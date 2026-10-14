import assert from 'node:assert/strict'
import {NodeIO} from '@gltf-transform/core'
import sharp from 'sharp'

const levels={},floorSamples=[]
for(const lod of ['near','far']){
 const doc=await new NodeIO().read(`public/models/saltflat/road-banks-${lod}.glb`)
 const nodes=doc.getRoot().listNodes()
 assert(!nodes.some(n=>/Shoulder|Mountain/i.test(n.getName())))
 levels[lod]=Array.from({length:8},(_,v)=>{
  const node=nodes.find(n=>n.getName()===`Terrain_${v}_${lod}`)
  assert(node,`Missing ${v} ${lod}`)
  const primitive=node.getMesh().listPrimitives()[0],p=primitive.getAttribute('POSITION').getArray(),uv=primitive.getAttribute('TEXCOORD_0').getArray()
  const ends=[[],[]]
  for(let i=0;i<p.length;i+=3){
   const x=p[i],height=p[i+1],z=p[i+2]
   if(lod==='near'&&Math.abs(z)>4.6&&Math.abs(x%10)<.001)floorSamples.push([x+160*v,-z,height])
   if(Math.abs(z)<=3.7)assert(Math.abs(height-8.287)<.00001,'Road must stay level for tyre physics')
   assert(Math.abs(z)<=120.001,'Detailed terrain exceeds compact bank')
   assert(Math.abs(uv[i/3*2]*1.25-(x+160*v))<.0002,'Along-road texture coordinates')
   assert(Math.abs((1-uv[i/3*2+1])*1.25+z)<.0002,'Blender UV handedness')
   for(let side=0;side<2;side++)if(Math.abs(x-(side?80:-80))<.001)ends[side].push([z,height])
  }
  ends.forEach(e=>e.sort((a,b)=>a[0]-b[0]));return ends
 })
 for(let v=0;v<8;v++){
  const end=levels[lod][v][1],start=levels[lod][(v+1)%8][0]
  assert.equal(end.length,start.length)
  for(let i=0;i<end.length;i++)assert(Math.hypot(end[i][0]-start[i][0],end[i][1]-start[i][1])<.00002,`Coast geometry seam ${v} ${lod}`)
 }
}
// All shared near/far boundary vertices must coincide when LOD changes.
for(let v=0;v<8;v++)for(let side=0;side<2;side++)for(const p of levels.far[v][side]){
 const near=levels.near[v][side].find(q=>Math.abs(p[0]-q[0])<.001)
 if(near)assert(Math.abs(p[1]-near[1])<.00002,'LOD boundary crack')
}
const {data,info}=await sharp('public/textures/saltflat-shore-field.png').removeAlpha().raw().toBuffer({resolveWithObject:true})
const left=await sharp('public/textures/saltflat-shore-left.png').removeAlpha().raw().toBuffer({resolveWithObject:true})
function depthAt(x,y){
 const pixels=y<0?left.data:data;y=Math.abs(y)
 const px=(x+80)/1280*info.width-.5,py=(1-y/120)*info.height-.5,ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy
 const sample=(x,y)=>pixels[(Math.max(0,Math.min(info.height-1,y))*info.width+(x%info.width+info.width)%info.width)*info.channels]/255*.24
 return (sample(ix,iy)*(1-fx)+sample(ix+1,iy)*fx)*(1-fy)+(sample(ix,iy+1)*(1-fx)+sample(ix+1,iy+1)*fx)*fy
}
let maxDepthError=0
for(const [x,y,height] of floorSamples){const depth=depthAt(x,y),t=Math.max(0,Math.min(1,(Math.abs(y)-3.7)/(6+.3*Math.sin(x/1280*Math.PI*32)-3.7))),error=Math.abs(height-(8.287-t*t*(3-2*t)*(.522+depth)));if(depth>.007)maxDepthError=Math.max(maxDepthError,error);else assert(error<.32,'Dry salt hummocks must remain below 32 cm')}
assert(maxDepthError<.007,`Water atlas and Blender basin disagree: ${maxDepthError} m`)
let wet=0,count=0
for(let y=24;y<420;y++)for(let x=0;x<info.width;x++){wet+=data[(y*info.width+x)*info.channels]>.028/.24*255?1:0;count++}
assert(wet/count>.5,'Water must occupy a substantial portion of the right bank')
assert(left.data.some((v,i)=>i%info.channels===0&&v>32),'Left basins must contain water');assert(data.some((v,i)=>i%info.channels===0&&Math.abs(v-left.data[i])>32),'Two shores must have independent shapes');
console.log(JSON.stringify({status:'PASS',sectionJoins:16,roadFlat:true,uvOrientation:'verified',maxDepthErrorMm:Math.round(maxDepthError*1000),waterCoverage:Math.round(wet/count*100)+'%',variants:8}))
