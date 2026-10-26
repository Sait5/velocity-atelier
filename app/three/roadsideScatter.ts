import * as T from 'three'
import {mergeVertices,toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js'

/**
 * The verge of the mountain maps, built once per terrain chunk on that chunk's own surface (chunk metres: x along the
 * road -128…128, z across, the mountain on +z, the sea on -z):
 * - fractured boulders on the slope foot and small stones in the grass: icospheres cut by planes (flat broken faces,
 *   sharp edges), five base shapes; each instance is turned, tilted toward the slope and sunk below the lowest ground
 *   under its whole foot, so nothing floats;
 * - alpine grass tufts made of real blades (no alpha cards to cut out or to fail), thinning out softly toward the road;
 * - a gravel shoulder (summer) or a ploughed snow bank (winter) between the asphalt and the terrain.
 * Stones are textured triplanar in chunk space: no UV seams, nothing stretched. All hashes are sine-free, so every GPU
 * draws the same pattern.
 */
const random=(seed:number)=>{let s=(seed*2654435761)>>>0||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
const hash=(x:number,y:number,z:number)=>{const h=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return h-Math.floor(h)}
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t
const smooth=(a:number,b:number,x:number)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)}
function noise(x:number,y:number,z:number){
 const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=x-xi,yf=y-yi,zf=z-zi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf)
 const c=(i:number,j:number,k:number)=>hash(xi+i,yi+j,zi+k)
 return lerp(lerp(lerp(c(0,0,0),c(1,0,0),u),lerp(c(0,1,0),c(1,1,0),u),v),lerp(lerp(c(0,0,1),c(1,0,1),u),lerp(c(0,1,1),c(1,1,1),u),v),w)
}
const fbm=(x:number,y:number,z:number)=>{let n=0,a=.5,f=1;for(let i=0;i<4;i++){n+=a*noise(x*f,y*f,z*f);f*=2.03;a*=.5}return n}
/** 2D value noise whose lattice repeats every `period` cells along x (a pattern that runs on across chunk joints). */
function noise2(x:number,z:number,period=1e9,seed=0){
 const xi=Math.floor(x),zi=Math.floor(z),u=smooth(0,1,x-xi),v=smooth(0,1,z-zi),c=(i:number,j:number)=>hash(((xi+i)%period+period)%period,zi+j,seed)
 return lerp(lerp(c(0,0),c(1,0),u),lerp(c(0,1),c(1,1),u),v)
}

export type RockShape={geometry:T.BufferGeometry,base:T.Vector3[],bottom:number,top:number,radius:number}
/** A broken boulder about 2 m across at unit scale: flat fracture faces, a weathered rough skin and a flat bed. */
export function rockShape(seed:number,detail:number):RockShape{
 let g:T.BufferGeometry=new T.IcosahedronGeometry(1,detail);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g)
 const rand=random(seed*977+13),cuts=Array.from({length:7+Math.floor(rand()*4)},()=>({n:new T.Vector3(rand()*2-1,(rand()*2-1)*.8,rand()*2-1).normalize(),d:.58+rand()*.3}))
 const stretch=new T.Vector3(.95+rand()*.4,.55+rand()*.3,.75+rand()*.35),p=g.getAttribute('position') as T.BufferAttribute,v=new T.Vector3()
 for(let i=0;i<p.count;i++){
  v.fromBufferAttribute(p,i)
  v.multiplyScalar(1+.2*(fbm(v.x*1.4+seed*5.1,v.y*1.4,v.z*1.4-seed*2.3)-.47))
  for(const c of cuts){const k=v.dot(c.n)-c.d;if(k>0)v.addScaledVector(c.n,-k*.94)}
  v.multiplyScalar(1+.05*(fbm(v.x*5.3-seed,v.y*5.3+seed*1.7,v.z*5.3)-.47)+.014*(noise(v.x*19,v.y*19,v.z*19+seed)-.5))
  v.multiply(stretch);const bed=-.3*stretch.y;if(v.y<bed)v.y=bed+(v.y-bed)*.1
  p.setXYZ(i,v.x,v.y,v.z)
 }
 const out=toCreasedNormals(g,.62);out.computeBoundingBox();out.computeBoundingSphere()
 const box=out.boundingBox!,pos=out.getAttribute('position'),band=box.min.y+(box.max.y-box.min.y)*.16,seen=new Set<string>(),base:T.Vector3[]=[]
 for(let i=0;i<pos.count;i++){const y=pos.getY(i);if(y>band)continue;const key=`${pos.getX(i).toFixed(3)},${y.toFixed(3)},${pos.getZ(i).toFixed(3)}`;if(seen.has(key))continue;seen.add(key);base.push(new T.Vector3(pos.getX(i),y,pos.getZ(i)))}
 const step=Math.max(1,Math.floor(base.length/40))
 return {geometry:out,base:base.filter((_,i)=>i%step===0),bottom:box.min.y,top:box.max.y,radius:Math.max(box.max.x-box.min.x,box.max.z-box.min.z)*.5}
}

/** Grass tuft: `blades` curved, tapering blades from a small root, dark at the base and lighter toward the tips. */
export function grassTuft(seed:number,blades:number,height:number,segments:number,dryShare:number){
 const rand=random(seed),pos:number[]=[],nor:number[]=[],col:number[]=[],index:number[]=[],up=new T.Vector3(0,1,0)
 const p=new T.Vector3(),tangent=new T.Vector3(),n=new T.Vector3(),side=new T.Vector3()
 for(let b=0;b<blades;b++){
  const a=rand()*Math.PI*2,r=Math.sqrt(rand())*.11,dir=new T.Vector3(Math.cos(a),0,Math.sin(a))
  const lean=.12+rand()*.6,h=height*(.45+rand()*.75),w=.011+rand()*.012,dry=rand()<dryShare,tone=rand(),first=pos.length/3
  side.set(-dir.z,0,dir.x).applyAxisAngle(up,(rand()-.5)*.9);p.set(dir.x*r,0,dir.z*r)
  const root=[.035+.03*tone,.05+.04*tone,.016+.012*tone],tip=dry?[.34+.1*tone,.29+.07*tone,.13+.04*tone]:[.14+.09*tone,.2+.08*tone,.055+.035*tone]
  for(let i=0;i<=segments;i++){
   const t=i/segments,theta=lean*(.25+1.4*t*t);tangent.copy(dir).multiplyScalar(Math.sin(theta)).addScaledVector(up,Math.cos(theta))
   if(i>0)p.addScaledVector(tangent,h/segments)
   n.crossVectors(side,tangent).normalize();if(n.y<0)n.negate();n.multiplyScalar(.4).addScaledVector(up,.6).normalize()
   const shade=.38+.62*Math.pow(t,.7),c=[0,1,2].map(k=>lerp(root[k]!,tip[k]!,t)*shade),width=w*(1-Math.pow(t,1.6))
   const rows=i<segments?[-.5,.5]:[0]
   for(const s of rows){pos.push(p.x+side.x*width*s,p.y,p.z+side.z*width*s);nor.push(n.x,n.y,n.z);col.push(c[0]!,c[1]!,c[2]!)}
  }
  for(let i=0;i<segments-1;i++){const k=first+i*2;index.push(k,k+1,k+3,k,k+3,k+2)}
  const last=first+(segments-1)*2;index.push(last,last+1,last+2)
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(index);g.computeBoundingSphere();return g
}

/** Ground height and slope of a terrain chunk, read from its triangles (x/z grid of 2 m cells). */
function surfaceOf(geometry:T.BufferGeometry,zMin:number,zMax:number){
 const pos=geometry.getAttribute('position'),index=geometry.index,count=index?index.count:pos.count,cells=new Map<string,number[]>(),key=(x:number,z:number)=>Math.floor(x/2)+','+Math.floor(z/2)
 const at=(i:number)=>index?index.getX(i):i
 for(let t=0;t<count;t+=3){
  const zs=[0,1,2].map(k=>pos.getZ(at(t+k)));if(Math.max(...zs)<zMin-2||Math.min(...zs)>zMax+2)continue
  const xs=[0,1,2].map(k=>pos.getX(at(t+k)))
  for(let x=Math.floor(Math.min(...xs)/2);x<=Math.floor(Math.max(...xs)/2);x++)for(let z=Math.floor(Math.min(...zs)/2);z<=Math.floor(Math.max(...zs)/2);z++){const k=x+','+z;let list=cells.get(k);if(!list)cells.set(k,list=[]);list.push(t)}
 }
 const height=(x:number,z:number)=>{
  for(const t of cells.get(key(x,z))??[]){
   const [i,j,k]=[at(t),at(t+1),at(t+2)],ax=pos.getX(i),az=pos.getZ(i),bx=pos.getX(j),bz=pos.getZ(j),cx=pos.getX(k),cz=pos.getZ(k)
   const d=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);if(Math.abs(d)<1e-9)continue
   const u=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/d,v=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/d;if(u<-1e-4||v<-1e-4||u+v>1.0001)continue
   return u*pos.getY(i)+v*pos.getY(j)+(1-u-v)*pos.getY(k)
  }
  return -.22
 }
 const normal=(x:number,z:number,target:T.Vector3)=>target.set(height(x-.4,z)-height(x+.4,z),.8,height(x,z-.4)-height(x,z+.4)).normalize()
 return {height,normal}
}

export const GRASS_BLOCK=32,GRASS_BLOCKS=8
/** Instance matrices (16 floats each) and colours (3 floats each) for one chunk. */
export type VergePlacement={rocks:Float32Array[],grass:{matrices:Float32Array,colours:Float32Array}[][]}
/**
 * Rocks (one list per shape: the first `big` shapes are boulders, the rest small stones) and grass (per 32 m block,
 * per tuft kind) for one chunk of the summer valley.
 */
export function placeVerge(geometry:T.BufferGeometry,variant:number,shapes:RockShape[],big:number,kinds:number):VergePlacement{
 const {height,normal}=surfaceOf(geometry,-7,26),rand=random(variant*31+7),up=new T.Vector3(0,1,0),n=new T.Vector3()
 const q=new T.Quaternion(),tilt=new T.Quaternion(),yaw=new T.Quaternion(),s=new T.Vector3(),at=new T.Vector3(),tmp=new T.Vector3(),m=new T.Matrix4()
 const rocks:number[][]=shapes.map(()=>[]),placed:{x:number,z:number,r:number}[]=[]
 // the slope foot: where the ground begins to climb, every metre along the chunk
 const foot:number[]=[];for(let x=-128;x<=128;x++){let f=24;for(let z=5;z<24;z+=.25)if(height(x,z)>-.12){f=z;break}foot.push(f)}
 const footAt=(x:number)=>foot[Math.round(Math.min(128,Math.max(-128,x)))+128]!
 function rock(x:number,z:number,size:number,k:number,align:number){
  const shape=shapes[k]!,r=shape.radius*size*1.1
  if(x<-126+r||x>126-r||z-r<5.25)return false
  for(const o of placed)if((o.x-x)**2+(o.z-z)**2<((o.r+r)*.78)**2)return false
  normal(x,z,n);q.setFromUnitVectors(up,tmp.copy(up).lerp(n,align).normalize())
  tilt.setFromEuler(new T.Euler((rand()-.5)*.36,0,(rand()-.5)*.36));yaw.setFromAxisAngle(up,rand()*Math.PI*2);q.multiply(tilt).multiply(yaw)
  s.set(size*(.85+rand()*.3),size*(.78+rand()*.42),size*(.85+rand()*.3))
  // lowest placement that keeps every point of the stone's bed under the ground, then sunk further into it
  let lift=Infinity;for(const b of shape.base){tmp.copy(b).multiply(s).applyQuaternion(q);lift=Math.min(lift,height(x+tmp.x,z+tmp.z)-tmp.y)}
  const tall=(shape.top-shape.bottom)*s.y,y=lift-tall*(.1+rand()*.22)
  if(y+shape.top*s.y-height(x,z)<tall*.38)return false
  rocks[k]!.push(...m.compose(at.set(x,y,z),q,s).elements);placed.push({x,z,r});return true
 }
 // talus on the slope foot, gathered in loose fans (never in a row), mostly small with a few big blocks
 for(let a=0,count=0;a<1600&&count<80;a++){
  const x=-124+rand()*248,cluster=smooth(.35,.78,noise2(x/23,.5,1e9,variant*7.7)),bigBlock=rand()<.045*cluster
  if(rand()>.1+.9*cluster)continue
  const size=bigBlock?1.25+rand()*.9:.18+Math.pow(rand(),2.3)*1.05
  if(rock(x,footAt(x)-1.2+Math.pow(rand(),1.4)*6.5,size,Math.floor(rand()*big),.55))count++
 }
 // small stones in the grass, more of them toward the foot of the slope
 for(let a=0,count=0;a<700&&count<150;a++){
  const x=-125+rand()*250,f=footAt(x),z=5.3+Math.pow(rand(),.7)*Math.max(.5,f-4.3)
  if(rock(x,z,.05+Math.pow(rand(),1.8)*.17,big+Math.floor(rand()*(shapes.length-big)),.85))count++
 }
 // grass: a jittered grid thinned by a density that rises softly from the shoulder and breaks into patches
 const grass:{m:number[],c:number[]}[][]=Array.from({length:GRASS_BLOCKS},()=>Array.from({length:kinds},()=>({m:[],c:[]})))
 const cell=.42,colour=new T.Color()
 function tuft(x:number,z:number,density:number,lush:number){
  if(rand()>density)return
  for(const o of placed)if((o.x-x)**2+(o.z-z)**2<(o.r*.72)**2)return
  const y=height(x,z),kind=kinds>1&&rand()<.14*(.4+lush)?1:0,ramp=smooth(5.2,6.8,Math.abs(z))
  normal(x,z,n);q.setFromUnitVectors(up,tmp.copy(up).lerp(n,.45).normalize());yaw.setFromAxisAngle(up,rand()*Math.PI*2);q.multiply(yaw)
  s.setScalar((kind?.8+rand()*.5:.6+rand()*.7)*(.62+.38*lush)*(.65+.35*ramp))
  const block=Math.min(GRASS_BLOCKS-1,Math.max(0,Math.floor((x+128)/GRASS_BLOCK))),list=grass[block]![kind]!
  list.m.push(...m.compose(at.set(x,y-.025,z),q,s).elements)
  const dry=Math.min(1,Math.max(0,.2+.55*noise2(x/14,z/14,1e9,variant+3.3)+.3*(rand()-.5)+.35*(1-lush)))
  colour.setRGB(lerp(.86,1.18,dry),lerp(1,1.02,dry),lerp(.82,.7,dry)).multiplyScalar(.78+.38*rand());list.c.push(colour.r,colour.g,colour.b)
 }
 for(let gx=-127.6;gx<127.6;gx+=cell)for(let gz=5.2;gz<22;gz+=cell){
  const x=gx+rand()*cell,z=gz+rand()*cell,y=height(x,z);normal(x,z,n)
  const lush=smooth(.22,.62,noise2(x/6.5,z/6.5,1e9,variant*5.7)*.7+noise2(x/2.1,z/2.1,1e9,variant*3.3+1)*.3)
  tuft(x,z,smooth(5.25,6.7,z)*smooth(.58,.86,n.y)*(1-smooth(2.5,7,y+.22))*(.22+.78*lush),lush)
 }
 // the narrow strip between the sea-side barrier and the cliff edge
 for(let gx=-127.6;gx<127.6;gx+=cell)for(let gz=-5.85;gz<-4.7;gz+=cell){
  const x=gx+rand()*cell,z=gz+rand()*cell,lush=smooth(.3,.7,noise2(x/5,z/5,1e9,variant*2.9+5))
  tuft(x,z,smooth(-4.75,-5.3,z)*(.12+.6*lush),lush)
 }
 return {rocks:rocks.map(r=>new Float32Array(r)),grass:grass.map(b=>b.map(k=>({matrices:new Float32Array(k.m),colours:new Float32Array(k.c)})))}
}

const lum='vec3(.2126,.7152,.0722)'
/** Sine-free hash and value noise for every verge shader; the lattice repeats every `period` cells along x. */
export const vergeGlsl=`
float vgHash(vec2 p,float period){p.x=mod(p.x,period);vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float vgNoise(vec2 p,float period){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(vgHash(i,period),vgHash(i+vec2(1.,0.),period),f.x),mix(vgHash(i+vec2(0.,1.),period),vgHash(i+vec2(1.,1.),period),f.x),f.y);}
// compacted gravel and dust of the shoulder; p in chunk metres (all lattices repeat over the 256 m chunk), grain = rock-scan luminance
vec3 vergeGravel(vec2 p,float grain){
 // the finest stones fade into their average before they are smaller than a pixel
 float fine=1.-smoothstep(.3,.9,max(fwidth(p.x),fwidth(p.y))*12.5),stones=vgNoise(p*3.125,800.)*.6+mix(.5,vgNoise(p*12.5,3200.),fine)*.4,tone=vgNoise(p*.25,64.);
 return mix(vec3(.105,.1,.09),vec3(.27,.252,.225),clamp(grain*1.3-.1+.55*(stones-.5),0.,1.))*(.88+.24*tone);
}
// the ground under the grass: soil and dry thatch
vec3 vergeMeadow(vec2 p,float grain){
 float dry=vgNoise(p*.125,32.)*.6+vgNoise(p*.5,128.)*.4;
 vec3 soil=mix(vec3(.085,.075,.05),vec3(.16,.14,.09),clamp(grain*1.4-.2,0.,1.));
 return mix(soil,mix(vec3(.075,.1,.035),vec3(.22,.2,.1),dry),.55+.3*(dry-.5));
}
`
const terrainFog=`#ifdef USE_FOG
 gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,smoothstep(300.,620.,length(vViewPosition)));
 #endif`

/** Triplanar rock-face material for instanced stones, in the valley cliff's tones; darker and dustier at the ground. */
export function rockMaterial(map:T.Texture,normalMap:T.Texture,roughnessMap:T.Texture){
 const m=new T.MeshStandardMaterial({color:'#ffffff',roughness:1,envMapIntensity:.55})
 m.onBeforeCompile=s=>{
  s.uniforms.rockColour={value:map};s.uniforms.rockNormal={value:normalMap};s.uniforms.rockRough={value:roughnessMap}
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 rockPoint,rockAxis;varying float rockFoot,rockSeed;').replace('#include <begin_vertex>',`#include <begin_vertex>
  #ifdef USE_INSTANCING
  rockPoint=(instanceMatrix*vec4(position,1.)).xyz;rockAxis=normalize(mat3(instanceMatrix)*(objectNormal/vec3(dot(instanceMatrix[0].xyz,instanceMatrix[0].xyz),dot(instanceMatrix[1].xyz,instanceMatrix[1].xyz),dot(instanceMatrix[2].xyz,instanceMatrix[2].xyz))));
  rockSeed=fract(dot(instanceMatrix[3].xz,vec2(.1031,.1173))*7.13);
  #else
  rockPoint=position;rockAxis=objectNormal;rockSeed=.5;
  #endif
  rockFoot=position.y;`)
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
  varying vec3 rockPoint,rockAxis;varying float rockFoot,rockSeed;uniform sampler2D rockColour,rockNormal,rockRough;
  ${vergeGlsl}
  vec3 rkWeights(){vec3 w=pow(abs(normalize(rockAxis)),vec3(6.));return w/(w.x+w.y+w.z);}
  vec3 rkTri(sampler2D t,vec3 p,vec3 w){return texture2D(t,p.zy).rgb*w.x+texture2D(t,p.xz).rgb*w.y+texture2D(t,p.xy).rgb*w.z;}`).replace('#include <map_fragment>',`#include <map_fragment>
  vec3 rkW=rkWeights(),rkP=rockPoint*.43+rockSeed*7.;
  vec3 rkAlbedo=rkTri(rockColour,rkP,rkW);float rkGrain=dot(rkAlbedo,${lum});
  // the cliff's grey-brown stone: mostly the scan's luminance, a little of its colour, a cool or warm cast per stone
  vec3 rkStone=mix(vec3(rkGrain)*vec3(1.07,1.01,.93),rkAlbedo,.3)*mix(vec3(.94,.97,1.02),vec3(1.1,1.,.84),rockSeed);
  float rkUp=normalize(rockAxis).y,rkLichen=smoothstep(.55,.8,vgNoise(rockPoint.xz*1.7+rockSeed*31.,1e6))*smoothstep(.35,.85,rkUp);
  rkStone=mix(rkStone,rkStone*vec3(.84,.95,.74),rkLichen*.55);
  // contact: soil climbs the bed of the stone and the crevice under it is dark
  float rkContact=smoothstep(.0,.35,rockFoot+.3);
  rkStone=mix(vec3(.1,.088,.064)*(.7+.6*rkGrain),rkStone,.35+.65*rkContact)*(.55+.45*smoothstep(-.05,.3,rockFoot+.3));
  diffuseColor.rgb=mix(vec3(dot(rkStone,vec3(.2126,.7152,.0722))),rkStone,.75)*.82;`).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
  roughnessFactor=clamp(rkTri(rockRough,rkP,rkW).g*1.05+.06,.62,1.);`).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
  {vec3 an=normalize(rockAxis),tX=texture2D(rockNormal,rkP.zy).xyz*2.-1.,tY=texture2D(rockNormal,rkP.xz).xyz*2.-1.,tZ=texture2D(rockNormal,rkP.xy).xyz*2.-1.;
   tX=vec3(tX.xy*1.2+an.zy,abs(tX.z)*an.x);tY=vec3(tY.xy*1.2+an.xz,abs(tY.z)*an.y);tZ=vec3(tZ.xy*1.2+an.xy,abs(tZ.z)*an.z);
   vec3 local=normalize(tX.zyx*rkW.x+tY.xzy*rkW.y+tZ.xyz*rkW.z);normal=normalize((viewMatrix*vec4(local,0.)).xyz);}`).replace('#include <fog_fragment>',terrainFog)
 }
 m.customProgramCacheKey=()=> 'verge-rock-v3'
 return m
}

/** Grass blades: vertex colours times the tuft's colour, lit with an up-leaning normal on both faces, swaying in the
 *  wind and sinking into the ground with distance (the terrain's own grass tone takes over there). */
export function grassMaterial(time:T.IUniform<number>){
 const m=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.8,metalness:0,envMapIntensity:.5})
 m.onBeforeCompile=s=>{
  s.uniforms.grassTime=time
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float grassTime;').replace('#include <begin_vertex>',`#include <begin_vertex>
  #ifdef USE_INSTANCING
  vec3 tuftAt=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
  float gust=sin(grassTime*1.3+tuftAt.x*.19+tuftAt.z*.23)*.6+sin(grassTime*2.9+tuftAt.x*.61-tuftAt.z*.4)*.25;
  vec3 wind=(vec4(.07,0.,.045,0.)*instanceMatrix).xyz/max(dot(instanceMatrix[0].xyz,instanceMatrix[0].xyz),1e-4);
  transformed+=wind*gust*position.y*position.y*3.;
  transformed*=1.-smoothstep(42.,80.,distance(tuftAt,cameraPosition));
  #endif`)
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_begin>','float faceDirection=gl_FrontFacing?1.:-1.;vec3 normal=normalize(vNormal);vec3 nonPerturbedNormal=normal;')
 }
 m.customProgramCacheKey=()=> 'verge-grass-v1'
 return m
}

/** Gravel shoulder of the summer road (both sides), sloping from the asphalt edge under the verge ground. */
export function shoulderGeometry(){
 const sides=[[[3.72,.004],[3.86,-.006],[4.2,-.035],[4.6,-.085],[5,-.16],[5.45,-.25]],[[-3.72,.004],[-3.86,-.006],[-4.2,-.03],[-4.7,-.1],[-5.2,-.25]]]
 const pos:number[]=[],index:number[]=[]
 for(const profile of sides){const first=pos.length/3,rows=profile.length
  for(let x=-128;x<=128;x+=2)for(const [z,y] of profile)pos.push(x,y!,z!)
  for(let i=0;i<128;i++)for(let j=0;j<rows-1;j++){const a=first+i*rows+j,b=a+rows;profile[0]![0]!>0?index.push(a,a+1,b,b,a+1,b+1):index.push(a,b,a+1,b,b+1,a+1)}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(index);g.computeVertexNormals();g.computeBoundingSphere();return g
}
export function shoulderMaterial(rock:T.Texture){
 const m=new T.MeshStandardMaterial({color:'#ffffff',roughness:.96,envMapIntensity:.3})
 m.onBeforeCompile=s=>{
  s.uniforms.rockDetail={value:rock}
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 shoulderPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nshoulderPoint=position;')
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
  varying vec3 shoulderPoint;uniform sampler2D rockDetail;${vergeGlsl}`).replace('#include <map_fragment>',`#include <map_fragment>
  float shGrain=dot(texture2D(rockDetail,shoulderPoint.xz*.875).rgb,${lum});
  diffuseColor.rgb=vergeGravel(shoulderPoint.xz,shGrain)*(1.-.16*(1.-smoothstep(3.8,4.5,abs(shoulderPoint.z))));`).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
  {vec3 dpdx=dFdx(-vViewPosition),dpdy=dFdy(-vViewPosition),r1=cross(dpdy,normal),r2=cross(normal,dpdx);float det=dot(dpdx,r1);
   float hgt=shGrain+.5*vgNoise(shoulderPoint.xz*12.5,3200.);normal=normalize(abs(det)*normal-sign(det)*(dFdx(hgt)*r1+dFdy(hgt)*r2)*.012);}`).replace('#include <fog_fragment>',terrainFog)
 }
 m.customProgramCacheKey=()=> 'verge-shoulder-v1'
 return m
}

/** Ploughed snow banks along both edges of the winter road for one chunk; their height runs on across chunk joints. */
export function snowBankGeometry(variant:number){
 const pos:number[]=[],uv:number[]=[],across:number[]=[],index:number[]=[],cols=11
 for(const side of [1,-1]){const first=pos.length/3
  for(let x=-128;x<=128;x+=1){const g=(variant*256+x+128)
   const crest=.2+.22*noise2(g/8,side*3.7,512,11)+.07*noise2(g/2.56,side*5.1,1600,12)
   for(let j=0;j<cols;j++){const u=j/(cols-1),z=side*(3.5+u*2.15)
    const lump=.035*(noise2(g/1.6,u*4+side*9,2560,13)-.5),body=Math.pow(Math.sin(Math.PI*Math.min(1,u/.96)),.75)*(1-.3*u)
    const y=lerp(.012,-.245,smooth(.42,1,u))+(crest+lump)*body
    pos.push(x,y,z);uv.push(x*.5,z*.5);across.push(u)}
  }
  for(let i=0;i<256;i++)for(let j=0;j<cols-1;j++){const a=first+i*cols+j,b=a+cols;side>0?index.push(a,a+1,b,b,a+1,b+1):index.push(a,b,a+1,b,b+1,a+1)}
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setAttribute('across',new T.Float32BufferAttribute(across,1));geo.setIndex(index);geo.computeVertexNormals();geo.computeBoundingSphere();return geo
}
export function snowBankMaterial(map:T.Texture,normalMap:T.Texture,roughnessMap:T.Texture){
 const m=new T.MeshStandardMaterial({map,normalMap,roughnessMap,normalScale:new T.Vector2(.8,.8),color:'#ffffff',roughness:1,envMapIntensity:.6})
 m.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float across;varying float bankAcross;varying vec3 bankPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nbankAcross=across;bankPoint=position;')
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
  varying float bankAcross;varying vec3 bankPoint;${vergeGlsl}`).replace('#include <map_fragment>',`#include <map_fragment>
  // clean wind-packed snow on top; grey plough spray and grit low on the road side
  float bkGrey=dot(diffuseColor.rgb,${lum}),bkGrime=(1.-smoothstep(.04,.3+.12*vgNoise(bankPoint.xz*vec2(.5,2.),128.),bankAcross))*(.55+.45*vgNoise(bankPoint.xz*vec2(2.,4.),512.));
  diffuseColor.rgb=mix(diffuseColor.rgb*vec3(.9,.95,1.02),vec3(bkGrey)*vec3(.5,.51,.53),bkGrime*.7);`).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
  roughnessFactor=mix(max(.72,roughnessFactor),.5,bkGrime*.6);`).replace('#include <fog_fragment>',`#ifdef USE_FOG
  gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,smoothstep(fogNear,fogFar,length(vViewPosition)));
  #endif`)
 }
 m.customProgramCacheKey=()=> 'verge-snow-bank-v1'
 return m
}
