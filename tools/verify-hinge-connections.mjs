import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const car=process.argv[2]||'porsche';
const b=await fs.readFile(`public/models/fitted-hinges/${car}-hinges.glb`);
const gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
const root=gltf.scene,mixer=new T.AnimationMixer(root),report=[];
const pos=o=>o.getWorldPosition(new T.Vector3());
for(const side of ['L','R']){
 const i=side==='L'?0:1,fixed=root.getObjectByName(`${car}_FixedHinge_${i}`),leaf=root.getObjectByName(`${car}_DoorHinge_${i}`);
 const pins=fixed.children.filter(o=>o.name.includes('_hinge_axis_')),knuckles=leaf.children.filter(o=>o.name.includes('_moving_knuckle_'));
 const a=fixed.children.find(o=>o.name.includes('_body_wiring_grommet_')),z=leaf.children.find(o=>o.name.includes('_door_wiring_grommet_'));
 const all=[];root.traverse(o=>{if(o.name.includes('_flexible_wiring_boot_'))all.push(o)});
 const segments=all.slice(i*28,(i+1)*28);
 assert.equal(pins.length,2);assert.equal(segments.length,28);
 const act=mixer.clipAction(gltf.animations.find(c=>c.name===`Door_${side}_Open`));act.play();act.paused=true;
 let axisError=0,endpointError=0,deflection=0;
 for(let sample=0;sample<=120;sample++){
  act.time=act.getClip().duration*sample/120;mixer.update(0);root.updateMatrixWorld(true);
  for(let n=0;n<2;n++){axisError=Math.max(axisError,pos(pins[n]).distanceTo(pos(knuckles[n])));const up=new T.Vector3(0,1,0).applyQuaternion(pins[n].getWorldQuaternion(new T.Quaternion()));assert(up.distanceTo(new T.Vector3(0,1,0))<1e-5,'Hinge axis tilted');}
  const start=segments[0].localToWorld(new T.Vector3(0,-.5,0)),end=segments.at(-1).localToWorld(new T.Vector3(0,.5,0));
  endpointError=Math.max(endpointError,start.distanceTo(pos(a)),end.distanceTo(pos(z)));
  if(sample===120){const mid=pos(segments[14]),line=new T.Line3(pos(a),pos(z));deflection=mid.distanceTo(line.closestPointToPoint(mid,true,new T.Vector3()));}
 }
 assert(axisError<1e-5,`Detached hinge: ${axisError}`);assert(endpointError<.0003,`Detached wiring boot: ${endpointError}`);assert(deflection>.003,'Wiring boot became a straight bar');
 act.stop();report.push({side,samples:121,axisError,endpointError,openBootDeflection:deflection});
}
await fs.writeFile(`tools/generated/door-mechanisms/${car}-hinge-connection-verification.json`,JSON.stringify(report,null,2));console.log(report);
