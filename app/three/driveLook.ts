import * as T from 'three'

/** Views remain attached to the moving car; dragging only changes the sightline. */
export function createDriveLook(camera:T.PerspectiveCamera,anchor=new T.Vector3(.02,1.04,.35)){
 let yaw=0,pitch=0,targetYaw=0,targetPitch=0
 const up=new T.Vector3(0,1,0),offset=new T.Vector3(),target=new T.Vector3()
 function reset(){yaw=pitch=targetYaw=targetPitch=0}
 function turn(dx:number,dy:number,view=0){
  targetYaw+=(view===1?-1:1)*T.MathUtils.clamp(dx,-80,80)*.00125
  const base=view===2?.74:.35
  const minimum=view===1?-.55:.12-base,maximum=view===1?.65:1.25-base
  // Clamp the actual orbit target, so reverse dragging responds at the limit.
  targetPitch=T.MathUtils.clamp(targetPitch+(view===1?1:-1)*T.MathUtils.clamp(dy,-80,80)*.001,minimum,maximum)
 }

 function apply(position:T.Vector3,heading:number,view:number,dt:number){
  const smoothing=1-Math.exp(-dt*5);yaw=T.MathUtils.lerp(yaw,targetYaw,smoothing);pitch=T.MathUtils.lerp(pitch,targetPitch,smoothing)
  if(view===1){
   offset.copy(anchor).applyAxisAngle(up,heading);camera.position.copy(position).add(offset)
   camera.quaternion.setFromEuler(new T.Euler(-.08-pitch,Math.PI/2+heading+yaw,0,'YXZ'))
  }else{
   const radius=view===2?13:8.6,elevation=T.MathUtils.clamp((view===2?.74:.35)+pitch,.12,1.25),azimuth=(view===2?Math.PI/2:2.55)+yaw
   offset.set(Math.cos(azimuth)*Math.cos(elevation)*radius,Math.sin(elevation)*radius,Math.sin(azimuth)*Math.cos(elevation)*radius).applyAxisAngle(up,heading)
   camera.position.copy(position).add(offset);target.copy(position);target.y+=.65;camera.lookAt(target)
  }
 }
 return {anchor,turn,apply,reset}
}


