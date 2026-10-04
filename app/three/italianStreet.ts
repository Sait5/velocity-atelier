import * as T from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js'

/** CC0 Poly Haven models, shared across three streaming street sections. */
export function createItalianStreet(parent:T.Group){
 const chunks=Array.from({length:3},(_,i)=>{const chunk=new T.Group();chunk.name='Downloaded Italian street section '+i;parent.add(chunk);return chunk})
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
 let disposed=false
 const ready=Promise.all([loader.loadAsync('/models/italian-urban-facade.glb'),loader.loadAsync('/models/italian-roadside-tree.glb')]).then(([facade,tree])=>{
  const assets=[...facade.scenes.map((asset,variant)=>({asset,kind:'facade',variant})),{asset:tree.scene,kind:'tree',variant:0}]
  for(const {asset,kind,variant} of assets){
   asset.updateMatrixWorld(true)
   const bounds=new T.Box3().setFromObject(asset),height=bounds.max.y-bounds.min.y,scale=kind==='tree'?5.2/height:1
   const finishes=new Map<T.Material,T.Material>()
   asset.traverse(o=>{if(!(o instanceof T.Mesh))return
    if(disposed){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const v of Object.values(m))if(v instanceof T.Texture)v.dispose();m.dispose()}return}
    // Preserve dequantization in the instance matrix. Applying it to normalized
    // Int16 vertex buffers would wrap coordinates and collapse the imported mesh.
    const geometry=o.geometry
    if(kind==='facade'){const tint=(m:T.Material)=>{if(!m.name.endsWith('_plaster'))return m;let shaded=finishes.get(m);if(!shaded){shaded=m.clone();(shaded as T.MeshStandardMaterial).color.multiply(new T.Color(['#e1d8c9','#ffffff','#d1b396'][variant]!));finishes.set(m,shaded)}return shaded};o.material=Array.isArray(o.material)?o.material.map(tint):tint(o.material)}
    for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const v of Object.values(m))if(v instanceof T.Texture)v.anisotropy=12;(m as T.MeshStandardMaterial).envMapIntensity=.75}
    for(const chunk of chunks){
     const count=kind==='facade'?2:4,instances=new T.InstancedMesh(geometry,o.material,count),dummy=new T.Object3D()
     instances.name=kind==='facade'?'Poly Haven detailed architectural modules':'Poly Haven detailed roadside trees';instances.receiveShadow=true;instances.castShadow=kind==='facade'
     for(let i=0;i<count;i++){
      const side=i<2?-1:1,slot=i%2
      dummy.scale.setScalar(scale)
      if(kind==='facade'){const buildingSide=i===0?-1:1;dummy.rotation.y=buildingSide===1?Math.PI:0;dummy.scale.set(variant===0?.85:variant===2?1.05:1,1,1);dummy.position.set(-24+(buildingSide===1?2-variant:variant)*24,.14,buildingSide*(variant===0?18:19))}
      else{const treeScale=scale*(.88+i*.08);dummy.scale.setScalar(treeScale);dummy.rotation.y=i*1.7;dummy.position.set(slot?-37:3,-bounds.min.y*treeScale+.14,side*8.7)}
      dummy.updateMatrix();instances.setMatrixAt(i,dummy.matrix.clone().multiply(o.matrixWorld))
     }
     instances.computeBoundingSphere();chunk.add(instances)
    }
   })
  }
 })
 function update(distance:number){chunks.forEach((chunk,i)=>{chunk.position.x=((i*80+distance+40)%240+240)%240-120})}
 update(0)
 return {ready,update,dispose(){disposed=true}}
}
