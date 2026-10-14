import {NodeIO} from '@gltf-transform/core'
import {ALL_EXTENSIONS} from '@gltf-transform/extensions'
import {dedup,prune,weld,join,textureCompress,meshopt} from '@gltf-transform/functions'
import {MeshoptEncoder} from 'meshoptimizer'
import sharp from 'sharp'
import {readdir} from 'node:fs/promises'
await MeshoptEncoder.ready
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder})
for(const file of await readdir('public/models/desert')){if(!file.endsWith('.glb'))continue;const p='public/models/desert/'+file,doc=await io.read(p);await doc.transform(dedup(),join(),weld(),prune(),textureCompress({encoder:sharp,targetFormat:'webp',quality:96}),meshopt({encoder:MeshoptEncoder,level:'medium'}));await io.write(p,doc);console.log(file)}
