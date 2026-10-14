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
const {preparePorsche}=await import('../app/three/porsche')
const {createStableDriveContact}=await import('../app/three/stableDriveContact')
const {scene:root}=await load('public/models/porsche-911-gt3-door-assembly.glb')
const before=new Map<T.Mesh,number[]>();root.traverse(o=>{if(o instanceof T.Mesh)before.set(o,Array.from(o.geometry.getAttribute('position').array))})
const vehicle=preparePorsche(root)
const alloyMeshes:T.Mesh[]=[]
root.traverse(o=>{if(o instanceof T.Mesh&&Array.isArray(o.material)&&o.material.includes(vehicle.rim))alloyMeshes.push(o)})
assert.equal(alloyMeshes.length,4)
for(const mesh of alloyMeshes){
 const uv=mesh.geometry.getAttribute('uv'),index=mesh.geometry.index!,groups=mesh.geometry.groups
 assert.ok(groups[1]!.count>1000)
 for(let i=groups[0]!.start;i<groups[0]!.count;i+=3){const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];assert.ok(!ids.every(v=>uv.getX(v)>.07&&uv.getX(v)<.105&&uv.getY(v)>.258&&uv.getY(v)<.29))}
}
vehicle.rim.color.set('#f2f2ee');alloyMeshes.forEach(m=>assert.equal((m.material as T.Material[])[1],vehicle.rim))
console.log('PASS: four alloy finishes share a dedicated material; tyre, badge and brake atlas faces retain their original material.')
const plates:T.Mesh[]=[];root.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)&&/ManufacturerPlateA/.test(o.material.name))plates.push(o)})
assert.equal(plates.length,1);assert.equal(plates[0]!.visible,false)
for(const [o,p] of before)assert.deepEqual(Array.from(o.geometry.getAttribute('position').array),p)
const rig=createStableDriveContact(root,vehicle.wheels,()=>8.287)
const height=root.position.y,rest=vehicle.wheels.map(w=>w.position.clone())
for(let frame=0;frame<3600;frame++){
 const speed=frame<1800?frame/30:(3600-frame)/30
 rig.update(speed,frame/2,1/60,false,frame>400&&frame<600?1:0)
 assert.ok(Math.abs(root.position.y-height)<1e-10)
 assert.equal(root.rotation.x,0);assert.equal(root.rotation.z,0)
 vehicle.wheels.forEach((w,i)=>assert.ok(w.position.equals(rest[i]!)))
}
assert.ok(root.position.z>0);assert.ok(root.position.z<=2.7)
console.log('PASS: plate hidden; all mesh vertices unchanged; flat-road chassis and wheels stable during acceleration, braking and steering.')
const {scene:terrain}=await load('public/models/saltflat/road-banks-near.glb')
terrain.updateWorldMatrix(true,true)
terrain.traverse(o=>{if(o instanceof T.Mesh&&o.name==='Terrain_0_near'){
 const p=o.geometry.getAttribute('position'),uv=o.geometry.getAttribute('uv'),v=new T.Vector3()
 for(const i of [0,Math.floor(p.count/2),p.count-1]){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);console.log('Terrain',v.toArray(),'metres',[uv.getX(i)*1.25,(1-uv.getY(i))*1.25])}
}})

