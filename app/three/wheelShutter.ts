import * as T from 'three'

/** Five shutter samples use the authored rim geometry, never the tyres or calipers. */
export function installWheelShutter(wheels:T.Group[]){
 const rotation=new T.Matrix4(),matrix=new T.Matrix4()
 const rims=wheels.flatMap(wheel=>wheel.children.filter((o):o is T.Mesh=>o instanceof T.Mesh&&!Array.isArray(o.material)&&o.material.name==='rim_bump_metal'&&!/emblem/.test(o.name)).map(mesh=>{
  mesh.updateMatrix();const sharp=(mesh.material as T.MeshStandardMaterial).clone();sharp.transparent=true;mesh.material=sharp
  const sampled=sharp.clone();sampled.name='Moving rim shutter';sampled.depthWrite=false;sampled.opacity=0;sampled.roughness=Math.max(.3,sampled.roughness)
  const blur=new T.InstancedMesh(mesh.geometry,sampled,5);blur.name='Rim shutter samples';blur.visible=false;blur.castShadow=false;blur.receiveShadow=true;blur.frustumCulled=false;blur.instanceMatrix.setUsage(T.DynamicDrawUsage);wheel.add(blur)
  const radius=wheel.position.x>0?.365:.335
  return {mesh,sharp,sampled,blur,base:mesh.matrix.clone(),radius}
 }))
 function update(speed:number){const amount=T.MathUtils.smoothstep(Math.abs(speed),4,16)
  for(const r of rims){r.mesh.visible=amount<.995;r.sharp.opacity=1-amount;r.blur.visible=amount>.005;r.sampled.opacity=.27*amount
   if(!r.blur.visible)continue
   const shutter=T.MathUtils.clamp(speed/r.radius/90,-Math.PI*2/5,Math.PI*2/5)
   for(let i=0;i<5;i++){rotation.makeRotationZ(((i+.5)/5-.5)*shutter);matrix.multiplyMatrices(rotation,r.base);r.blur.setMatrixAt(i,matrix)}r.blur.instanceMatrix.needsUpdate=true
  }
 }
 return {update}
}
