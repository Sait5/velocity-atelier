import * as T from 'three'
import gsap from 'gsap'

/** Short editorial camera drifts, with a fade masking each change of viewpoint. */
export function createShowroomIntro(car:{root:T.Group,wheels:T.Object3D[]},camera:T.PerspectiveCamera,target:T.Vector3,changed:(active:boolean)=>void,fade:(opacity:number)=>void=()=>{}){
 let timeline:gsap.core.Timeline|undefined
 const wheelStarts=car.wheels.map(w=>w.rotation.z),home=car.root.position.clone(),curtain={value:0}
 function stop(){
  timeline?.kill();timeline=undefined;car.root.position.copy(home)
  car.wheels.forEach((w,i)=>w.rotation.z=wheelStarts[i]!)
  target.set(0,.65,0);camera.position.set(-5.7,2.35,6.3);camera.lookAt(target);curtain.value=0;fade(0);changed(false)
 }
 function play(){
  stop();changed(true);car.root.position.x=home.x+7.5
  camera.position.set(-5.7,1.55,6.7);camera.lookAt(target)
  timeline=gsap.timeline({onUpdate(){camera.lookAt(target);fade(curtain.value)},onComplete:stop})
  timeline.to(car.root.position,{x:home.x,duration:3.4,ease:'sine.inOut',onUpdate(){car.wheels.forEach((w,i)=>w.rotation.z=wheelStarts[i]!+(7.5-(car.root.position.x-home.x))/(i<2?.365:.335))}},0)
  const shots:[number[],number[],number[],number][]=[
   [[-4.5,.95,1.65],[-3.2,1.6,2.7],[-1,.55,0],2.8],
   [[-1.25,1.18,4.8],[1.15,1.4,4.65],[0,.58,0],3.0],
   [[4.4,1.0,1.9],[3.75,1.45,3.2],[1,.6,0],2.9],
   [[-.8,5.4,.85],[1.1,5.2,1.8],[0,.4,0],2.5],
   [[-1.8,.65,2.05],[-1.55,.7,2.15],[-1.2,.37,.85],2.5],
   [[-5.7,2.35,6.3],[-5.7,2.35,6.3],[0,.65,0],1.1]
  ]
  let at=3.65
  for(const [start,end,focus,duration] of shots){
   timeline.to(curtain,{value:1,duration:.32,ease:'sine.inOut'},at)
   timeline.set(camera.position,{x:start[0],y:start[1],z:start[2]},at+.32)
   timeline.set(target,{x:focus[0],y:focus[1],z:focus[2]},at+.32)
   timeline.to(curtain,{value:0,duration:.45,ease:'sine.inOut'},at+.36)
   timeline.to(camera.position,{x:end[0],y:end[1],z:end[2],duration,ease:'sine.inOut'},at+.36)
   at+=duration+.6
  }
 }
 return {play,stop}
}
