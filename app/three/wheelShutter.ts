import * as T from 'three'

/** Shutter samples use the authored rim geometry, never the tyres or calipers. */
export function installWheelShutter(wheels:T.Group[],sampleCount=5){
 const rotation=new T.Matrix4(),matrix=new T.Matrix4()
 const rims=wheels.flatMap(wheel=>{
  const meshes:T.Mesh[]=[];wheel.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)&&/^(rim_bump_metal|M_WheelRim)$/.test(o.material.name)&&!/emblem/.test(o.name))meshes.push(o)})
  wheel.updateWorldMatrix(true,true);const inverse=wheel.matrixWorld.clone().invert()
  return meshes.map(mesh=>{
  mesh.updateWorldMatrix(true,false);const base=new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);const sharp=(mesh.material as T.MeshStandardMaterial).clone();sharp.transparent=true;mesh.material=sharp
  const sampled=sharp.clone();sampled.name='Moving rim shutter';sampled.depthWrite=false;sampled.opacity=0;sampled.roughness=Math.max(.3,sampled.roughness)
  const blur=new T.InstancedMesh(mesh.geometry,sampled,sampleCount);blur.name='Rim shutter samples';blur.visible=false;blur.castShadow=false;blur.receiveShadow=true;blur.frustumCulled=false;blur.instanceMatrix.setUsage(T.DynamicDrawUsage);wheel.add(blur)
  const radius=wheel.position.x>0?.365:.335
  return {mesh,sharp,sampled,blur,base,radius}
 })})
 function update(speed:number){const amount=T.MathUtils.smoothstep(Math.abs(speed),4,16)
  for(const r of rims){r.mesh.visible=amount<.995;r.sharp.opacity=1-amount;r.blur.visible=amount>.005;r.sampled.opacity=(1.35/sampleCount)*amount
   if(!r.blur.visible)continue
   const shutter=T.MathUtils.clamp(speed/r.radius/90,-Math.PI*2/5,Math.PI*2/5)
   for(let i=0;i<sampleCount;i++){rotation.makeRotationZ(((i+.5)/sampleCount-.5)*shutter);matrix.multiplyMatrices(rotation,r.base);r.blur.setMatrixAt(i,matrix)}r.blur.instanceMatrix.needsUpdate=true
  }
 }
 return {update}
}
