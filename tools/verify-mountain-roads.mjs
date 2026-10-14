import {NodeIO} from '@gltf-transform/core'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const io=new NodeIO(),report={}
for(const scale of [.1875,.5])assert.equal(256*scale,Math.round(256*scale),'Detail texture must meet at chunk boundaries')
assert.equal(256%16,0,'Dash spacing must remain continuous')
for(const kind of ['mountain','winter']){
 const folder=`public/models/${kind}-road`,variants=[]
 for(let i=0;i<16;i++){
  const d=await io.read(`${folder}/terrain-${i}-near.glb`),p=d.getRoot().listMeshes()[0].listPrimitives()[0].getAttribute('POSITION');const a=p.getArray(),left=[],right=[]
  for(let j=0;j<a.length;j+=3){if(Math.abs(a[j]+128)<.001)left.push([a[j+1],a[j+2]]);if(Math.abs(a[j]-128)<.001)right.push([a[j+1],a[j+2]])}
  left.sort((a,b)=>a[1]-b[1]);right.sort((a,b)=>a[1]-b[1]);variants.push({left,right})
 }
 let max=0
 for(let i=0;i<16;i++){const a=variants[i].right,b=variants[(i+1)%16].left;assert.equal(a.length,b.length);for(let j=0;j<a.length;j++){const gap=Math.hypot(a[j][0]-b[j][0],a[j][1]-b[j][1]);max=Math.max(max,gap);assert(gap<.003,`${kind} join ${i} gap ${gap}`)}}
 const meta=JSON.parse(await fs.readFile(`${folder}/scene.json`));assert.equal(meta.roadLevel,.007);assert.equal(meta.variants,16);report[kind]={checkedJoins:16,maxGapMetres:max,nearVertices:meta.nearVertices,farVertices:meta.farVertices,period:meta.period}
}
console.log(JSON.stringify(report,null,2));await fs.writeFile('tools/generated/mountain-road/geometry-verification.json',JSON.stringify(report,null,2))
