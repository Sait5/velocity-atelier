import * as T from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import type {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js'
import {removeGeometryParts} from './geometryParts'

function carbonMaterial(){
 const size=64,pixels=new Uint8Array(size*size*4)
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+y)%size,v=(y-x+size)%size,horizontal=(Math.floor(u/8)+Math.floor(v/8))%2===0
  const strand=(horizontal?v:u)%8,light=.65+.35*Math.sin((strand+.5)/8*Math.PI),value=Math.round((horizontal?70:56)*light)
  const i=(y*size+x)*4;pixels[i]=value;pixels[i+1]=value+2;pixels[i+2]=value+1;pixels[i+3]=255
 }
 const weave=new T.DataTexture(pixels,size,size);weave.colorSpace=T.SRGBColorSpace;weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(75,75);weave.magFilter=T.LinearFilter;weave.minFilter=T.LinearMipmapLinearFilter;weave.generateMipmaps=true;weave.anisotropy=8;weave.needsUpdate=true
 const mat=new T.MeshPhysicalMaterial({name:'Fitted carbon shell',color:'#babfba',map:weave,bumpMap:weave,bumpScale:.00025,roughness:.49,metalness:.12,clearcoat:.22,clearcoatRoughness:.35});return mat
}

/** Authored and checked in Blender, with the original door pivots and body silhouette. */
export async function installFittedInterior(root:T.Group,doors:T.Group[],leather:T.Material,decoder:DRACOLoader){
 const asset=await new GLTFLoader().setDRACOLoader(decoder).loadAsync('/models/ferrari-carbon-interior.glb?v=interior-reference-4')
 installFittedAssemblies(root,doors,leather,asset.scene)
}
export function installFittedAssemblies(root:T.Group,doors:T.Group[],leather:T.Material,asset:T.Group){
 const rear=asset.getObjectByName('upgrade_rear'),seats=asset.getObjectByName('upgrade_seats')
 const replacements=doors.map((_,i)=>asset.getObjectByName(i===0?'upgrade_door_L':'upgrade_door_R'))
 if(!rear||!seats||replacements.some(o=>!o))throw new Error('Fitted interior assembly missing')
 // Remove the old rollbar lining where the authored closed return replaces it.
 root.updateMatrixWorld(true)
 // Superseded source belt clips were loose in front of the replacement rear panels.
 root.traverse(o=>{if(o instanceof T.Mesh&&['interior_light','interior_dark','chrome'].includes(o.name))removeGeometryParts(o,(a,b)=>a.x>.35&&b.x<.46&&a.y>.48&&b.y<.80&&Math.abs((a.z+b.z)/2)>.48&&Math.abs((a.z+b.z)/2)<.67)})
 root.traverse(o=>{if(!(o instanceof T.Mesh)||!['interior_light','interior_dark'].includes(o.name))return
  const g=o.geometry,p=g.getAttribute('position'),kept:number[]=[],a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3()
  const total=g.index?.count||p.count
  for(let i=0;i<total;i+=3){const ids=[0,1,2].map(k=>g.index?g.index.getX(i+k):i+k)
   a.fromBufferAttribute(p,ids[0]!).applyMatrix4(o.matrixWorld);b.fromBufferAttribute(p,ids[1]!).applyMatrix4(o.matrixWorld);c.fromBufferAttribute(p,ids[2]!).applyMatrix4(o.matrixWorld);a.add(b).add(c).multiplyScalar(1/3)
   if(a.x>.38&&a.x<.78&&a.y>.88&&Math.abs(a.z)<.85)continue
   kept.push(...ids)
  }
  if(kept.length!==total){const replacement=g.clone();replacement.setIndex(kept);replacement.clearGroups();o.geometry=replacement;g.dispose()}
 })
 const removed:T.Object3D[]=[]
 const detach=(o:T.Object3D|undefined)=>{if(o){o.removeFromParent();removed.push(o)}}
 let carbon:T.Material|undefined
 asset.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=o.receiveShadow=true;if(!Array.isArray(o.material)){if(o.material.name==='Fitted upholstery')o.material=leather;else if(o.material.name==='Fitted carbon shell')o.material=carbon??=carbonMaterial()}}})
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

