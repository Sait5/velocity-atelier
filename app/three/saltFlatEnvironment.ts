import * as T from 'three'
import {createRoadAssets} from './roadAssets'
import {createSaltSky,saltSunDirection} from './saltSkyHdr'
import {installSaltHorizon} from './saltHorizon'
import {createSaltFence} from './saltFence'
import {createSaltMounds} from './saltMounds'
import {atmosphereUniforms} from './atmosphere'
import {createRain} from './rain'
import {roadWearGlsl} from './roadWear'

// The road runs on a low embankment: the salt either side lies EMBANKMENT lower, the gravel shoulder sloping down to it.
const LEVEL=8.287,TILE=160,VARIANTS=8,EMBANKMENT=.09
const mod=(n:number,d:number)=>T.MathUtils.euclideanModulo(n,d)
// Water of the brine lake and of the puddles on the crust: two scrolling layers of a real water normal map, the sky's
// reflection cube with fresnel, the salt floor seen through a coloured depth of brine, a sun glint and distance haze.
// Needs the uniforms waveNormal, skyMap, saltAlbedo, lakeTime, sunDirection, sunStrength, atmoLight, atmoTint, atmoHaze.
const brineShadeGlsl=`
vec3 brineShade(vec2 m,float depth,float calm,vec3 point,float waveScale){
 float distanceToEye=length(cameraPosition-point);
 vec2 flow=vec2(lakeTime*.006,lakeTime*.004);
 vec3 a=texture2D(waveNormal,m*.15+flow).rgb*2.-1.;
 vec3 b=texture2D(waveNormal,m*.51-flow*.7).rgb*2.-1.;
 float detail=1.-smoothstep(25.,120.,distanceToEye);
 vec3 n=normalize(vec3((a.x+b.x*.25*detail)*.025*waveScale,1.,-(a.y+b.y*.25*detail)*.025*waveScale));
 vec3 eye=normalize(cameraPosition-point);float fresnel=.0204+.9796*pow(1.-max(dot(n,eye),0.),5.);
 vec3 reflected=textureCube(skyMap,reflect(-eye,n),1.5+calm).rgb;
 vec3 bottom=mix(vec3(.661,.663,.667),texture2D(saltAlbedo,m/2.4+n.xz*.018).rgb,detail*.45);
 vec3 transmission=exp(-vec3(18.,5.0,3.4)*depth*2.2);
 vec3 body=(bottom*transmission+vec3(.012,.23,.29)*(1.-transmission))*atmoLight*atmoTint;
 float shine=pow(max(dot(n,normalize(sunDirection+eye)),0.),mix(150.,260.,calm));
 vec3 colour=mix(body,reflected,min(.48,fresnel*.58))+shine*vec3(1.,.96,.89)*.18*sunStrength;
 return mix(colour,atmoHaze*vec3(1.047,1.,.963),smoothstep(340.,570.,distanceToEye));
}
`

/** Existing Blender map: continuous road/mineral mesh, eight shores and shared LODs. */
export function createBlenderSaltFlatRoad(scene:T.Scene){
 const assets=createRoadAssets(),root=new T.Group(),tiles=new T.Group()
 const geometries:T.BufferGeometry[]=[],materials:T.Material[]=[],pending:Promise<void>[]=[]
 let disposed=false,lastStep=Number.NaN
 root.name='Blender salt-flat environment';root.add(tiles);scene.add(root)
 const atmo=atmosphereUniforms(scene),travel={value:0}
 const horizon=installSaltHorizon(root,LEVEL-EMBANKMENT,atmo)
 const rain=createRain(LEVEL,travel,atmo.light);root.add(rain.object)
 let contacts:T.Vector3[]=[]
 const time={value:0},skyReflection=scene.userData.saltReflectionUniform??{value:null}
 scene.userData.saltReflectionUniform=skyReflection
 function tex(name:string,colour=false){const t=assets.texture('/textures/'+name,colour);pending.push(t.ready);return t.map}
 const roadMap=tex('asphalt_01_diff_4k.webp',true),roadNormal=tex('asphalt_01_nor_gl_2k.webp'),roadRough=tex('asphalt_01_rough_2k.webp')
 const saltMap=tex('saltflat-scan-albedo-3k.webp',true),saltNormal=tex('saltflat-scan-normal-3k.webp'),saltRough=tex('saltflat-scan-roughness-2k.webp')
 const bankMap=tex('sand_01_diff_2k.webp',true)
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
 vec2 wear=roadWear(metres);asphaltColour*=wear.x;
 float edgeSalt=smoothstep(2.65,3.65,abs(metres.y));
 float windPatch=smoothstep(.35,.72,texture2D(bankAlbedo,vec2(metres.x*.029,metres.y*.23)).r);
 asphaltColour=mix(asphaltColour,vec3(.40,.34,.25),edgeSalt*windPatch*.19*fineFade);
 // The salt is the scanned crust itself: its colour and relief are sampled twice, at different scales and angles, and
 // blended by a soft mask so the 2.4 m tile never repeats visibly; the mipmapped, anisotropic scan cannot break into
 // pixels the way per-pixel noise did.
 vec2 saltA=metres/2.4,saltB=mat2(.8,-.6,.6,.8)*metres/3.3+vec2(.37,.11);
 float saltMix=smoothstep(.3,.7,saltNoise(metres/9.+vec2(7.,3.)));
 vec3 scan=mix(texture2D(saltAlbedo,saltA).rgb,texture2D(saltAlbedo,saltB).rgb,saltMix)/.66;
 // The 31 m sand patch repeats visibly toward the horizon: keep it near, and vary the far crust with soft value noise.
 float viewDistance=length(vViewPosition),nearPatch=1.-smoothstep(45.,140.,viewDistance);
 float mineralPatch=texture2D(bankAlbedo,metres/31.+vec2(.17,.61)).r*nearPatch+.5*(1.-nearPatch);
 float broadSalt=saltNoise(metres/173.)*.6+saltNoise(metres/53.+vec2(3.1,7.7))*.4;
 // warm off-white salt (not the cold blue-white of snow), faint mineral clouding
 vec3 mineral=vec3(.72,.696,.652)*mix(vec3(1.),scan,.55)*(.975+.04*mineralPatch)*(.955+.075*broadSalt);
 // Reference (Bonneville, dry Uyuni): flat granular crust; the polygon seams are faint, soft and slightly darker.
 vec2 cellPoint=metres/1.6+vec2(.09*sin(metres.y*1.3)+.03*sin(metres.y*3.9+metres.x*.6),.08*sin(metres.x*1.1)+.03*sin(metres.x*3.4-metres.y*.8));
 vec2 cell=floor(cellPoint),within=fract(cellPoint);float first=9.,second=9.;vec2 toFirst=vec2(0.),toSecond=vec2(1.);
 for(int cy=-1;cy<=1;cy++)for(int cx=-1;cx<=1;cx++){
 vec2 neighbour=vec2(float(cx),float(cy));vec2 seed=cell+neighbour;
 vec2 random=fract(sin(vec2(dot(seed,vec2(127.1,311.7)),dot(seed,vec2(269.5,183.3))))*43758.5453);
 vec2 delta=neighbour+.18+.64*random-within;float dist=dot(delta,delta);
 if(dist<first){second=first;toSecond=toFirst;first=dist;toFirst=delta;}else if(dist<second){second=dist;toSecond=delta;}
 }
 float seamDistance=sqrt(second)-sqrt(first);
 float seamAA=max(.0015,fwidth(seamDistance)*.5);
 float crust=1.-smoothstep(.002+seamAA,.016+seamAA,seamDistance);
 float crustFade=1.-smoothstep(12.,60.,viewDistance);
 mineral=mix(mineral,mineral*vec3(.92,.905,.88),crust*crustFade);
 float raisedEdge=(1.-smoothstep(.03,.07,seamDistance))-crust*.5;
 mineral+=raisedEdge*.008*crustFade;
 // The seams in relief: a low pressure rim either side of the crack and the crack itself sunk a few millimetres. The
 // slope is exact (no screen-space derivatives) and fades once the rim is narrower than a pixel.
 vec2 across=normalize(toSecond-toFirst+vec2(1e-5));
 float seamMetres=max(0.,dot(.5*(toFirst+toSecond),across))*1.6;
 float rimX=(seamMetres-.05)/.035,dipX=seamMetres/.012;
 float slope=.004*exp(-rimX*rimX)*(-2.*rimX/.035)+.003*exp(-dipX*dipX)*(2.*dipX/.012);
 float rimDetail=clamp(.035/max(1e-4,fwidth(seamMetres)*3.),0.,1.);
 vec2 crustSlope=-across*slope*crustFade*rimDetail;
 mineral*=1.02+(geographic.g-.5)*.09;
 float wet=smoothstep(.001,.038,coastDepth);mineral*=1.-wet*.13;
 float bankWidth=5.0+.48*sin(phase*16.+metres.y*.7)+.24*sin(phase*73.);
 float bank=(1.-smoothstep(3.95,bankWidth,abs(metres.y)))*(1.-smoothstep(.001,.02,coastDepth));
 vec3 bankPhoto=texture2D(bankAlbedo,vMapUv*.625).rgb;
 vec3 ochre=bankPhoto*vec3(.85,.66,.44);
 mineral=mix(mineral,ochre,bank*.88);
 // small shallow puddles on the dry crust: still water mirroring the sky inside a darker wet rim; the edge is filtered to
 // the pixel so far puddles stay clean
 float puddleField=saltNoise(metres/6.5+vec2(11.3,4.7))*.65+saltNoise(metres/2.2+vec2(2.9,8.1))*.35;
 float puddleEdge=max(.006,fwidth(puddleField));
 float dryGround=(1.-bank)*(1.-roadWeight)*(1.-smoothstep(.0005,.01,coastDepth))*smoothstep(5.5,8.,abs(metres.y));
 float puddle=smoothstep(.695-puddleEdge,.695+puddleEdge,puddleField)*dryGround;
 float puddleDepth=.003+.016*smoothstep(.695,.8,puddleField);
 float puddleRim=clamp(smoothstep(.655,.695,puddleField)*dryGround-puddle,0.,1.);
 mineral*=mix(vec3(1.),vec3(.5,.6,.7),puddle)*(1.-puddleRim*.18);
 // rain: a glossy water film on the asphalt; water stands in the tyre ruts and in shallow dips (near-mirror there)
 float roadWater=atmoWet*clamp(roadPuddles(metres)*.9+exp(-pow((abs(metres.y)-1.12)/.3,2.))*smoothstep(.3,.6,saltNoise(vec2(metres.x*.05,metres.y)+7.))*.85,0.,1.);
 asphaltColour*=1.-.42*atmoWet-.22*roadWater;mineral*=1.-.08*atmoWet;
 diffuseColor.rgb=mix(mineral,asphaltColour,roadWeight);
 `
 function terrainMaterial(near:boolean,bed=false){
  const material=new T.MeshStandardMaterial({map:roadMap,normalMap:near?roadNormal:null,roughnessMap:near?roadRough:null,roughness:1})
  material.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,{saltAlbedo:{value:saltMap},saltNormal:{value:saltNormal},saltRough:{value:saltRough},shoreField:{value:shore},bankAlbedo:{value:bankMap},atmoWet:atmo.wet,waveNormal:{value:waves},skyMap:skyReflection,lakeTime:time,sunDirection:atmo.sun,sunStrength:atmo.sunStrength,atmoLight:atmo.light,atmoTint:atmo.tint,atmoHaze:atmo.haze})
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 saltWorld;').replace('#include <project_vertex>','#include <project_vertex>\nsaltWorld=(modelMatrix*vec4(transformed,1.)).xyz;')
   if(!bed)shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nif(transformed.z>4.0)transformed.y=8.287;\ntransformed.y-='+EMBANKMENT.toFixed(3)+'*smoothstep(4.3,7.5,abs(transformed.z));')
    .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nif(position.z>4.0)objectNormal=vec3(0.,1.,0.);')
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D saltAlbedo,saltNormal,saltRough,shoreField,bankAlbedo,waveNormal;uniform samplerCube skyMap;uniform float atmoWet,lakeTime,sunStrength,atmoLight;uniform vec3 sunDirection,atmoTint,atmoHaze;varying vec3 saltWorld;\n'+brineShadeGlsl+roadWearGlsl+'float saltHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat saltNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(saltHash(i),saltHash(i+vec2(1.,0.)),f.x),mix(saltHash(i+vec2(0.,1.)),saltHash(i+vec2(1.,1.)),f.x),f.y);}')
    .replace('#include <map_fragment>',surfaceCode)
    .replace('#include <opaque_fragment>','outgoingLight=mix(outgoingLight,brineShade(metres,puddleDepth,1.,saltWorld,.6),puddle);\n#include <opaque_fragment>')
    .replace('#include <roughnessmap_fragment>',near?`float roadR=texture2D(roughnessMap,vRoughnessMapUv).g;float saltR=mix(texture2D(saltRough,saltA).g,texture2D(saltRough,saltB).g,saltMix);float roughnessFactor=mix(mix(.87,saltR,fineFade)-wet*.18,mix(.72,.88,roadR)+wear.y,roadWeight);roughnessFactor=mix(roughnessFactor,.035,puddle);roughnessFactor-=puddleRim*.25;roughnessFactor=mix(roughnessFactor,mix(.32,.2,roadWeight),atmoWet);roughnessFactor=mix(roughnessFactor,.025,roadWater*roadWeight);
// salt crystals: a sparse scatter of tiny smooth facets that catch the sun and sparkle as the view moves (near crust only)
float crystalCell=fract(sin(dot(floor(metres*72.),vec2(12.9898,78.233)))*43758.5453);float crystalFade=1.-smoothstep(.22,.55,length(fwidth(metres*72.)));float crystal=step(.986,crystalCell)*crystalFade*(1.-roadWeight)*(1.-wet)*(1.-puddle);roughnessFactor=mix(roughnessFactor,.16,crystal);`:'float roughnessFactor=mix(mix(mix(mix(.87-wet*.18,.79+wear.y,roadWeight),.05,puddle),mix(.32,.2,roadWeight),atmoWet),.025,roadWater*roadWeight);')
   if(near)shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 // the scanned relief, its second sample turned back to the first one's axes
 vec3 nA=texture2D(saltNormal,saltA).xyz*2.-1.,nB=texture2D(saltNormal,saltB).xyz*2.-1.;nB.xy=mat2(.8,.6,-.6,.8)*nB.xy;
 vec3 mineralN=normalize(mix(nA,nB,saltMix));float relief=.22*fineFade*(1.-puddle);
 // close to the camera a finer copy of the scan adds crisp crystal grain
 float microFade=1.-smoothstep(4.,14.,length(vViewPosition));vec3 nC=texture2D(saltNormal,metres/.55+vec2(.31,.77)).xyz*2.-1.;mineralN=normalize(mineralN+vec3(nC.xy*.6*microFade,0.));
 mineralN.xy+=vec2(-crustSlope.x,crustSlope.y)/max(relief,.02)*(1.-puddle);
 float lakeTimeRipple=lakeTime;vec2 rippleCellPoint=metres*2.4;vec2 rippleCell=floor(rippleCellPoint),rippleLocal=fract(rippleCellPoint)-.5;float rippleSeed=fract(sin(dot(rippleCell,vec2(41.3,289.1)))*43758.5453);
 float rippleAge=fract(lakeTimeRipple*1.4+rippleSeed);vec2 rippleCentre=(vec2(fract(rippleSeed*7.3),fract(rippleSeed*3.1))-.5)*.5;float rippleR=length(rippleLocal-rippleCentre),rippleFront=rippleR-rippleAge*.42;
 float rippleRing=sin(rippleFront*70.)*exp(-pow(rippleFront*16.,2.))*(1.-rippleAge);vec2 rippleSlope=normalize(rippleLocal-rippleCentre+1e-4)*rippleRing*.12*roadWater*fineFade;
 mapN=normalize(mix(vec3(mineralN.x*relief,-mineralN.y*relief,1.),vec3(mapN.xy*.55*fineFade*(1.-.8*roadWater)+vec2(rippleSlope.x,-rippleSlope.y),mapN.z),roadWeight));normal=normalize(tbn*mapN);
 // each crystal facet leans its own way, so only some of them flash the sun toward the eye
 vec2 crystalTilt=vec2(fract(crystalCell*91.7),fract(crystalCell*57.3))-.5;normal=normalize(normal+tbn*vec3(crystalTilt*.7,0.)*crystal);`)
  }
  material.customProgramCacheKey=()=>`unified-salt-asphalt-photo-v9-${near}-${bed}`;materials.push(material);return material
 }
 const nearMat=terrainMaterial(true),farMat=terrainMaterial(false)
 // The Blender terrain has a hole under the brine; a salt bed just under the water fills it, so the shallow rim (where the
 // water shader draws nothing) shows wet crust instead of the sky below the horizon.
 const bedNear=terrainMaterial(true,true),bedFar=terrainMaterial(false,true)
 const railMat=new T.MeshStandardMaterial({color:'#b6babb',metalness:.82,roughness:.56,side:T.DoubleSide});materials.push(railMat)
 // The Blender guardrails are replaced by a detailed galvanised barrier (saltFence.ts); same line, posts every 2 m.
 const fence=createSaltFence(LEVEL)
 // harvested salt piles on the dry plain (saltMounds.ts)
 const mounds=createSaltMounds(VARIANTS,LEVEL-EMBANKMENT,{albedo:saltMap,normal:saltNormal})
 const paint=new T.MeshStandardMaterial({color:'#c6c1af',roughness:.88,map:roadMap,polygonOffset:true,polygonOffsetFactor:-1})
 paint.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`float grain=texture2D(map,vMapUv*2.).r;diffuseColor.rgb*=.92+.08*grain;`)}
 paint.customProgramCacheKey=()=>'subtle-matte-road-paint';materials.push(paint)
 const sky=createSaltSky(scene.userData.saltSkyTexture);root.add(sky);geometries.push(sky.geometry);materials.push(sky.material)
 const waterMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{shoreField:{value:shore},saltAlbedo:{value:saltMap},waveNormal:{value:waves},skyMap:skyReflection,lakeTime:time,sunDirection:atmo.sun,sunStrength:atmo.sunStrength,atmoLight:atmo.light,atmoTint:atmo.tint,atmoHaze:atmo.haze},vertexShader:`varying vec3 worldPoint;varying vec2 metres;void main(){metres=vec2(uv.x,1.-uv.y)*1.25;worldPoint=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
 uniform sampler2D shoreField,saltAlbedo,waveNormal;uniform samplerCube skyMap;uniform float lakeTime,sunStrength,atmoLight;uniform vec3 sunDirection,atmoTint,atmoHaze;
 varying vec3 worldPoint;varying vec2 metres;
 ${brineShadeGlsl}
 void main(){
 if(metres.y<0.)discard;
 vec2 lakeUv=vec2((metres.x+80.)/1280.,abs(metres.y)/120.); vec3 geographic=texture2D(shoreField,lakeUv).rgb;
 float depth=max(0.,geographic.r*.24-.028);if(depth<.001)discard;
 vec3 colour=brineShade(metres,depth,geographic.b,worldPoint,1.);
 gl_FragColor=vec4(colour,smoothstep(.001,.023,depth));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});materials.push(waterMaterial)
 const contactGeo=new T.PlaneGeometry(5.8,3.1),contactMat=new T.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,vertexShader:'varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;void main(){float r=dot(p,p);gl_FragColor=vec4(0.,0.,0.,.23*exp(-r*2.8)*(1.-smoothstep(.65,1.,r)));}'})
 const contact=new T.Mesh(contactGeo,contactMat);contact.rotation.x=-Math.PI/2;contact.position.y=LEVEL+.006;root.add(contact);geometries.push(contactGeo);materials.push(contactMat)
 type Section={index:number,near:T.Mesh[],far:T.Mesh[],water:T.Mesh,bed:T.Mesh,piles:T.InstancedMesh}
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
   meshes.forEach(level=>{level[2]!.visible=false});groups[0]!.add(fence.tile(true));groups[1]!.add(fence.tile(false))
   lod.addLevel(groups[0]!,0);lod.addLevel(groups[1]!,145,.12);tiles.add(lod)
   const water=new T.Mesh(library.water[v],waterMaterial);water.position.x=i*TILE;tiles.add(water)
   const bed=new T.Mesh(library.water[v],Math.abs(i)<=1?bedNear:bedFar);bed.position.set(i*TILE,-.017,0);bed.renderOrder=1;bed.receiveShadow=true;tiles.add(bed)
   const piles=mounds.section();piles.position.x=i*TILE;mounds.show(piles,v);tiles.add(piles)
   sections.push({index:i,near:meshes[0]!,far:meshes[1]!,water,bed,piles})
  }
 })()
 return {ready,heightAt:(_x:number,_z:number,_distance?:number)=>LEVEL,
  prepare(renderer:T.WebGLRenderer,camera:T.Camera){
   const staging=new T.Group(),target=new T.WebGLRenderTarget(2,2),old=renderer.getRenderTarget();root.add(staging)
   for(const maps of [library.near,library.far])for(const parts of maps)parts.forEach((g,i)=>{const m=new T.Mesh(g,i===2?railMat:i===1?paint:nearMat);m.frustumCulled=false;staging.add(m)})
   for(const g of library.water)for(const material of [waterMaterial,bedNear,bedFar]){const m=new T.Mesh(g,material);m.frustumCulled=false;staging.add(m)}
   {const piles=mounds.section();mounds.show(piles,0);piles.frustumCulled=false;staging.add(piles)}
   for(const t of [roadMap,roadNormal,roadRough,saltMap,saltNormal,saltRough,bankMap,shore,waves])renderer.initTexture(t)
   try{renderer.setRenderTarget(target);renderer.render(scene,camera)}finally{renderer.setRenderTarget(old);root.remove(staging);target.dispose()}
  },
  /** time of day / weather: the photographed daylight sky only by clear day; rain streaks */
  setAtmosphere(options:{customSky:boolean,rain:boolean}){sky.visible=!options.customSky;rain.setVisible(options.rain)},
  setContacts(points:T.Vector3[]){contacts=points;if(points.length){contact.position.set(0,0,0);points.forEach(p=>contact.position.add(p));contact.position.multiplyScalar(1/points.length);contact.position.y=LEVEL+.006}},
  setVisible(visible:boolean){root.visible=visible},
  update(distance:number,speed:number,elapsed:number){
   tiles.position.x=mod(distance+80,TILE)-80;time.value=elapsed;travel.value=mod(distance,16384);if(rain.object.visible)rain.update(elapsed,speed,contacts)
   const step=Math.floor((distance+80)/TILE)
   if(step!==lastStep){for(const section of sections){const variant=mod(section.index-step,VARIANTS);section.near.forEach((mesh,i)=>mesh.geometry=library.near[variant]![i]!);section.far.forEach((mesh,i)=>mesh.geometry=(i===0?library.near:library.far)[variant]![i]!);section.water.geometry=section.bed.geometry=library.water[variant]!;mounds.show(section.piles,variant)}lastStep=step}
  },
  dispose(){disposed=true;scene.remove(root);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());fence.dispose();mounds.dispose();rain.dispose();horizon.dispose();assets.dispose()}
 }
}
