import * as T from 'three'
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js'
import fittedPlacement from './data/revueltoMechanismPlacement.json'

type Vehicle={root:T.Group;doors:T.Group[]}
/** The authored lift plus a short outward release, with links following the mount. */
export function connectSuppliedRevueltoHinge<V extends Vehicle>(vehicle:V,asset:GLTF){
 const clip=asset.animations.find(c=>c.name==='Door_Open')
 if(!clip)throw new Error('Two-arm Blender opening clip missing')
 const duration=clip.duration
 // Finish only the supplied mechanism; car and door materials are untouched.
 const visibleMetal=new Map<T.Material,T.Material>()
 asset.scene.traverse(o=>{if(o instanceof T.Mesh)for(const material of Array.isArray(o.material)?o.material:[o.material]){
  if(!visibleMetal.has(material)){
   const black=(material as T.MeshStandardMaterial).clone();black.color.set('#121416');black.metalness=.25;black.roughness=.5;black.name='Revuelto hinge black '+material.name;visibleMetal.set(material,black)
  }
 }})
 const mechanisms=vehicle.doors.map((door,i)=>{
  const placement=new T.Group();placement.name=`Revuelto two-arm body mount ${i?'R':'L'}`
  // Fitted against both mounting surfaces in Revuelto-Mechanism-Placed.blend.
  placement.matrix.fromArray(i?fittedPlacement.right:fittedPlacement.left)
  placement.matrixAutoUpdate=false
  const rig=asset.scene.clone(true)
  placement.add(rig);vehicle.root.add(placement)
  const mixer=new T.AnimationMixer(rig),action=mixer.clipAction(clip)
  action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;action.time=0;mixer.update(0)
  vehicle.root.updateWorldMatrix(true,true)
  const attachment=rig.getObjectByName('Door_Mount')
  if(!attachment)throw new Error('Two-arm Door_Mount missing')
  const lower=rig.getObjectByName('Lower_Arm')!,upper=rig.getObjectByName('Upper_Arm')!
  const find=(prefix:string)=>{let found:T.Object3D|undefined;rig.traverse(o=>{if(o.name.startsWith(prefix))found=o});if(!found)throw new Error('Hinge anchor missing: '+prefix);return found}
  const c=find('Axis_C'),d=find('Axis_D')
  const gasNode=(suffix:string)=>{let result:T.Object3D|undefined;rig.traverse(o=>{if(o.name.startsWith('Gas_Strut')&&o.name.endsWith(suffix))result=o});if(!result)throw new Error('Gas strut anchor missing: '+suffix);return result}
  const fixedEye=gasNode('fixed_eye'),movingEye=gasNode('moving_eye')
  const gas=[{aim:gasNode('cylinder_aim'),target:movingEye},{aim:gasNode('rod_aim'),target:fixedEye}]
  const anchors=[c,d].map(o=>attachment.worldToLocal(o.getWorldPosition(new T.Vector3())))
  const arms=[lower,upper].map((arm,j)=>({arm,length:j?102:88,scale:arm.scale.clone()}))
  const authored=[attachment,lower,upper,...gas.map(g=>g.aim)].map(node=>({node,position:node.position.clone(),quaternion:node.quaternion.clone()}))
  attachment.attach(door)
  // Lower both mounting locations, keeping the approved door transform intact.
  const drop=.08
  const mountOffset=attachment.worldToLocal(attachment.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,-drop,0)))
  door.position.sub(mountOffset)
  placement.matrix.elements[13]!-=drop
  rig.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;o.material=Array.isArray(o.material)?o.material.map(m=>visibleMetal.get(m)??m):visibleMetal.get(o.material)??o.material}})
  return {mixer,action,attachment,anchors,arms,authored,gas,mountOffset,drop}
 })
 function setDoors(left:number,right=left){
  mechanisms.forEach(({mixer,action,attachment,anchors,arms,authored,gas,mountOffset,drop},i)=>{
   const p=T.MathUtils.clamp(i?right:left,0,1)
   // Release the leading edge from the fender before the main upward motion.
   const release=1-Math.pow(1-T.MathUtils.clamp(p/.18,0,1),2),lift=T.MathUtils.clamp((p-.08)/.92,0,1)
   arms.forEach(({arm,scale})=>arm.scale.copy(scale))
   authored.forEach(({node,position,quaternion})=>{node.position.copy(position);node.quaternion.copy(quaternion)})
   action.enabled=true;action.paused=true;action.time=duration*lift;mixer.update(0)
   authored.forEach(({node,position,quaternion})=>{position.copy(node.position);quaternion.copy(node.quaternion)})
   vehicle.root.updateWorldMatrix(true,true)
   const outward=new T.Vector3(0,.080*release,(i?-1:1)*(.090*release+.015*lift))
   const point=attachment.localToWorld(mountOffset.clone()).add(outward).add(new T.Vector3(0,drop,0))
   attachment.position.copy(attachment.parent!.worldToLocal(point))
   vehicle.root.updateWorldMatrix(true,true)
   // Keep the existing links joined at both ends while the mount releases outward.
   arms.forEach(({arm,length},j)=>{
    const end=arm.parent!.worldToLocal(attachment.localToWorld(anchors[j]!.clone()))
    const direction=end.sub(arm.position),axis=new T.Vector3(1,0,0).applyQuaternion(arm.quaternion)
    arm.quaternion.premultiply(new T.Quaternion().setFromUnitVectors(axis.normalize(),direction.clone().normalize()))
    arm.scale.x=direction.length()/length
   })
   vehicle.root.updateWorldMatrix(true,true)
   gas.forEach(({aim,target})=>{
    const direction=aim.parent!.worldToLocal(target.getWorldPosition(new T.Vector3())).sub(aim.position).normalize()
    aim.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction)
   })
  })
  vehicle.root.updateWorldMatrix(true,true)
 }
 setDoors(0,0)
 return {...vehicle,setDoors}
}




