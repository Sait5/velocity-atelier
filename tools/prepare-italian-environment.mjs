import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,dedup,weld,simplify,meshopt,textureCompress,join} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs/promises';
await Promise.all([MeshoptEncoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
const base='../assets-research/italian-environment';
const doc=await io.read(base+'/modular_urban_apartments_facade/modular_urban_apartments_facade.gltf');
const scene=doc.getRoot().listScenes()[0],templates=new Map(scene.listChildren().map(n=>[n.getName(),n]));
const building=doc.createNode('Small two-storey urban building');scene.addChild(building);
let face=building;
function add(name,x,y,z=0,scale=[1,1,1],rotation=[0,0,0,1]){const source=templates.get(name);if(!source)throw new Error('Missing '+name);const n=doc.createNode(name).setMesh(source.getMesh()).setTranslation([x,y,z]).setScale(scale).setRotation(rotation);face.addChild(n);}
function facade(columns,offsetX,offsetZ,rotation=[0,0,0,1]){
 for(let col=0;col<columns;col++)for(let floor=0;floor<2;floor++){
  const x=offsetX+(col+1)*3,y=floor*3.6;
  const door=floor===0&&col%4===1;
  add(door?'wall_door_centered_small_01':'wall_window_centered_small_01',x,y,offsetZ,[1,1,1],rotation);
  add(door?'door_centered_small_01':'window_centered_small_01',x,y,offsetZ,[1,1,1],rotation);
  add('wall_standard_standard_01',x,y+3,offsetZ,[1,.2,1],rotation);
  add('cornice_standard_standard_01',x,y+3.4,offsetZ,[1,1,1],rotation);
  if(!floor)add('dado_standard_standard_01',x,.05,offsetZ,[1,1,1],rotation);
  if(floor===1)add('crown_standard_standard_01',x,7.2,offsetZ,[1,1,1],rotation);
 }
}
for(const [columns,x,z,angle] of [[4,0,4.5,0],[4,0,-4.5,Math.PI],[3,6,0,Math.PI/2],[3,-6,0,-Math.PI/2]]){
 face=doc.createNode('Detailed building wall').setTranslation([x,0,z]).setRotation([0,Math.sin(angle/2),0,Math.cos(angle/2)]);building.addChild(face);facade(columns,-columns*1.5,0);
}
const buffer=doc.getRoot().listBuffers()[0];
const roofMaterial=doc.createMaterial('Slate roof').setBaseColorFactor([.19,.21,.22,1]).setRoughnessFactor(.9);
const roof=doc.createPrimitive().setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(new Float32Array([-6.1,7.94,-4.6,-6.1,7.94,4.6,6.1,7.94,4.6,6.1,7.94,-4.6])).setBuffer(buffer)).setAttribute('NORMAL',doc.createAccessor().setType('VEC3').setArray(new Float32Array([0,1,0,0,1,0,0,1,0,0,1,0])).setBuffer(buffer)).setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array([0,1,2,0,2,3])).setBuffer(buffer)).setMaterial(roofMaterial);
building.addChild(doc.createNode('Solid roof').setMesh(doc.createMesh('Roof').addPrimitive(roof)));
for(const node of templates.values())node.dispose();
await doc.transform(prune(),dedup(),join(),weld(),simplify({simplifier:MeshoptSimplifier,ratio:.3,error:.002}),textureCompress({encoder:sharp,targetFormat:'webp',quality:87}),meshopt({encoder:MeshoptEncoder,level:'medium'}));
await io.write('public/models/italian-urban-facade.glb',doc);
const tree=await io.read(base+'/island_tree_01/island_tree_01.gltf');
const files=JSON.parse((await fs.readFile('../assets-research/island_tree_01-files.json','utf8')).replace(/^\uFEFF/,''));
const alphaResponse=await fetch(files.leaves_alpha['2k'].png.url);if(!alphaResponse.ok)throw new Error('Tree leaf alpha '+alphaResponse.status);
const alpha=await sharp(Buffer.from(await alphaResponse.arrayBuffer())).extractChannel(0).raw().toBuffer({resolveWithObject:true});
for(const m of tree.getRoot().listMaterials()){
 if(m.getName().includes('leaves')){const texture=m.getBaseColorTexture();const rgba=await sharp(Buffer.from(texture.getImage())).joinChannel(alpha.data,{raw:{width:alpha.info.width,height:alpha.info.height,channels:1}}).png().toBuffer();texture.setImage(rgba).setMimeType('image/png');m.setAlphaMode('MASK').setAlphaCutoff(.45)}else m.setAlphaMode('OPAQUE');
}
await tree.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.055,error:.025}),prune(),dedup(),textureCompress({encoder:sharp,targetFormat:'webp',quality:87}),meshopt({encoder:MeshoptEncoder,level:'medium'}));
await io.write('public/models/italian-roadside-tree.glb',tree);
for(const name of ['italian-urban-facade','italian-roadside-tree'])console.log(name,(await fs.stat('public/models/'+name+'.glb')).size);
