import * as T from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import type {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js'

/** Authored and checked in Blender, with the original door pivots and body silhouette. */
export async function installFittedInterior(root:T.Group,doors:T.Group[],leather:T.Material,decoder:DRACOLoader){
 const asset=await new GLTFLoader().setDRACOLoader(decoder).loadAsync('/models/ferrari-fitted-interior.glb')
 installFittedAssemblies(root,doors,leather,asset.scene)
}
export function installFittedAssemblies(root:T.Group,doors:T.Group[],leather:T.Material,asset:T.Group){
 const rear=asset.getObjectByName('upgrade_rear'),seats=asset.getObjectByName('upgrade_seats')
 const replacements=doors.map((_,i)=>asset.getObjectByName(i===0?'upgrade_door_L':'upgrade_door_R'))
 if(!rear||!seats||replacements.some(o=>!o))throw new Error('Fitted interior assembly missing')
 const removed:T.Object3D[]=[]
 const detach=(o:T.Object3D|undefined)=>{if(o){o.removeFromParent();removed.push(o)}}
 asset.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=o.receiveShadow=true;if(!Array.isArray(o.material)&&o.material.name==='Fitted upholstery')o.material=leather}})
 detach(root.getObjectByName('rear_tailored_trim'))
 const belts:T.Object3D[]=[];root.traverse(o=>{if(o.name==='seatbelt_webbing')belts.push(o)});belts.forEach(detach)
 rear.removeFromParent();root.add(rear)
 detach(root.getObjectByName('seat_driver'));detach(root.getObjectByName('seat_passenger'));seats.removeFromParent();root.add(seats)
 for(let i=0;i<doors.length;i++){
  const door=doors[i]!,replacement=replacements[i]!
  for(const child of [...door.children])if(!['body_door','chrome_door','interior_dark_door'].includes(child.name))detach(child)
  replacement.removeFromParent();replacement.position.set(0,0,0);door.add(replacement)
 }
 const liveGeometry=new Set<T.BufferGeometry>(),liveMaterials=new Set<T.Material>([leather])
 root.traverse(o=>{if(o instanceof T.Mesh){liveGeometry.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])liveMaterials.add(m)}})
 const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>()
 removed.forEach(o=>o.traverse(child=>{if(child instanceof T.Mesh){geometries.add(child.geometry);for(const m of Array.isArray(child.material)?child.material:[child.material])materials.add(m)}}))
 geometries.forEach(g=>{if(!liveGeometry.has(g))g.dispose()});materials.forEach(m=>{if(!liveMaterials.has(m))m.dispose()})
 root.updateMatrixWorld(true)
}
