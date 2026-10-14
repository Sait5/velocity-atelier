import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import * as T from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'



async function load(path:string){
 const file=await fs.readFile(path),length=file.readUInt32LE(12),doc=JSON.parse(file.subarray(20,20+length).toString()),binary=file.subarray(28+length)
 delete doc.images;delete doc.textures;delete doc.samplers
 for(const material of doc.materials??[]){delete material.normalTexture;delete material.occlusionTexture;delete material.emissiveTexture;if(material.pbrMetallicRoughness){delete material.pbrMetallicRoughness.baseColorTexture;delete material.pbrMetallicRoughness.metallicRoughnessTexture}delete material.extensions}
 const json=Buffer.from(JSON.stringify(doc)),j=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),header=Buffer.alloc(20),bh=Buffer.alloc(8)
 header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+j.length+binary.length,8);header.writeUInt32LE(j.length,12);header.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(binary.length);bh.writeUInt32LE(0x004e4942,4)
 const data=Buffer.concat([header,j,bh,binary]);return new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'')
}
const {installPorscheInnerTrim}=await import('../app/three/innerDoorTrim')
const {scene:root}=await load('public/models/porsche-911-gt3-door-assembly.glb')
const paint=new T.MeshStandardMaterial({name:'Porsche paint'})
const before=new Map<T.Mesh,{position:number[],matrix:number[],indices:number[]}>()
root.updateWorldMatrix(true,true)
root.traverse(o=>{if(o instanceof T.Mesh){before.set(o,{position:Array.from(o.geometry.getAttribute('position').array),matrix:o.matrixWorld.toArray(),indices:o.geometry.index?Array.from(o.geometry.index.array):[]});if(!Array.isArray(o.material)&&/2025Paint_/.test(o.material.name))o.material=paint}})
installPorscheInnerTrim(root)
let changes=0
for(const [o,b] of before){
 assert.deepEqual(Array.from(o.geometry.getAttribute('position').array),b.position)
 assert.deepEqual(o.matrixWorld.toArray(),b.matrix)
 assert.deepEqual(Array.from(o.geometry.index?.array??[]).sort((a,b)=>a-b),b.indices.sort((a,b)=>a-b))
 if(Array.isArray(o.material)&&o.material.some(m=>m.name==='Black inner door trim')){
  changes++;console.log(o.parent?.name,o.geometry.groups)
  assert.equal(o.geometry.groups.find(g=>g.materialIndex===1)?.count,o.parent?.name==='Porsche_GT3_9922'?6120:3447)
 }
}
assert.equal(changes,3)
console.log('Porsche: only three paint meshes affected; all geometry and transforms preserved.')
const {installRevueltoInnerTrim}=await import('../app/three/innerDoorTrim')
const {scene:revuelto}=await load('public/models/lamborghini-revuelto-user-edited.glb')
const revBefore=new Map<T.Mesh,{geometry:T.BufferGeometry,material:T.Material|T.Material[],matrix:number[]}>()
revuelto.updateWorldMatrix(true,true)
revuelto.traverse(o=>{if(o instanceof T.Mesh)revBefore.set(o,{geometry:o.geometry,material:o.material,matrix:o.matrixWorld.toArray()})})
installRevueltoInnerTrim(revuelto)
let revChanges=0
for(const [o,b] of revBefore){
 assert.equal(o.geometry,b.geometry);assert.deepEqual(o.matrixWorld.toArray(),b.matrix)
 if(o.material!==b.material){revChanges++;assert.match(o.name,/^(DoorCard[LR]F|DoorJamb[LR]F_CarPaint|DoorSill_CarPaint)/)}
}
assert.equal(revChanges,11)
console.log('Revuelto: three inner shells and eight upholstery surfaces updated; exterior, seats and geometry preserved.')
