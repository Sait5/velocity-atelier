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
const {prepareTourbillon}=await import('../app/three/tourbillon')
const {scene:root}=await load('public/models/bugatti-tourbillon.glb')
const closed=new T.Box3().setFromObject(root,true),vehicle=prepareTourbillon(root)
assert.ok(closed.max.x-closed.min.x>4.5&&closed.max.x-closed.min.x<4.9)
assert.equal(vehicle.wheels.length,4);assert.equal(vehicle.doors.length,2)
const fixed=new Map<T.Object3D,T.Matrix4>();root.updateMatrixWorld(true);root.traverse(o=>{if(o.name.startsWith('body_'))fixed.set(o,o.matrixWorld.clone())});assert.ok(fixed.size>0)
const starts=vehicle.doors.map(d=>new T.Box3().setFromObject(d,true))
for(let i=0;i<=20;i++){vehicle.setDoors(i/20);root.updateMatrixWorld(true);fixed.forEach((matrix,o)=>assert.ok(o.matrixWorld.equals(matrix)));assert.ok(vehicle.doors.every(d=>Number.isFinite(d.rotation.z)))}
vehicle.doors.forEach((d,i)=>assert.ok(new T.Box3().setFromObject(d,true).max.y>starts[i]!.max.y+.3))
vehicle.setDoors(0);root.updateMatrixWorld(true);vehicle.doors.forEach((d,i)=>assert.ok(new T.Box3().setFromObject(d,true).min.distanceTo(starts[i]!.min)<1e-5))
const panes=vehicle.doors.flatMap(d=>d.children.filter(o=>o.name.includes('sliding_glass')||o.name.includes('sliding glass')));assert.equal(panes.length,2);vehicle.setWindows(1);assert.ok(panes.every(p=>!p.visible));vehicle.setWindows(0);assert.ok(panes.every(p=>p.visible));
vehicle.setLights(true,false,.5,0);assert.equal(root.userData.frontEnabled,true);assert.equal(root.userData.tailEnabled,false)
vehicle.setLights(false,true,0,1);assert.equal(root.userData.frontEnabled,false);assert.equal(root.userData.tailEnabled,true)
const paint=root.getObjectByProperty('type','Mesh');const colors:T.MeshStandardMaterial[]=[];root.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name==='col_2')colors.push(m as T.MeshStandardMaterial)});vehicle.body.color.set('#eeeeee');vehicle.setSecondaryPaint('#2266aa');assert.ok(colors.length>0);assert.ok(colors.every(m=>m.color!==vehicle.body.color&&m.color.getHexString()==='2266aa'));assert.equal(vehicle.body.color.getHexString(),'eeeeee');
let seatFound=false;vehicle.setUpholstery('#e0ddd5');root.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(/Interior(ColourZone|TillingColourZone)A_|InteriorSeatColourZoneA/.test(m.name)){assert.equal((m as T.MeshStandardMaterial).color.getHexString(),'e0ddd5');if(m.name.includes('InteriorSeat'))seatFound=true}});assert.ok(seatFound,'Seat surfaces must participate in upholstery selection');
const assignments=JSON.parse(await fs.readFile('tools/generated/tourbillon-assignments.json','utf8')) as {material:string,faces:number,group:string}[]
for(const a of assignments){if(a.material==='col_2'||(/Carbon1/.test(a.material)&&[443,1095,849,3312,3313].includes(a.faces)))assert.equal(a.group,'body','Roof and fixed aperture must not follow the door')}
for(const [material,suffix,group] of [['Carbon1','0.088','door0'],['Carbon1','0.098','door1'],['InteriorA_','0.921','door0'],['InteriorA_','0.949','door1'],['InteriorA_','0.1163','door0'],['InteriorA_','0.1014','door1']]){
 const part=(assignments as (typeof assignments[number]&{name:string})[]).find(a=>a.material.includes(material!)&&a.name.endsWith(suffix!));assert.ok(part,'Missing door lining component '+suffix);assert.equal(part.group,group,'Window seal and inner panel must follow their door')
}
console.log('PASS: metre scale, four wheel pivots, two rising doors with stable closed pose, independent lamp controls')
vehicle.dispose()
