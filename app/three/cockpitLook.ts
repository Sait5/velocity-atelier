import * as T from 'three'
export function createCockpitLook(camera:T.PerspectiveCamera){
 const anchor=new T.Vector3(.23,1.02,.36),baseYaw=Math.PI/2
 let yaw=baseYaw,pitch=-.13
 function apply(){camera.position.copy(anchor);camera.quaternion.setFromEuler(new T.Euler(pitch,yaw,0,'YXZ'))}
 function turn(dx:number,dy:number){yaw=T.MathUtils.clamp(yaw-dx*.004,baseYaw-2.6,baseYaw+2.6);pitch=T.MathUtils.clamp(pitch-dy*.003,-1,.7);apply()}
 function aim(point:T.Vector3){const direction=point.clone().sub(anchor).normalize();let y=Math.atan2(-direction.x,-direction.z);while(y-baseYaw>Math.PI)y-=Math.PI*2;while(y-baseYaw<-Math.PI)y+=Math.PI*2;yaw=T.MathUtils.clamp(y,baseYaw-2.6,baseYaw+2.6);pitch=T.MathUtils.clamp(Math.asin(direction.y),-1,.7)}
 function reset(){yaw=baseYaw;pitch=-.13;apply()}
 return {anchor,apply,turn,aim,reset}
}
