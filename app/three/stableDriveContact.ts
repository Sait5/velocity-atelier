import * as T from 'three'

/** Rigid GT3 presentation: steering and road height, without tyre springs. */
export function createStableDriveContact(root:T.Group,wheels:T.Group[],surface:(x:number,z:number,distance:number)=>number,lateralLimit=()=>2.7,rigidBody=false){
 root.updateMatrixWorld(true)
 const rest=wheels.map(w=>w.position.clone()),radii=wheels.map(w=>{const box=new T.Box3().setFromObject(w,true);return (box.max.y-box.min.y)/2})
 const offset=rest.reduce((sum,p,i)=>sum+radii[i]!-p.y,0)/rest.length
 const contacts=rest.map(()=>new T.Vector3()),suspension=rest.map(()=>0),point=new T.Vector3()
 let lateral=0,lateralSpeed=0,heading=0,height=0,pitch=0,roll=0,steering=0
 function update(speed:number,distance:number,dt:number,_italian:boolean,steer=0){
  dt=T.MathUtils.clamp(dt,0,.1);steering=T.MathUtils.damp(steering,steer,7,dt)
  lateralSpeed=T.MathUtils.damp(lateralSpeed,Math.abs(speed)>1?steering*Math.min(Math.abs(speed)*.04,1.2):0,5,dt)
  lateral=T.MathUtils.clamp(lateral+lateralSpeed*dt,-lateralLimit(),lateralLimit())
  if(Math.abs(lateral)>=lateralLimit())lateralSpeed=0
  heading=T.MathUtils.damp(heading,-Math.atan2(lateralSpeed,Math.max(Math.abs(speed),8)),6,dt)
  const ground=rest.map(p=>surface(p.x*Math.cos(heading)+p.z*Math.sin(heading),lateral-p.x*Math.sin(heading)+p.z*Math.cos(heading),distance))
  const mean=(indices:number[])=>indices.reduce((s,i)=>s+ground[i]!,0)/indices.length
  const front=rest.map((p,i)=>p.x<0?i:-1).filter(i=>i>=0),rear=rest.map((p,i)=>p.x>=0?i:-1).filter(i=>i>=0)
  const left=rest.map((p,i)=>p.z<0?i:-1).filter(i=>i>=0),right=rest.map((p,i)=>p.z>=0?i:-1).filter(i=>i>=0)
  const wheelbase=Math.max(...rest.map(p=>p.x))-Math.min(...rest.map(p=>p.x)),track=Math.max(...rest.map(p=>p.z))-Math.min(...rest.map(p=>p.z))
  height=T.MathUtils.damp(height,offset+mean(rest.map((_,i)=>i)),18,dt)
  pitch=T.MathUtils.damp(pitch,Math.atan2(mean(rear)-mean(front),wheelbase),10,dt)
  roll=T.MathUtils.damp(roll,Math.atan2(mean(right)-mean(left),track),10,dt)
  root.position.set(0,height,lateral);root.rotation.set(rigidBody?0:roll,heading,rigidBody?0:pitch,'YXZ');root.updateMatrixWorld(true)
  wheels.forEach((w,i)=>{w.position.copy(rest[i]!);w.rotation.y=rest[i]!.x<0?steering*.045/(1+Math.abs(speed)*.035):0;point.copy(rest[i]!).applyMatrix4(root.matrixWorld);contacts[i]!.set(point.x,surface(point.x,point.z,distance),point.z)})
 }
 function reset(){lateral=lateralSpeed=heading=pitch=roll=steering=0;height=offset+surface(0,0,0);update(0,0,0,false)}
 reset();return {update,reset,radii,contacts,suspension,assemblies:wheels,get heading(){return heading},get lateralAcceleration(){return 0}}
}
