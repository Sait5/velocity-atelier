import fs from 'node:fs'
import * as T from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {rigDoors} from '../app/three/rigDoors'
import {rebuildCabin} from '../app/three/cabin'
import {addPedalBox} from '../app/three/pedals'

// The source is decoded by Blender; this export uses the same geometry as the showroom.
class NodeFileReader {
 result:any;onloadend:any
 async readAsArrayBuffer(blob:Blob){this.result=await blob.arrayBuffer();this.onloadend?.()}
 async readAsDataURL(blob:Blob){this.result='data:'+blob.type+';base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64');this.onloadend?.()}
}
;(globalThis as any).FileReader=NodeFileReader
const bytes=fs.readFileSync('../blender/source.glb')
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')
const model=gltf.scene,root=new T.Group();root.name='Ferrari_458_detailed_interior';model.rotation.y=Math.PI/2;root.add(model)
root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root),center=bounds.getCenter(new T.Vector3())
model.position.x-=center.x;model.position.z-=center.z;model.position.y-=bounds.min.y
const body=new T.MeshPhysicalMaterial({name:'Atelier paint',color:'#a2b368',metalness:.8,roughness:.25,clearcoat:1})
const leather=new T.MeshPhysicalMaterial({name:'Atelier fine grain leather',color:'#242826',roughness:.78,sheen:.28,sheenRoughness:.85})
model.traverse(o=>{if(o instanceof T.Mesh){if(o.name==='body')o.material=body;else if(o.name==='leather'||/Leather/.test((o.material as T.Material).name))o.material=leather}})
rigDoors(root,body,leather);rebuildCabin(root,leather);addPedalBox(root)
// glTF instancing support differs across importers; bake decorative instances for Blender.
const instances:T.InstancedMesh[]=[];root.traverse(o=>{if(o instanceof T.InstancedMesh)instances.push(o)})
for(const o of instances){
 const parts:T.BufferGeometry[]=[],matrix=new T.Matrix4()
 for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);parts.push(o.geometry.clone().applyMatrix4(matrix))}
 const geometry=mergeGeometries(parts);if(!geometry)throw new Error('Cannot bake '+o.name)
 const mesh=new T.Mesh(geometry,o.material);mesh.name=o.name;mesh.position.copy(o.position);mesh.quaternion.copy(o.quaternion);mesh.scale.copy(o.scale);o.parent!.add(mesh);o.removeFromParent();parts.forEach(g=>g.dispose())
}
const output=await new GLTFExporter().parseAsync(root,{binary:true}) as ArrayBuffer
fs.writeFileSync('../blender/Ferrari-458-interior.glb',Buffer.from(output))
console.log('Saved Blender interchange model.')
