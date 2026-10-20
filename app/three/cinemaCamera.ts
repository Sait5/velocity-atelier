import * as T from 'three'

/**
 * Cinema camera for the drive page: a loop of filmed shots with hard cuts between them, each moving slowly and smoothly
 * (low front three-quarter, wheel-level tracking, rising rear, a roadside camera the car passes, a long-lens profile from
 * the free lane and a high front view). The car travels toward -x and the road scrolls under it, so a "fixed" roadside camera moves +x
 * at the car's speed. Positions are clamped to the map's room (tunnel ceiling and walls, the valley's cliff).
 */
export type CinemaRoom={ceiling:number,left:number,right:number}
type Shot={seconds:number,frame:(u:number,t:number,p:T.Vector3,eye:T.Vector3,aim:T.Vector3)=>number}

export function createCinemaCamera(){
 const eye=new T.Vector3(),aim=new T.Vector3(),ease=(u:number)=>u*u*(3-2*u)
 let index=0,time=0,roadside=0,speed=0
 const shots:Shot[]=[
  {seconds:5.5,frame:(u,_t,p)=>{eye.set(-7.4+2.2*u,.62,2.9-.9*u).add(p);aim.set(-1.1,.55,.15).add(p);return 34}},
  {seconds:5,frame:(u,_t,p)=>{eye.set(-1.9+3.2*u,.5,2.9).add(p);aim.set(-1.1+2.6*u,.42,.7).add(p);return 42}},
  {seconds:6,frame:(u,_t,p)=>{eye.set(5.5+7*u,1.3+2.6*u,-2.2-1.4*u).add(p);aim.set(-3-9*u,.75,0).add(p);return 36}},
  // a camera standing by the road ahead: the car comes toward it and passes
  {seconds:5,frame:(_u,t,p)=>{eye.set(-roadside+speed*t,.85,-3.3).add(p);eye.x=Math.min(eye.x,p.x+30);aim.set(0,.6,0).add(p);return 30}},
  // the long-lens profile stands on the free lane, never behind the barrier
  {seconds:5,frame:(u,_t,p)=>{eye.set(1.2-2.6*u,.75,4.4).add(p);aim.set(.3-2*u,.55,0).add(p);return 30}},
  {seconds:5.5,frame:(u,_t,p)=>{eye.set(-13+4*u,6.5-1.5*u,3.5-1.5*u).add(p);aim.set(-.5,.4,0).add(p);return 38}}
 ]
 function start(){time=0;roadside=Math.max(14,speed*2.6)}
 function apply(camera:T.PerspectiveCamera,carPosition:T.Vector3,carSpeed:number,dt:number,room:CinemaRoom){
  speed=Math.abs(carSpeed);time+=dt
  if(time>shots[index]!.seconds){index=(index+1)%shots.length;start()}
  const shot=shots[index]!,fov=shot.frame(ease(Math.min(1,time/shot.seconds)),time,carPosition,eye,aim)
  eye.y=Math.min(eye.y,room.ceiling);eye.z=T.MathUtils.clamp(eye.z,-room.right,room.left)
  camera.position.copy(eye);camera.lookAt(aim)
  if(Math.abs(camera.fov-fov)>.01){camera.fov=fov;camera.updateProjectionMatrix()}
 }
 return {apply,reset(){index=0;start()}}
}
