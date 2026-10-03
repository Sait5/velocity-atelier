import * as T from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js'
import {createVehicle} from './vehicle'
import {installItaliaLamps} from './vehicleLamps'
import {installInstruments} from './instruments'
import {enhanceCabin} from './cabinDetails'

/** Use the complete authored Italia, with its native cabin and exterior. */
export function prepareCompleteItalia(root:T.Group){
 const material=(name:string)=>{
  let found:T.MeshStandardMaterial|undefined
  root.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name===name)found=m as T.MeshStandardMaterial})
  if(!found)throw new Error('Italia material missing: '+name)
  return found
 }
 const body=new T.MeshPhysicalMaterial({name:'Italia paint',color:'#a2b368',metalness:.18,roughness:.2,clearcoat:1,clearcoatRoughness:.075,envMapIntensity:1.2})
 const leather=material('bump_leather_cp') as T.MeshPhysicalMaterial
 leather.color.set('#242826');leather.metalness=0;leather.roughness=.72;leather.normalScale?.multiplyScalar(1.2)
 const glass=material('window') as T.MeshPhysicalMaterial
 glass.color.set('#b9ceca');glass.metalness=0;glass.roughness=.06;glass.transmission=0;glass.transparent=true;glass.opacity=.22;glass.depthWrite=false
 const rim=material('rim_bump_metal'),brake=material('brake_bump_metal2')
 const carpet=material('mottled');carpet.color.set('#222422');carpet.metalness=0;carpet.roughness=1
 const lampGlass=material('glass') as T.MeshPhysicalMaterial
 lampGlass.color.set('#d3dfde');lampGlass.transmission=0;lampGlass.transparent=true;lampGlass.opacity=.14;lampGlass.roughness=.06;lampGlass.depthWrite=false
 const {white,setLights}=installItaliaLamps(root,material('lights_glass'))
 const retired=new Set<T.Material>()
 root.traverse(o=>{
  if(!(o instanceof T.Mesh))return
  o.castShadow=true;o.receiveShadow=true
  for(const m of Array.isArray(o.material)?o.material:[o.material])for(const value of Object.values(m))if(value instanceof T.Texture)value.anisotropy=16
  if(Array.isArray(o.material))return
  if(o.material.name==='carpaint'){retired.add(o.material);o.material=body}
  if(/leather|stitching|mottled|headliner|cloth/.test(o.material.name)){(o.material as T.MeshStandardMaterial).metalness=0}
 })
 retired.forEach(m=>m.dispose())
 const group=(name:string)=>{
  const part=root.getObjectByName(name)
  if(!part||part instanceof T.Mesh||!part.children.length)throw new Error('Italia assembly missing: '+name)
  return part as T.Group
 }
 const doors=[group('door_L'),group('door_R')],wheels=[0,1,2,3].map(i=>group('wheel_'+i)),spokes:T.Group[]=[]
 // Outer hinge seam avoids sweeping the front edge into the tyre.
 for(const door of doors){const shift=new T.Vector3(0,0,Math.sign(door.position.z)*.98-door.position.z);door.position.add(shift);door.children.forEach(child=>child.position.sub(shift))}
 root.updateMatrixWorld(true)
 enhanceCabin(root,leather)
 const {updateInstruments}=installInstruments(root)
 return {updateInstruments,root,body,rim,brake,glass,leather,white,doors,wheels,spokes,setLights,dispose(){
  const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>()
  root.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m))}})
  geometries.forEach(g=>g.dispose());[body,rim,brake,glass,leather,white].forEach(m=>materials.add(m))
  materials.forEach(m=>{for(const v of Object.values(m))if(v instanceof T.Texture)textures.add(v);m.dispose()});textures.forEach(t=>t.dispose())
 }}
}

export async function loadVehicle(shape:number,onProgress:(n:number)=>void){
 if(shape!==8)return createVehicle(shape)
 const decoder=new DRACOLoader().setDecoderPath('/draco/'),loader=new GLTFLoader().setDRACOLoader(decoder)
 try{
  const gltf=await loader.loadAsync('/models/ferrari-italia-complete.glb',e=>{if(e.lengthComputable)onProgress(65+Math.round(e.loaded/e.total*20))})
  return prepareCompleteItalia(gltf.scene)
 }finally{decoder.dispose()}
}


