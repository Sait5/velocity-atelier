import fs from 'node:fs/promises';
import ts from 'typescript';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
const motion=await fs.readFile('app/three/revueltoDoorMotion.ts','utf8');
await fs.writeFile('tools/generated/revueltoDoorMotion.mjs',ts.transpileModule(motion,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {setRevueltoDoorPose}=await import('./generated/revueltoDoorMotion.mjs');
const source=await fs.readFile('app/three/fittedDoorHardware.ts','utf8');
await fs.writeFile('tools/generated/fittedDoorHardware.mjs',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace('./revueltoDoorMotion','./revueltoDoorMotion.mjs'));
const {installFittedDoorHardware}=await import('./generated/fittedDoorHardware.mjs?'+Date.now());
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.()})}readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result='data:'+blob.type+';base64,'+Buffer.from(result).toString('base64');this.onloadend?.()})}};
await fs.mkdir('public/models/fitted-hinges',{recursive:true});
for(const key of ['porsche','ferrari','revuelto'].filter(key=>!process.argv[2]||key===process.argv[2])){
 const root=new T.Group();root.name=key+'_Hardware';const doors=[];
 for(let i=0;i<2;i++){
  const d=new T.Group();d.name='DoorAnchor_'+(i?'R':'L');
  d.position.set(...(key==='porsche'?[-.73,.70,i?-.79:.79]:key==='ferrari'?[-.732756984,.651469231,i?.775303:-.775303]:[-1.10,.64,i?-.86:.86]));root.add(d);doors.push(d);
 }
 const rest=doors.map(d=>d.position.clone());
 function original(left,right=left){doors.forEach((d,i)=>{const p=T.MathUtils.clamp(i?right:left,0,1);d.position.copy(rest[i]);if(key==='revuelto'){setRevueltoDoorPose(d,i?-1:1,p)}else {d.rotation.y=(key==='porsche'?-Math.sign(rest[i].z)*1.12:i?-1.02:1.02)*p;if(key!=='revuelto'){const pivot=new T.Vector3(key==='porsche'?-.77:rest[i].x-.14,rest[i].y,Math.sign(rest[i].z)*.84);d.position.copy(rest[i]).sub(pivot).applyAxisAngle(new T.Vector3(0,1,0),d.rotation.y).add(pivot)}}})}
 const v=installFittedDoorHardware({root,doors,setDoors:original},key),nodes=[];root.traverse(o=>nodes.push(o));const clips=[];
 for(let side=0;side<2;side++){
  const times=[],records=nodes.map(o=>({o,position:[],quaternion:[],scale:[]}));
  for(let frame=0;frame<=120;frame++){const p=frame/120;v.setDoors(side?0:p,side?p:0);times.push(p*1.2);for(const r of records)for(const property of ['position','quaternion','scale'])r[property].push(...r.o[property].toArray())}
  const tracks=[];
  for(const r of records)for(const property of ['position','quaternion','scale']){
   const size=property==='quaternion'?4:3,values=r[property];if(values.every((value,i)=>Math.abs(value-values[i%size])<1e-7))continue;
   const Track=property==='quaternion'?T.QuaternionKeyframeTrack:T.VectorKeyframeTrack;tracks.push(new Track(r.o.name+'.'+property,times,values));
  }
  const name='Door_'+(side?'R':'L');clips.push(new T.AnimationClip(name+'_Open',1.2,tracks));
  const reverse=tracks.map(track=>{const c=track.clone(),size=c.getValueSize();for(let frame=0;frame<=120;frame++)for(let j=0;j<size;j++)c.values[frame*size+j]=track.values[(120-frame)*size+j];return c});clips.push(new T.AnimationClip(name+'_Close',1.2,reverse));
 }
 v.setDoors(0,0);root.updateMatrixWorld(true);
 const glb=await new GLTFExporter().parseAsync(root,{binary:true,animations:clips,onlyVisible:true});await fs.writeFile('public/models/fitted-hinges/'+key+'-hinges.glb',Buffer.from(glb));
 console.log(key,clips.map(c=>c.name+':'+c.tracks.length).join(', '));
}



