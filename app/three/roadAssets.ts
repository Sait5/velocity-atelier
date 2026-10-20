import * as T from 'three'
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js'
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js'

/** One source copy per driving scene; map instances are released on every switch. */
export function createRoadAssets(){
 const textures=new Map<string,{map:T.Texture,ready:Promise<void>}>(),models=new Map<string,Promise<GLTF>>()
 const owned=new Set<T.Texture|T.Material|T.BufferGeometry>(),loader=new T.TextureLoader(),gltfLoader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
 let disposed=false
 const release=(value:T.Texture|T.Material|T.BufferGeometry)=>value.dispose()
 function texture(url:string,color=false){let entry=textures.get(url);if(!entry){let yes:()=>void,no:(e:unknown)=>void;const ready=new Promise<void>((resolve,reject)=>{yes=resolve;no=reject});const map=loader.load(url,()=>{if(disposed)map.dispose();yes()},undefined,e=>no(e));map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=12;map.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;owned.add(map);entry={map,ready};textures.set(url,entry)}return entry}
 function model(url:string){let task=models.get(url);if(!task){task=(async()=>{
  const full=url.endsWith('-lod.glb')?await model(url.replace('-lod.glb','.glb')):undefined
  const asset=await gltfLoader.loadAsync(url),finishes=new Map<string,T.Material>()
  full?.scene.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])finishes.set(m.name,m)})
  for(const scene of asset.scenes)scene.traverse(o=>{if(o instanceof T.Mesh){owned.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){const original=finishes.get(m.name);for(const [key,value] of Object.entries(m)){if(value instanceof T.Texture){const same=original&&(original as unknown as Record<string,unknown>)[key];if(same instanceof T.Texture&&same!==value){(m as unknown as Record<string,unknown>)[key]=same;value.dispose()}}}owned.add(m);for(const v of Object.values(m))if(v instanceof T.Texture)owned.add(v)}}})
  if(disposed)owned.forEach(release);return asset
 })();models.set(url,task)}return task}


 return {texture,model,owns:(value:T.Texture|T.Material|T.BufferGeometry)=>owned.has(value),dispose(){disposed=true;owned.forEach(release);owned.clear();models.clear();textures.clear()}}
}
export type RoadAssets=ReturnType<typeof createRoadAssets>
