import assert from 'node:assert/strict'
import {NodeIO} from '@gltf-transform/core'
import {ALL_EXTENSIONS} from '@gltf-transform/extensions'
import {MeshoptDecoder} from 'meshoptimizer'
import {dequantize} from '@gltf-transform/functions'
import {readFile} from 'node:fs/promises'

await MeshoptDecoder.ready
const {period}=JSON.parse(await readFile('app/three/tunnelMeta.json','utf8'))
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder})
// Check the shipped compressed asset, including its node transforms.
const document=await io.read('public/models/road-tunnel.glb')
await document.transform(dequantize())
let wallTriangles=0,caps=0,normalPairs=0
for(const node of document.getRoot().listNodes()){
 if(!/Tunnel walls|Above utility pipe/.test(node.getName()))continue
 const matrix=node.getWorldMatrix()
 for(const primitive of node.getMesh().listPrimitives()){
  const position=primitive.getAttribute('POSITION'),indices=primitive.getIndices(),normal=primitive.getAttribute('NORMAL')
  const ends=new Map()
  if(node.getName()==='Tunnel walls')for(const id of new Set(indices.getArray())){
   const p=position.getElement(id,[])
   const world=[0,1,2].map(k=>matrix[k]*p[0]+matrix[4+k]*p[1]+matrix[8+k]*p[2]+matrix[12+k])
   const end=Math.abs(world[2])<.02?0:Math.abs(world[2]-period)<.02?1:-1
   if(end<0)continue
   const key=world.slice(0,2).map(v=>Math.round(v*100)).join(',')
   const pair=ends.get(key)||[];pair[end]={normal:normal.getElement(id,[]),uv:primitive.getAttribute('TEXCOORD_0').getElement(id,[])};ends.set(key,pair)
  }
  for(const [front,back] of ends.values())if(front&&back){
   assert(Math.hypot(...front.normal.map((v,k)=>v-back.normal[k]))<.005,'Front/back wall normals must match')
   assert(front.uv.every((v,k)=>Math.abs((v-back.uv[k])-Math.round(v-back.uv[k]))<.002),'Every texture channel must wrap continuously at both ends')
   normalPairs++
  }
  for(let i=0;i<indices.getCount();i+=3){
   const z=[0,1,2].map(k=>{const p=position.getElement(indices.getScalar(i+k),[]);return matrix[2]*p[0]+matrix[6]*p[1]+matrix[10]*p[2]+matrix[14]})
   if(z.every(v=>Math.abs(v)<.02)||z.every(v=>Math.abs(v-period)<.02))caps++
   wallTriangles++
  }
 }
}
assert(wallTriangles>1000,'Walls must retain their original detailed surfaces')
assert.equal(caps,0,'Coincident internal end caps must not be shipped')
assert(normalPairs>=20,'Both ends of the entire tunnel cross-section must be checked')
console.log(`Tunnel verified: ${wallTriangles} wall/utility triangles, no overlapping internal caps, ${normalPairs} matching front/back wall normals.`)

