import {NodeIO} from '@gltf-transform/core'
import {ALL_EXTENSIONS} from '@gltf-transform/extensions'
import {dedup,prune,weld,simplify,textureCompress,meshopt} from '@gltf-transform/functions'
import {MeshoptEncoder,MeshoptSimplifier} from 'meshoptimizer'
import sharp from 'sharp'
await Promise.all([MeshoptEncoder.ready,MeshoptSimplifier.ready])
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder})
const doc=await io.read('public/models/wet-road.glb')
await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.12,error:.0001}),dedup(),prune(),textureCompress({encoder:sharp,targetFormat:'webp',quality:96}),meshopt({encoder:MeshoptEncoder,level:'medium'}))
await io.write('public/models/wet-road.glb',doc)
