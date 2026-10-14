import * as T from 'three'
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js'
import fittedPlacement from './data/revueltoMechanismPlacement.json'
import {createRevueltoBracketConnection} from './revueltoBracketConnection'

type Vehicle={root:T.Group;doors:T.Group[]}
/** Retain the accepted door path and connect the original orange hook. */
export function connectSuppliedRevueltoHinge<V extends Vehicle>(vehicle:V,asset:GLTF){
 const clip=asset.animations.find(c=>c.name==='Door_Open')
 if(!clip)throw new Error('Revuelto door animation missing')
 const duration=clip.duration
 const controllers=vehicle.doors.map((door,i)=>{
  const placement=new T.Group();placement.name=`Revuelto door animation controller ${i?'R':'L'}`
  placement.matrix.fromArray(i?fittedPlacement.right:fittedPlacement.left);placement.matrixAutoUpdate=false
  const rig=asset.scene.clone(true)
  // The supplied asset supplies only the existing animation. None of its
  // complex hinge meshes are displayed; the car's own bracket is on the door.
  rig.traverse(o=>{if(o instanceof T.Mesh)o.visible=false})
  placement.add(rig);vehicle.root.add(placement)
  const mixer=new T.AnimationMixer(rig),action=mixer.clipAction(clip)
  action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;action.time=0;mixer.update(0)
  vehicle.root.updateWorldMatrix(true,true)
  const attachment=rig.getObjectByName('Door_Mount')
  if(!attachment)throw new Error('Revuelto door animation attachment missing')
  const authored={position:attachment.position.clone(),quaternion:attachment.quaternion.clone()}
  attachment.attach(door)
  const drop=.08
  const mountOffset=attachment.worldToLocal(attachment.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,-drop,0)))
  door.position.sub(mountOffset);placement.matrix.elements[13]!-=drop
  return {mixer,action,attachment,authored,mountOffset,drop}
 })
 const connections:ReturnType<typeof createRevueltoBracketConnection>[]=[]
 function setDoors(left:number,right=left){
  controllers.forEach(({mixer,action,attachment,authored,mountOffset,drop},i)=>{
   const p=T.MathUtils.clamp(i?right:left,0,1)
   const release=1-Math.pow(1-T.MathUtils.clamp(p/.18,0,1),2),lift=T.MathUtils.clamp((p-.08)/.92,0,1)
   attachment.position.copy(authored.position);attachment.quaternion.copy(authored.quaternion)
   action.enabled=true;action.paused=true;action.time=duration*lift;mixer.update(0)
   authored.position.copy(attachment.position);authored.quaternion.copy(attachment.quaternion)
   vehicle.root.updateWorldMatrix(true,true)
   const outward=new T.Vector3(0,.080*release,(i?-1:1)*(.090*release+.015*lift))
   const point=attachment.localToWorld(mountOffset.clone()).add(outward).add(new T.Vector3(0,drop,0))
   attachment.position.copy(attachment.parent!.worldToLocal(point))
  })
  vehicle.root.updateWorldMatrix(true,true)
  connections.forEach(connection=>connection.update())
 }
 setDoors(0,0)
 vehicle.doors.forEach((door,i)=>connections.push(createRevueltoBracketConnection(vehicle.root,door,i?-1:1)))
 return {...vehicle,setDoors}
}
