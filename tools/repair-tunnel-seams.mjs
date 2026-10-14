import {NodeIO} from '@gltf-transform/core'
import {ALL_EXTENSIONS} from '@gltf-transform/extensions'
import {readFile,copyFile} from 'node:fs/promises'
const path='tools/generated/road-tunnel.glb'
try{await readFile('tools/generated/road-tunnel-before-seams.glb')}catch{await copyFile(path,'tools/generated/road-tunnel-before-seams.glb')}
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.read('tools/generated/road-tunnel-before-seams.glb')
const period=192.91066360473633
// Replace the source's layered array/bevel lining with one continuous inner
// surface. Keep its cross-section, concrete PBR and the separate lamps/rails.
// This eliminates the narrow rings themselves instead of masking their edges.
const wall=doc.getRoot().listNodes().find(n=>n.getName()==='Tunnel walls')
const originalWall=wall.getMesh(),material=originalWall.listPrimitives()[0].getMaterial()
const angles=96,lengths=64,positions=[],normals=[],uvs=[],triangles=[]
for(let z=0;z<=lengths;z++)for(let a=0;a<=angles;a++){
 const angle=-Math.PI*5/8+Math.PI*5/4*a/angles,s=Math.sin(angle),c=Math.cos(angle)
 positions.push(s*5.36105,1.47685+c*5.36105,period*z/lengths)
 normals.push(-s,-c,0);uvs.push(angle*5.36105/3,z)
}
for(let z=0;z<lengths;z++)for(let a=0;a<angles;a++){
 const i=z*(angles+1)+a,j=i+angles+1
 triangles.push(i,i+1,j,i+1,j+1,j)
}
const buffer=doc.getRoot().listBuffers()[0]
const attribute=(name,type,array)=>doc.createAccessor(name,buffer).setType(type).setArray(array)
const lining=doc.createPrimitive()
 .setAttribute('POSITION',attribute('Continuous lining position','VEC3',new Float32Array(positions)))
 .setAttribute('NORMAL',attribute('Continuous lining normal','VEC3',new Float32Array(normals)))
 .setAttribute('TEXCOORD_0',attribute('Continuous lining UV','VEC2',new Float32Array(uvs)))
 .setIndices(attribute('Continuous lining index','SCALAR',new Uint32Array(triangles))).setMaterial(material)
wall.setMesh(doc.createMesh('Continuous tunnel lining').addPrimitive(lining))
let matched=0,removedCaps=0
for(const node of doc.getRoot().listNodes()){
 if(!/Tunnel walls|Road|Sidewalk|Above utility/.test(node.getName()))continue
 for(const p of node.getMesh().listPrimitives()){
  const pos=p.getAttribute('POSITION'),normal=p.getAttribute('NORMAL'),uv=p.getAttribute('TEXCOORD_0');if(!normal)continue
  // Repeated sections must not have coincident internal end caps.
  const indices=p.getIndices(),kept=[]
  for(let i=0;i<indices.getCount();i+=3){
   const ids=[0,1,2].map(k=>indices.getScalar(i+k)),z=ids.map(id=>pos.getElement(id,[])[2])
   if(z.every(v=>Math.abs(v)<.02)||z.every(v=>Math.abs(v-period)<.02)){removedCaps++;continue}
   kept.push(...ids)
  }
  indices.setArray(new Uint32Array(kept))
  if(node.getName()==='Tunnel walls'&&uv){
   // One cylindrical unwrap for the whole lining. Longitudinal repeats are an
   // integer per module, so every texture channel meets at both repeated ends.
   const repeats=Math.round(period/3)
   for(let i=0;i<pos.getCount();i++){
    const v=pos.getElement(i,[]),angle=Math.atan2(v[0],v[1]-1.47685)
    uv.setElement(i,[angle*5.36105/3,v[2]*repeats/period])
   }
  }
  const groups=new Map(),active=new Set(kept)
  for(const i of active){
   const v=pos.getElement(i,[]);if(Math.min(Math.abs(v[2]),Math.abs(v[2]-period))>.02)continue
   const key=v.slice(0,2).map(x=>Math.round(x*1000)).join(',');const list=groups.get(key)||[];list.push(i);groups.set(key,list)
  }
  for(const ids of groups.values()){
   const front=ids.filter(i=>pos.getElement(i,[])[2]<1),back=ids.filter(i=>pos.getElement(i,[])[2]>1);if(!front.length||!back.length)continue
   // The source smooth normals already include the removed cap's influence.
   // Average BOTH ends, cancelling opposite longitudinal components. Filtering
   // by that component would leave the wall normals broken on both seams.
   const surface=ids
   const sum=[0,0,0];for(const i of surface)normal.getElement(i,[]).forEach((v,k)=>sum[k]+=v)
   const len=Math.hypot(...sum);if(len>.1)for(const i of surface)normal.setElement(i,sum.map(v=>v/len))
   if(uv){const first=uv.getElement(front[0],[]);for(const i of back){const end=uv.getElement(i,[]);uv.setElement(i,end.map((v,k)=>first[k]+Math.round(v-first[k])))}}
   matched++
  }
 }
}
await io.write(path,doc);console.log({matchedBoundaryVertices:matched,removedCaps})
