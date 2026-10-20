import * as T from 'three'

/**
 * Motion blur for wheels turning at their true rate (v/r). Above walking pace a five-spoke rim turns so far per frame that
 * the spokes strobe; a camera would smear them. Each wheel's spoke zone is found from its own geometry (spokes are the
 * part that does not repeat when turned about the axis; tyre, barrel and disc do), then:
 *  - the sharp wheel stops drawing the spoke zone and a set of copies of it, spread over the shutter arc and blended,
 *    draws it instead (translucent where spokes cover only part of the circle, as on film);
 *  - the tyre's lettering and tread fade into the tyre's average colour, as a fast-turning tyre does.
 * At low speed the copies collapse onto one another and match the sharp wheel exactly, so there is no switch-over pop.
 * Cost is kept low: only the meshes that really are spokes are copied (drilled discs and rings stay sharp), all spoke
 * triangles of a wheel are merged into one geometry with their texture colour baked in, and the copies use a matte
 * Lambert material — one extra draw call per wheel.
 */
const COPIES=12,SHUTTER=.5/60

type Zone={hub:number,rim:number,near:number,far:number,tyre:T.Color,period:number,spokeMeshes:Set<T.Mesh>}

function analyse(wheel:T.Group):Zone{
 wheel.updateWorldMatrix(true,true);const inverse=wheel.matrixWorld.clone().invert(),v=new T.Vector3(),points:number[][]=[],cell=.006,grid=new Map<string,number[]>()
 const meshes:T.Mesh[]=[];wheel.traverse(o=>{if(o instanceof T.Mesh&&!(o instanceof T.InstancedMesh))meshes.push(o)})
 let outer=0;const maps:{mesh:T.Mesh,uv:number[][]}[]=[],totals=meshes.map(()=>0)
 for(const [meshIndex,mesh] of meshes.entries()){
  const g=mesh.geometry,pos=g.getAttribute('position'),uv=g.getAttribute('uv'),idx=g.index,n=idx?idx.count:pos.count,at=(i:number)=>idx?idx.getX(i):i,m=inverse.clone().multiply(mesh.matrixWorld),uvs:number[][]=[]
  for(let t=0;t<n;t+=3){let x=0,y=0,z=0;for(let k=0;k<3;k++){v.fromBufferAttribute(pos,at(t+k)).applyMatrix4(m);x+=v.x;y+=v.y;z+=v.z}x/=3;y/=3;z/=3;const r=Math.hypot(x,y);outer=Math.max(outer,r);points.push([x,y,z,r,meshIndex]);totals[meshIndex]!++
   if(uv)uvs.push([(uv.getX(at(t))+uv.getX(at(t+1))+uv.getX(at(t+2)))/3,(uv.getY(at(t))+uv.getY(at(t+1))+uv.getY(at(t+2)))/3,r])
   const key=Math.floor(x/cell)+','+Math.floor(y/cell)+','+Math.floor(z/cell);let list=grid.get(key);if(!list)grid.set(key,list=[]);list.push(points.length-1)}
  maps.push({mesh,uv:uvs})
 }
 const near=(x:number,y:number,z:number,tol:number)=>{const cx=Math.floor(x/cell),cy=Math.floor(y/cell),cz=Math.floor(z/cell);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let c=-1;c<=1;c++)for(const j of grid.get((cx+a)+','+(cy+b)+','+(cz+c))??[]){const p=points[j]!;if((p[0]!-x)**2+(p[1]!-y)**2+(p[2]!-z)**2<tol*tol)return true}return false}
 const odd:number[][]=[]
 for(const p of points){const [x,y,z,r]=p as [number,number,number,number];if(r<.03||r>outer*.85)continue;let repeats=false
  for(const f of [3,4,5,6,7,8,9,10,12]){let hits=0;for(const s of [1,-1]){const a=s*2*Math.PI/f,c=Math.cos(a),sn=Math.sin(a);if(near(x*c-y*sn,x*sn+y*c,z,Math.max(.004,r*.025)))hits++}if(hits===2){repeats=true;break}}
  if(!repeats)odd.push(p)}
 const pick=(values:number[],q:number)=>{const s=[...values].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(q*(s.length-1)))]??0}
 // fall back to a typical low-profile wheel when the analysis finds too little (rim at 74 % of the tyre radius)
 // Spokes span from the hub nut to the rim lip. With a true axle (wheelAxis.ts) a wheel is almost perfectly symmetric, so the
 // non-repeating triangles are too few to measure the rim from; a low-profile tyre puts the rim at ~74 % of its radius.
 const rim=odd.length>400?Math.min(outer*.86,pick(odd.map(p=>p[3]!),.97)+.004):outer*.74,hub=.062
 // The zone runs from the spokes' inner edge out to the wheel's outboard face; the spokes sit on the outboard side of the
 // wheel's middle, which tells which way along the axis that is.
 const faces=points.map(p=>p[2]!),low=pick(faces,0),high=pick(faces,1)
 // the hub (and so the spoke face) sits on the outboard side of the tyre's middle: that tells which way along the axis is out
 const tread=points.filter(p=>p[3]!>outer*.97),hubPoints=points.filter(p=>p[3]!<.08),mean=(a:number[][])=>a.reduce((s,p)=>s+p[2]!,0)/Math.max(1,a.length)
 const outboard=mean(hubPoints)<mean(tread)?-1:1,middle=mean(tread)
 const inner=middle
 // Spoke pitch from the angular pattern of the spoke zone: the smallest n-fold turn that maps it onto itself. Spreading the
 // blur copies over one spoke pitch gives the full, even smear (the pattern only repeats beyond that).
const zs=odd.map(p=>p[2]!);void zs
 const histogram=new Float32Array(360);odd.forEach(p=>{histogram[Math.floor(((Math.atan2(p[1]!,p[0]!)*180/Math.PI)+360)%360)]!+=1})
 const score=(f:number)=>{let sum=0;const shift=Math.round(360/f);for(let i=0;i<360;i++)sum+=histogram[i]!*histogram[(i+shift)%360]!;return sum},folds=[3,4,5,6,7,8,9,10,12,14,15,16,18,20],scores=folds.map(score),top=Math.max(...scores)
 const spokes=odd.length>40?Math.min(...folds.filter((_,i)=>scores[i]!>=top*.8)):5
 // Parts that repeat round the axis (drilled discs, rotor rings, the tyre) do not strobe: only meshes with a real share of
 // non-repeating triangles are spokes; the rest stay sharp and are never copied.
 // spoke meshes: those with a real number of triangles between the hub nut and the rim lip on the outboard side
 const inZone=(p:number[])=>p[3]!>hub&&p[3]!<rim-.012&&(outboard<0?p[2]!<inner&&p[2]!>low-.02:p[2]!>inner&&p[2]!<high+.02)
 const zoneCount=meshes.map(()=>0);points.forEach(p=>{if(inZone(p))zoneCount[p[4]!]!++})
 const spokeMeshes=new Set(meshes.filter((_,i)=>zoneCount[i]!>=150))
 wheel.userData.blurStats=meshes.map((m,i)=>m.name.slice(0,24)+':'+zoneCount[i]+'/'+totals[i])
 const zone:Zone={hub,rim:rim-.012,near:outboard<0?low-.02:inner,far:outboard<0?inner:high+.02,tyre:new T.Color(.03,.03,.03),period:Math.max(Math.PI*2/spokes,Math.PI*2/5),spokeMeshes}
 // tyre's average colour from its own texture (sRGB texels -> linear)
 for(const {mesh,uv} of maps){const material=[mesh.material].flat()[0] as T.MeshStandardMaterial,read=texelReader(material)
  const tyre=uv.filter(u=>u[2]!>rim+.02);if(!tyre.length)continue
  const sum=new T.Color(0,0,0);for(const [u,w] of tyre)sum.add(read(u!,w!));zone.tyre.copy(sum.multiplyScalar(1/tyre.length))
 }
 return zone
}

/** Texel colour (linear, times the material colour) at a UV, or the material colour when it has no texture. */
function texelReader(material:T.MeshStandardMaterial){
 const image=material.map?.image as CanvasImageSource&{width:number,height:number}|undefined,base=material.color?.clone()??new T.Color(1,1,1)
 if(!image?.width)return ()=>base
 try{
  const size=256,c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(image,0,0,size,size)
  const data=ctx.getImageData(0,0,size,size).data,colour=new T.Color()
  return (u:number,v:number)=>{const x=Math.floor(T.MathUtils.euclideanModulo(u,1)*(size-1)),y=Math.floor(T.MathUtils.euclideanModulo(material.map!.flipY?1-v:v,1)*(size-1)),i=(y*size+x)*4;return colour.setRGB(data[i]!/255,data[i+1]!/255,data[i+2]!/255,T.SRGBColorSpace).multiply(base)}
 }catch{return ()=>base}
}

/** Every spoke triangle of a wheel merged into one geometry in the wheel's frame, coloured per triangle from its texture. */
function spokeGeometry(meshes:T.Mesh[],inverse:T.Matrix4,zone:Zone){
 const positions:number[]=[],normals:number[]=[],colours:number[]=[],n=new T.Vector3(),c=[new T.Vector3(),new T.Vector3(),new T.Vector3()]
 for(const mesh of meshes){
  const g=mesh.geometry,pos=g.getAttribute('position'),nor=g.getAttribute('normal'),uv=g.getAttribute('uv'),idx=g.index,count=idx?idx.count:pos.count,at=(i:number)=>idx?idx.getX(i):i
  const m=inverse.clone().multiply(mesh.matrixWorld),nm=new T.Matrix3().getNormalMatrix(m),materials=Array.isArray(mesh.material)?mesh.material:[mesh.material]
  const readers=materials.map(mat=>texelReader(mat as T.MeshStandardMaterial)),groupOf=(t:number)=>{for(const gr of g.groups)if(t>=gr.start&&t<gr.start+gr.count)return gr.materialIndex??0;return 0}
  for(let t=0;t<count;t+=3){
   for(let k=0;k<3;k++)c[k]!.fromBufferAttribute(pos,at(t+k)).applyMatrix4(m)
   const x=(c[0]!.x+c[1]!.x+c[2]!.x)/3,y=(c[0]!.y+c[1]!.y+c[2]!.y)/3,z=(c[0]!.z+c[1]!.z+c[2]!.z)/3
   const r=Math.hypot(x,y);if(!(r>zone.hub&&r<zone.rim&&z>zone.near&&z<zone.far))continue
   const read=readers[groupOf(t)]??readers[0]!,colour=uv?read((uv.getX(at(t))+uv.getX(at(t+1))+uv.getX(at(t+2)))/3,(uv.getY(at(t))+uv.getY(at(t+1))+uv.getY(at(t+2)))/3):read(0,0)
   for(let k=0;k<3;k++){positions.push(c[k]!.x,c[k]!.y,c[k]!.z);if(nor){n.fromBufferAttribute(nor,at(t+k)).applyMatrix3(nm).normalize();normals.push(n.x,n.y,n.z)}colours.push(colour.r,colour.g,colour.b)}
  }
 }
 if(!positions.length)return undefined
 const part=new T.BufferGeometry();part.setAttribute('position',new T.Float32BufferAttribute(positions,3));part.setAttribute('color',new T.Float32BufferAttribute(colours,3))
 if(normals.length===positions.length)part.setAttribute('normal',new T.Float32BufferAttribute(normals,3));else part.computeVertexNormals()
 part.computeBoundingSphere();return part
}

function blurShader(material:T.Material,uniforms:Record<string,T.IUniform>,copy:boolean){
 const previous=material.onBeforeCompile.bind(material),key=material.customProgramCacheKey.bind(material)
 material.onBeforeCompile=(s,r)=>{previous(s,r);Object.assign(s.uniforms,uniforms)
  // copy weights by instance: 1/(k+1) makes coincident copies exactly opaque, equal low weights give the translucent smear
  // once they spread
  const weight=copy?`copyWeight=mix(1./(float(gl_InstanceID)+1.),${(1.45/COPIES).toFixed(5)},wheelBlur);`:'copyWeight=1.;'
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform mat4 wheelFrame;uniform float wheelBlur;varying vec3 wheelPoint;varying float copyWeight;').replace('#include <begin_vertex>',`#include <begin_vertex>\nwheelPoint=(wheelFrame*vec4(transformed,1.)).xyz;${weight}`)
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform float wheelHub,wheelRim,wheelBlur,wheelNear,wheelFar,tyreFade;uniform vec3 tyreAverage;varying vec3 wheelPoint;varying float copyWeight;')
   .replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
 float wheelRadius=length(wheelPoint.xy);bool spokeZone=wheelRadius>wheelHub&&wheelRadius<wheelRim&&wheelPoint.z>wheelNear&&wheelPoint.z<wheelFar;
 ${copy?'':'if(wheelBlur>0.&&spokeZone)discard;'}`)
   .replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.a*=copyWeight;')
   .replace('#include <map_fragment>',`#include <map_fragment>
 if(wheelRadius>wheelRim+.02)diffuseColor.rgb=mix(diffuseColor.rgb,tyreAverage,wheelBlur*tyreFade*.9);`)
 }
 material.customProgramCacheKey=()=>key()+(copy?'|wheel-blur-copy-v4':'|wheel-blur-v2')
 material.needsUpdate=true
}

export function installWheelBlur(wheels:T.Group[]){
 const rotation=new T.Matrix4()
 const sets=wheels.map(wheel=>{
  const zone=analyse(wheel),blur={value:0},inverse=wheel.matrixWorld.clone().invert()
  const meshes:T.Mesh[]=[];wheel.traverse(o=>{if(o instanceof T.Mesh&&!(o instanceof T.InstancedMesh))meshes.push(o)})
  for(const mesh of meshes){
   const base=inverse.clone().multiply(mesh.matrixWorld),pos=mesh.geometry.getAttribute('position'),v=new T.Vector3();let reach=0;for(let i=0;i<pos.count;i+=7){v.fromBufferAttribute(pos,i).applyMatrix4(base);reach=Math.max(reach,Math.hypot(v.x,v.y))}
   // only spoke meshes hand their spoke zone over to the copies; symmetric parts (discs, rings) stay sharp
   const uniforms={wheelFrame:{value:base},wheelHub:{value:zone.hub},wheelRim:{value:zone.spokeMeshes.has(mesh)?zone.rim:0},wheelNear:{value:zone.near},wheelFar:{value:zone.far},wheelBlur:blur,tyreAverage:{value:zone.tyre},tyreFade:{value:reach>zone.rim+.03?1:0}}
   const originals=Array.isArray(mesh.material)?mesh.material:[mesh.material]
   const own=originals.map(m=>{const c=m.clone();blurShader(c,uniforms,false);return c});mesh.material=Array.isArray(mesh.material)?own:own[0]!
  }
  // the copies: all spoke triangles of the wheel in one geometry, one draw call per wheel. They keep the spokes' own
  // metalness and roughness and receive the scene's reflections like the rim (a matte copy turned a spinning silver
  // wheel nearly black, since a metal's look is almost all reflection)
  const spokes=spokeGeometry([...zone.spokeMeshes],inverse,zone);let copies:T.InstancedMesh|undefined
  if(spokes){
   const finishes=[...zone.spokeMeshes].flatMap(m=>Array.isArray(m.material)?m.material:[m.material]).filter((m):m is T.MeshStandardMaterial=>m instanceof T.MeshStandardMaterial)
   const average=(key:'metalness'|'roughness',fallback:number)=>finishes.length?finishes.reduce((sum,m)=>sum+m[key],0)/finishes.length:fallback
   const material=new T.MeshStandardMaterial({vertexColors:true,transparent:true,depthWrite:false,metalness:average('metalness',.6),roughness:Math.max(.25,average('roughness',.4))})
   blurShader(material,{wheelFrame:{value:new T.Matrix4()},wheelHub:{value:zone.hub},wheelRim:{value:zone.rim},wheelNear:{value:zone.near},wheelFar:{value:zone.far},wheelBlur:blur,tyreAverage:{value:zone.tyre},tyreFade:{value:0}},true)
   // stays 'visible' with no instances at rest, so the scene warm-up compiles its shader at load instead of the first
   // moment the car moves (that compile was a visible hitch)
   copies=new T.InstancedMesh(spokes,material,COPIES);copies.name='Wheel blur samples';copies.count=0;copies.castShadow=false;copies.frustumCulled=false
   copies.instanceMatrix.setUsage(T.DynamicDrawUsage);wheel.add(copies)
  }
  wheel.userData.blurZone=zone
  return {zone,blur,copies}
 })
 /** angular speed of each wheel in rad/s (signed, as it turns) */
 function update(rates:number[]){
  sets.forEach((set,w)=>{
   const travel=Math.abs(rates[w]??0)*SHUTTER,arc=Math.min(travel,set.zone.period),amount=T.MathUtils.smoothstep(travel,.05,.22);set.blur.value=amount
   const copies=set.copies;if(!copies)return;copies.count=amount>0?COPIES:0;if(!copies.count)return
   for(let i=0;i<COPIES;i++){rotation.makeRotationZ(((i+.5)/COPIES-.5)*arc);copies.setMatrixAt(i,rotation)}
   copies.instanceMatrix.needsUpdate=true
  })
 }
 return {update,zones:sets.map(s=>s.zone)}
}
