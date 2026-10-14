import * as T from 'three'
import {createRoadAssets} from './roadAssets'
import {createSaltSky,saltSunDirection} from './saltSkyHdr'
import {installSaltHorizon} from './saltHorizon'

const LEVEL=8.287,TILE=160,VARIANTS=8
const mod=(n:number,d:number)=>T.MathUtils.euclideanModulo(n,d)

/** Existing Blender map: continuous road/mineral mesh, eight shores and shared LODs. */
export function createBlenderSaltFlatRoad(scene:T.Scene){
 const assets=createRoadAssets(),root=new T.Group(),tiles=new T.Group()
 const geometries:T.BufferGeometry[]=[],materials:T.Material[]=[],pending:Promise<void>[]=[]
 let disposed=false,lastStep=Number.NaN
 root.name='Blender salt-flat environment';root.add(tiles);scene.add(root)
 const horizon=installSaltHorizon(root,LEVEL)
 const time={value:0},skyReflection=scene.userData.saltReflectionUniform??{value:null}
 scene.userData.saltReflectionUniform=skyReflection
 function tex(name:string,colour=false){const t=assets.texture('/textures/'+name,colour);pending.push(t.ready);return t.map}
 const roadMap=tex('asphalt_01_diff_4k.jpg',true),roadNormal=tex('asphalt_01_nor_gl_2k.jpg'),roadRough=tex('asphalt_01_rough_2k.jpg')
 const saltMap=tex('saltflat-scan-albedo.jpg',true),saltNormal=tex('saltflat-scan-normal.jpg'),saltRough=tex('saltflat-scan-roughness.jpg')
 const bankMap=tex('sand_01_diff_4k.jpg',true)
 const shore=tex('saltflat-shore-field.png');shore.wrapT=T.ClampToEdgeWrapping
 const waves=tex('salt-lake-water-normal.jpg')
 const surfaceCode=`
 vec2 metres=vec2(vMapUv.x,1.-vMapUv.y)*1.25;
 vec2 shoreUv=vec2((metres.x+80.)/1280.,clamp(abs(metres.y)/120.,0.,1.));
 vec3 geographic=metres.y<0.?vec3(0.,.5,0.):texture2D(shoreField,shoreUv).rgb;
 float coastDepth=geographic.r*.24;
 float fineFade=1.-smoothstep(24.,110.,length(vViewPosition));
 float phase=metres.x/1280.*6.2831853;float irregular=.035*sin(phase*145.)+.02*sin(phase*471.+sin(metres.y*1.7));
 float roadWeight=1.-smoothstep(3.65+irregular,3.90+irregular,abs(metres.y));
 vec3 photograph=texture2D(map,vMapUv).rgb;
 float grain=dot(photograph,vec3(.2126,.7152,.0722));
 vec3 asphaltColour=vec3(.025,.027,.029)+photograph*vec3(.92,.90,.86);
 float broadGrain=texture2D(map,vMapUv*.173+vec2(.23,.41)).r;
 asphaltColour*=.94+.12*broadGrain;
 float track=exp(-pow((abs(metres.y)-1.12)/.38,2.));asphaltColour*=1.-track*.025;
 float edgeSalt=smoothstep(2.65,3.65,abs(metres.y));
 float windPatch=smoothstep(.35,.72,texture2D(bankAlbedo,vec2(metres.x*.029,metres.y*.23)).r);
 asphaltColour=mix(asphaltColour,vec3(.40,.34,.25),edgeSalt*windPatch*.19*fineFade);
 float mineralGrain=texture2D(saltAlbedo,metres/.38).r;
 float mineralPatch=texture2D(bankAlbedo,metres/31.+vec2(.17,.61)).r;
 float grit=fract(sin(dot(floor(metres*180.),vec2(12.9898,78.233)))*43758.5453);
 float gritFade=1.-smoothstep(.35,1.2,length(fwidth(metres*180.)));
 vec3 mineral=vec3(.62,.609,.581)*(.96+.065*mineralPatch+.12*mineralGrain*fineFade+.035*(grit-.5)*fineFade*gritFade);
 // Reference: flat granular crust, irregular polygons and narrow grey seams.
 vec2 cellPoint=metres/1.45+vec2(.075*sin(metres.y*1.3)+.008*sin(metres.y*31.),.07*sin(metres.x*1.1)+.008*sin(metres.x*27.));
 vec2 cell=floor(cellPoint),within=fract(cellPoint);float first=9.,second=9.;
 for(int cy=-1;cy<=1;cy++)for(int cx=-1;cx<=1;cx++){
 vec2 neighbour=vec2(float(cx),float(cy));vec2 seed=cell+neighbour;
 vec2 random=fract(sin(vec2(dot(seed,vec2(127.1,311.7)),dot(seed,vec2(269.5,183.3))))*43758.5453);
 vec2 delta=neighbour+.18+.64*random-within;float dist=dot(delta,delta);
 if(dist<first){second=first;first=dist;}else second=min(second,dist);
 }
 float seamDistance=sqrt(second)-sqrt(first);
 float seamAA=max(.0015,fwidth(seamDistance)*.5);
 float crust=(1.-smoothstep(.011-seamAA,.011+seamAA,seamDistance))*clamp(.011/seamAA,.5,1.);
 float crustFade=1.-smoothstep(90.,260.,length(vViewPosition));
 mineral=mix(mineral,mineral*vec3(.52,.52,.51),crust*.64*crustFade);
 float raisedEdge=(1.-smoothstep(.018,.045,seamDistance))-crust;
 mineral+=raisedEdge*.018*crustFade;
 vec2 scratchCell=floor(metres*3.2);vec2 scratchLocal=fract(metres*3.2)-.5;
 float scratchSeed=fract(sin(dot(scratchCell,vec2(39.13,17.71)))*43758.5453);
 float scratchAngle=scratchSeed*6.2831853;
 vec2 scratchDir=vec2(cos(scratchAngle),sin(scratchAngle));
 float along=dot(scratchLocal,scratchDir),across=dot(scratchLocal,vec2(-scratchDir.y,scratchDir.x));
 float scratchAA=max(.008,fwidth(across)*.7);
 float scratch=(1.-smoothstep(.022-scratchAA,.022+scratchAA,abs(across)))*(1.-smoothstep(.18,.43,abs(along)))*step(.72,scratchSeed);
 float seamNeighbour=1.-smoothstep(.10,.48,seamDistance);
 mineral*=1.-scratch*.18*seamNeighbour*fineFade;
 vec2 grainPoint=metres*18.,grainCell=floor(grainPoint),grainLocal=fract(grainPoint);
 vec2 grainBlend=grainLocal*grainLocal*(3.-2.*grainLocal);
 vec4 grainHash=fract(sin(vec4(dot(grainCell,vec2(127.1,311.7)),dot(grainCell+vec2(1.,0.),vec2(127.1,311.7)),dot(grainCell+vec2(0.,1.),vec2(127.1,311.7)),dot(grainCell+vec2(1.),vec2(127.1,311.7))))*43758.5453);
 float clumps=mix(mix(grainHash.x,grainHash.y,grainBlend.x),mix(grainHash.z,grainHash.w,grainBlend.x),grainBlend.y);
 float grainFade=(1.-smoothstep(.3,.8,length(fwidth(grainPoint))))*fineFade;
 mineral*=1.+(clumps-.5)*.12*grainFade;
 // Millimetre relief shades the crust without moving the ground or car.
 float smallPit=(1.-smoothstep(.07,.23,length(scratchLocal)))*step(.94,scratchSeed);
 float saltRelief=(clumps-.5)*.002*grainFade+raisedEdge*.002*crustFade-scratch*.0012*seamNeighbour*fineFade-smallPit*.0007*fineFade;
 mineral*=1.02+(geographic.g-.5)*.09;
 float wet=smoothstep(.001,.038,coastDepth);mineral*=1.-wet*.13;
 float bankWidth=5.0+.48*sin(phase*16.+metres.y*.7)+.24*sin(phase*73.);
 float bank=(1.-smoothstep(3.95,bankWidth,abs(metres.y)))*(1.-smoothstep(.001,.02,coastDepth));
 vec3 bankPhoto=texture2D(bankAlbedo,vMapUv*.625).rgb;
 vec3 ochre=bankPhoto*vec3(.85,.66,.44);
 mineral=mix(mineral,ochre,bank*.88);
 diffuseColor.rgb=mix(mineral,asphaltColour,roadWeight);
 `
 function terrainMaterial(near:boolean){
  const material=new T.MeshStandardMaterial({map:roadMap,normalMap:near?roadNormal:null,roughnessMap:near?roadRough:null,roughness:1})
  material.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,{saltAlbedo:{value:saltMap},saltNormal:{value:saltNormal},saltRough:{value:saltRough},shoreField:{value:shore},bankAlbedo:{value:bankMap}})
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nif(transformed.z>4.0)transformed.y=8.287;')
    .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nif(position.z>4.0)objectNormal=vec3(0.,1.,0.);')
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D saltAlbedo,saltNormal,saltRough,shoreField,bankAlbedo;')
    .replace('#include <map_fragment>',surfaceCode)
    .replace('#include <roughnessmap_fragment>',near?`float roadR=texture2D(roughnessMap,vRoughnessMapUv).g;float saltR=texture2D(saltRough,metres/2.4).g;float roughnessFactor=mix(mix(.87,saltR,fineFade)-wet*.18,mix(.72,.88,roadR),roadWeight);`:'float roughnessFactor=mix(.87-wet*.18,.79,roadWeight);')
   if(near)shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 vec3 mineralN=texture2D(saltNormal,metres/2.4).xyz*2.-1.;
 mapN=normalize(mix(vec3(mineralN.x*.065,-mineralN.y*.065,mineralN.z),vec3(mapN.xy*.55,mapN.z),roadWeight));
 mapN.xy*=fineFade;normal=normalize(tbn*mapN);
 vec3 saltQ0=dFdx(-vViewPosition),saltQ1=dFdy(-vViewPosition);
 vec3 saltR1=cross(saltQ1,normal),saltR2=cross(normal,saltQ0);float saltDet=dot(saltQ0,saltR1);
 vec3 saltGradient=sign(saltDet)*(dFdx(saltRelief)*saltR1+dFdy(saltRelief)*saltR2);
 normal=normalize(abs(saltDet)*normal-saltGradient*(1.-roadWeight));`)
  }
  material.customProgramCacheKey=()=>`unified-salt-asphalt-relief-v7-${near}`;materials.push(material);return material
 }
 const nearMat=terrainMaterial(true),farMat=terrainMaterial(false)
 const railMat=new T.MeshStandardMaterial({color:'#b6babb',metalness:.82,roughness:.56,side:T.DoubleSide});materials.push(railMat)
 const paint=new T.MeshStandardMaterial({color:'#c6c1af',roughness:.88,map:roadMap,polygonOffset:true,polygonOffsetFactor:-1})
 paint.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`float grain=texture2D(map,vMapUv*2.).r;diffuseColor.rgb*=.92+.08*grain;`)}
 paint.customProgramCacheKey=()=>'subtle-matte-road-paint';materials.push(paint)
 const sky=createSaltSky(scene.userData.saltSkyTexture);root.add(sky);geometries.push(sky.geometry);materials.push(sky.material)
 const waterMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{shoreField:{value:shore},saltAlbedo:{value:saltMap},waveNormal:{value:waves},skyMap:skyReflection,lakeTime:time,sunDirection:{value:saltSunDirection}},vertexShader:`varying vec3 worldPoint;varying vec2 metres;void main(){metres=vec2(uv.x,1.-uv.y)*1.25;worldPoint=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
 uniform sampler2D shoreField,saltAlbedo,waveNormal;uniform samplerCube skyMap;uniform float lakeTime;uniform vec3 sunDirection;
 varying vec3 worldPoint;varying vec2 metres;
 void main(){
 if(metres.y<0.)discard;
 vec2 lakeUv=vec2((metres.x+80.)/1280.,abs(metres.y)/120.); vec3 geographic=texture2D(shoreField,lakeUv).rgb;
 float depth=max(0.,geographic.r*.24-.028);if(depth<.001)discard;
 float distanceToEye=length(cameraPosition-worldPoint);
 vec2 flow=vec2(lakeTime*.006,lakeTime*.004);
 vec3 a=texture2D(waveNormal,metres*.15+flow).rgb*2.-1.;
 vec3 b=texture2D(waveNormal,metres*.51-flow*.7).rgb*2.-1.;
 float detail=1.-smoothstep(25.,120.,distanceToEye);
 vec3 n=normalize(vec3((a.x+b.x*.25*detail)*.025,1.,-(a.y+b.y*.25*detail)*.025));
 vec3 eye=normalize(cameraPosition-worldPoint);float fresnel=.0204+.9796*pow(1.-max(dot(n,eye),0.),5.);
 vec3 reflected=textureCube(skyMap,reflect(-eye,n),1.5+geographic.b).rgb;
 vec3 bottom=mix(vec3(.661,.663,.667),texture2D(saltAlbedo,metres/2.4+n.xz*.018).rgb,detail*.45);
 vec3 transmission=exp(-vec3(18.,5.0,3.4)*depth*2.2);
 vec3 body=bottom*transmission+vec3(.012,.23,.29)*(1.-transmission);
 float shine=pow(max(dot(n,normalize(sunDirection+eye)),0.),mix(150.,260.,geographic.b));
 vec3 colour=mix(body,reflected,min(.48,fresnel*.58))+shine*vec3(1.,.96,.89)*.18;
 colour=mix(colour,vec3(.67,.75,.78),smoothstep(340.,570.,distanceToEye));
 gl_FragColor=vec4(colour,smoothstep(.001,.023,depth));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});materials.push(waterMaterial)
 const contactGeo=new T.PlaneGeometry(5.8,3.1),contactMat=new T.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,vertexShader:'varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;void main(){float r=dot(p,p);gl_FragColor=vec4(0.,0.,0.,.23*exp(-r*2.8)*(1.-smoothstep(.65,1.,r)));}'})
 const contact=new T.Mesh(contactGeo,contactMat);contact.rotation.x=-Math.PI/2;contact.position.y=LEVEL+.006;root.add(contact);geometries.push(contactGeo);materials.push(contactMat)
 type Section={index:number,near:T.Mesh[],far:T.Mesh[],water:T.Mesh}
 const sections:Section[]=[],library:{near:T.BufferGeometry[][],far:T.BufferGeometry[][],water:T.BufferGeometry[]}={near:[],far:[],water:[]}
 function extract(source:T.Object3D,name:string,variant=0){
  source.updateMatrixWorld(true);let result:T.BufferGeometry|undefined
  source.traverse(o=>{if(!result&&o instanceof T.Mesh&&(o.name===name||o.name.startsWith(name+'.'))){result=o.geometry.clone().applyMatrix4(o.matrixWorld).translate(-variant*TILE,0,0)}})
  if(!result)throw new Error('Missing Blender section '+name)
  geometries.push(result);return result
 }
 const ready=(async()=>{
  const [near,far]=await Promise.all([assets.model('/models/saltflat/road-banks-near.glb'),assets.model('/models/saltflat/road-banks-far.glb')]);await Promise.all(pending);if(disposed)return
  for(let v=0;v<VARIANTS;v++){
   library.near.push(['Terrain','Markings','Guardrail'].map(n=>extract(near.scene,`${n}_${v}_near`,v)))
   library.far.push(['Terrain','Markings','Guardrail'].map(n=>extract(far.scene,`${n}_${v}_far`,v)))
   library.water.push(extract(far.scene,`Water_${v}_far`,v))
  }
  for(let i=-4;i<=4;i++){
   const v=mod(i,VARIANTS),lod=new T.LOD();lod.position.x=i*TILE
   const groups=[new T.Group(),new T.Group()]
   const meshes=groups.map((group,level)=>[0,1,2].map(part=>{const geometry=(level===0||part===0?library.near:library.far)[v]![part]!;const mesh=new T.Mesh(geometry,part===2?railMat:part===1?paint:level===0?nearMat:farMat);mesh.receiveShadow=level===0;group.add(mesh);return mesh}))
   lod.addLevel(groups[0]!,0);lod.addLevel(groups[1]!,145,.12);tiles.add(lod)
   const water=new T.Mesh(library.water[v],waterMaterial);water.position.x=i*TILE;tiles.add(water)
   sections.push({index:i,near:meshes[0]!,far:meshes[1]!,water})
  }
 })()
 return {ready,heightAt:(_x:number,_z:number,_distance?:number)=>LEVEL,
  prepare(renderer:T.WebGLRenderer,camera:T.Camera){
   const staging=new T.Group(),target=new T.WebGLRenderTarget(2,2),old=renderer.getRenderTarget();root.add(staging)
   for(const maps of [library.near,library.far])for(const parts of maps)parts.forEach((g,i)=>{const m=new T.Mesh(g,i===2?railMat:i===1?paint:nearMat);m.frustumCulled=false;staging.add(m)})
   for(const g of library.water){const m=new T.Mesh(g,waterMaterial);m.frustumCulled=false;staging.add(m)}
   for(const t of [roadMap,roadNormal,roadRough,saltMap,saltNormal,saltRough,bankMap,shore,waves])renderer.initTexture(t)
   try{renderer.setRenderTarget(target);renderer.render(scene,camera)}finally{renderer.setRenderTarget(old);root.remove(staging);target.dispose()}
  },
  setContacts(points:T.Vector3[]){if(points.length){contact.position.set(0,0,0);points.forEach(p=>contact.position.add(p));contact.position.multiplyScalar(1/points.length);contact.position.y=LEVEL+.006}},
  setVisible(visible:boolean){root.visible=visible},
  update(distance:number,_speed:number,elapsed:number){
   tiles.position.x=mod(distance+80,TILE)-80;time.value=elapsed
   const step=Math.floor((distance+80)/TILE)
   if(step!==lastStep){for(const section of sections){const variant=mod(section.index-step,VARIANTS);section.near.forEach((mesh,i)=>mesh.geometry=library.near[variant]![i]!);section.far.forEach((mesh,i)=>mesh.geometry=(i===0?library.near:library.far)[variant]![i]!);section.water.geometry=library.water[variant]!}lastStep=step}
  },
  dispose(){disposed=true;scene.remove(root);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());horizon.dispose();assets.dispose()}
 }
}
