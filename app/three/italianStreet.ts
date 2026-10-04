import * as T from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js'

/** CC0 Poly Haven models, shared across five streaming street sections. */
export function createItalianStreet(parent:T.Group){
 const chunks=Array.from({length:5},(_,i)=>{const chunk=new T.Group();chunk.name='Downloaded Italian street section '+i;parent.add(chunk);return chunk})
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
 const width=(variant:number)=>variant===0?.85:variant===2?1.05:1
 const housePose=(variant:number,side:number)=>new T.Vector3(-24+(side===1?2-variant:variant)*24,.255,side*(variant===0?18:19))
 const foundationGeometry=new T.BoxGeometry(1,1,1),foundationMaterial=new T.MeshStandardMaterial({color:'#777873',roughness:.95})
 for(const chunk of chunks){const foundations=new T.InstancedMesh(foundationGeometry,foundationMaterial,6),dummy=new T.Object3D();foundations.name='Separate continuous building foundations';let i=0;for(const side of [-1,1])for(let variant=0;variant<3;variant++){dummy.position.copy(housePose(variant,side));dummy.position.y=.115;dummy.scale.set(12.7*width(variant),.28,9.7);dummy.updateMatrix();foundations.setMatrixAt(i++,dummy.matrix)}foundations.receiveShadow=true;foundations.computeBoundingSphere();chunk.add(foundations)}
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
    if(kind==='facade'){const tint=(m:T.Material)=>{if(!m.name.endsWith('_plaster'))return m;let shaded=finishes.get(m);if(!shaded){
     shaded=m.clone();(shaded as T.MeshStandardMaterial).color.set(['#dfcba7','#b67858','#93977d'][variant]!)
     // Remove the baked orange hue, preserving the photographed plaster grain,
     // normal map and weathering so each finish has its own real albedo.
     shaded.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
      vec4 sampledDiffuseColor=texture2D(map,vMapUv);
      float plasterGrain=clamp(dot(sampledDiffuseColor.rgb,vec3(.2126,.7152,.0722))*2.6,.32,1.3);
      diffuseColor*=vec4(vec3(plasterGrain),sampledDiffuseColor.a);
     #endif`)}
     shaded.customProgramCacheKey=()=> 'italian-plaster-neutral-grain-v1';finishes.set(m,shaded)
    }return shaded};o.material=Array.isArray(o.material)?o.material.map(tint):tint(o.material)}
    for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const v of Object.values(m))if(v instanceof T.Texture)v.anisotropy=12;const finish=m as T.MeshStandardMaterial;finish.envMapIntensity=.4;if(kind==='facade'){finish.side=T.FrontSide;if(m.name.endsWith('_glass')){finish.transparent=false;finish.opacity=1;finish.depthWrite=true;finish.roughness=.4;finish.metalness=.12;finish.needsUpdate=true}}}
    for(const chunk of chunks){
     const count=kind==='facade'?2:4,instances=new T.InstancedMesh(geometry,o.material,count),dummy=new T.Object3D()
     instances.name=kind==='facade'?'Poly Haven detailed architectural modules':'Poly Haven detailed roadside trees';instances.receiveShadow=true;instances.castShadow=kind==='facade'
     for(let i=0;i<count;i++){
      const side=i<2?-1:1,slot=i%2
      dummy.scale.setScalar(scale)
      if(kind==='facade'){const buildingSide=i===0?-1:1;dummy.rotation.y=buildingSide===1?Math.PI:0;dummy.scale.set(width(variant),1,1);dummy.position.copy(housePose(variant,buildingSide))}
      else{const treeScale=scale*(.88+i*.08);dummy.scale.setScalar(treeScale);dummy.rotation.y=i*1.7;dummy.position.set(slot?-37:3,-bounds.min.y*treeScale+.14,side*8.7)}
      dummy.updateMatrix();instances.setMatrixAt(i,dummy.matrix.clone().multiply(o.matrixWorld))
     }
     instances.computeBoundingSphere();chunk.add(instances)
    }
   })
  }
 })
 function update(distance:number){chunks.forEach((chunk,i)=>{chunk.position.x=((i*80+distance+40)%400+400)%400-200})}
 update(0)
 return {ready,update,dispose(){disposed=true}}
}
