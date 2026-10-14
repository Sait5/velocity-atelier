import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const reports=[];
for(const car of ['porsche','ferrari','revuelto']){
 let file=await fs.readFile(`public/models/fitted-hinges/${car}-complete.glb`);
 const length=file.readUInt32LE(12),doc=JSON.parse(file.subarray(20,20+length)),binary=file.subarray(28+length);
 delete doc.images;delete doc.textures;delete doc.samplers;doc.materials=[{}];
 for(const mesh of doc.meshes)for(const p of mesh.primitives)p.material=0;
 const json=Buffer.from(JSON.stringify(doc)),padding=(4-json.length%4)%4,j=Buffer.concat([json,Buffer.alloc(padding,32)]),header=Buffer.alloc(20),bh=Buffer.alloc(8);
 header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+j.length+binary.length,8);header.writeUInt32LE(j.length,12);header.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(binary.length);bh.writeUInt32LE(0x004e4942,4);file=Buffer.concat([header,j,bh,binary]);
 const gltf=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');
 const root=gltf.scene,mixer=new T.AnimationMixer(root),left=root.getObjectByName('DoorAnchor_L'),right=root.getObjectByName('DoorAnchor_R');
 assert(left&&right);
 const lr=left.matrix.clone(),rr=right.matrix.clone();
 const states={};
 for(const side of ['L','R']){
  const anchor=side==='L'?left:right,other=side==='L'?right:left;
  const before=other.position.clone();
  const open=gltf.animations.find(x=>x.name===`Door_${side}_Open`),close=gltf.animations.find(x=>x.name===`Door_${side}_Close`);
  assert(open&&close,`${car} missing independent open/close clips`);
  const act=mixer.clipAction(open);act.play();act.paused=true;act.time=open.duration;mixer.update(0);root.updateMatrixWorld(true);
  const end=anchor.matrixWorld.clone();assert(other.position.distanceTo(before)<1e-7,'Opposite door moved');
  const angle=anchor.quaternion.angleTo(new T.Quaternion());assert(angle>.8,`${car} animation did not open`);
  act.stop();const back=mixer.clipAction(close);back.play();back.paused=true;back.time=0;mixer.update(0);root.updateMatrixWorld(true);
  assert(Math.max(...end.elements.map((v,i)=>Math.abs(v-anchor.matrixWorld.elements[i])))<1e-5,'Close clip does not start at open pose');
  back.time=close.duration;mixer.update(0);root.updateMatrixWorld(true);
  const rest=side==='L'?lr:rr;assert(Math.max(...rest.elements.map((v,i)=>Math.abs(v-anchor.matrix.elements[i])))<1e-5,'Close does not return to rest');
  back.stop();states[side]={duration:open.duration,angleDegrees:angle*180/Math.PI};
 }
 reports.push({car,clips:gltf.animations.map(x=>x.name),states});
}
await fs.writeFile('tools/generated/door-mechanisms/fitted-full-runtime-verification.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));


