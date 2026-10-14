import {NodeIO} from '@gltf-transform/core';import {ALL_EXTENSIONS} from '@gltf-transform/extensions';import sharp from 'sharp';import fs from 'node:fs';
for(const [name,source,installed] of [['wetland','C:/Users/Admin/Downloads/highway_hill_wetland_and_forest.glb','public/models/wetland-road.glb'],['highway50','C:/Users/Admin/Downloads/highway_50_-_near_cold_springs.glb','public/models/highway50-road.glb']]){
 const same=fs.readFileSync(source).equals(fs.readFileSync(installed));const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(installed);const tex=[];
 for(const t of doc.getRoot().listTextures()){const m=await sharp(t.getImage()).metadata();tex.push({width:m.width,height:m.height,format:m.format})}
 console.log(JSON.stringify({name,identicalToDownload:same,textures:tex,materials:doc.getRoot().listMaterials().map(m=>({name:m.getName(),extensions:m.listExtensions().map(e=>e.extensionName)}))}));
}
