import * as T from 'three'
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js'

/** The exported clips drive both hardware and doors; no second animation path. */
export function installDoorMechanisms<V extends {root:T.Group;doors:T.Group[];setWindows:(value:number)=>void;dispose:()=>void}>(vehicle:V,asset:GLTF){
 const rig=asset.scene,mixer=new T.AnimationMixer(rig)
 vehicle.root.add(rig)
 const actions=['L','R'].map(side=>{
  const clip=asset.animations.find(c=>c.name===`Door_${side}_Open`)
  if(!clip)throw new Error(`Missing exported ${side} door animation`)
  const action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true
  return action
 })
 mixer.update(0);vehicle.root.updateMatrixWorld(true)
 for(const [i,side] of ['L','R'].entries()){
  const anchor=rig.getObjectByName(`DoorAnchor_${side}`)
  if(!anchor)throw new Error(`Missing exported ${side} door anchor`)
  anchor.attach(vehicle.doors[i]!)
 }
 let windowProgress=0
 const originalWindows=vehicle.setWindows.bind(vehicle)
 function setWindows(value:number){windowProgress=value;originalWindows(value)}
 function setDoors(left:number,right=left){
  for(const [i,value] of [left,right].entries())actions[i]!.time=T.MathUtils.clamp(value,0,1)*actions[i]!.getClip().duration
  mixer.update(0)
  rig.updateWorldMatrix(true,true)
  originalWindows(windowProgress)
 }
 setDoors(0)
 return {...vehicle,setDoors,setWindows,dispose(){mixer.stopAllAction();mixer.uncacheRoot(rig);vehicle.dispose()}}
}
