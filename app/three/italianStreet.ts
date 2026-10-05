import * as T from 'three'
import type {RoadAssets} from './roadAssets'
const smooth=(a:number,b:number,x:number)=>T.MathUtils.smoothstep(x,a,b)
/** Mild ground relief, periodic with the 480 m streaming loop. */
export function terrainHeight(x:number,z:number){const edge=smooth(5.7,10,Math.abs(z)),hill=smooth(10,55,Math.abs(z)),mound=(.5+.5*Math.sin(x*Math.PI/80+z*.043))**3;return -.025+edge*(.09+.12*Math.sin(x*Math.PI/30+z*.29)+.07*Math.sin(x*Math.PI/12-z*.21))+hill*(1.1+.7*Math.sin(x*Math.PI/240+z*.025)+.45*Math.sin(x*Math.PI/60-z*.032)+2.1*mound)}
export function forestLayout(section:number){const r=(key:number)=>{const v=Math.sin(section*311.7+key*91.3)*43758.5453;return v-Math.floor(v)},count=10+section%4;return Array.from({length:count},(_,i)=>{const group=i<Math.ceil(count*.7)?0:1,side=r(group+30)>.48?1:-1;return {species:Math.floor(r(i+40)*3),x:-30+group*42+(r(i+50)-.5)*27,z:side*(14+group*12+r(i+60)*13),scale:1.15+r(i+70)*.6,rotation:r(i+80)*Math.PI*2,tint:new T.Color().setHSL(.24,.20,.76+r(i+90)*.1)}})}
export function treeLayout(section:number){
 const random=(key:number)=>{const v=Math.sin(key*127.1+section*311.7)*43758.5453;return v-Math.floor(v)}
 const count=3+section%2
 return Array.from({length:count},(_,i)=>({species:(section+i)%3,x:-34+i*(68/(count-1))+(random(i+1)-.5)*7,z:(random(i+100)>.53?1:-1)*(9+random(i+10)*7),scale:.8+random(i+20)*.4,rotation:random(i+30)*Math.PI*2,tint:new T.Color().setHSL(.23+random(i+40)*.05,.2,.78+random(i+60)*.1)}))
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


/** Open rural landscape, sparse small ruins and instanced CC0 vegetation. */
export function createItalianStreet(parent:T.Group,assets:RoadAssets){
 const initialX=(i:number)=>((i*80+40)%480)-240
 const chunks=Array.from({length:6},(_,i)=>{const g=new T.Group();g.name='Roman countryside section '+i;parent.add(g);return g})
 const box=new T.BoxGeometry(1,1,1),brick=masonryDetail(new T.MeshStandardMaterial({color:'#96745b',roughness:1})),stoneMaterial=new T.MeshStandardMaterial({color:'#b2a992',roughness:1}),rockGeometry=new T.IcosahedronGeometry(1,1),rockMaterial=new T.MeshStandardMaterial({color:'#747365',roughness:1,flatShading:true})
 const random=(section:number,key:number)=>{const v=Math.sin(section*311.7+key*127.1)*43758.5453;return v-Math.floor(v)}
 for(const [section,chunk] of chunks.entries()){
  const blocks=new T.InstancedMesh(box,brick,12),rubble=new T.InstancedMesh(rockGeometry,rockMaterial,14),columns=new T.InstancedMesh(new T.CylinderGeometry(.28,.34,1,10),stoneMaterial,2),dummy=new T.Object3D()
  blocks.name='Small weathered Roman wall fragments';rubble.name='Irregular roadside stones';columns.name='Broken Roman column fragments'
  const centre=-18+random(section,2)*28,side=section%2?1:-1,z=side*(10+random(section,3)*5)
  for(let i=0;i<12;i++){const x=centre+(i%6)*.9,row=Math.floor(i/6),ground=terrainHeight(x+initialX(section),z);dummy.position.set(x,ground+.18+row*.34,z);dummy.scale.set(row&&i%3===0?.30:.86,row?.22+random(section,i+18)*.13:.34,.48);dummy.rotation.set(0,(random(section,i+20)-.5)*.06,row?(random(section,i+22)-.5)*.22:0);dummy.updateMatrix();blocks.setMatrixAt(i,dummy.matrix)}
  for(let i=0;i<14;i++){const x=-34+random(section,i+40)*68,rz=(i%2?1:-1)*(6.5+random(section,i+70)*8),scale=i%7===0?.45+random(section,i+90)*.4:.12+random(section,i+90)*.24;dummy.position.set(x,terrainHeight(x+initialX(section),rz)+scale*.3,rz);dummy.rotation.set(random(section,i+110),random(section,i+130)*6,random(section,i+150));dummy.scale.set(scale*1.4,scale*.7,scale);dummy.updateMatrix();rubble.setMatrixAt(i,dummy.matrix)}
  for(let i=0;i<2;i++){const x=centre+7+i*1.3,rz=z+side*1.5,ground=terrainHeight(x+initialX(section),rz);dummy.position.set(x,ground+(i?.25:.55),rz);dummy.scale.set(1,i?.9:1.1,1);dummy.rotation.set(i?Math.PI/2:0,section*.7,i?.2:0);dummy.updateMatrix();columns.setMatrixAt(i,dummy.matrix)}
  for(const mesh of [blocks,rubble,columns]){mesh.receiveShadow=true;mesh.castShadow=false;mesh.computeBoundingSphere();chunk.add(mesh)}
 }
 const terrain=new T.PlaneGeometry(600,360,120,90);terrain.rotateX(-Math.PI/2)
 const grass=assets.texture('/textures/roman-meadow-diff.webp',true),grassNormal=assets.texture('/textures/roman-meadow-normal.webp');grass.map.repeat.set(120,72);grassNormal.map.repeat.copy(grass.map.repeat)
 const uniforms={travel:{value:0}},material=new T.MeshStandardMaterial({map:grass.map,normalMap:grassNormal.map,normalScale:new T.Vector2(.3,.3),color:'#b4c5a3',roughness:1})
 const heightGLSL=`float groundHeight(float x,float z){float edge=smoothstep(5.7,10.,abs(z)),hill=smoothstep(10.,55.,abs(z));float mound=pow(.5+.5*sin(x*3.14159265359/80.+z*.043),3.);return -.025+edge*(.09+.12*sin(x*3.14159265359/30.+z*.29)+.07*sin(x*3.14159265359/12.-z*.21))+hill*(1.1+.7*sin(x*3.14159265359/240.+z*.025)+.45*sin(x*3.14159265359/60.-z*.032)+2.1*mound);}`

 material.onBeforeCompile=shader=>{shader.uniforms.groundTravel=uniforms.travel;shader.vertexShader='uniform float groundTravel;\n'+heightGLSL+'\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y=groundHeight(transformed.x-groundTravel,transformed.z);').replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
  float gx=position.x-groundTravel,gz=position.z;objectNormal=normalize(vec3((groundHeight(gx-.1,gz)-groundHeight(gx+.1,gz))/.2,1.,(groundHeight(gx,gz-.1)-groundHeight(gx,gz+.1))/.2));`)};material.customProgramCacheKey=()=> 'roman-low-relief-v2'
 const landscape=new T.Mesh(terrain,material);landscape.name='Continuous Roman countryside hills';landscape.receiveShadow=true;landscape.frustumCulled=false;parent.add(landscape)
 let disposed=false
 const models=['/models/italian-roadside-tree.glb','/models/italian-canopy-tree.glb','/models/roman-pine_tree_01.glb','/models/roman-shrub_01.glb','/models/roman-grass_medium_01.glb','/models/italian-roadside-tree-lod.glb','/models/italian-canopy-tree-lod.glb','/models/roman-pine_tree_01-lod.glb']
 const ready=Promise.all(models.map(url=>assets.model(url))).then(models=>{
  for(const [species,model] of models.entries()){
   const asset=model.scene;asset.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(asset),scale=[6,5.4,7.5,1.1,.4,6,5.4,7.5][species]!/(bounds.max.y-bounds.min.y)
   asset.traverse(o=>{if(disposed||!(o instanceof T.Mesh))return
    for(const [section,chunk] of chunks.entries()){
     let poses:{x:number,z:number,scale:number,rotation:number,tint:T.Color}[]=[]
     if(species<3){poses=treeLayout(section).filter(p=>p.species===species)}else if(species>=5){poses=forestLayout(section).filter(p=>p.species===species-5)}
     else{const count=species===3?12:30;poses=Array.from({length:count},(_,i)=>{const cluster=Math.floor(i/(species===3?3:5)),side=random(section,cluster+420)>.5?1:-1;return {x:-32+cluster*12+(random(section,i+250)-.5)*12,z:side*(7+random(section,cluster+280)*21+(random(section,i+300)-.5)*2),scale:.65+random(section,i+320)*.55,rotation:random(section,i+340)*Math.PI*2,tint:new T.Color().setHSL(.22+random(section,i+360)*.04,.18,.65+random(section,i+380)*.2)}})}
     if(!poses.length)continue
     const finishes=Array.isArray(o.material)?o.material:[o.material],foliage=(species<3||species>=5)&&finishes.some(m=>/leaves|twig/i.test(m.name)),layers=foliage?2:1
     const instances=new T.InstancedMesh(o.geometry,o.material,poses.length*layers),dummy=new T.Object3D();instances.name=species>=5?'Asymmetric distant groves with reduced geometry':species===2?'Detailed Roman roadside pines':species===3?'Clustered roadside shrubs':species===4?'Uneven verge grass clumps':'Poly Haven Roman roadside trees';instances.castShadow=false;instances.receiveShadow=false
     poses.forEach((pose,i)=>{for(let layer=0;layer<layers;layer++){const size=scale*pose.scale*(layer?.97:1);dummy.scale.set(size*(.92+(i%3)*.07),size,size);dummy.rotation.y=pose.rotation+layer*.19;dummy.position.set(pose.x,terrainHeight(pose.x+initialX(section),pose.z)-bounds.min.y*size,pose.z);dummy.updateMatrix();instances.setMatrixAt(i*layers+layer,dummy.matrix.clone().multiply(o.matrixWorld));instances.setColorAt(i*layers+layer,pose.tint)}});instances.computeBoundingSphere();chunk.add(instances)

    }
   })
  }
 }).then(()=>Promise.all([grass.ready,grassNormal.ready]))
 function update(distance:number){uniforms.travel.value=((distance%480)+480)%480;grass.map.offset.x=-distance/5%1;grassNormal.map.offset.x=grass.map.offset.x;chunks.forEach((chunk,i)=>{chunk.position.x=((i*80+distance+40)%480+480)%480-240})}
 update(0);return {ready,update,dispose(){disposed=true}}
}

