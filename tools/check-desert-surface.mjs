import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {NodeIO} from '@gltf-transform/core'
import {ALL_EXTENSIONS} from '@gltf-transform/extensions'
import {MeshoptDecoder} from 'meshoptimizer'
import {Matrix4,Vector3} from 'three'
await build({entryPoints:['app/three/desertSurface.ts'],outfile:'tools/generated/desert-surface-check.mjs',bundle:true,platform:'node',format:'esm'})
const {createDesertSurface}=await import('./generated/desert-surface-check.mjs')
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder})
const doc=await io.read('public/models/desert/terrain.glb')
for(const node of doc.getRoot().listNodes()){
 const mesh=node.getMesh();if(!mesh)continue
 const field=createDesertSurface(),matrix=new Matrix4().fromArray(node.getWorldMatrix()),point=new Vector3()
 for(const primitive of mesh.listPrimitives()){
  const positions=primitive.getAttribute('POSITION'),uv=primitive.getAttribute('TEXCOORD_0');if(!positions)continue
  for(let i=0;i<positions.getCount();i++){
   const p=positions.getElement(i,[]);point.set(...p).applyMatrix4(matrix);const t=uv?.getElement(i,[])??[0,0]
   field.sample(point.x,point.z,point.y,t[0],t[1])
  }
 }
 const grid=field.finish()
 assert(grid.height.every(Number.isFinite));assert(grid.u.every(Number.isFinite));assert(grid.v.every(Number.isFinite))
 for(let col=0;col<grid.columns;col++)assert.equal(grid.height[col],grid.height[(grid.rows-1)*grid.columns+col])
 console.log({surface:mesh.getName(),vertices:grid.height.length,triangles:(grid.columns-1)*(grid.rows-1)*2,closedCells:true,matchedSegmentBorders:true,uvRange:[Math.min(...grid.u),Math.max(...grid.u),Math.min(...grid.v),Math.max(...grid.v)]})
}
