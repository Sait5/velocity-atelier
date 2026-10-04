import * as T from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js'

/** CC0 Poly Haven models, shared across three streaming street sections. */
export function createItalianStreet(parent:T.Group){
 const chunks=Array.from({length:3},(_,i)=>{const chunk=new T.Group();chunk.name='Downloaded Italian street section '+i;parent.add(chunk);return chunk})
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
 let disposed=false
 const ready=Promise.all([loader.loadAsync('/models/italian-urban-facade.glb'),loader.loadAsync('/models/italian-roadside-tree.glb')]).then(([facade,tree])=>{
  for(const [asset,kind] of [[facade.scene,'facade'],[tree.scene,'tree']] as const){
   asset.updateMatrixWorld(true)
   const bounds=new T.Box3().setFromObject(asset),height=bounds.max.y-bounds.min.y,scale=kind==='tree'?5.2/height:1
   asset.traverse(o=>{if(!(o instanceof T.Mesh))return
    if(disposed){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const v of Object.values(m))if(v instanceof T.Texture)v.dispose();m.dispose()}return}
    // Preserve dequantization in the instance matrix. Applying it to normalized
    // Int16 vertex buffers would wrap coordinates and collapse the imported mesh.
    const geometry=o.geometry
    for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const v of Object.values(m))if(v instanceof T.Texture)v.anisotropy=12;(m as T.MeshStandardMaterial).envMapIntensity=.75}
    for(const chunk of chunks){
     const instances=new T.InstancedMesh(geometry,o.material,kind==='facade'?4:4),dummy=new T.Object3D()
     instances.name=kind==='facade'?'Poly Haven detailed architectural modules':'Poly Haven detailed roadside trees';instances.receiveShadow=true;instances.castShadow=kind==='facade'
     for(let i=0;i<4;i++){
      const side=i<2?-1:1,slot=i%2
      dummy.scale.setScalar(scale)
      if(kind==='facade'){dummy.rotation.y=side===1?Math.PI:0;dummy.position.set(slot?-20:20,.14,side*19)}
      else{dummy.rotation.y=i*1.7;dummy.position.set(slot?-37:3,-bounds.min.y*scale+.14,side*8.7)}
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
