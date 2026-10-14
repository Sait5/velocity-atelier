import * as T from 'three'
import assert from 'node:assert/strict'
import {rolldown} from 'rolldown'
const bundle=await rolldown({input:'app/three/tyreContact.ts',external:['three']})
await bundle.write({file:'tools/generated/stable-tyre-contact.mjs',format:'esm'});await bundle.close()
const {createTyreContact}=await import('./generated/stable-tyre-contact.mjs')
for(const dt of [1/30,1/60,1/144]){
 const root=new T.Group(),wheels=[]
 for(const x of [-1.4,1.4])for(const z of [-.8,.8]){
  const wheel=new T.Group();wheel.position.set(x,.34,z)
  wheel.add(new T.Mesh(new T.CylinderGeometry(.34,.34,.25,64).rotateX(Math.PI/2),new T.MeshStandardMaterial({name:'tyre'})))
  root.add(wheel);wheels.push(wheel)
 }
 const contact=createTyreContact(root,wheels,()=>.007,()=>2.7,()=>false,true)
 const rest=contact.assemblies.map(g=>g.position.clone())
 let distance=0
 for(let frame=0;frame<1200;frame++){
  const speed=frame<600?Math.min(370/3.6,frame*dt*10):Math.max(0,370/3.6-(frame-600)*dt*12)
  distance+=speed*dt;contact.update(speed,distance,dt,false,frame>400&&frame<450?1:0)
  wheels.forEach((wheel,i)=>{
   wheel.rotation.z=(frame*8*dt)%(Math.PI*2)
   assert(contact.assemblies[i].position.distanceTo(rest[i])<1e-10,'wheel carrier cannot bounce independently')
   assert.equal(contact.suspension[i],0)
   assert(wheel.position.length()<1e-8,'wheel remains centred in its carrier')
   assert.equal(wheel.scale.y,1)
  })
  assert.equal(root.rotation.z,0,'no acceleration pitch oscillation on flat road')
 }
 contact.reset();assert.equal(root.position.z,0)
}
console.log('PASS: rigid centred wheel carriers during acceleration, braking and steering at 30/60/144 FPS')
