import * as T from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js'
import {createVehicle} from './vehicle'
import {rigDoors} from './rigDoors'
export async function loadVehicle(shape:number,onProgress:(n:number)=>void){
 if(shape!==8)return createVehicle(shape)
 const decoder=new DRACOLoader().setDecoderPath('/draco/'),loader=new GLTFLoader().setDRACOLoader(decoder)
 try{const gltf=await new Promise<any>((resolve,reject)=>loader.load('/models/ferrari.glb',resolve,e=>{if(e.lengthComputable)onProgress(65+Math.round(e.loaded/e.total*20))},reject));const model=gltf.scene,root=new T.Group();model.rotation.y=Math.PI/2;root.add(model)
 const body=new T.MeshPhysicalMaterial({color:'#a2b368',metalness:.8,roughness:.25,clearcoat:1}),rim=new T.MeshStandardMaterial({color:'#b5b7ae',metalness:1,roughness:.3}),brake=new T.MeshStandardMaterial({color:'#d9e678'}),glass=new T.MeshPhysicalMaterial({color:'#161d1b',metalness:.25,roughness:.08,transparent:true,opacity:.72}),leather=new T.MeshStandardMaterial({color:'#191d19',roughness:.8}),white=new T.MeshStandardMaterial({color:'#f3fff2',emissive:'#eaffda',emissiveIntensity:2})
 const wheels:T.Group[]=[],spokes:T.Group[]=[]
 model.traverse((o:T.Object3D)=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;if(o.name==='body')o.material=body;else if(o.name.startsWith('rim_'))o.material=rim;else if(o.name==='glass')o.material=glass;else if(o.name==='brakes'||o.name==='brake')o.material=brake;else if(o.name==='leather')o.material=leather;else if(o.name==='leds')o.material=white;else if(o.name.startsWith('tire')){o.material=new T.MeshStandardMaterial({color:'#080909',metalness:0,roughness:.95,envMapIntensity:.05})}else if(['trim','grills','carpet','carbon_fibre_trim','carbon_fibre','interior_dark','interior_light','wipers','steering_carbon','steering_leather'].includes(o.name))o.material=new T.MeshStandardMaterial({color:'#121613',metalness:.15,roughness:.65,envMapIntensity:.2})}if(o.name.startsWith('wheel_'))wheels.push(o as T.Group)})
 root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root);const center=bounds.getCenter(new T.Vector3());model.position.x-=center.x;model.position.z-=center.z;model.position.y-=bounds.min.y
 body.envMapIntensity=.65;rim.envMapIntensity=.6;const doors=rigDoors(root,body)
 return {root,body,rim,brake,glass,leather,white,doors,wheels,spokes,dispose(){const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();root.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m))}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());[body,rim,brake,glass,leather,white].forEach(m=>m.dispose())}}
 }finally{decoder.dispose()}
}
