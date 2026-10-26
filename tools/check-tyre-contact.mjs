import {build} from 'esbuild';import * as T from 'three';import assert from 'node:assert/strict';
// Rigid tyre contact and true wheels (app/three/tyreContact.ts, wheelAxis.ts) on synthetic wheels built like the site's
// models: one mesh authored with 1.5° camber in a square group (Porsche, Bugatti), a tyre 2 mm off its rim with a disc 3 mm
// off and leaning 0.8° (Ferrari front, AMG, McLaren), and plain wheels. After createTyreContact every piece must turn true
// about its group's z axis, and every tyre must stay on the road through a whole revolution.
await build({entryPoints:['app/three/tyreContact.ts'],outfile:'tools/generated/tyre-contact-check.mjs',bundle:true,platform:'node',format:'esm',external:['three'],logLevel:'error'});const {createTyreContact}=await import('./generated/tyre-contact-check.mjs');
const lathe=(profile,segments=96)=>new T.LatheGeometry(profile.map(([r,z])=>new T.Vector2(r,z)),segments).rotateX(Math.PI/2)// lathe axis y -> z
const tyreProfile=[[.27,-.12],[.31,-.135],[.345,-.12],[.355,-.06],[.356,0],[.355,.06],[.345,.12],[.31,.135],[.27,.12]]
const rimProfile=[[.05,.06],[.2,.06],[.26,.07],[.27,.1],[.27,-.12],[.26,-.1]]
function rim(){const g=new T.Group(),m=new T.Mesh(lathe(rimProfile),new T.MeshStandardMaterial({name:'rim'}));g.add(m)
 for(let i=0;i<5;i++){const s=new T.Mesh(new T.BoxGeometry(.03,.21,.02),m.material);s.position.set(Math.cos(i*Math.PI*2/5)*.155,Math.sin(i*Math.PI*2/5)*.155,.07);s.rotation.z=i*Math.PI*2/5-Math.PI/2;g.add(s)}return g}
const tyre=()=>new T.Mesh(lathe(tyreProfile),new T.MeshStandardMaterial({name:'tire'}))
const disc=()=>new T.Mesh(new T.CylinderGeometry(.19,.19,.03,64).rotateX(Math.PI/2),new T.MeshStandardMaterial({name:'disc'}))
function car(){
 const root=new T.Group(),wheels=[]
 for(const [x,z] of [[-1.4,-.8],[-1.4,.8],[1.4,-.8],[1.4,.8]]){const w=new T.Group();w.position.set(x,.356,z);root.add(w);wheels.push(w)}
 // 0: one piece (tyre, rim, disc) leaning 1.5° in its group
 const one=new T.Group();one.add(tyre(),rim(),disc());one.rotation.x=1.5*Math.PI/180;wheels[0].add(one)
 // 1: separate pieces off each other's axis
 const t=tyre();t.position.set(.002,0,0);const d=disc();d.position.set(0,-.003,-.03);d.rotation.y=.8*Math.PI/180;wheels[1].add(t,rim(),d)
 wheels[2].add(tyre(),rim(),disc());wheels[3].add(tyre(),rim(),disc())
 return {root,wheels}
}
/** axis of a piece from its vertex covariance (lathe and five-fold pieces are transversely isotropic): offset and lean;
 *  duplicate vertices (a lathe repeats its seam column) are counted once */
function axisOf(mesh,wheel){
 wheel.updateWorldMatrix(true,true);const m=wheel.matrixWorld.clone().invert().multiply(mesh.matrixWorld),p=mesh.geometry.getAttribute('position'),v=new T.Vector3(),c=new T.Vector3(),C=[[0,0,0],[0,0,0],[0,0,0]];let n=0
 const seen=new Set(),points=[];for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const key=v.toArray().map(x=>Math.round(x*1e6)).join();if(seen.has(key))continue;seen.add(key);points.push(v.clone().applyMatrix4(m))}
 for(const q of points){c.add(q);n++}c.divideScalar(n)
 for(const q of points){v.copy(q).sub(c);const a=[v.x,v.y,v.z];for(let j=0;j<3;j++)for(let k=0;k<3;k++)C[j][k]+=a[j]*a[k]/n}
 const s=(C[0][0]+C[1][1])/2;return {offset:Math.hypot(c.x,c.y),lean:Math.atan(Math.hypot(C[0][2],C[1][2])/Math.abs(C[2][2]-s))*180/Math.PI}
}
{const {root,wheels}=car();const before=axisOf(wheels[0].children[0].children[0],wheels[0]);assert.ok(before.lean>1.4,'the test wheel leans as authored')
 const contact=createTyreContact(root,wheels,()=>8.287,()=>2.7)
 wheels.forEach((w,i)=>w.traverse(o=>{if(!(o instanceof T.Mesh)||o.geometry.type==='BoxGeometry')return;const a=axisOf(o,w)
  assert.ok(a.offset<5e-5&&a.lean<.01,`wheel ${i} ${o.material.name}: axis ${(a.offset*1000).toFixed(3)} mm off, leans ${a.lean.toFixed(4)}°`)}))
 // tyres on the road through a revolution (lowest tyre point within 1 mm of the surface)
 let worst=0;for(let s=0;s<24;s++){wheels.forEach(w=>w.rotation.z=s/24*Math.PI*2);root.updateMatrixWorld(true)
  wheels.forEach(w=>{let low=Infinity;w.traverse(o=>{if(o instanceof T.Mesh&&o.material.name==='tire'){const p=o.geometry.getAttribute('position'),v=new T.Vector3();for(let i=0;i<p.count;i++)low=Math.min(low,v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).y)}});worst=Math.max(worst,Math.abs(low-8.287))})}
 assert.ok(worst<.001,'tyres stay on the road: '+(worst*1000).toFixed(2)+' mm');assert.equal(contact.radii.length,4)
 console.log('true wheels: every piece on its group axis; tyre to road at most',(worst*1000).toFixed(2),'mm over a turn')}
for(const fps of [30,60,120]){const {root,wheels}=car(),tyres=createTyreContact(root,wheels,()=>8.287,()=>2.7);let maxStep=0,old=root.position.y
 for(let frame=0;frame<fps*12;frame++){const t=frame/fps,speed=t<8?t*8:Math.max(0,64-(t-8)*16);tyres.update(speed,t*25,1/fps,0);assert.ok(Number.isFinite(root.position.y));assert.ok(Math.abs(root.position.y-8.287)<.005)
  for(let i=0;i<4;i++)assert.ok(Math.abs(tyres.contacts[i].y-8.287)<1e-8);maxStep=Math.max(maxStep,Math.abs(root.position.y-old));old=root.position.y}
 assert.ok(maxStep<.012);console.log({fps,maxHeightStep:maxStep.toFixed(5),height:root.position.y.toFixed(4)})}
