import * as T from 'three'
export function createCockpitLook(camera:T.PerspectiveCamera){
 const anchor=new T.Vector3(.02,1.04,.35),baseYaw=Math.PI/2
 let yaw=baseYaw,pitch=-.13,targetYaw=yaw,targetPitch=pitch
 function apply(){yaw=T.MathUtils.lerp(yaw,targetYaw,.16);pitch=T.MathUtils.lerp(pitch,targetPitch,.16);camera.position.copy(anchor);camera.quaternion.setFromEuler(new T.Euler(pitch,yaw,0,'YXZ'))}
 function turn(dx:number,dy:number){targetYaw=T.MathUtils.clamp(targetYaw-dx*.0022,baseYaw-2.6,baseYaw+2.6);targetPitch=T.MathUtils.clamp(targetPitch-dy*.0018,-1.1,.7);apply()}
 function aim(point:T.Vector3){const direction=point.clone().sub(anchor).normalize();let y=Math.atan2(-direction.x,-direction.z);while(y-baseYaw>Math.PI)y-=Math.PI*2;while(y-baseYaw<-Math.PI)y+=Math.PI*2;targetYaw=T.MathUtils.clamp(y,baseYaw-2.6,baseYaw+2.6);targetPitch=T.MathUtils.clamp(Math.asin(direction.y),-1.1,.7)}
 function reset(){yaw=targetYaw=baseYaw;pitch=targetPitch=-.13;apply()}
 return {anchor,apply,turn,aim,reset}
}

