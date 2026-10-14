import {NodeIO} from '@gltf-transform/core'
import {ALL_EXTENSIONS} from '@gltf-transform/extensions'
import {simplify,prune,weld} from '@gltf-transform/functions'
import {MeshoptDecoder,MeshoptSimplifier} from 'meshoptimizer'
await MeshoptDecoder.ready
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder})
const doc=await io.read('public/models/roman-shrub_01.glb')
await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.2,error:.001}),prune())
for(const ext of [...doc.getRoot().listExtensionsUsed()])if(ext.extensionName==='EXT_meshopt_compression')ext.dispose()
await io.write('public/models/mountain-road/shrub-optimized.glb',doc)
console.log(doc.getRoot().listMeshes().flatMap(m=>m.listPrimitives().map(p=>p.getIndices().getCount()/3)))
