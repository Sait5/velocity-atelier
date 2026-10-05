import * as T from 'three'
/** Ground-constrained wheels and damped load transfer; visual suspension, not a driving simulator. */
export function createTyreContact(root:T.Group,wheels:T.Group[]){
 root.updateMatrixWorld(true)
 const rest=wheels.map(w=>w.position.clone()),radii=wheels.map(w=>{const b=new T.Box3().setFromObject(w);return (b.max.y-b.min.y)/2})
 const height=.007-Math.min(...wheels.map((w,i)=>w.getWorldPosition(new T.Vector3()).y-radii[i]!))
 const hardware: {object:T.Object3D,rest:T.Vector3,wheel:number}[]=[]
 root.traverse(o=>{if(o.name.startsWith('Fixed wheel hardware')){let nearest=0,best=Infinity;rest.forEach((p,i)=>{const d=o.position.distanceToSquared(p);if(d<best){best=d;nearest=i}});hardware.push({object:o,rest:o.position.clone(),wheel:nearest})}})
 let previousSpeed=0,pitch=0,velocity=0,heave=0
 function reset(){previousSpeed=pitch=velocity=heave=0;root.position.y=height;root.rotation.z=0;wheels.forEach((w,i)=>{w.position.copy(rest[i]!);w.scale.y=1});hardware.forEach(h=>h.object.position.copy(h.rest))}
 function update(speed:number,distance:number,dt:number,stone:boolean){
  const acceleration=T.MathUtils.clamp((speed-previousSpeed)/Math.max(dt,.001),-14,10);previousSpeed=speed
  const roughness=stone?Math.min(Math.abs(speed)/15,1)*.0018:0
  const targetPitch=-acceleration*.00065+roughness*.5*Math.sin(distance*2.1)
  // Fixed substeps keep the spring stable at both capped and uncapped frame rates.
  let remaining=Math.min(dt,.1);while(remaining>0){const step=Math.min(remaining,1/120);velocity+=((targetPitch-pitch)*100-velocity*20)*step;pitch+=velocity*step;remaining-=step}
  heave=T.MathUtils.damp(heave,roughness*Math.sin(distance*4.4),12,dt);root.rotation.z=pitch;root.position.y=height+heave
  wheels.forEach((w,i)=>{const p=rest[i]!,compression=1-Math.min(.007,Math.abs(acceleration)*.0004+roughness);w.scale.y=compression
   const centre=.007+radii[i]!*compression;w.position.y=(centre-root.position.y-Math.sin(pitch)*p.x)/Math.cos(pitch)
  })
  hardware.forEach(h=>{h.object.position.copy(h.rest);h.object.position.y+=wheels[h.wheel]!.position.y-rest[h.wheel]!.y})
 }
 reset();return {update,reset}
}
