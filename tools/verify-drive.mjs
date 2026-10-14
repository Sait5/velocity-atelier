import {rolldown} from 'rolldown';import {PerspectiveCamera,Vector3} from 'three';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
await fs.mkdir('tools/generated',{recursive:true});
for(const name of ['driveLook','straightMotion']){const build=await rolldown({input:'app/three/'+name+'.ts',external:['three']});await build.write({file:'tools/generated/'+name+'.mjs',format:'esm'});await build.close()}
const {createDriveLook}=await import('./generated/driveLook.mjs');
for(const view of [0,1,2]){const camera=new PerspectiveCamera(),look=createDriveLook(camera),origin=new Vector3();for(let i=0;i<300;i++)look.turn(0,80,view);for(let i=0;i<200;i++)look.apply(origin,0,view,1/60);const y=camera.position.y,rotation=camera.quaternion.clone();look.turn(0,-80,view);for(let i=0;i<30;i++)look.apply(origin,0,view,1/60);if(view===1)assert(camera.quaternion.angleTo(rotation)>.01);else assert(camera.position.y>y+.1);console.log('Camera reverses immediately at lower limit:',view)}
const {createStraightMotion}=await import('./generated/straightMotion.mjs');
for(const max of [325,370]){const motion=createStraightMotion(max);let result;for(let i=0;i<120*60;i++)result=motion.step(1/60,true,false,false);assert(Math.abs(result.speed*3.6-max)<.01);assert.equal(result.gear,max===370?8:7);for(let i=0;i<10*60;i++)result=motion.step(1/60,false,true,false);assert.equal(result.speed,0);console.log('Speed limit, gear count and braking:',max,result.gear)}

for(const [limit,count] of [[325,8],[370,7]]){const motion=createStraightMotion(limit,count);let result;for(let i=0;i<120*60;i++)result=motion.step(1/60,true,false,false);assert.equal(result.gear,count);console.log("Explicit vehicle gear count is independent of speed limit:",limit,count)}

// Short imported roads must stop at the scan boundary even with auto acceleration held.
for(const dt of [1/30,1/60,1/144]){const motion=createStraightMotion(370,8);let result;for(let i=0;i<40/dt;i++){result=motion.step(dt,true,false,false,0,110);assert(result.distance<=110);assert(result.speed<=25)}assert.equal(result.speed,0);assert(result.distance>109.98);for(let i=0;i<30/dt;i++)result=motion.step(dt,false,false,true,0,110);assert.equal(result.distance,0);assert.equal(result.speed,0);motion.reset();assert.equal(motion.step(dt,false,false,false,0,110).distance,0)}console.log('Finite scanned route: smooth endpoint stop, bounded reverse and reset at 30/60/144 FPS')

// Full orbit and lane changes must remain inside tunnel walls without post-orbit clamping.
for(const view of [0,2])for(const lane of [-2.7,0,2.7]){const camera=new PerspectiveCamera(),look=createDriveLook(camera);look.setTunnel(true);const origin=new Vector3(0,0,lane);let previous;for(let i=0;i<2400;i++){look.turn(8,Math.sin(i*.01)*3,view);look.apply(origin,0,view,1/60);assert(Math.abs(camera.position.z)<3.56);assert(camera.position.y<3.13);assert(camera.position.distanceTo(origin)<7);if(previous)assert(camera.position.distanceTo(previous)<.12);previous=camera.position.clone()}}console.log('Tunnel camera: continuous full orbit, bounded distance, height and lane clearance');

// New road is continuous, flat across its full width, with the mountain on the right.
const coastalBuild=await rolldown({input:'app/three/coastalLandscape.ts',external:['three','three/addons/loaders/GLTFLoader.js','three/addons/libs/meshopt_decoder.module.js']});await coastalBuild.write({file:'tools/generated/coastalLandscape.mjs',format:'esm'});await coastalBuild.close();
const {coastalHeight,coastalCentre,coastalTangent,coastalLength}=await import('./generated/coastalLandscape.mjs');
assert.equal(coastalLength,3000);
for(let d=0;d<coastalLength;d+=.5){for(const s of [-5,0,5])assert.equal(coastalHeight(d,s),24);assert(coastalHeight(d,-150)>65);assert(coastalHeight(d,60)<1);assert(Math.abs(coastalCentre(d+.5)-coastalCentre(d))<.075);assert(Math.abs(coastalTangent(d+.5)-coastalTangent(d))<.001)}
for(const view of [0,2]){const camera=new PerspectiveCamera(),look=createDriveLook(camera);look.setCoastal(true);for(let i=0;i<1500;i++){look.turn(5,Math.sin(i*.02)*10,view);look.apply(new Vector3(),0,view,1/60);assert(camera.position.length()<(view===2?28.01:13.01));assert(camera.position.y>1.85)}}
console.log('New coast: 3 km continuous driving surface, gentle tangent, mountains right and sea left');
