import {rolldown} from 'rolldown';
import * as T from 'three';import assert from 'node:assert/strict';
for(const name of ['motionRoad','lampDynamics','italianStreet','lampPool']){const build=await rolldown({input:'app/three/'+name+'.ts',external:id=>id==='three'||id.startsWith('three/')});await build.write({file:'tools/generated/verify-'+name+'.mjs',format:'esm'});await build.close()}
const {createMotionRoad}=await import('./generated/verify-motionRoad.mjs');
const textures=new Map(),owned=new Set();let disposedSources=0;
const originalMaterial=new T.MeshStandardMaterial();originalMaterial.name='sample_plaster';owned.add(originalMaterial);originalMaterial.addEventListener('dispose',()=>disposedSources++);
const geometry=new T.BoxGeometry(12,3,9);owned.add(geometry);geometry.addEventListener('dispose',()=>disposedSources++);
const facade={scenes:Array.from({length:3},()=>{const g=new T.Group();g.add(new T.Mesh(geometry,originalMaterial));return g})};
const tree={scenes:[],scene:new T.Group()};tree.scene.add(new T.Mesh(geometry,originalMaterial));
const assets={texture(url){if(!textures.has(url)){const map=new T.Texture();owned.add(map);map.addEventListener('dispose',()=>disposedSources++);textures.set(url,{map,ready:Promise.resolve()})}return textures.get(url)},model(url){return Promise.resolve(url.includes('facade')?facade:tree)},owns:r=>owned.has(r)};
const scene=new T.Scene();
for(let attempt=0;attempt<3;attempt++){
 const road=createMotionRoad(scene,true,assets);await road.ready;scene.updateMatrixWorld(true);
 assert(scene.getObjectByName('Continuous Roman countryside hills'),'terrain fills horizon');assert(scene.getObjectByName('Small weathered Roman wall fragments'),'low brick boundaries replace houses');
 const asphaltRoad=scene.getObjectByName('Continuous PBR asphalt road');assert(asphaltRoad.material.isMeshStandardMaterial&&asphaltRoad.receiveShadow,'asphalt accepts real light and shadows');const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};asphaltRoad.material.onBeforeCompile(shader);assert(!/;#/.test(shader.vertexShader+shader.fragmentShader),'GLSL preprocessor must begin a new line');road.update(200,30,3);road.dispose();assert.equal(scene.children.length,0,'old map fully detached');assert.equal(disposedSources,0,'shared source assets stay valid across switches');assert.equal(facade.scenes[0].children[0].material,originalMaterial,'map tint must not mutate cached source material');
}
console.log('Continuous paving bounds, map detachment and shared asset ownership pass.');
const {createLampDynamics}=await import('./generated/verify-lampDynamics.mjs');const root=new T.Group();root.add(new T.SpotLight(0xffffff,12),new T.SpotLight(0xffffff,12));const spill=new T.Mesh(new T.PlaneGeometry(),new T.ShaderMaterial({vertexShader:'void main(){gl_Position=vec4(position,1.);}',fragmentShader:'void main(){gl_FragColor=vec4(1.);}'}));spill.name='Headlight floor spill';root.add(spill);const lights=createLampDynamics(root);lights.configure('Ultra',true,false);assert.equal(root.children.filter(l=>l.isSpotLight&&l.castShadow).length,1);lights.update(120);assert.equal(spill.material.uniforms.lampTravel.value,120);lights.configure('Medium',true,true);lights.update(140);assert.equal(root.children.filter(l=>l.isSpotLight&&l.castShadow).length,0);assert.equal(spill.visible,false,'drive shader replaces floating light overlay');console.log('Shadow budget and moving light surface state pass.');

const {treeLayout}=await import('./generated/verify-italianStreet.mjs');
const layouts=Array.from({length:8},(_,i)=>treeLayout(i));
assert(new Set(layouts.map(l=>l.length)).size>1,'street sections have different tree densities');
for(let section=0;section<8;section++){
 const poses=layouts[section];assert.deepEqual(poses,treeLayout(section),'tree placements remain stable during streaming');
 for(const pose of poses){assert(Math.abs(pose.z)>=9&&Math.abs(pose.z)<16,'trees stay beyond stone shoulders');assert(pose.scale>=.8&&pose.scale<1.21)}
 for(let i=1;i<poses.length;i++)assert(poses[i].x-poses[i-1].x>7,'tree trunks cannot overlap');
}
console.log('Irregular tree density, safe planting bounds and stable stream poses pass.');

const {createHeadlightPool}=await import('./generated/verify-lampPool.mjs');
const physicalRoot=new T.Group(),lamp=new T.SpotLight(0xffffff,95),second=new T.SpotLight(0xffffff,95);lamp.position.set(-2,.5,.7);second.position.set(-2,.5,-.7);lamp.target.position.set(-6,0,.7);second.target.position.set(-6,0,-.7);physicalRoot.add(lamp,second,lamp.target,second.target);const pool=createHeadlightPool(-2,.7);physicalRoot.add(pool);const physicalLights=createLampDynamics(physicalRoot);physicalLights.configure('High',true,false);physicalLights.update(0);assert(pool.material.uniforms.lampPositions.value[0].equals(lamp.position));physicalRoot.position.x=10;physicalLights.update(0);assert.equal(pool.material.uniforms.lampPositions.value[0].x,8,'light reflection tracks actual world position');assert.equal(pool.material.uniforms.lampPowers.value[0],95);assert(pool.material.fragmentShader.includes('cameraPosition-surface'),'BRDF uses camera direction');assert(pool.material.fragmentShader.includes('1./distance2'),'physical inverse-square attenuation');assert(!pool.material.fragmentShader.includes('sin('),'no painted scrolling pattern');assert(layouts.every(poses=>new Set(poses.map(p=>p.species)).size===3),'three tree species are planted in every section');console.log('World-space lamp transforms, camera-dependent BRDF and two tree species pass.');

assert(layouts.every(poses=>poses.length>=3&&poses.length<=4),'trees stay in a controlled instance budget');

const {terrainHeight}=await import('./generated/verify-italianStreet.mjs');for(const x of [-180,-30,0,72,230])for(const z of [-60,-15,0,8,40])assert(Math.abs(terrainHeight(x,z)-terrainHeight(x+480,z))<1e-9,'terrain and vegetation keep identical heights on stream wrap');assert(Math.abs(terrainHeight(0,0)+.025)<1e-9,'terrain stays underneath central road');

const {forestLayout}=await import('./generated/verify-italianStreet.mjs');const groves=Array.from({length:6},(_,i)=>forestLayout(i));assert(groves.every(p=>p.length>=10&&p.length<=13));assert(groves.some(p=>p.filter(x=>x.z>0).length!==p.filter(x=>x.z<0).length),'groves cannot be mirrored');assert(groves.every(p=>p.some(x=>x.scale>1.3)),'distant groves include larger trees');console.log('Asymmetric grove groups and varied mature tree sizes pass.');
