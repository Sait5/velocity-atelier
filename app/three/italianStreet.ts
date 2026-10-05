import * as T from 'three'
import type {RoadAssets} from './roadAssets'


/** Stable irregular layouts avoid popping when a streamed section wraps. */
export function treeLayout(section:number){
 const random=(key:number)=>{const value=Math.sin(key*127.1+section*311.7)*43758.5453;return value-Math.floor(value)}
 const count=2+section%2
 return Array.from({length:count},(_,i)=>({species:(section+i)%2,x:-35+i*(70/(count-1))+(random(i+1)-.5)*5,z:(i%2?-1:1)*(7.8+random(i+10)*2.2),scale:.78+random(i+20)*.32,rotation:random(i+30)*Math.PI*2,tint:new T.Color().setHSL(.24+random(i+40)*.04,.18+random(i+50)*.12,.76+random(i+60)*.1)}))
}
function masonryDetail(material:T.MeshStandardMaterial){
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 masonryPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   masonryPosition=transformed;
   #ifdef USE_INSTANCING
   masonryPosition=(instanceMatrix*vec4(transformed,1.)).xyz;
   #endif`)
  shader.fragmentShader='varying vec3 masonryPosition;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 brick=vec2(masonryPosition.x+masonryPosition.z,masonryPosition.y)/vec2(.30,.13);
   float row=floor(brick.y);brick.x+=mod(row,2.)*.5;
   vec2 seam=min(fract(brick),1.-fract(brick));vec2 aa=max(fwidth(brick),vec2(.008));
   float mortar=1.-smoothstep(.025,.025+aa.x,seam.x)*smoothstep(.04,.04+aa.y,seam.y);
   float variation=fract(sin(dot(floor(brick),vec2(12.9898,78.233)))*43758.5453);
   diffuseColor.rgb*=mix(.86+variation*.23,.62,mortar*.65);
  `)
 }
 material.customProgramCacheKey=()=> 'subtle-masonry-joints-v1'
 return material
}

/** CC0 Poly Haven models, shared across six streaming street sections. */
export function createItalianStreet(parent:T.Group,assets:RoadAssets){
 const chunks=Array.from({length:6},(_,i)=>{const chunk=new T.Group();chunk.name='Downloaded Italian street section '+i;parent.add(chunk);return chunk})
 const width=(variant:number)=>variant===0?.85:variant===2?1.05:1
 const orders=[[0,1,2],[2,0,1],[1,2,0],[0,2,1],[2,1,0],[1,0,2]]
 const housePose=(variant:number,side:number,section=0)=>new T.Vector3(-24+orders[(section+(side===1?2:0))%orders.length]!.indexOf(variant)*24,.255,side*(variant===0?18:19))
 const foundationGeometry=new T.BoxGeometry(1,1,1),foundationMaterial=masonryDetail(new T.MeshStandardMaterial({color:'#69665d',roughness:.95}))
 for(const [section,chunk] of chunks.entries()){const foundations=new T.InstancedMesh(foundationGeometry,foundationMaterial,6),dummy=new T.Object3D();foundations.name='Separate continuous building foundations';let i=0;for(const side of [-1,1])for(let variant=0;variant<3;variant++){dummy.position.copy(housePose(variant,side,section));dummy.position.y=.135;dummy.scale.set(12.7*width(variant),.30,9.7);dummy.updateMatrix();foundations.setMatrixAt(i++,dummy.matrix)}foundations.receiveShadow=true;foundations.computeBoundingSphere();chunk.add(foundations)}

 // Small street details stay instanced and travel with each existing section.
 const pipeGeometry=new T.CylinderGeometry(.045,.045,1,6),pipeMaterial=new T.MeshStandardMaterial({color:'#5e625e',metalness:.45,roughness:.6})
 for(const [section,chunk] of chunks.entries()){
  const pipes=new T.InstancedMesh(pipeGeometry,pipeMaterial,12),dummy=new T.Object3D();let index=0
  pipes.name='Facade rainwater downpipes'
  for(const side of [-1,1])for(let variant=0;variant<3;variant++)for(const edge of [-1,1]){
   const pos=housePose(variant,side,section),front=side*(Math.abs(pos.z)-4.95),height=(variant+1)*3.6+.5
   dummy.position.set(pos.x+edge*5.95*width(variant),.3+height/2,front+side*.15);dummy.scale.set(1,height,1);dummy.updateMatrix();pipes.setMatrixAt(index,dummy.matrix);index++
  }
  for(const mesh of [pipes]){mesh.receiveShadow=true;mesh.computeBoundingSphere();chunk.add(mesh)}
 }
 let disposed=false
 // Imported facade modules retain their closed caps; omit extra pitched roofs,
 // chimneys and roof textures to keep the moving street lightweight.
 const ready=Promise.all([assets.model('/models/italian-urban-facade.glb'),assets.model('/models/italian-roadside-tree.glb'),assets.model('/models/italian-canopy-tree.glb')]).then(([facade,tree,canopy])=>{
  const assets=[...facade.scenes.map((asset,variant)=>({asset,kind:'facade',variant})),{asset:tree.scene,kind:'tree',variant:0},{asset:canopy.scene,kind:'tree',variant:1}]
  for(const {asset,kind,variant} of assets){
   asset.updateMatrixWorld(true)
   const bounds=new T.Box3().setFromObject(asset),height=bounds.max.y-bounds.min.y,scale=kind==='tree'?(variant===1?4.8:5.2)/height:1
   const finishes=new Map<T.Material,T.Material>()
   asset.traverse(o=>{if(!(o instanceof T.Mesh))return
    if(disposed)return
    let instanceMaterials=o.material
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
    }return shaded};instanceMaterials=Array.isArray(o.material)?o.material.map(tint):tint(o.material)}
    for(const m of Array.isArray(instanceMaterials)?instanceMaterials:[instanceMaterials]){for(const v of Object.values(m))if(v instanceof T.Texture)v.anisotropy=12;const finish=m as T.MeshStandardMaterial;finish.envMapIntensity=.4;if(kind==='facade'){finish.side=T.FrontSide;if(m.name.endsWith('_glass')){finish.transparent=false;finish.opacity=1;finish.depthWrite=true;finish.roughness=.82;finish.metalness=0;finish.envMapIntensity=.08;finish.needsUpdate=true}}}
    for(const [section,chunk] of chunks.entries()){
     const layout=treeLayout(section).filter(p=>p.species===variant);const count=kind==='facade'?2:layout.length,instances=new T.InstancedMesh(geometry,instanceMaterials,count),dummy=new T.Object3D()
     instances.name=kind==='facade'?'Poly Haven detailed architectural modules':'Poly Haven detailed roadside trees';instances.receiveShadow=kind==='facade';instances.castShadow=kind==='facade'
     for(let i=0;i<count;i++){
            dummy.scale.setScalar(scale)
      if(kind==='facade'){const buildingSide=i===0?-1:1;dummy.rotation.y=buildingSide===1?Math.PI:0;dummy.scale.set(width(variant),1,1);dummy.position.copy(housePose(variant,buildingSide,section))}
      else{const pose=layout[i]!,treeScale=scale*pose.scale;dummy.scale.set(treeScale*(.94+(i%3)*.05),treeScale,treeScale);dummy.rotation.y=pose.rotation;dummy.position.set(pose.x,-bounds.min.y*treeScale+.14,pose.z);instances.setColorAt(i,pose.tint)}
      dummy.updateMatrix();instances.setMatrixAt(i,dummy.matrix.clone().multiply(o.matrixWorld))
     }
     instances.computeBoundingSphere();chunk.add(instances)
    }
   })
  }
 })
 function update(distance:number){chunks.forEach((chunk,i)=>{chunk.position.x=((i*80+distance+40)%480+480)%480-240})}
 update(0)
 return {ready,update,dispose(){disposed=true}}
}
