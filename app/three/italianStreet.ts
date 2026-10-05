import * as T from 'three'
import type {RoadAssets} from './roadAssets'
/** Seeded planting remains consistent when a road section wraps. */
export function treeLayout(section:number){
 const random=(key:number)=>{const v=Math.sin(key*127.1+section*311.7)*43758.5453;return v-Math.floor(v)}
 const count=3+section%2
 return Array.from({length:count},(_,i)=>({species:(section+i)%2,x:-34+i*(68/(count-1))+(random(i+1)-.5)*7,z:(i%2?-1:1)*(9+random(i+10)*7),scale:.8+random(i+20)*.4,rotation:random(i+30)*Math.PI*2,tint:new T.Color().setHSL(.23+random(i+40)*.05,.2,.78+random(i+60)*.1)}))
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


/** Roman countryside: low weathered boundaries and real trees, no house assets. */
export function createItalianStreet(parent:T.Group,assets:RoadAssets){
 const chunks=Array.from({length:6},(_,i)=>{const g=new T.Group();g.name='Roman countryside section '+i;parent.add(g);return g})
 const wallMaterial=masonryDetail(new T.MeshStandardMaterial({color:'#a17a58',roughness:1})),wallGeometry=new T.BoxGeometry(1,1,1),capMaterial=new T.MeshStandardMaterial({color:'#a29a82',roughness:1})
 for(const [section,chunk] of chunks.entries()){
  const walls=new T.InstancedMesh(wallGeometry,wallMaterial,4),caps=new T.InstancedMesh(wallGeometry,capMaterial,4),dummy=new T.Object3D()
  walls.name='Weathered low Roman brick boundaries';caps.name='Stone boundary coping'
  for(let i=0;i<4;i++){const side=i%2?1:-1,length=18+((section+i)%3)*5,height=.65+((section+i)%3)*.12;dummy.position.set(i<2?-22:23,height/2-.015,side*(7.1+(section%2)*.6));dummy.scale.set(length,height,.42);dummy.updateMatrix();walls.setMatrixAt(i,dummy.matrix);dummy.position.y=height;dummy.scale.set(length+.1,.12,.5);dummy.updateMatrix();caps.setMatrixAt(i,dummy.matrix)}
  for(const o of [walls,caps]){o.receiveShadow=true;o.computeBoundingSphere();chunk.add(o)}
 }
 // Distant hills use a continuous low-poly terrain, not upright horizon walls.
 const terrain=new T.PlaneGeometry(1200,480,80,48);terrain.rotateX(-Math.PI/2)
 const position=terrain.getAttribute('position');for(let i=0;i<position.count;i++){const x=position.getX(i),z=position.getZ(i),edge=T.MathUtils.smoothstep(Math.abs(z),18,120);position.setY(i,-.04+edge*(8+6*Math.sin(x*.017+z*.021)+5*Math.sin(x*.035-z*.012)))}terrain.computeVertexNormals()
 const grass=assets.texture('/textures/roman-grass-diff.webp',true),grassNormal=assets.texture('/textures/roman-grass-normal.webp');grass.map.repeat.set(240,96);grassNormal.map.repeat.copy(grass.map.repeat)
 const landscape=new T.Mesh(terrain,new T.MeshStandardMaterial({map:grass.map,normalMap:grassNormal.map,normalScale:new T.Vector2(.3,.3),color:'#a7ad82',roughness:1}));landscape.name='Continuous Roman countryside hills';landscape.receiveShadow=true;parent.add(landscape)
 let disposed=false
 const ready=Promise.all([assets.model('/models/italian-roadside-tree.glb'),assets.model('/models/italian-canopy-tree.glb')]).then(models=>{
  for(const [species,model] of models.entries()){
   const asset=model.scene;asset.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(asset),scale=(species?5.4:6)/(bounds.max.y-bounds.min.y)
   asset.traverse(o=>{if(disposed||!(o instanceof T.Mesh))return
    const distant=new T.InstancedMesh(o.geometry,o.material,6),distantPose=new T.Object3D()
    distant.name='Detailed distant Roman groves'
    for(let i=0;i<6;i++){const x=-160+i*62+species*21,z=(i%2?1:-1)*(40+(i%3)*10),edge=T.MathUtils.smoothstep(Math.abs(z),18,120),ground=-.04+edge*(8+6*Math.sin(x*.017+z*.021)+5*Math.sin(x*.035-z*.012)),treeScale=scale*(.9+(i%3)*.15);distantPose.position.set(x,ground-bounds.min.y*treeScale,z);distantPose.scale.setScalar(treeScale);distantPose.rotation.y=i*1.8;distantPose.updateMatrix();distant.setMatrixAt(i,distantPose.matrix.clone().multiply(o.matrixWorld))}distant.computeBoundingSphere();parent.add(distant)
    for(const [section,chunk] of chunks.entries()){
     const poses=treeLayout(section).filter(p=>p.species===species),instances=new T.InstancedMesh(o.geometry,o.material,poses.length),dummy=new T.Object3D();instances.name='Poly Haven Roman roadside trees';instances.castShadow=false;instances.receiveShadow=false
     poses.forEach((pose,i)=>{dummy.scale.setScalar(scale*pose.scale);dummy.rotation.y=pose.rotation;dummy.position.set(pose.x,-bounds.min.y*scale*pose.scale-.02,pose.z);dummy.updateMatrix();instances.setMatrixAt(i,dummy.matrix.clone().multiply(o.matrixWorld));instances.setColorAt(i,pose.tint)});instances.computeBoundingSphere();chunk.add(instances)
    }
   })
  }
 }).then(()=>Promise.all([grass.ready,grassNormal.ready]))
 function update(distance:number){chunks.forEach((chunk,i)=>{chunk.position.x=((i*80+distance+40)%480+480)%480-240})}
 update(0);return {ready,update,dispose(){disposed=true}}
}
