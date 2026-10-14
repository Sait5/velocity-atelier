import {NodeIO} from '@gltf-transform/core'
import {ALL_EXTENSIONS} from '@gltf-transform/extensions'
import {dedup,prune,weld,meshopt,textureCompress} from '@gltf-transform/functions'
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer'
import sharp from 'sharp'
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready])
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder})
const document=await io.read('tools/generated/road-tunnel.glb')
await document.transform(dedup(),weld(),prune(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[2048,2048],quality:90}),meshopt({encoder:MeshoptEncoder,level:'medium'}))
await io.write('public/models/road-tunnel.glb',document)
