import * as T from 'three'

/**
 * Turn every wheel about its own axle. In the Bugatti and Porsche models the wheel geometry sits slightly askew to its
 * group (about 0.6° and up to 0.9°): turning the group about its z axis made the tread swing ±4–5 mm sideways once per
 * revolution, a loose-wheel wobble. The true axle is read from the tread's edges, which do not depend on how densely the
 * mesh is triangulated: for 24 sectors round the tyre, the midpoint between the inboard and outboard tread edge is
 * fitted with a + b·cosθ + c·sinθ (a tilted plane shows exactly that sinusoid), and the tread radius with
 * r + dx·cosθ + dy·sinθ (an off-centre hub). The group is re-based onto that axle and centre; its children keep their
 * exact world pose, so nothing moves at rest, but rotation.z now rolls the wheel true.
 */
export function alignWheelAxes(wheels:T.Group[]){
 const report:{name:string,tilt:number,shift:number}[]=[]
 for(const wheel of wheels){
  wheel.updateWorldMatrix(true,true)
  const inverse=wheel.matrixWorld.clone().invert(),v=new T.Vector3(),points:number[][]=[];let outer=0
  wheel.traverse(o=>{if(!(o instanceof T.Mesh)||o instanceof T.InstancedMesh)return;const p=o.geometry.getAttribute('position'),m=inverse.clone().multiply(o.matrixWorld)
   for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m);const r=Math.hypot(v.x,v.y);outer=Math.max(outer,r);points.push([v.x,v.y,v.z,r])}})
  const sectors=Array.from({length:24},()=>({lo:Infinity,hi:-Infinity,r:0}))
  for(const [x,y,z,r] of points){if(r!<outer*.97)continue;const s=sectors[Math.floor(((Math.atan2(y!,x!)+Math.PI*2)%(Math.PI*2))/(Math.PI*2)*24)%24]!;s.lo=Math.min(s.lo,z!);s.hi=Math.max(s.hi,z!);s.r=Math.max(s.r,r!)}
  if(sectors.some(s=>!Number.isFinite(s.lo)))continue
  // least squares for f(θ) = a + b cosθ + c sinθ over evenly spaced sectors (closed form)
  const fit=(values:number[])=>{let a=0,b=0,c=0;values.forEach((f,k)=>{const t=(k+.5)/24*Math.PI*2;a+=f;b+=f*Math.cos(t);c+=f*Math.sin(t)});return [a/24,b*2/24,c*2/24]}
  const [mid,cosTerm,sinTerm]=fit(sectors.map(s=>(s.lo+s.hi)/2)),[radius,dx,dy]=fit(sectors.map(s=>s.r))
  const axis=new T.Vector3(-cosTerm!/radius!,-sinTerm!/radius!,1).normalize(),tilt=Math.acos(axis.z)*180/Math.PI,shift=Math.hypot(dx!,dy!)
  report.push({name:wheel.name,tilt:+tilt.toFixed(2),shift:+(shift*1000).toFixed(1)})
  if(tilt<.05&&shift<.0003)continue
  const children=[...wheel.children],worlds=children.map(ch=>ch.matrixWorld.clone())
  const offset=new T.Matrix4().compose(new T.Vector3(dx!,dy!,mid!),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),axis),new T.Vector3(1,1,1))
  // keep the group's axial position: only shift in-plane, so the hub stays where it was along the axle
  offset.multiply(new T.Matrix4().makeTranslation(0,0,-mid!))
  wheel.matrix.compose(wheel.position,wheel.quaternion,wheel.scale).multiply(offset).decompose(wheel.position,wheel.quaternion,wheel.scale)
  wheel.updateWorldMatrix(true,false);const toWheel=wheel.matrixWorld.clone().invert()
  children.forEach((ch,i)=>{ch.matrix.multiplyMatrices(toWheel,worlds[i]!).decompose(ch.position,ch.quaternion,ch.scale)})
  wheel.updateWorldMatrix(false,true)
 }
 return report
}
