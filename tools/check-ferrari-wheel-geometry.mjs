import fs from 'node:fs/promises'
import * as T from 'three'
const raw=await fs.readFile('public/models/ferrari-italia-complete.glb'),length=raw.readUInt32LE(12)
const json=JSON.parse(raw.subarray(20,20+length).toString())
// Accessor bounds and authored transforms are available without decoding Draco.
const nodes=json.nodes.map(node=>{
 const group=new T.Group();group.name=node.name||''
 if(node.matrix){group.matrix.fromArray(node.matrix);group.matrix.decompose(group.position,group.quaternion,group.scale)}
 else {if(node.translation)group.position.fromArray(node.translation);if(node.rotation)group.quaternion.fromArray(node.rotation);if(node.scale)group.scale.fromArray(node.scale)}
 if(node.mesh!==undefined)for(const primitive of json.meshes[node.mesh].primitives){
  const accessor=json.accessors[primitive.attributes.POSITION],name=json.materials[primitive.material]?.name||''
  if(accessor.min&&accessor.max){const centre=new T.Object3D();centre.position.fromArray(accessor.min).add(new T.Vector3().fromArray(accessor.max)).multiplyScalar(.5);centre.userData.wheelSurface=/rim_bump_metal|tyre|tire/i.test(name);group.add(centre)}
 }
 return group
})
json.nodes.forEach((node,i)=>node.children?.forEach(child=>nodes[i].add(nodes[child])))
const scene=new T.Group();json.scenes[json.scene||0].nodes.forEach(node=>scene.add(nodes[node]));scene.updateMatrixWorld(true)
for(let i=0;i<4;i++){
 const wheel=scene.getObjectByName('wheel_'+i),axle=wheel.getWorldPosition(new T.Vector3()),base=wheel.rotation.z
 let deviation=0
 for(const phase of [0,.4,1.2,2.3,3.1,4.8,6.1]){
  wheel.rotation.z=base+phase;scene.updateMatrixWorld(true)
  wheel.traverse(mesh=>{if(mesh.userData.wheelSurface){const centre=mesh.getWorldPosition(new T.Vector3());deviation=Math.max(deviation,Math.hypot(centre.x-axle.x,centre.y-axle.y))}})
 }
 console.log('Wheel',i,'maximum radial centre deviation, mm:',(deviation*1000).toFixed(2))
 wheel.rotation.z=base
}
