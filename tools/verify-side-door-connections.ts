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
const reports=[]
const accepted=JSON.parse(await fs.readFile('tools/generated/side-door-accepted-poses.json','utf8'))
await fs.writeFile('tools/generated/retired-italia-hardware.json',JSON.stringify(retiredItaliaHardware))
for(const [key,path,names] of [['porsche','public/models/porsche-911-gt3-door-assembly.glb',['Porsche_door_L','Porsche_door_R']],['ferrari','tools/generated/ferrari-side-door-test.glb',['door_L','door_R']]] as const){
 const car=await load(path),root=car.scene,doors=names.map(n=>root.getObjectByName(n) as T.Group)
 root.updateWorldMatrix(true,true)
 if(key==='ferrari')removeRetiredItaliaHinges(root)
 const before=doors.map(d=>d.matrixWorld.clone()),doorNodes=new Set<T.Object3D>();doors.forEach(d=>d.traverse(o=>doorNodes.add(o)))
 const fixed:{node:T.Object3D,matrix:T.Matrix4}[]=[];root.traverse(o=>{if(o instanceof T.Mesh&&!doorNodes.has(o))fixed.push({node:o,matrix:o.matrixWorld.clone()})})
 const originalMeshes:T.Mesh[]=[];root.traverse(o=>{if(o instanceof T.Mesh)originalMeshes.push(o)})
 const geometry=originalMeshes.map(o=>o.geometry)
 const authoredPoses:T.Matrix4[][]=[],rests=doors.map(d=>d.position.clone())
 const authoredSetDoors=key==='porsche'?(left:number,right=left)=>{doors.forEach((door,i)=>{const p=T.MathUtils.clamp(i?right:left,0,1),side=Math.sign(rests[i]!.z),pivot=new T.Vector3(-.77,.70,side*.84),angle=-side*p*1.12;door.position.copy(rests[i]!).sub(pivot).applyAxisAngle(new T.Vector3(0,1,0),angle).add(pivot);door.rotation.y=angle});root.updateWorldMatrix(true,true)}:undefined
 if(authoredSetDoors){for(let n=0;n<=240;n++){authoredSetDoors(n/240);authoredPoses.push(doors.map(d=>d.matrixWorld.clone()))}authoredSetDoors(0)}
 const vehicle=installSideDoorConnections({root,doors,setDoors:authoredSetDoors},key)
 const hinges:T.Mesh[]=[];root.traverse(o=>{if(o instanceof T.Mesh&&!originalMeshes.includes(o))hinges.push(o)})
 const records=hinges.map(o=>({name:o.name,positions:Array.from(o.geometry.getAttribute('position').array),indices:o.geometry.index?Array.from(o.geometry.index.array):undefined,matrix:o.matrixWorld.toArray(),samples:[] as number[][]}))
 const poses:number[][][]=[],delta=(a:T.Matrix4,b:T.Matrix4)=>Math.max(...a.elements.map((v,i)=>Math.abs(v-b.elements[i]!)))
 let maxJointSeparation=0
 for(let n=0;n<=240;n++){
  vehicle.setDoors(n/240);poses.push(doors.map(d=>d.matrixWorld.toArray()));hinges.forEach((o,i)=>records[i]!.samples.push(o.matrixWorld.toArray()))
  doors.forEach((door,i)=>assert(delta(door.matrixWorld,new T.Matrix4().fromArray(accepted[key][n][i]))<1e-7,'Accepted door animation changed'))
  if(authoredSetDoors)doors.forEach((door,i)=>assert(delta(door.matrixWorld,authoredPoses[n]![i]!)<1e-7,'Authored Porsche door animation changed'))
  fixed.forEach(({node,matrix})=>assert(delta(node.matrixWorld,matrix)<1e-7,'Fixed body moved'))
  for(const i of [0,1])for(const j of [0,1]){
   const assembly=root.getObjectByName(`${key} compact door hinges ${i?'R':'L'}`)!
   const point=(name:string)=>assembly.getObjectByName(name)!.getWorldPosition(new T.Vector3())
   const elbow=point(`Folding hinge pin ${j}`)
   for(const [name,start,end] of [[`Body rigid hinge link ${j}`,point(`Body hinge pin ${j}`),elbow],[`Door rigid hinge link ${j}`,elbow,point(`Vertical hinge pin ${j}`)]] as const){
    const link=assembly.getObjectByName(name) as T.Mesh<T.BoxGeometry>,half=link.geometry.parameters.width/2
    const a=link.localToWorld(new T.Vector3(-half,0,0)),b=link.localToWorld(new T.Vector3(half,0,0))
    assert(a.distanceTo(start)<1e-6&&b.distanceTo(end)<1e-6,'Rigid link disconnected or stretched')
   }
  }
  doors.forEach((door,i)=>{for(const j of [0,1]){const shaft=root.getObjectByName(`${key} compact door hinges ${i?'R':'L'}`)!.getObjectByName(`Vertical hinge pin ${j}`)!;const sleeve=door.getObjectByName(`Moving hinge sleeve ${j}`)!;maxJointSeparation=Math.max(maxJointSeparation,shaft.getWorldPosition(new T.Vector3()).distanceTo(sleeve.getWorldPosition(new T.Vector3())))}assert(door.getWorldScale(new T.Vector3()).distanceTo(new T.Vector3(1,1,1))<1e-5,'Door deformed')})
 }
 assert(maxJointSeparation<1e-6,'Door hinge disconnected')
 vehicle.setDoors(1,0);assert(delta(doors[1]!.matrixWorld,before[1]!)<1e-6,'Right door not independent')
 vehicle.setDoors(0,1);assert(delta(doors[0]!.matrixWorld,before[0]!)<1e-6,'Left door not independent')
 for(let n=240;n>=0;n--){vehicle.setDoors(n/240);doors.forEach((door,i)=>assert(delta(door.matrixWorld,new T.Matrix4().fromArray(poses[n]![i]!))<1e-7,'Closing path changed'))}
 doors.forEach((door,i)=>assert(delta(door.matrixWorld,before[i]!)<1e-6,'Closed pose changed'));originalMeshes.forEach((o,i)=>assert(o.geometry===geometry[i],'Car geometry changed'))
 await fs.writeFile(`tools/generated/${key}-compact-hinges.json`,JSON.stringify({doorNames:names,poses,hardware:records}))
 reports.push({car:key,samples:241,openDegrees:1.12*180/Math.PI,maxJointSeparation,hardwareMeshes:hinges.length,closedPosePreserved:true,acceptedAnimationPreserved:true})
}
console.log(reports);await fs.writeFile('tools/generated/side-door-verification.json',JSON.stringify(reports,null,2))
