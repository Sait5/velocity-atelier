import * as T from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js'
import {createVehicle} from './vehicle'
import {rigDoors} from './rigDoors'
import {enhanceVehicle} from './enhanceVehicle'
export async function loadVehicle(shape:number,onProgress:(n:number)=>void){
 if(shape!==8)return createVehicle(shape)
 const decoder=new DRACOLoader().setDecoderPath('/draco/'),loader=new GLTFLoader().setDRACOLoader(decoder)
 try{const gltf=await new Promise<any>((resolve,reject)=>loader.load('/models/ferrari.glb',resolve,e=>{if(e.lengthComputable)onProgress(65+Math.round(e.loaded/e.total*20))},reject));const model=gltf.scene,root=new T.Group();model.rotation.y=Math.PI/2;root.add(model)
 const body=new T.MeshPhysicalMaterial({color:'#a2b368',metalness:.8,roughness:.25,clearcoat:1}),rim=new T.MeshStandardMaterial({color:'#828983',metalness:1,roughness:.33}),brake=new T.MeshStandardMaterial({color:'#555957',metalness:.85,roughness:.5}),glass=new T.MeshPhysicalMaterial({color:'#161d1b',metalness:.25,roughness:.08,transparent:true,opacity:.72}),leather=new T.MeshStandardMaterial({color:'#242826',roughness:.85,metalness:0}),white=new T.MeshStandardMaterial({color:'#f3fff2',emissive:'#eaffda',emissiveIntensity:2})
 const wheels:T.Group[]=[],spokes:T.Group[]=[]
 const originals=new Set<T.Material>();model.traverse((o:T.Object3D)=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;if(o.name==='body'||o.name==='glass'){originals.add(o.material as T.Material);o.material=o.name==='body'?body:glass}else if(o.name==='leds'){originals.add(o.material as T.Material);o.material=white}}if(o.name.startsWith('wheel_'))wheels.push(o as T.Group)})
 root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root);const center=bounds.getCenter(new T.Vector3());model.position.x-=center.x;model.position.z-=center.z;model.position.y-=bounds.min.y
 body.envMapIntensity=.65;rim.envMapIntensity=.6;enhanceVehicle(root,wheels,rim,leather);originals.forEach(m=>m.dispose());const doors=rigDoors(root,body)
 return {root,body,rim,brake,glass,leather,white,doors,wheels,spokes,dispose(){const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>(),textures=new Set<T.Texture>();root.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);if(o instanceof T.InstancedMesh)o.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m))}});gs.forEach(g=>g.dispose());ms.forEach(m=>{for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);m.dispose()});textures.forEach(t=>t.dispose());[body,rim,brake,glass,leather,white].forEach(m=>m.dispose())}}
 }finally{decoder.dispose()}
}
