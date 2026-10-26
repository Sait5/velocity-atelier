import * as T from 'three'
import {alignWheelAxes} from './wheelAxis'

/** Four ground probes under a rigid chassis: the body follows the road height, grade and camber, and every wheel stays
 * fixed on its hub (no spring travel, so no wheel drifts or leaves its arch). Front wheels steer on carriers that also
 * hold the calipers and other non-spinning wheel hardware. Each wheel turns about its own axle (wheelAxis.ts; wheels the
 * loader left as authored, the Valhalla's and the Jesko's, are trued here before they roll). */
export function createTyreContact(root:T.Group,wheels:T.Group[],surface:(x:number,z:number,distance:number)=>number,lateralLimit=()=>2.7){
 if(!(import.meta.dev&&typeof location!=='undefined'&&location.search.includes('noalign')))alignWheelAxes(wheels)
 root.updateMatrixWorld(true)
 // Hub positions in the chassis frame (some wheels sit under intermediate model nodes).
 const rest=wheels.map(w=>root.worldToLocal(w.getWorldPosition(new T.Vector3()))),point=new T.Vector3()
 const radii=wheels.map(w=>{
  const bounds=new T.Box3();w.traverse(o=>{if(o instanceof T.Mesh){const m=Array.isArray(o.material)?o.material:[o.material];if(m.some(m=>/^Wheel(?:\.|$)|tyre|tire/i.test(m.name)))bounds.expandByObject(o,true)}})
  // The Revuelto's treads are fixed hardware outside the spinning group.
  if(w.name.startsWith('Revuelto wheel ')){const tyrePrefix='Fixed wheel hardware '+w.name.split(' ').at(-1)+' tyre ';root.traverse(o=>{if(o instanceof T.Mesh&&o.name.startsWith(tyrePrefix))bounds.expandByObject(o,true)})}
  if(bounds.isEmpty())bounds.setFromObject(w,true)
  return (bounds.max.y-bounds.min.y)/2
 })
 // Root height over the road surface that puts the tyres on it.
 const offset=rest.reduce((sum,p,i)=>sum+radii[i]!-p.y,0)/rest.length
 const carriers=wheels.map((w,i)=>{const g=new T.Group();g.name='Wheel carrier '+i;root.add(g);g.position.copy(rest[i]!);root.updateMatrixWorld(true);g.attach(w);return g})
 const hardware:T.Object3D[]=[];root.traverse(o=>{if(o.name.startsWith('Fixed wheel hardware'))hardware.push(o)})
 hardware.forEach(o=>{const at=root.worldToLocal(o.getWorldPosition(new T.Vector3()));let nearest=0,best=Infinity;rest.forEach((p,i)=>{const d=at.distanceToSquared(p);if(d<best){best=d;nearest=i}});carriers[nearest]!.attach(o)})
 const pick=(test:(p:T.Vector3)=>boolean)=>rest.map((p,i)=>test(p)?i:-1).filter(i=>i>=0)
 const front=pick(p=>p.x<0),rear=pick(p=>p.x>=0),left=pick(p=>p.z<0),right=pick(p=>p.z>=0),all=rest.map((_,i)=>i)
 const wheelbase=Math.max(...rest.map(p=>p.x))-Math.min(...rest.map(p=>p.x)),track=Math.max(...rest.map(p=>p.z))-Math.min(...rest.map(p=>p.z))
 const contacts=rest.map(()=>new T.Vector3()),ground=rest.map(()=>0)
 let lateral=0,lateralSpeed=0,lateralAcceleration=0,heading=0,height=offset,pitch=0,roll=0,steering=0
 const mean=(indices:number[])=>indices.reduce((s,i)=>s+ground[i]!,0)/indices.length
 function probe(distance:number){rest.forEach((p,i)=>{ground[i]=surface(p.x*Math.cos(heading)+p.z*Math.sin(heading),lateral-p.x*Math.sin(heading)+p.z*Math.cos(heading),distance)})}
 function update(speed:number,distance:number,dt:number,steer=0){
  dt=T.MathUtils.clamp(dt,0,.1);steering=T.MathUtils.damp(steering,steer,7,dt)
  const before=lateralSpeed,limit=lateralLimit()
  lateralSpeed=T.MathUtils.damp(lateralSpeed,Math.abs(speed)>1?steering*Math.min(Math.abs(speed)*.04,1.2):0,5,dt)
  lateral=T.MathUtils.clamp(lateral+lateralSpeed*dt,-limit,limit);if(Math.abs(lateral)>=limit)lateralSpeed=0
  lateralAcceleration=dt>0?T.MathUtils.clamp((lateralSpeed-before)/dt,-3,3):0
  heading=T.MathUtils.damp(heading,-Math.atan2(lateralSpeed,Math.max(Math.abs(speed),8)),6,dt)
  probe(distance)
  height=T.MathUtils.damp(height,offset+mean(all),18,dt)
  pitch=T.MathUtils.damp(pitch,Math.atan2(mean(rear)-mean(front),wheelbase),10,dt)
  roll=T.MathUtils.damp(roll,Math.atan2(mean(right)-mean(left),track),10,dt)
  root.position.set(0,height,lateral);root.rotation.set(roll,heading,pitch,'YXZ');root.updateMatrixWorld(true)
  carriers.forEach((g,i)=>{g.rotation.y=rest[i]!.x<0?steering*.045/(1+Math.abs(speed)*.035):0;point.copy(rest[i]!).applyMatrix4(root.matrixWorld);contacts[i]!.set(point.x,surface(point.x,point.z,distance),point.z)})
 }
 function reset(){lateral=lateralSpeed=lateralAcceleration=heading=steering=0;probe(0);height=offset+mean(all);pitch=Math.atan2(mean(rear)-mean(front),wheelbase);roll=Math.atan2(mean(right)-mean(left),track);update(0,0,0)}
 reset()
 return {update,reset,radii,contacts,get heading(){return heading},get lateralAcceleration(){return lateralAcceleration}}
}
