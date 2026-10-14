import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const bytes=await fs.readFile('public/models/fitted-hinges/revuelto-hinges.glb');
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const root=gltf.scene,mixer=new T.AnimationMixer(root),nodes=[];root.traverse(o=>nodes.push(o));const report=[];
for(const [i,side] of ['L','R'].entries()){
 const fixed=root.getObjectByName(`revuelto_FixedHinge_${i}`),leaf=root.getObjectByName(`revuelto_DoorHinge_${i}`),door=root.getObjectByName(`DoorAnchor_${side}`),sign=Math.sign(door.position.z);
 const barrel=nodes.filter(o=>o.name.includes('_gas_barrel_'))[i],rod=nodes.filter(o=>o.name.includes('_gas_piston_'))[i];
 const shaft=nodes.filter(o=>o.name.includes('_inclined_hinge_axis_'))[i],knuckle=nodes.filter(o=>o.name.includes('_moving_knuckle_'))[i];
 const clip=gltf.animations.find(c=>c.name===`Door_${side}_Open`),action=mixer.clipAction(clip);action.play();action.paused=true;let error=0,gasError=0,axisError=0;
 for(let frame=0;frame<=120;frame++){
  action.time=clip.duration*frame/120;mixer.update(0);root.updateMatrixWorld(true);
  error=Math.max(error,shaft.getWorldPosition(new T.Vector3()).distanceTo(knuckle.getWorldPosition(new T.Vector3())));
  const fixedAxis=new T.Vector3(0,1,0).transformDirection(shaft.matrixWorld),movingAxis=new T.Vector3(0,1,0).transformDirection(knuckle.matrixWorld);axisError=Math.max(axisError,fixedAxis.distanceTo(movingAxis));
  const base=fixed.localToWorld(new T.Vector3(-.015,-.31,-sign*.045)),tip=leaf.localToWorld(new T.Vector3(.12,-.075,-sign*.045));
  gasError=Math.max(gasError,barrel.localToWorld(new T.Vector3(0,-.15/2,0)).distanceTo(base),rod.localToWorld(new T.Vector3(0,.5,0)).distanceTo(tip));
  assert(barrel.scale.distanceTo(new T.Vector3(1,1,1))<1e-6,'Gas barrel stretched');assert(rod.scale.y>0,'Negative gas extension');
 }
 assert(error<1e-5&&axisError<1e-5,'Hinge disconnected or axes not coaxial');assert(gasError<1e-5,'Gas support disconnected');action.stop();report.push({side,samples:121,pivotError:error,axisError,gasError});
}
await fs.writeFile('tools/generated/door-mechanisms/revuelto-axis-verification.json',JSON.stringify(report,null,2));console.log(report);
