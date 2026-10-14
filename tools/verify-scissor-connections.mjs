import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const bytes=await fs.readFile('public/models/fitted-hinges/revuelto-hinges.glb');
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const root=gltf.scene,mixer=new T.AnimationMixer(root),nodes=[];root.traverse(o=>nodes.push(o));const report=[];
const lower=nodes.filter(o=>o.name.includes('_scissor_lower_link_')),upper=nodes.filter(o=>o.name.includes('_scissor_upper_link_')),elbows=nodes.filter(o=>o.name.includes('_scissor_elbow_'));
for(const [i,side] of ['L','R'].entries()){
 const fixed=root.getObjectByName(`revuelto_FixedHinge_${i}`),door=root.getObjectByName(`DoorAnchor_${side}`),sign=Math.sign(door.position.z);
 const barrel=nodes.filter(o=>o.name.includes('_gas_barrel_'))[i],rod=nodes.filter(o=>o.name.includes('_gas_piston_'))[i];
 const clip=gltf.animations.find(c=>c.name===`Door_${side}_Open`),action=mixer.clipAction(clip);action.play();action.paused=true;let error=0,gasError=0;
 for(let frame=0;frame<=120;frame++){
  action.time=clip.duration*frame/120;mixer.update(0);root.updateMatrixWorld(true);
  const base=fixed.localToWorld(new T.Vector3(.17,-.25,-sign*.065)),tip=door.localToWorld(new T.Vector3(.25,.10,-sign*.065));
  gasError=Math.max(gasError,barrel.localToWorld(new T.Vector3(0,-.22/2,0)).distanceTo(base),rod.localToWorld(new T.Vector3(0,.5,0)).distanceTo(tip));
  assert(barrel.scale.distanceTo(new T.Vector3(1,1,1))<1e-6,'Gas cylinder body stretched');assert(rod.scale.y>0,'Negative gas strut extension');
  for(let pair=0;pair<2;pair++){
   const offset=pair===0?-.013:.013,l=lower[i*2+pair],u=upper[i*2+pair],joint=elbows[i*2+pair].getWorldPosition(new T.Vector3());
   const a=fixed.localToWorld(new T.Vector3(.18,-.23,-sign*.025+offset)),b=door.localToWorld(new T.Vector3(.23,.10,-sign*.023+offset));
   const ends=[l.localToWorld(new T.Vector3(0,-.29/2,0)),l.localToWorld(new T.Vector3(0,.29/2,0)),u.localToWorld(new T.Vector3(0,-.31/2,0)),u.localToWorld(new T.Vector3(0,.31/2,0))];
   error=Math.max(error,ends[0].distanceTo(a),ends[1].distanceTo(joint),ends[2].distanceTo(joint),ends[3].distanceTo(b));
   assert(l.scale.distanceTo(new T.Vector3(1,1,1))<1e-6&&u.scale.distanceTo(new T.Vector3(1,1,1))<1e-6,'Rigid scissor link was stretched');
  }
 }
 assert(error<1e-5,`Disconnected scissor mechanism: ${error}`);assert(gasError<1e-5,`Disconnected gas support: ${gasError}`);action.stop();report.push({side,samples:121,jointError:error,gasError,linkLengths:[.29,.31],gasCylinderLength:.22});
}
await fs.writeFile('tools/generated/door-mechanisms/scissor-connection-verification.json',JSON.stringify(report,null,2));console.log(report);
