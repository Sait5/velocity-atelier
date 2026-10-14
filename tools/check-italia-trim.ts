import {installSideDoorConnections,removeRetiredItaliaHinges,retiredItaliaHardware} from '../app/three/sideDoorConnections'
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
const {installItaliaJambTrim}=await import('../app/three/italiaJambTrim')
const {scene:root}=await load('tools/generated/ferrari-side-door-test.glb')
removeRetiredItaliaHinges(root)
const paint=new T.MeshStandardMaterial({name:'Italia paint',color:'red'})
const original=new Map<T.Mesh,{geometry:T.BufferGeometry;position:Float32Array|ArrayLike<number>;matrix:number[]}>()
root.updateWorldMatrix(true,true)
root.traverse(o=>{if(o instanceof T.Mesh){original.set(o,{geometry:o.geometry,position:Array.from(o.geometry.getAttribute('position').array),matrix:o.matrixWorld.toArray()});if(!Array.isArray(o.material)&&o.material.name==='carpaint')o.material=paint}})
installItaliaJambTrim(root)
for(const [o,before] of original){
 assert.deepEqual(Array.from(o.geometry.getAttribute('position').array),before.position)
 assert.deepEqual(o.matrixWorld.toArray(),before.matrix)
 if(o.geometry!==before.geometry){console.log('TRIM',o.name,o.geometry.groups);assert.ok(/lod0_body_body__carpaint|door[LR]F_body_2__carpaint/.test(o.name))}
 if(/mirror|hood|skirt|bumper/.test(o.name))assert.equal(o.geometry,before.geometry)
}
console.log('Positions, transforms and exterior parts preserved')
