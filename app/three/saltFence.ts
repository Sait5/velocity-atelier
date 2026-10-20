import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'

/**
 * Salt-flat roadside barrier, one 160 m tile at a time (tile-local x -80…80, both sides of the road): a pressed W-beam
 * rail on I-section steel posts every 2 m with spacer blocks, retroreflectors every 12 m (amber on the lake side, white
 * on the other). Hot-dip galvanised finish: zinc spangle in the roughness, faint run-off streaks and a white salt crust
 * creeping up from the ground. Patterns are in tile-local space, so they stay put on the rail while the tiles recycle.
 */
const RAIL_FACE=4.04,SPACING=2,REFLECTOR_EVERY=12

// W-beam cross-section: (depth toward the road, height), 83 mm deep and 310 mm tall, two rounded corrugations.
const PROFILE:[number,number][]=[[0,0],[.012,.012],[.045,.04],[.072,.068],[.083,.098],[.08,.118],[.052,.14],[.026,.155],[.052,.17],[.08,.192],[.083,.212],[.072,.242],[.045,.27],[.012,.298],[0,.31]]

function railGeometry(level:number){
 const positions:number[]=[],indices:number[]=[],thick=.0035,height=level+.395,rows:[number,number][]=[...PROFILE.map(([d,h])=>[d,h] as [number,number]),...[...PROFILE].reverse().map(([d,h])=>[d-thick,h] as [number,number])]
 // one closed shell per side; the +z rail faces -z (toward the road) and vice versa
 for(const side of [1,-1]){
  const start=positions.length/3
  for(const x of [-80,80])for(const [d,h] of rows)positions.push(x,height+h,side*(RAIL_FACE+.083-d))
  const n=rows.length;for(let i=0;i<n;i++){const j=(i+1)%n,a=start+i,b=start+j,c=start+n+j,e=start+n+i;if(side>0)indices.push(a,b,c,a,c,e);else indices.push(a,c,b,a,e,c)}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g
}

/** A pair of I-section posts with their spacer blocks, one each side of the road, at x = 0. */
function postGeometry(level:number){
 const flange=.1,depth=.15,tf=.0085,tw=.0058,shape=new T.Shape()
 shape.moveTo(-flange/2,-depth/2);shape.lineTo(flange/2,-depth/2);shape.lineTo(flange/2,-depth/2+tf);shape.lineTo(tw/2,-depth/2+tf);shape.lineTo(tw/2,depth/2-tf);shape.lineTo(flange/2,depth/2-tf);shape.lineTo(flange/2,depth/2)
 shape.lineTo(-flange/2,depth/2);shape.lineTo(-flange/2,depth/2-tf);shape.lineTo(-tw/2,depth/2-tf);shape.lineTo(-tw/2,-depth/2+tf);shape.lineTo(-flange/2,-depth/2+tf);shape.closePath()
 const bottom=level-.5,top=level+.68
 const post=new T.ExtrudeGeometry(shape,{depth:top-bottom,bevelEnabled:false});post.rotateX(-Math.PI/2);post.translate(0,bottom,RAIL_FACE+.083+.1+depth/2)
 const spacer=new T.ExtrudeGeometry(shape,{depth:.3,bevelEnabled:false});spacer.rotateX(-Math.PI/2);spacer.scale(.9,1,.62);spacer.translate(0,level+.4,RAIL_FACE+.083+.05)
 const cap=new T.BoxGeometry(flange+.01,.006,depth+.01);cap.translate(0,top+.003,RAIL_FACE+.083+.1+depth/2)
 const one=mergeGeometries([post,spacer,cap.toNonIndexed()].map(g=>{g.deleteAttribute('uv');g.deleteAttribute('normal');return g}))!
 // mirror for the far side, swapping two corners of every triangle to keep the faces pointing outward
 const other=one.clone();other.scale(1,1,-1);const p=other.getAttribute('position') as T.BufferAttribute
 for(let i=0;i<p.count;i+=3){const x=p.getX(i+1),y=p.getY(i+1),z=p.getZ(i+1);p.setXYZ(i+1,p.getX(i+2),p.getY(i+2),p.getZ(i+2));p.setXYZ(i+2,x,y,z)}
 const pair=mergeGeometries([one,other])!;pair.computeVertexNormals();return pair
}

function galvanised(level:number){
 const m=new T.MeshStandardMaterial({color:'#d3d7d8',metalness:.8,roughness:.34,envMapIntensity:1.1})
 m.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 fencePoint;').replace('#include <begin_vertex>',`#include <begin_vertex>
 vec4 fenceLocal=vec4(transformed,1.);
 #ifdef USE_INSTANCING
 fenceLocal=instanceMatrix*fenceLocal;
 #endif
 fencePoint=fenceLocal.xyz;`)
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 fencePoint;
 float fenceHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
 float fenceNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(fenceHash(i),fenceHash(i+vec3(1,0,0)),f.x),mix(fenceHash(i+vec3(0,1,0)),fenceHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(fenceHash(i+vec3(0,0,1)),fenceHash(i+vec3(1,0,1)),f.x),mix(fenceHash(i+vec3(0,1,1)),fenceHash(i+vec3(1,1,1)),f.x),f.y),f.z);}`)
  .replace('#include <map_fragment>',`#include <map_fragment>
 float spangle=fenceNoise(fencePoint*70.)*.6+fenceNoise(fencePoint*23.)*.4;
 float streak=fenceNoise(fencePoint*vec3(3.1,.35,3.1));
 float crust=smoothstep(${(level+.32).toFixed(3)},${(level-.06).toFixed(3)},fencePoint.y+fenceNoise(fencePoint*vec3(6.,2.,6.))*.14);
 diffuseColor.rgb*=.96+.06*spangle-.05*smoothstep(.55,.85,streak);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.9,.89,.86),crust*.85);`)
  .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 roughnessFactor=clamp(roughnessFactor+(spangle-.5)*.08+.08*smoothstep(.55,.85,streak),.2,1.);roughnessFactor=mix(roughnessFactor,.86,crust);`)
  .replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
 metalnessFactor=mix(metalnessFactor,.15,crust);`)
 }
 m.customProgramCacheKey=()=> 'salt-galvanised-fence-v2';return m
}

export function createSaltFence(level:number){
 const rail=railGeometry(level),post=postGeometry(level),reflector=new T.BoxGeometry(.05,.07,.012)
 const steel=galvanised(level),amber=new T.MeshStandardMaterial({color:'#ffae3a',emissive:'#a85a0c',emissiveIntensity:.35,roughness:.3,metalness:0}),white=new T.MeshStandardMaterial({color:'#f4f4f0',emissive:'#6a6a66',emissiveIntensity:.3,roughness:.3,metalness:0})
 const posts=Math.round(160/SPACING),reflectors=Math.round(160/REFLECTOR_EVERY),m=new T.Matrix4()
 /** One tile's barrier. Near tiles cast shadows and carry the reflectors. */
 function tile(near:boolean){
  const group=new T.Group();group.name='Salt flat barrier'
  const beam=new T.Mesh(rail,steel);beam.castShadow=near;beam.receiveShadow=near;group.add(beam)
  const stands=new T.InstancedMesh(post,steel,posts);stands.castShadow=near;stands.receiveShadow=near
  for(let i=0;i<posts;i++){m.makeTranslation(-79+i*SPACING,0,0);stands.setMatrixAt(i,m)}
  stands.computeBoundingSphere();group.add(stands)
  if(near)for(const side of [1,-1]){const lights=new T.InstancedMesh(reflector,side>0?white:amber,reflectors);for(let i=0;i<reflectors;i++){m.makeTranslation(-78+i*REFLECTOR_EVERY+1,level+.395+.155,side*(RAIL_FACE+.083-.026-.006));lights.setMatrixAt(i,m)}lights.computeBoundingSphere();group.add(lights)}
  return group
 }
 return {tile,materials:[steel,amber,white],dispose(){for(const g of [rail,post,reflector])g.dispose();for(const x of [steel,amber,white])x.dispose()}}
}
