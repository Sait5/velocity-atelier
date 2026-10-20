import * as T from 'three'
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js'

/**
 * Roadside rocks and shrubs for the summer valley. Rocks are noise-shaped boulders (two base shapes, each instance turned
 * and stretched differently) textured with the same rock-face maps as the slopes. Positions are fixed per terrain chunk
 * (seeded), on the mountain-side verge and the foot of the slope, set onto the chunk's own surface.
 */
const random=(seed:number)=>{let s=(seed*2654435761)>>>0||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
const hash=(x:number,y:number,z:number)=>{const h=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return h-Math.floor(h)}
function noise(x:number,y:number,z:number){
 const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=x-xi,yf=y-yi,zf=z-zi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf)
 const lerp=(a:number,b:number,t:number)=>a+(b-a)*t,c=(i:number,j:number,k:number)=>hash(xi+i,yi+j,zi+k)
 return lerp(lerp(lerp(c(0,0,0),c(1,0,0),u),lerp(c(0,1,0),c(1,1,0),u),v),lerp(lerp(c(0,0,1),c(1,0,1),u),lerp(c(0,1,1),c(1,1,1),u),v),w)
}
const fbm=(x:number,y:number,z:number)=>{let n=0,a=.5,f=1;for(let i=0;i<4;i++){n+=a*noise(x*f,y*f,z*f);f*=2.03;a*=.5}return n}

/** A boulder about 2 m across and 1.2 m tall at unit scale, flat underneath, with planar UVs per face (metre scale). */
export function rockGeometry(seed:number){
 let g:T.BufferGeometry=new T.IcosahedronGeometry(1,4);g.deleteAttribute('normal');g.deleteAttribute('uv')
 const p=g.getAttribute('position') as T.BufferAttribute,v=new T.Vector3()
 for(let i=0;i<p.count;i++){
  v.fromBufferAttribute(p,i);const r=1+.42*(fbm(v.x*1.3+seed*7.1,v.y*1.3,v.z*1.3-seed*3.3)-.47)+.14*(fbm(v.x*3.6-seed,v.y*3.6+seed*2.1,v.z*3.6)-.47)
  v.multiplyScalar(r);v.y*=.6;if(v.y< -.22)v.y=-.22+(v.y+.22)*.15;p.setXYZ(i,v.x,v.y,v.z)
 }
 g=mergeVertices(g);g.computeVertexNormals();g=g.toNonIndexed()
 const pos=g.getAttribute('position'),uv=new Float32Array(pos.count*2),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),n=new T.Vector3()
 for(let i=0;i<pos.count;i+=3){
  a.fromBufferAttribute(pos,i);b.fromBufferAttribute(pos,i+1);c.fromBufferAttribute(pos,i+2);n.subVectors(c,b).cross(a.clone().sub(b)).normalize()
  const ax=Math.abs(n.x),ay=Math.abs(n.y),az=Math.abs(n.z)
  for(let k=0;k<3;k++){v.fromBufferAttribute(pos,i+k);const [s,t]=ay>=ax&&ay>=az?[v.x,v.z]:ax>=az?[v.z,v.y]:[v.x,v.y];uv[(i+k)*2]=s*.5+seed*.37;uv[(i+k)*2+1]=t*.5+seed*.61}
 }
 g.setAttribute('uv',new T.BufferAttribute(uv,2));g.computeBoundingSphere();return g
}

/** Ground height of a terrain chunk inside a band of z, read from its triangles (x/z grid of 2 m cells). */
function surfaceOf(geometry:T.BufferGeometry,zMin:number,zMax:number){
 const pos=geometry.getAttribute('position'),index=geometry.index,count=index?index.count:pos.count,cells=new Map<string,number[]>(),key=(x:number,z:number)=>Math.floor(x/2)+','+Math.floor(z/2)
 const at=(i:number)=>index?index.getX(i):i
 for(let t=0;t<count;t+=3){
  const zs=[0,1,2].map(k=>pos.getZ(at(t+k)));if(Math.max(...zs)<zMin-2||Math.min(...zs)>zMax+2)continue
  const xs=[0,1,2].map(k=>pos.getX(at(t+k)))
  for(let x=Math.floor(Math.min(...xs)/2);x<=Math.floor(Math.max(...xs)/2);x++)for(let z=Math.floor(Math.min(...zs)/2);z<=Math.floor(Math.max(...zs)/2);z++){const k=x+','+z;let list=cells.get(k);if(!list)cells.set(k,list=[]);list.push(t)}
 }
 return (x:number,z:number)=>{
  for(const t of cells.get(key(x,z))??[]){
   const [i,j,k]=[at(t),at(t+1),at(t+2)],ax=pos.getX(i),az=pos.getZ(i),bx=pos.getX(j),bz=pos.getZ(j),cx=pos.getX(k),cz=pos.getZ(k)
   const d=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);if(Math.abs(d)<1e-9)continue
   const u=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/d,v=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/d;if(u<-1e-4||v<-1e-4||u+v>1.0001)continue
   return u*pos.getY(i)+v*pos.getY(j)+(1-u-v)*pos.getY(k)
  }
  return -.2
 }
}

export type Placement={rocks:T.Matrix4[][],shrubs:T.Matrix4[]}
/** Rock clusters (split over the two base shapes) and shrubs for one chunk, in the chunk's local frame. */
export function placeRoadside(geometry:T.BufferGeometry,variant:number):Placement{
 const height=surfaceOf(geometry,4,16),rand=random(variant+11),rocks:T.Matrix4[][]=[[],[]],shrubs:T.Matrix4[]=[]
 const q=new T.Quaternion(),e=new T.Euler(),s=new T.Vector3(),at=new T.Vector3()
 function rock(x:number,z:number,size:number,footing:number){
  const y=height(x,z);e.set((rand()-.5)*.35,rand()*Math.PI*2,(rand()-.5)*.35);q.setFromEuler(e)
  s.set(size*(.75+rand()*.55),size*(.6+rand()*.5),size*(.75+rand()*.55));at.set(x,y+s.y*footing,z)
  rocks[Math.floor(rand()*2)]!.push(new T.Matrix4().compose(at,q,s))
 }
 // Clusters along the chunk: small stones on the flat verge, heavier boulders where the slope begins.
 for(let c=0;c<14;c++){
  const x=-124+(c+rand()*.85)*17.6,foot=rand()<.5,z=foot?9.6+rand()*3.4:6.2+rand()*3,members=2+Math.floor(rand()*(foot?3:4))
  for(let m=0;m<members;m++){const size=foot?(m?.45+rand()*.5:.9+rand()*.8):(m?.16+rand()*.24:.34+rand()*.42);rock(x+(rand()-.5)*(foot?5:3.5),Math.max(foot?8.8:5.9,z+(rand()-.5)*2.2),size,foot?.12:.16)}
 }
 // Shrubs grow in loose clumps (never in a row), a few near the stones.
 for(let c=0;c<5;c++){const cx=-118+(c+rand()*.7)*49,cz=9.2+rand()*3,n=2+Math.floor(rand()*3)
  for(let i=0;i<n;i++){const x=cx+(rand()-.5)*4.5,z=Math.max(8.4,cz+(rand()-.5)*2.4),y=height(x,z),size=.3+rand()*.5;q.setFromEuler(e.set(0,rand()*Math.PI*2,0));shrubs.push(new T.Matrix4().compose(at.set(x,y-.1,z),q,s.setScalar(size)))}}
 return {rocks,shrubs}
}

/** Rock-face material matched to the valley slopes (muted colour, same distance fog as the other roadside objects). */
export function rockMaterial(map:T.Texture,normalMap:T.Texture,roughnessMap:T.Texture){
 const m=new T.MeshStandardMaterial({map,normalMap,roughnessMap,color:'#e4dfd6',roughness:1,normalScale:new T.Vector2(1.15,1.15),envMapIntensity:.7})
 m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 diffuseColor.rgb=mix(vec3(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))),diffuseColor.rgb,.25);`).replace('#include <fog_fragment>',`#ifdef USE_FOG
 gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,smoothstep(220.,520.,length(vViewPosition)));
 #endif`)};m.customProgramCacheKey=()=> 'mountain-roadside-rock-v2'
 return m
}
