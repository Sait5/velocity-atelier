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
 const asset=await new GLTFLoader().setDRACOLoader(decoder).loadAsync('/models/ferrari-donor-interior.glb?v=donor-fit-1')
 installFittedAssemblies(root,doors,leather,asset.scene)
}
export function installFittedAssemblies(root:T.Group,doors:T.Group[],leather:T.Material,asset:T.Group){
 const rear=asset.getObjectByName('upgrade_rear'),seats=asset.getObjectByName('upgrade_seats')
 const cockpit=asset.getObjectByName('upgrade_cockpit')
 const replacements=doors.map((_,i)=>asset.getObjectByName(i===0?'upgrade_door_L':'upgrade_door_R'))
 if(!rear||!seats||!cockpit||replacements.some(o=>!o))throw new Error('Fitted interior assembly missing')
 root.updateMatrixWorld(true)
 const removed:T.Object3D[]=[]
 const detach=(o:T.Object3D|undefined)=>{if(o){o.removeFromParent();removed.push(o)}}
 // Clear the superseded interior only. Exterior paint, glass, grille and lights
 // retain their original triangles; donor roof and exterior panels are absent.
 const sourceInterior=new Set(['trim','plastic_gray','leather','interior_light','interior_dark','carpet','carbon_fibre_trim','carbon fibre','yellow_trim','blue'])
 const sourcePanels:T.Object3D[]=[]
 root.traverse(o=>{if(o instanceof T.Mesh&&sourceInterior.has(o.name))sourcePanels.push(o)
  else if(o instanceof T.Mesh&&['metal','chrome'].includes(o.name))removeGeometryParts(o,(a,b)=>{
   const c=a.clone().add(b).multiplyScalar(.5)
   return c.x> -1.21&&c.x<.58&&c.y>.12&&c.y<1.14&&Math.abs(c.z)<.82
  })
 });sourcePanels.forEach(detach)
 const superseded:T.Object3D[]=[];root.traverse(o=>{if(o.name.startsWith('steering_')||['cockpit_detail','dashboard_stitch','console_fitted_stitch','fitted_carpet_binding','closed_cabin','mounted_pedal_box'].includes(o.name))superseded.push(o)});superseded.forEach(detach)
 let carbon:T.Material|undefined
 asset.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=o.receiveShadow=true;if(!Array.isArray(o.material)){if(o.material.name==='Fitted upholstery')o.material=leather;else if(o.material.name==='Fitted carbon shell')o.material=carbon??=carbonMaterial();else if(o.material.name==='bump_leather_cp'&&leather instanceof T.MeshStandardMaterial){o.material.color=leather.color;o.material.metalness=0;o.material.roughness=.78}else if(o.material.name==='mottled'&&o.material instanceof T.MeshStandardMaterial){o.material.color.set('#222422');o.material.roughness=1}else if(o.material.name==='bump_stitchingA'&&o.material instanceof T.MeshStandardMaterial){o.material.color.set('#a6342a');o.material.metalness=0;o.material.roughness=.9}}}})
 detach(root.getObjectByName('rear_tailored_trim'))
 const belts:T.Object3D[]=[];root.traverse(o=>{if(o.name==='seatbelt_webbing')belts.push(o)});belts.forEach(detach)
 rear.removeFromParent();root.add(rear)
 detach(root.getObjectByName('seat_driver'));detach(root.getObjectByName('seat_passenger'));seats.removeFromParent();root.add(seats)
 cockpit.removeFromParent();root.add(cockpit)
 for(let i=0;i<doors.length;i++){
  const door=doors[i]!,replacement=replacements[i]!
  for(const child of [...door.children])if(!['body_door','chrome_door','interior_dark_door'].includes(child.name))detach(child)
  replacement.removeFromParent();replacement.position.set(0,0,0);door.add(replacement)
 }
 const liveGeometry=new Set<T.BufferGeometry>(),liveMaterials=new Set<T.Material>([leather]),liveTextures=new Set<T.Texture>()
 root.traverse(o=>{if(o instanceof T.Mesh){liveGeometry.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])liveMaterials.add(m)}})
 for(const m of liveMaterials)for(const v of Object.values(m))if(v instanceof T.Texture)liveTextures.add(v)
 const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>()
 removed.forEach(o=>o.traverse(child=>{if(child instanceof T.Mesh){geometries.add(child.geometry);for(const m of Array.isArray(child.material)?child.material:[child.material])materials.add(m)}}))
 geometries.forEach(g=>{if(!liveGeometry.has(g))g.dispose()});materials.forEach(m=>{if(!liveMaterials.has(m)){for(const v of Object.values(m))if(v instanceof T.Texture&&!liveTextures.has(v))v.dispose();m.dispose()}})
 root.updateMatrixWorld(true)
}

