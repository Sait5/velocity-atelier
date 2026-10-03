import * as T from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import type {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js'

export function collectFerrariWheels(model:T.Object3D):T.Group[]{
 // GLTFLoader renames repeated child meshes to wheel_1, wheel_2, etc.
 // Only these four parent assemblies correspond to the donor wheel order.
 return ['wheel_rr','wheel_rl','wheel_fl','wheel_fr'].map(name=>{
  const wheel=model.getObjectByName(name)
  if(!wheel||wheel instanceof T.Mesh||wheel.children.length===0)throw new Error('Ferrari wheel assembly missing: '+name)
  return wheel as T.Group
 })
}

export async function installDonorWheels(root:T.Group,wheels:T.Group[],decoder:DRACOLoader){
 const asset=await new GLTFLoader().setDRACOLoader(decoder).loadAsync('/models/ferrari-donor-wheels.glb?v=donor-fit-1')
 installDonorWheelAssemblies(root,wheels,asset.scene)
}
export function installDonorWheelAssemblies(root:T.Group,wheels:T.Group[],asset:T.Group){
 root.updateMatrixWorld(true)
 const replacements=wheels.map((old,i)=>{
  const wheel=asset.getObjectByName('donor_wheel_'+i),caliper=asset.getObjectByName('donor_caliper_'+i)
  if(!wheel||!caliper)throw new Error('Donor wheel assembly missing')
  return {old,wheel,caliper,position:old.getWorldPosition(new T.Vector3())}
 })
 const oldMaterials=new Set<T.Material>()
 for(const {old,wheel,caliper,position} of replacements){
  old.removeFromParent()
  old.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>oldMaterials.add(m));if(o instanceof T.InstancedMesh)o.dispose()}})
  for(const part of [wheel,caliper]){part.removeFromParent();part.position.copy(position);root.add(part);part.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=o.receiveShadow=true})}
 }
 wheels.splice(0,wheels.length,...replacements.map(r=>r.wheel as T.Group))
 const liveMaterials=new Set<T.Material>(),liveTextures=new Set<T.Texture>()
 root.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){liveMaterials.add(m);for(const v of Object.values(m))if(v instanceof T.Texture)liveTextures.add(v)}})
 for(const m of oldMaterials)if(!liveMaterials.has(m)){for(const v of Object.values(m))if(v instanceof T.Texture&&!liveTextures.has(v))v.dispose();m.dispose()}
}
