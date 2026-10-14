import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import * as T from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {connectSuppliedRevueltoHinge} from '../app/three/suppliedRevueltoHinge'
import {hideRevueltoLegacyHooks} from '../app/three/revueltoLegacyHardware'

async function load(path:string){
 const file=await fs.readFile(path),length=file.readUInt32LE(12),doc=JSON.parse(file.subarray(20,20+length).toString()),binary=file.subarray(28+length)
 delete doc.images;delete doc.textures;delete doc.samplers
 for(const material of doc.materials??[]){delete material.normalTexture;delete material.occlusionTexture;delete material.emissiveTexture;if(material.pbrMetallicRoughness){delete material.pbrMetallicRoughness.baseColorTexture;delete material.pbrMetallicRoughness.metallicRoughnessTexture}delete material.extensions}
 const json=Buffer.from(JSON.stringify(doc)),j=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),header=Buffer.alloc(20),bh=Buffer.alloc(8)
 header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+j.length+binary.length,8);header.writeUInt32LE(j.length,12);header.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(binary.length);bh.writeUInt32LE(0x004e4942,4)
 const data=Buffer.concat([header,j,bh,binary]);return new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'')
}
const car=await load('public/models/lamborghini-revuelto-user-edited.glb'),asset=await load('public/models/revuelto-two-arm-mechanism.glb')
assert(!car.scene.getObjectByName('DoorJambLF_PaintedMetal'),'User-deleted metal part remains in website model')
hideRevueltoLegacyHooks(car.scene)
const root=new T.Group();root.add(car.scene);car.scene.rotation.y=-Math.PI/2;car.scene.position.set(.10516,.00108,0);root.updateMatrixWorld(true)
const doors=['L','R'].map(code=>{const d=new T.Group();d.name='Revuelto door '+code;root.add(d);const parts:T.Object3D[]=[];car.scene.traverse(o=>{if(o instanceof T.Mesh&&new RegExp(`^(Door${code}F_|DoorJamb${code}F_|DoorCard${code}F|WingMirror${code}_|MirrorBase${code}_|Glass${code}M_)`).test(o.name))parts.push(o)});for(const p of parts)d.attach(p);return d})
const before=doors.map(d=>{root.updateMatrixWorld(true);return d.matrixWorld.clone()})
const vehicle=connectSuppliedRevueltoHinge({root,doors},asset)
const delta=(a:T.Matrix4,b:T.Matrix4)=>Math.max(...a.elements.map((v,i)=>Math.abs(v-b.elements[i]!)))
assert(doors.every((d,i)=>delta(d.matrixWorld,before[i]!)<1e-6),'Closed pose changed')
const local=doors.map(d=>d.matrix.clone())
const brackets=doors.map((door,i)=>{
 const part=root.getObjectByName(`DoorJamb${i?'R':'L'}F_OriginalOrangeBracket`)
 assert(part instanceof T.Mesh,'Original orange door bracket missing')
 assert(part.geometry.index!.count>0&&part.geometry.index!.count<649*3,'Door flange was not separated')
 assert(!part.visible,'Overlapping original flange remains visible')
 return {part,local:part.matrixWorld.clone()}
})
const doorMeshes=new Set<T.Object3D>();doors.forEach(d=>d.traverse(o=>doorMeshes.add(o)))
const fixed:{node:T.Object3D;matrix:T.Matrix4}[]=[]
car.scene.traverse(o=>{if(o instanceof T.Mesh&&!doorMeshes.has(o))fixed.push({node:o,matrix:o.matrixWorld.clone()})})
const hardware=doors[0]!.parent!.children.filter(o=>o!==doors[0]).map(o=>({name:o.name,matrix:o.matrix.toArray()}))
await fs.writeFile('tools/generated/revuelto-door-hardware.json',JSON.stringify(hardware))
let visibleComplexMeshes=0
root.children.filter(c=>c.name.startsWith('Revuelto door animation controller')).forEach(c=>c.traverse(o=>{if(o instanceof T.Mesh&&!doorMeshes.has(o)&&o.visible)visibleComplexMeshes++}))
assert(visibleComplexMeshes===0,'Complex hinge remains visible')
let maxScaleError=0,maxClosureError=0
const poses:number[][]=[]
const bakeNames=['Door_Mount','Lower_Arm','Upper_Arm','Gas_Strut | cylinder aim','Gas_Strut | rod aim']
const bake=Object.fromEntries(bakeNames.map(name=>[name,[] as number[][]]))
for(let n=0;n<=240;n++){
 const p=n/240;vehicle.setDoors(p,p)
 root.children.filter(c=>c.name.startsWith('Revuelto original bracket connection')).forEach(c=>{
  assert(c.userData.reachMargin>.009,'Folding connection separated')
  assert(c.userData.sectionOverlap>.01,'Metal sections separated')
  c.children.filter(o=>!o.userData.originalOrangeBracket).forEach(o=>assert(o.scale.equals(new T.Vector3(1,1,1)),'Connection stretched'))
  const pin=c.getObjectByName('Original hook connection pin')!;const side=c.name.endsWith('L')?1:-1
  const expected=new T.Vector3(-.815,.535,side*.895).applyMatrix4(doors[side>0?0:1]!.matrixWorld)
  assert(pin.position.distanceTo(expected)<1e-6,'Connection detached from original hook')
 })
 poses.push(doors[0]!.matrixWorld.toArray())
 for(const name of bakeNames){const node=root.getObjectByName(name.replace(/ /g,'_'))!;assert(node,name);bake[name]!.push(node.matrix.toArray())}
 const held=doors.map(d=>d.matrixWorld.clone());vehicle.setDoors(p,p);doors.forEach((d,i)=>assert(delta(d.matrixWorld,held[i]!)<1e-7,'Repeated update drifts'))
 brackets.forEach(({part,local})=>{assert(delta(part.matrixWorld,doors[brackets.findIndex(b=>b.part===part)]!.matrixWorld.clone().multiply(local))<1e-6,'Original bracket detached from door');assert(!part.visible,'Overlapping original flange became visible')})
 fixed.forEach(({node,matrix})=>assert(delta(node.matrixWorld,matrix)<1e-8,'Fixed car geometry moved'))
 doors.forEach((door,i)=>{assert(delta(door.matrix,local[i]!)<1e-8,'Door detached from moving mount');const scale=door.getWorldScale(new T.Vector3());maxScaleError=Math.max(maxScaleError,...scale.toArray().map(v=>Math.abs(Math.abs(v)-1)));assert(door.getObjectByName(`DoorCard${i?'R':'L'}F_Leather` )||door.children.some(o=>o.name.startsWith('DoorCard')),'Door liner missing')})
}
vehicle.setDoors(1,0);assert(delta(doors[1]!.matrixWorld,before[1]!)<1e-6,'Independent right door moved')
vehicle.setDoors(0,1);assert(delta(doors[0]!.matrixWorld,before[0]!)<1e-6,'Independent left door moved')
vehicle.setDoors(0,0);doors.forEach((d,i)=>maxClosureError=Math.max(maxClosureError,delta(d.matrixWorld,before[i]!)))
assert(maxScaleError<1e-5);assert(maxClosureError<1e-6)
// The accepted outward-release path is the regression contract for this fix.
// The original rigid bracket stays attached to the door.
const approved=JSON.parse(await fs.readFile('tools/generated/revuelto-approved-door-poses.json','utf8')) as number[][]
let maxApprovedPoseError=0
poses.forEach((pose,i)=>{maxApprovedPoseError=Math.max(maxApprovedPoseError,delta(new T.Matrix4().fromArray(pose),new T.Matrix4().fromArray(approved[i]!)))})
assert(maxApprovedPoseError<1e-6,'Approved door trajectory changed')
for(let n=240;n>=0;n--){vehicle.setDoors(n/240);assert(delta(doors[0]!.matrixWorld,new T.Matrix4().fromArray(poses[n]!))<1e-7,'Closing path differs from opening')}
const report={samples:241,maxApprovedPoseError,maxScaleError,maxClosureError,visibleComplexMeshes,replacedDoorFlanges:brackets.length,clips:asset.animations.map(c=>c.name),maskedFaces:Object.fromEntries(['DoorJambLF_CarPaint','DoorJambRF_CarPaint','DoorSill_CarPaint','DoorSill_PaintedMetal'].map(n=>[n,root.getObjectByName(n)?.userData.hiddenLegacyHookFaces]))}
await fs.writeFile('tools/generated/two-arm-runtime-verification.json',JSON.stringify(report,null,2));console.log(report)
await fs.writeFile('tools/generated/revuelto-current-door-poses.json',JSON.stringify(poses))
await fs.writeFile('tools/generated/revuelto-release-bake.json',JSON.stringify(bake))











