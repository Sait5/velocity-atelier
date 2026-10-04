import * as T from 'three'
import gsap from 'gsap'

/** The caller starts this only after the loading overlay has finished. */
export function createShowroomIntro(car:{root:T.Group,wheels:T.Object3D[]},camera:T.PerspectiveCamera,target:T.Vector3,changed:(active:boolean)=>void){
 let timeline:gsap.core.Timeline|undefined
 const wheelStarts=car.wheels.map(w=>w.rotation.z),home=car.root.position.clone()
 function stop(){
  timeline?.kill();timeline=undefined;car.root.position.copy(home)
  car.wheels.forEach((w,i)=>w.rotation.z=wheelStarts[i]!)
  target.set(0,.65,0);camera.position.set(-5.7,2.35,6.3);camera.lookAt(target);changed(false)
 }
 function play(){
  stop();changed(true);car.root.position.x=home.x+7.5
  camera.position.set(-5.7,1.55,6.7);camera.lookAt(target)
  timeline=gsap.timeline({onUpdate(){camera.lookAt(target)},onComplete:stop})
  timeline.to(car.root.position,{x:home.x,duration:4.2,ease:'sine.inOut',onUpdate(){car.wheels.forEach((w,i)=>w.rotation.z=wheelStarts[i]!+(7.5-(car.root.position.x-home.x))/(i<2?.365:.335))}},0)
  const shots:[number[],number[],number][]=[
   [[-5.5,1.1,2.2],[-.6,.6,0],2.8],
   [[-.2,1.5,6.7],[0,.6,0],3.2],
   [[5,1.4,3.6],[1,.65,0],3.2],
   [[.6,6.4,2.7],[0,.4,0],3.2],
   [[-1.8,.72,2.25],[-1.2,.37,.85],3.2],
   [[-5.7,2.35,6.3],[0,.65,0],3.2]
  ]
  let at=4.8
  for(const [position,focus,duration] of shots){timeline.to(camera.position,{x:position[0],y:position[1],z:position[2],duration,ease:'sine.inOut'},at);timeline.to(target,{x:focus[0],y:focus[1],z:focus[2],duration,ease:'sine.inOut'},at);at+=duration+.8}
 }
 return {play,stop}
}
