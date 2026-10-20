import * as T from 'three'

/**
 * Live Tourbillon instruments. The hub cluster's speed and rev needles are small islands of the cabin mesh; they are
 * cut out once and turned about the shared dial axis. Car coordinates, measured on the model in Blender: both needles
 * rest on zero (lower right as the driver sees it) and the scales run counter-clockwise from there.
 */
const pivot=new T.Vector3(-.4903,.7935,-.365),axis=new T.Vector3(.98,.19,-.06).normalize()
// Both needles rest along the same line; each is several islands (blade, tip, tail). The speedometer needle reaches
// past 2.8 cm from the axis, the rev needle stays inside.
const restLine=new T.Vector3(-.4834,.767,-.3917).sub(pivot).projectOnPlane(axis).normalize()
const needles=[{degreesPerUnit:264/550},{degreesPerUnit:28.2/1000}]   // speedometer 0-550 km/h, rev counter 0-10 000 rpm

export function installTourbillonGauges(root:T.Group){
 const source=root.getObjectByName('body_•_InteriorA_Material1')
 if(!(source instanceof T.Mesh)||!source.geometry.index||source.geometry.groups.length)return {updateInstruments(_speed:number,_rpm:number,_gear:number){}}
 root.updateWorldMatrix(true,true)
 const geometry=source.geometry,index=geometry.index!,position=geometry.getAttribute('position')
 const toRoot=root.matrixWorld.clone().invert().multiply(source.matrixWorld),point=new T.Vector3()
 // triangles near the dial, joined into islands through shared vertices
 const near:number[]=[],parents=new Map<number,number>()
 const find=(v:number):number=>{let p=parents.get(v)??v;while(p!==v){v=p;p=parents.get(v)??v}return v}
 for(let t=0;t<index.count;t+=3){
  point.fromBufferAttribute(position,index.getX(t)).applyMatrix4(toRoot)
  if(point.distanceTo(pivot)>.06)continue
  near.push(t);const a=find(index.getX(t));for(const k of [1,2]){const b=find(index.getX(t+k));if(a!==b)parents.set(b,a)}
 }
 // islands lying along the rest line of the needles: within 4 mm of it, from 1.6 cm behind the axis to 4.3 cm ahead
 const islands=new Map<number,{triangles:number[],onLine:boolean,reach:number}>(),offset=new T.Vector3()
 for(const t of near){
  const id=find(index.getX(t));let island=islands.get(id)
  if(!island)islands.set(id,island={triangles:[],onLine:true,reach:-1})
  island.triangles.push(t)
  for(let k=0;k<3;k++){
   offset.fromBufferAttribute(position,index.getX(t+k)).applyMatrix4(toRoot).sub(pivot)
   const along=offset.dot(restLine),height=offset.dot(axis),across=offset.addScaledVector(restLine,-along).addScaledVector(axis,-height).length()
   if(across>.004||along<-.016||along>.043||Math.abs(height)>.008)island.onLine=false;island.reach=Math.max(island.reach,along)
  }
 }
 const parent=source.parent!,toParent=parent.matrixWorld.clone().invert().multiply(root.matrixWorld)
 const localPivot=pivot.clone().applyMatrix4(toParent),localAxis=axis.clone().transformDirection(toParent),taken=new Set<number>()
 const live=needles.map(({degreesPerUnit},n)=>{
  const triangles:number[]=[]
  for(const island of islands.values()){
   if(!island.onLine||island.triangles.length<6||island.triangles.length>800||(island.reach>.028)!==(n===0))continue   // single-face islands are scale ticks
   for(const t of island.triangles){taken.add(t);triangles.push(index.getX(t),index.getX(t+1),index.getX(t+2))}
  }
  const part=new T.BufferGeometry();for(const name of Object.keys(geometry.attributes))part.setAttribute(name,geometry.getAttribute(name));part.setIndex(triangles)
  const mesh=new T.Mesh(part,source.material);mesh.name='Tourbillon gauge needle';mesh.position.copy(source.position);mesh.quaternion.copy(source.quaternion);mesh.scale.copy(source.scale);parent.add(mesh)
  return {mesh,restPosition:mesh.position.clone(),restQuaternion:mesh.quaternion.clone(),degreesPerUnit}
 })
 const kept:number[]=[];for(let t=0;t<index.count;t+=3)if(!taken.has(t))kept.push(index.getX(t),index.getX(t+1),index.getX(t+2))
 const rest=new T.BufferGeometry();for(const name of Object.keys(geometry.attributes))rest.setAttribute(name,geometry.getAttribute(name));rest.setIndex(kept);source.geometry=rest
 const turn=new T.Quaternion()
 function set(needle:typeof live[number],value:number){
  turn.setFromAxisAngle(localAxis,T.MathUtils.degToRad(value*needle.degreesPerUnit))
  needle.mesh.quaternion.copy(turn).multiply(needle.restQuaternion)
  needle.mesh.position.copy(needle.restPosition).sub(localPivot).applyQuaternion(turn).add(localPivot)
 }
 function updateInstruments(speed:number,rpm:number,_gear:number){
  set(live[0]!,T.MathUtils.clamp(Math.abs(speed)*3.6,0,550));set(live[1]!,T.MathUtils.clamp(rpm,0,10000))
 }
 updateInstruments(0,0,0)
 return {updateInstruments}
}
