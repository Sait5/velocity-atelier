import {rolldown} from 'rolldown';
import * as T from 'three';import assert from 'node:assert/strict';
for(const name of ['motionRoad','lampDynamics','italianStreet']){const build=await rolldown({input:'app/three/'+name+'.ts',external:id=>id==='three'||id.startsWith('three/')});await build.write({file:'tools/generated/verify-'+name+'.mjs',format:'esm'});await build.close()}
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
 const surfaces=[];scene.traverse(o=>{if(o instanceof T.Mesh&&o.material instanceof T.MeshStandardMaterial&&o.material.map===textures.get('/textures/italian-pavement-diff-4k.webp').map)surfaces.push(o)});
 assert.equal(surfaces.length,2,'one seamless pavement surface per street side');
 for(const surface of surfaces){const b=new T.Box3().setFromObject(surface);assert(Math.abs(b.min.y-b.max.y)<1e-6);assert(Math.abs(b.min.y-.122)<1e-6);assert(Math.abs(Math.min(Math.abs(b.min.z),Math.abs(b.max.z))-5)<1e-6);assert(Math.abs(Math.max(Math.abs(b.min.z),Math.abs(b.max.z))-24.5)<1e-6)}
 const asphaltRoad=scene.getObjectByName('Continuous PBR asphalt road');assert(asphaltRoad.material.isMeshStandardMaterial&&asphaltRoad.receiveShadow,'asphalt accepts real light and shadows');const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};asphaltRoad.material.onBeforeCompile(shader);assert(!/;#/.test(shader.vertexShader+shader.fragmentShader),'GLSL preprocessor must begin a new line');road.update(200,30,3);road.dispose();assert.equal(scene.children.length,0,'old map fully detached');assert.equal(disposedSources,0,'shared source assets stay valid across switches');assert.equal(facade.scenes[0].children[0].material,originalMaterial,'map tint must not mutate cached source material');
}
console.log('Continuous paving bounds, map detachment and shared asset ownership pass.');
const {createLampDynamics}=await import('./generated/verify-lampDynamics.mjs');const root=new T.Group();root.add(new T.SpotLight(0xffffff,12),new T.SpotLight(0xffffff,12));const spill=new T.Mesh(new T.PlaneGeometry(),new T.ShaderMaterial({vertexShader:'void main(){gl_Position=vec4(position,1.);}',fragmentShader:'void main(){gl_FragColor=vec4(1.);}'}));spill.name='Headlight floor spill';root.add(spill);const lights=createLampDynamics(root);lights.configure('Ultra',true,false);assert.equal(root.children.filter(l=>l.isSpotLight&&l.castShadow).length,1);lights.update(120);assert.equal(spill.material.uniforms.lampTravel.value,120);lights.configure('Medium',true,true);lights.update(140);assert.equal(root.children.filter(l=>l.isSpotLight&&l.castShadow).length,0);assert.equal(spill.visible,false,'drive shader replaces floating light overlay');console.log('Shadow budget and moving light surface state pass.');

const {treeLayout}=await import('./generated/verify-italianStreet.mjs');
const layouts=Array.from({length:8},(_,i)=>treeLayout(i));
assert(new Set(layouts.map(l=>l.length)).size>1,'street sections have different tree densities');
for(let section=0;section<8;section++){
 const poses=layouts[section];assert.deepEqual(poses,treeLayout(section),'tree placements remain stable during streaming');
 for(const pose of poses){assert(Math.abs(pose.z)>7.5&&Math.abs(pose.z)<11,'trees remain between road and facade');assert(pose.scale>.7&&pose.scale<1.15)}
 for(let i=1;i<poses.length;i++)assert(poses[i].x-poses[i-1].x>7,'tree trunks cannot overlap');
}
console.log('Irregular tree density, safe planting bounds and stable stream poses pass.');
