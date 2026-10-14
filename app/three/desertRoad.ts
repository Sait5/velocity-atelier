import * as T from 'three'
import {createRoadAssets} from './roadAssets'
import meta from './desertMeta.json'
import {createDesertSurface} from './desertSurface'

/** The Blender desert, shared plant instances and one continuous straight driving surface. */
export function createDesertRoad(scene:T.Scene){
 const assets=createRoadAssets(),land=new T.Group(),surface=new T.Group(),instances:T.InstancedMesh[]=[]
 land.rotation.y=surface.rotation.y=-Math.PI/2;land.name='Desert terrain and original plants';surface.name='Continuous desert road';scene.add(land,surface)
 const asphalt=assets.texture('/textures/asphalt_01_diff_4k.jpg',true),normal=assets.texture('/textures/asphalt_01_nor_gl_2k.jpg'),rough=assets.texture('/textures/asphalt_01_rough_2k.jpg'),sand=assets.texture('/textures/sand_01_diff_4k.jpg',true),sandNormal=assets.texture('/textures/sand_01_nor_gl_2k.jpg'),sandRough=assets.texture('/textures/sand_01_rough_2k.jpg')
 asphalt.map.repeat.set(2.87,66.67);normal.map.repeat.copy(asphalt.map.repeat);rough.map.repeat.copy(asphalt.map.repeat)
 const roadMaterial=new T.MeshStandardMaterial({map:asphalt.map,normalMap:normal.map,roughnessMap:rough.map,normalScale:new T.Vector2(.42,.42),roughness:.84,metalness:0,color:'#b8b7b0'})
 const travel={value:0},edgeSand={value:sand.map},terrainShift={value:0}
 roadMaterial.onBeforeCompile=shader=>{
  shader.uniforms.desertSand=edgeSand;shader.uniforms.desertTravel=travel;shader.uniforms.desertSandTint={value:new T.Color('#fff5e4')}
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 desertPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\ndesertPosition=position;')
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 desertPosition;uniform sampler2D desertSand;uniform float desertTravel;uniform vec3 desertSandTint;
float dh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float dn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(dh(i),dh(i+vec2(1.,0.)),f.x),mix(dh(i+vec2(0.,1.)),dh(i+vec2(1.)),f.x),f.y);}`)
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
vec2 dp=vec2(desertPosition.x,desertPosition.y-desertTravel);
float margin=mix(3.25,2.9,step(0.,dp.x))+dn(vec2(dp.y*.13,dp.x*.4))*0.4;
float edge=smoothstep(margin,4.22,abs(dp.x)+dn(dp*vec2(.65,.23)+vec2(7.,21.))*.22);
float drift=smoothstep(.73,.91,dn(dp*vec2(.31,.09)+vec2(23.,-17.)))*.24;
vec2 dustUV=vec2(dp.x/1.25,1.-dp.y*.8);
vec3 dust=texture2D(desertSand,dustUV).rgb*desertSandTint;
float phase=(dustUV.y-1.)*.09817477;
float variation=sin(dustUV.x*.27+sin(phase*2.))*sin(phase+.8);
float mineral=dn(vec2(dustUV.x*.7+sin(phase),sin(phase)*3.));
dust*=mix(vec3(.96,.90,.82),vec3(1.07,1.01,.94),clamp(variation*.18+mineral*.2+.4,0.,1.));
diffuseColor.rgb=mix(diffuseColor.rgb,dust,clamp(edge+drift,0.,1.));`)
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
vec2 roadGrain=vec2(desertPosition.x,desertPosition.y-desertTravel);
float worn=dn(roadGrain*vec2(.8,.17));
roughnessFactor=clamp(roughnessFactor+(worn-.5)*.12,.65,1.);`)
 }
 roadMaterial.customProgramCacheKey=()=>'desert-asphalt-dust-roughness-v2'
 function grade(y:number){
  const profile=meta.heightProfile,n=profile.length,t=(((y+meta.period/2)%meta.period)+meta.period)%meta.period/meta.period*n,i=Math.floor(t),f=t-i
  const a=profile[(i-1+n)%n]!,b=profile[i%n]!,c=profile[(i+1)%n]!,d=profile[(i+2)%n]!
  return .5*((2*b)+(-a+c)*f+(2*a-5*b+4*c-d)*f*f+(-a+3*b-3*c+d)*f*f*f)
 }
 const roadLevel=meta.heightProfile.reduce((sum,h)=>sum+h,0)/meta.heightProfile.length
 // Small, shared contact patches supplement the sun shadow without another shadow pass.
 const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=64
 const contactContext=contactCanvas.getContext('2d')!,contactGradient=contactContext.createRadialGradient(32,32,2,32,32,31)
 contactGradient.addColorStop(0,'rgba(12,9,6,.55)');contactGradient.addColorStop(.4,'rgba(12,9,6,.24)');contactGradient.addColorStop(1,'rgba(12,9,6,0)');contactContext.fillStyle=contactGradient;contactContext.fillRect(0,0,64,64)
 const contactTexture=new T.CanvasTexture(contactCanvas),contactGeometry=new T.PlaneGeometry(.72,.48),contactMaterial=new T.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false,opacity:.55,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})
 const contactGroup=new T.Group();contactGroup.name='Desert tyre contact shadows';scene.add(contactGroup)
 const contactPatches=Array.from({length:4},()=>{const patch=new T.Mesh(contactGeometry,contactMaterial);patch.rotation.x=-Math.PI/2;patch.visible=false;contactGroup.add(patch);return patch})
 function flattenOffset(x:number,y:number){const t=T.MathUtils.clamp((Math.abs(x)-4.4)/8,0,1),fade=t*t*(3-2*t);return (grade(y)-roadLevel)*(1-fade)}
 function hillOffset(x:number,y:number){
  const shoulder=T.MathUtils.smoothstep(Math.abs(x),6,20),phase=2*Math.PI*y/meta.period
  // Independent rhythms on each side, periodic at the repeated section boundary.
  return shoulder*(x<0?3.2*Math.sin(phase+.6)+1.5*Math.sin(phase*3+1.8):1.9*Math.sin(phase*2+2.3)-2.2*Math.cos(phase*3+.4))
 }
 const period=meta.period*.5
 function compactX(x:number){return Math.sign(x)*(Math.min(Math.abs(x),4.4)+Math.max(0,Math.abs(x)-4.4)*.25)}
 function compactHeight(y:number){return roadLevel+(y-roadLevel)*.6}
 const roadGeometry=new T.PlaneGeometry(8.6,200),road=new T.Mesh(roadGeometry,roadMaterial);road.rotation.x=-Math.PI/2;road.position.y=roadLevel+.007;road.receiveShadow=true;surface.add(road)
 const edgeGeometries:T.BufferGeometry[]=[],shoulderMaterials:T.Material[]=[]
 const basis=new T.Matrix4().makeRotationX(-Math.PI/2),inverse=basis.clone().invert();let alive=true
 let terrainHeight:((x:number,z:number)=>number)|undefined,cameraLift=0,lastCamera=0
 const ready=(async()=>{
  await Promise.all([asphalt.ready,normal.ready,rough.ready,sand.ready,sandNormal.ready,sandRough.ready])
  const terrain=await assets.model('/models/desert/terrain.glb');if(!alive)return
  terrain.scene.updateMatrixWorld(true)
  const edgeSamples=[new Float32Array(321),new Float32Array(321)]
  const edgeNormals=[new Float32Array(321*3),new Float32Array(321*3)]
  let sandMaterial:T.Material|undefined
  function shoulderHeight(x:number,z:number,h:number){
   const side=x>0?1:0,t=T.MathUtils.clamp((Math.abs(x)-24)/32,0,1),phase=2*Math.PI*z/meta.period,blend=t*t*(3-2*t)
   const crest=roadLevel+(side?5.3+1.5*Math.sin(phase+.9)+.7*Math.sin(phase*3+2.1)+.35*Math.cos(phase*7+.4):4.8+.9*Math.sin(phase+2.4)+.45*Math.cos(phase*2+.2)+.28*Math.sin(phase*5+1.9))
   const wash=.35*Math.pow(.5+.5*Math.sin(phase*5+t*2+side*1.7),8)*Math.sin(t*Math.PI)+.3*Math.pow(.5+.5*Math.cos(phase*3+t*3+side*2.2),6)*Math.sin(t*Math.PI)
   return h*(1-blend)+crest*blend+Math.sin(t*Math.PI)*(side?1.1:.45)*Math.sin(phase*(side?3:2)+side*1.3)-wash
  }
  terrain.scene.traverse(o=>{if(o instanceof T.Mesh){
   const original=o.geometry.attributes.position!,originalUV=o.geometry.attributes.uv,field=createDesertSurface(),inverseWorld=o.matrixWorld.clone().invert(),v=new T.Vector3()
   for(let i=0;i<original.count;i++){
    v.fromBufferAttribute(original,i).applyMatrix4(o.matrixWorld);v.y+=hillOffset(v.x,-v.z)-flattenOffset(v.x,-v.z)
    field.sample(v.x,v.z,v.y,originalUV?.getX(i)??v.x/2.5,originalUV?.getY(i)??-v.z/2.5)
   }
   const grid=field.finish(),positions:number[]=[],uvs:number[]=[],indices:number[]=[]
   for(let row=0;row<grid.rows;row++)for(let col=0;col<grid.columns;col++){
    const x=-grid.width+col*grid.step,z=-grid.depth+row*grid.step,i=row*grid.columns+col,blend=T.MathUtils.smoothstep(Math.abs(x),4.4,6),phase=2*Math.PI*z/meta.period
    const relief=Math.max(-.2,grid.height[i]!-roadLevel)
    const crest=x<0?2.2+.65*Math.sin(phase+1.1)+.3*Math.cos(phase*3+.4)+.25*Math.sin(phase*7+2.1):4.4+1.9*Math.sin(phase+.6)+.8*Math.cos(phase*3+2.2)+.4*Math.cos(phase*5+.7)
    const terrace=.75+.25*T.MathUtils.smoothstep(Math.abs(x),9+2*Math.sin(phase+(x<0?1:3)),18)
    const wash=.45*Math.pow(.5+.5*Math.sin(phase*5+x*.09+(x<0?1.2:3.1)),10)*T.MathUtils.smoothstep(Math.abs(x),7,15)
    const hollow=.32*Math.pow(.5+.5*Math.cos(phase*3+x*.22+(x<0?.4:2.7)),6)*T.MathUtils.smoothstep(Math.abs(x),6,11)
    const dune=.18*Math.sin(x*.47+Math.sin(phase*4+.9))*Math.cos(phase*6+(x<0?1.2:2.8))*T.MathUtils.smoothstep(Math.abs(x),6,12)
    const windward=.12*Math.sin(x*.21+phase*2+(x<0?.8:2.5))*T.MathUtils.smoothstep(Math.abs(x),6,16)
    const height=crest*Math.tanh(relief/(x<0?4:6))*terrace+.22*Math.sin(x*.31+Math.sin(phase*2+.8))*Math.sin(phase+1.7)*T.MathUtils.smoothstep(Math.abs(x),7,18)-wash-hollow+dune+windward
    grid.height[i]=T.MathUtils.lerp(roadLevel-.06,roadLevel+height,blend)
   }
   terrainHeight=(x,z)=>{
    const col=T.MathUtils.clamp((x+grid.width)/grid.step,0,grid.columns-1),row=T.MathUtils.clamp((z+grid.depth)/grid.step,0,grid.rows-1),a=Math.floor(col),b=Math.floor(row),c=Math.min(a+1,grid.columns-1),d=Math.min(b+1,grid.rows-1)
    const h=T.MathUtils.lerp(T.MathUtils.lerp(grid.height[b*grid.columns+a]!,grid.height[b*grid.columns+c]!,col-a),T.MathUtils.lerp(grid.height[d*grid.columns+a]!,grid.height[d*grid.columns+c]!,col-a),row-b)
    return Math.abs(x)>24?shoulderHeight(x,z,h):h
   }
   for(let row=0;row<grid.rows;row++)for(let col=0;col<grid.columns;col++){
    const i=row*grid.columns+col,x=-grid.width+col*grid.step,z=-grid.depth+row*grid.step
    v.set(compactX(x),compactHeight(grid.height[i]!),z*.5).applyMatrix4(inverseWorld);positions.push(v.x,v.y,v.z);uvs.push(compactX(x)/1.25,1-z/2.5)
    if(col===0||col===grid.columns-1)edgeSamples[col===0?0:1]![row]=grid.height[i]!
    if(row<grid.rows-1&&col<grid.columns-1){const a=i,b=a+1,c=a+grid.columns,d=c+1;indices.push(a,c,b,b,c,d)}
   }
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.computeBoundingBox();edgeGeometries.push(geometry);o.geometry=geometry
   const normalMatrix=new T.Matrix3().getNormalMatrix(o.matrixWorld),normals=geometry.attributes.normal!
   for(let side=0;side<2;side++)for(let row=0;row<grid.rows;row++){
    v.fromBufferAttribute(normals,row*grid.columns+(side?grid.columns-1:0)).applyNormalMatrix(normalMatrix);edgeNormals[side]!.set([v.x,v.y,v.z],row*3)
   }
   o.receiveShadow=true;o.castShadow=true;sandMaterial=Array.isArray(o.material)?o.material[0]:o.material
   for(const material of Array.isArray(o.material)?o.material:[o.material])if(material instanceof T.MeshStandardMaterial){
    material.map=sand.map;material.normalMap=sandNormal.map;material.roughnessMap=sandRough.map;material.aoMap=null;material.color.set('#fff5e4');material.normalScale.set(.45,.45);material.roughness=1;material.needsUpdate=true
    if(material.map)edgeSand.value=material.map
    material.onBeforeCompile=shader=>{
     shader.uniforms.sandTerrainShift=terrainShift
     shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 sandUV; varying float sandElevation; varying vec3 sandPosition; varying vec3 sandSurfaceNormal; uniform float sandTerrainShift;').replace('#include <begin_vertex>','#include <begin_vertex>\nsandUV=uv; sandPosition=(modelMatrix*vec4(position,1.)).xyz; sandPosition.x-=sandTerrainShift; sandElevation=sandPosition.y; sandSurfaceNormal=normalize(mat3(modelMatrix)*normal);')
     shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec2 sandUV; varying float sandElevation; varying vec3 sandPosition; varying vec3 sandSurfaceNormal;
float sandHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float sandNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(sandHash(i),sandHash(i+vec2(1.,0.)),f.x),mix(sandHash(i+vec2(0.,1.)),sandHash(i+vec2(1.)),f.x),f.y);}`)
     shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
vec3 sandWeights=pow(abs(normalize(sandSurfaceNormal)),vec3(4.));sandWeights/=max(dot(sandWeights,vec3(1.)),.0001);
vec4 sandSample=texture2D(map,vec2(sandPosition.y/1.25,1.+sandPosition.x/1.25))*sandWeights.z
+texture2D(map,vec2(sandPosition.z/1.25,1.+sandPosition.x/1.25))*sandWeights.y
+texture2D(map,vec2(sandPosition.z/1.25,sandPosition.y/1.25))*sandWeights.x;
diffuseColor*=sandSample;
float terrainPhase=(sandUV.y-1.)*.09817477;
float variation=sin(sandUV.x*.27+sin(terrainPhase*2.))*sin(terrainPhase+.8);
float mineral=sandNoise(vec2(sandUV.x*.7+sin(terrainPhase),sin(terrainPhase)*3.));
float grain=sandNoise(sandUV*90.);
float grainFade=1.-smoothstep(.025,.12,length(fwidth(sandUV)));
diffuseColor.rgb*=mix(vec3(.96,.90,.82),vec3(1.07,1.01,.94),clamp(variation*.18+mineral*.2+.4,0.,1.));
diffuseColor.rgb*=1.+(grain-.5)*.075*grainFade;`)
     shader.fragmentShader=shader.fragmentShader.replace('diffuseColor.rgb*=1.+(grain-.5)*.075*grainFade;',`diffuseColor.rgb*=1.+(grain-.5)*.075*grainFade;
float drySand=smoothstep(${(roadLevel+.1).toFixed(4)},${(roadLevel+2.5).toFixed(4)},sandElevation);
diffuseColor.rgb*=mix(vec3(.96,.93,.89),vec3(1.025,1.02,1.005),drySand);`)
     shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
float ripplePhase=(sandUV.y-1.)*.09817477;
float rippleFade=1.-smoothstep(.025,.10,length(fwidth(sandUV)));
float ripplePatch=smoothstep(.45,.7,sandNoise(vec2(sandUV.x*.5,sin(ripplePhase)*4.)));
float sandRipple=.0007*sin(sandUV.x*76.+sin(ripplePhase*32.)*.8)*ripplePatch*rippleFade*(1.-smoothstep(6.,14.,length(vViewPosition)));
vec3 sandDx=dFdx(-vViewPosition),sandDy=dFdy(-vViewPosition);
vec3 sandRx=cross(sandDy,normal),sandRy=cross(normal,sandDx);
float sandDet=dot(sandDx,sandRx);
normal=normalize(normal-sign(sandDet)*(dFdx(sandRipple)*sandRx+dFdy(sandRipple)*sandRy)/max(abs(sandDet),.00001));`)
     shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
roughnessFactor=clamp(roughnessFactor+(sandNoise(sandUV*3.)-.5)*.06,.82,1.);`)
    }
    material.customProgramCacheKey=()=>'desert-sand-new-pbr-v6'
    for(const value of Object.values(material))if(value instanceof T.Texture){value.anisotropy=12;value.minFilter=T.LinearMipmapLinearFilter;value.magFilter=T.LinearFilter;value.generateMipmaps=true;value.needsUpdate=true}
   }
  }})
  // Extend the cut source boundary into broad, textured sand slopes rather than exposed walls.
  const shoulders=new T.Group()
  if(sandMaterial)for(let side=0;side<2;side++){
   const positions:number[]=[],uvs:number[]=[],indices:number[]=[],edge=side?24:-24,direction=side?1:-1
   for(let row=0;row<=320;row++)for(let col=0;col<=24;col++){
    const t=col/24,x=edge+direction*t*32,z=-80+row*.5,height=shoulderHeight(x,z,edgeSamples[side]![row]!)
    positions.push(compactX(x),compactHeight(height),z*.5);uvs.push(compactX(x)/1.25,1-z/2.5)
   }
   for(let row=0;row<320;row++)for(let col=0;col<24;col++){const a=row*25+col,b=a+1,c=a+25,d=c+1;if(side)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c)}
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();edgeGeometries.push(geometry)
   const normals=geometry.attributes.normal!;for(let row=0;row<=320;row++)normals.setXYZ(row*25,edgeNormals[side]![row*3]!,edgeNormals[side]![row*3+1]!,edgeNormals[side]![row*3+2]!)
   normals.needsUpdate=true
   const material=sandMaterial.clone();material.onBeforeCompile=sandMaterial.onBeforeCompile;material.customProgramCacheKey=sandMaterial.customProgramCacheKey;material.side=T.DoubleSide;shoulderMaterials.push(material);const shoulder=new T.Mesh(geometry,material);shoulder.castShadow=shoulder.receiveShadow=true;shoulders.add(shoulder)
  }
  // Replace a few roadside shrubs with the source Opuntia; keep sparse, irregular placement.
  const cactusExtra:T.Matrix4[]=[],cactus=meta.prototypes.find(p=>p.name.includes('Opuntia'))
  const cactusBase=cactus?.matrices[0]
  if(cactusBase)for(const [index,rows] of meta.prototypes[0]!.matrices.entries()){
   const x=rows[0]![3]!,y=rows[1]![3]!
   if(index%3===0&&Math.abs(x)>7&&Math.abs(x)<27){
    const m=new T.Matrix4().set(...cactusBase.flat() as [number,number,number,number,number,number,number,number,number,number,number,number,number,number,number,number]);m.setPosition(x,y,rows[2]![3]!);cactusExtra.push(m)
   }
  }
  for(const z of [-period,0,period]){const copy=terrain.scene.clone(true);copy.position.z=z;land.add(copy);const skirt=shoulders.clone();skirt.position.z=z;land.add(skirt)}
  const fillShrubs=new Set<number[][]>(),occupied=new Set<string>(),candidates=new Map<string,number[][]>()
  const cell=(r:number[][])=>Math.floor(r[0]![3]!/22)+':'+Math.floor(r[1]![3]!/25)
  for(const p of meta.prototypes)if(/Bush 4|Rhazya|creosote/.test(p.name))for(const [i,r] of p.matrices.entries()){
   if(Math.abs(r[0]![3]!)>50)continue
   if(((i*73+19)%101)<35)occupied.add(cell(r));else if(!candidates.has(cell(r)))candidates.set(cell(r),r)
  }
  const extraCells=new Set([...candidates.keys()].filter(key=>!occupied.has(key)))
  for(const p of meta.prototypes)if(/Bush 4|Rhazya|creosote/.test(p.name))for(const r of p.matrices){const key=cell(r);if(extraCells.has(key)&&candidates.get(key)===r){fillShrubs.add(r);extraCells.delete(key)}}
  const planted:T.Vector2[]=[]
  for(const prototype of meta.prototypes){
   if(!alive)return
   // No vegetation: keep only the size-filtered small stones.
   if(!prototype.name.includes('stone'))continue
   const detailed=/plant-(0|2|6|7)\.glb$/.test(prototype.url)
   const source=await assets.model(prototype.url);source.scene.updateMatrixWorld(true)
   const medium=detailed?await assets.model(prototype.url.replace('.glb','-near.glb')):source;medium.scene.updateMatrixWorld(true)
   const far=detailed?await assets.model(prototype.url.replace('.glb',/plant-(0|2)\.glb$/.test(prototype.url)?'-near.glb':'-far.glb')):source;far.scene.updateMatrixWorld(true)
   const adjusted=new Set<T.Material>()
   source.scene.traverse(o=>{if(o instanceof T.Mesh)for(const material of Array.isArray(o.material)?o.material:[o.material]){
    if(material instanceof T.MeshStandardMaterial&&!adjusted.has(material)){adjusted.add(material)
     const stone=prototype.name.includes('stone');material.color.multiply(new T.Color(stone?'#6b5139':prototype.name.includes('Bush 4')?'#e0d4b4':'#e0d9bc'));material.roughness=stone?1:Math.max(material.roughness,.85);material.envMapIntensity=stone?0:.5;
     if(!stone){material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
float foliageLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
diffuseColor.rgb=mix(vec3(foliageLuma),diffuseColor.rgb,.72);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.14,.12,.08),.08);`);shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`outgoingLight+=vec3(.018,.022,.010)/(1.+foliageLuma*4.);\n#include <opaque_fragment>`)};material.customProgramCacheKey=()=>'desert-dry-foliage-v5';material.emissive.set('#c5bf9b');material.emissiveMap=material.map;material.emissiveIntensity=.10}
     material.side=T.DoubleSide;material.normalScale.multiplyScalar(.5);if(material.transparent||material.alphaTest>0){material.transparent=false;material.alphaTest=.18;material.depthWrite=true;material.alphaToCoverage=true;material.needsUpdate=true}}
   }})
   const isStone=prototype.name.includes('stone')
   const isShrub=/Bush 4|Rhazya|creosote/.test(prototype.name)
   const stoneBounds=new T.Box3().setFromObject(source.scene)
   const selected=prototype.matrices.filter((rows,i)=>{
    if(Math.abs(rows[0]![3]!)>23||isStone&&i%12!==0)return false
    if(isStone){const m=new T.Matrix4().set(...rows.flat() as [number,number,number,number,number,number,number,number,number,number,number,number,number,number,number,number]);const size=stoneBounds.clone().applyMatrix4(basis.clone().multiply(m).multiply(inverse)).getSize(new T.Vector3());if(Math.max(size.x,size.y,size.z)>.25)return false}
    return true
   }).slice(0,isStone?Infinity:prototype===cactus?4:2)
   const placement=selected.map(rows=>new T.Matrix4().set(...rows.flat() as [number,number,number,number,number,number,number,number,number,number,number,number,number,number,number,number]))
   if(prototype===cactus)placement.push(...cactusExtra.filter(m=>Math.abs(m.elements[12]!)<=23).slice(0,Math.max(0,5-placement.length)))
   // Redistribute existing plants over the full slopes, not just the road shoulder.
   if(isShrub||prototype===cactus||prototype.name.includes('beavertail')){
    const seed=Number(prototype.url.match(/plant-(\d+)/)?.[1]??0)+1
    const random=(i:number,k:number)=>T.MathUtils.euclideanModulo(Math.sin((i+1)*12.9898+seed*78.233+k*37.719)*43758.5453,1)
    for(const [i,m] of placement.entries()){
     const e=m.elements
     let bestX=0,bestY=0,bestGap=-1
     for(let attempt=0;attempt<24;attempt++){
      const k=attempt*6,side=random(i,k)<.47?-1:1,far=random(i,k+1)>.3,x=side*(far?23+random(i,k+2)*26:8+random(i,k+2)*14),y=-73+random(i,k+3)*146,point=new T.Vector2(compactX(x),y*.5)
      const gap=planted.length?Math.min(...planted.map(p=>p.distanceToSquared(point))):Infinity
      if(gap>bestGap){bestX=x;bestY=y;bestGap=gap}if(gap>4.84)break
     }
     e[12]=bestX;e[13]=bestY;planted.push(new T.Vector2(compactX(bestX),bestY*.5))
     m.multiply(new T.Matrix4().makeRotationZ(random(i,4)*Math.PI*2))
     const scale=.78+random(i,5)*.43;m.scale(new T.Vector3(scale,scale,scale))
    }
   }
   // One light creosote in each large uncovered cell, using the existing source asset.
   if(prototype.name==='SOURCE • Desert Plants — creosote'){
    const base=placement[0]
    if(base)for(const side of [-1,1])for(const band of [15,34,46])for(let row=0;row<8;row++){
     const x=side*(band+Math.sin(row*2.1+side)*2),y=-68+row*18+(side<0?3:-4),point=new T.Vector2(compactX(x),y*.5)
     if(planted.some(p=>p.distanceToSquared(point)<16))continue
     const m=base.clone();m.setPosition(x,y,0);m.multiply(new T.Matrix4().makeRotationZ(row*1.7+side));m.scale(new T.Vector3(.75,.75,.75));placement.push(m);planted.push(point)
    }
   }
   const transforms=placement.map(m=>{const e=m.elements;e[14]=terrainHeight?.(e[12]!,-e[13]!)??e[14]!;e[12]=compactX(e[12]!);e[13]!*=.5;e[14]=compactHeight(e[14]!);return basis.clone().multiply(m).multiply(inverse)})
   // Seat each LOD's actual base after all rotations/scales; source origins are not roots.
   const grounded=new Map<typeof source,T.Matrix4[]>()
   for(const asset of new Set([source,medium,far])){
    if(isStone){grounded.set(asset,transforms);continue}
    const bounds=new T.Box3().setFromObject(asset.scene),support:T.Vector3[]=[],point=new T.Vector3()
    asset.scene.traverse(o=>{if(o instanceof T.Mesh){const p=o.geometry.attributes.position!;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(point.y<=bounds.min.y+(bounds.max.y-bounds.min.y)*.12)support.push(point.clone())}}})
    const step=Math.max(1,Math.ceil(support.length/256)),roots=support.filter((_,i)=>i%step===0)
    grounded.set(asset,transforms.map(m=>{
     const placed=roots.map(p=>p.clone().applyMatrix4(m)),minimum=Math.min(...placed.map(p=>p.y));let correction=-Infinity
     for(const p of placed)if(p.y<minimum+.12){const x=Math.sign(p.x)*(Math.min(Math.abs(p.x),4.4)+Math.max(0,Math.abs(p.x)-4.4)*4),z=T.MathUtils.euclideanModulo(p.z*2+80,160)-80;correction=Math.max(correction,compactHeight(terrainHeight?.(x,z)??roadLevel)-p.y)}
     const result=m.clone();if(Number.isFinite(correction))result.elements[13]!+=correction-.055;return result
    }))
   }
   const finishes=new Map<string,T.Material>()
   source.scene.traverse(o=>{if(o instanceof T.Mesh)for(const mat of Array.isArray(o.material)?o.material:[o.material])finishes.set(mat.name,mat)})
   for(const reduced of [medium,far])if(reduced!==source)reduced.scene.traverse(o=>{if(o instanceof T.Mesh)o.material=Array.isArray(o.material)?o.material.map(m=>finishes.get(m.name)??m):finishes.get(o.material.name)??o.material})
   const clusters=new Map<string,T.Matrix4[]>()
   for(const m of transforms){const x=m.elements[12]!,z=m.elements[14]!,key=Math.floor((z+80)/40)+':'+Math.floor((x+50)/40);const list=clusters.get(key)??[];list.push(m);clusters.set(key,list)}
   for(const offset of [-period,0,period])for(const list of clusters.values()){
    const center=new T.Vector3();for(const m of list)center.add(new T.Vector3().setFromMatrixPosition(m));center.multiplyScalar(1/list.length);center.z+=offset
    const lod=new T.LOD();lod.position.copy(center)
    for(const [asset,distance] of [[source,0],[medium,20],[far,42]] as const){
     if(distance&&(asset===source||(distance===42&&asset===medium)))continue
     const group=new T.Group(),shift=new T.Matrix4().makeTranslation(-center.x,-center.y,offset-center.z)
     asset.scene.traverse(o=>{if(!(o instanceof T.Mesh)||!alive)return
      const mesh=new T.InstancedMesh(o.geometry,o.material,list.length)
      list.forEach((m,i)=>mesh.setMatrixAt(i,shift.clone().multiply(grounded.get(asset)![transforms.indexOf(m)]!).multiply(o.matrixWorld)))
      mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=false;mesh.receiveShadow=false;group.add(mesh);instances.push(mesh)
     })
     lod.addLevel(group,distance,.15)
    }
    lod.addLevel(new T.Group(),115,.12);land.add(lod)
   }
   await new Promise<void>(resolve=>setTimeout(resolve,0))
  }
 })()
 function update(distance:number,_speed:number,_time:number){
  land.position.x=((distance+period/2)%period+period)%period-period/2;terrainShift.value=land.position.x;travel.value=distance;asphalt.map.offset.y=normal.map.offset.y=rough.map.offset.y=-distance/3

 }
 function adjustCamera(camera:T.PerspectiveCamera,position:T.Vector3){
  if(!terrainHeight)return
  const target=position.clone();target.y+=.65;const desired=camera.position.clone(),ray=desired.clone().sub(target)
  let needed=0
  for(let i=2;i<=12;i++){
   const t=i/12,p=target.clone().addScaledVector(ray,t),x=Math.sign(p.z)*(Math.min(Math.abs(p.z),4.4)+Math.max(0,Math.abs(p.z)-4.4)*4),z=T.MathUtils.euclideanModulo((land.position.x-p.x)*2+80,160)-80
   const h=Math.abs(p.z)<4.3?roadLevel:compactHeight(terrainHeight(x,z))
   needed=Math.max(needed,(h+.45-p.y)/t)
  }
  const now=performance.now(),dt=lastCamera?Math.min((now-lastCamera)/1000,.1):.016;lastCamera=now
  cameraLift=needed>cameraLift?needed:T.MathUtils.damp(cameraLift,Math.max(0,needed),5,dt)
  camera.position.y+=cameraLift;camera.lookAt(target)
 }
 return {ready,update,adjustCamera,heightAt:(_x:number,_z:number,_distance:number)=>roadLevel+.007,setContacts:(points:T.Vector3[])=>{contactPatches.forEach((patch,i)=>{const point=points[i];patch.visible=!!point;if(point){patch.position.copy(point);patch.position.y+=.012}})},setVisible:(visible:boolean)=>{land.visible=surface.visible=contactGroup.visible=visible},dispose(){alive=false;scene.remove(land,surface,contactGroup);contactTexture.dispose();contactGeometry.dispose();contactMaterial.dispose();instances.forEach(i=>i.dispose());edgeGeometries.forEach(g=>g.dispose());shoulderMaterials.forEach(m=>m.dispose());roadGeometry.dispose();roadMaterial.dispose();assets.dispose()}}
}
