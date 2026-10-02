import * as T from 'three'
import {addDoorInterior} from './doorInterior'

/** Discover complete disconnected panels without cutting through body triangles. */
export function rigDoors(root:T.Group,_body:T.MeshPhysicalMaterial,leather:T.Material){
 root.updateMatrixWorld(true)
 const doors=[new T.Group(),new T.Group()]
 doors.forEach((d,i)=>{d.name=i===0?'door_L':'door_R';d.position.set(-.73,.65,i===0?-.83:.83);root.add(d)})
 const meshes:T.Mesh[]=[]
 root.traverse(o=>{if(o instanceof T.Mesh&&!/^(wheel|rim_|tire|brake|nuts|centre|steering)/.test(o.name))meshes.push(o)})
 for(const mesh of meshes){
  const geometry=mesh.geometry,position=geometry.getAttribute('position')
  if(!position||Array.isArray(mesh.material))continue
  const parent=Array.from({length:position.count},(_,i)=>i)
  function find(i:number):number{let r=i;while(parent[r]!==r)r=parent[r]!;while(parent[i]!==i){const next=parent[i]!;parent[i]=r;i=next}return r}
  const join=(a:number,b:number)=>{parent[find(a)]=find(b)}
  const welded=new Map<string,number>(),worldPoints:T.Vector3[]=[]
  for(let i=0;i<position.count;i++){const p=new T.Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);worldPoints.push(p);const key=[p.x,p.y,p.z].map(v=>Math.round(v*1000000)).join(',');const existing=welded.get(key);if(existing!==undefined)join(i,existing);else welded.set(key,i)}
  const triangles:number[][]=[]
  for(let i=0;i<(geometry.index?.count||position.count);i+=3){const ids=[0,1,2].map(j=>geometry.index?geometry.index.getX(i+j):i+j);join(ids[0]!,ids[1]!);join(ids[1]!,ids[2]!);triangles.push(ids)}
  const parts=new Map<number,{min:T.Vector3,max:T.Vector3,triangles:number[][]}>()
  for(const ids of triangles){const key=find(ids[0]!);let p=parts.get(key);if(!p){p={min:new T.Vector3(Infinity,Infinity,Infinity),max:new T.Vector3(-Infinity,-Infinity,-Infinity),triangles:[]};parts.set(key,p)}p.triangles.push(ids);for(const id of ids){p.min.min(worldPoints[id]!);p.max.max(worldPoints[id]!)}}
  const kept:number[]=[],normalMatrix=new T.Matrix3().getNormalMatrix(mesh.matrixWorld)
  for(const part of parts.values()){
   const side=part.max.z<-.60?0:part.min.z>.60?1:-1
   const inDoorArea=side!==-1&&part.min.x>-.735&&part.max.x<.62&&part.min.y>.2&&part.max.y<1.16
   const exterior=mesh.name==='body'&&inDoorArea
   const mirror=/^(chrome|interior_dark)$/.test(mesh.name)&&part.min.x>-.5&&part.max.x<-.35&&part.min.y>.78&&part.max.y<.94&&Math.min(Math.abs(part.min.z),Math.abs(part.max.z))>.9
   const oldInner=inDoorArea&&/^(leather|trim|interior_light|interior_dark|carbon_fibre_trim|metal|chrome)$/.test(mesh.name)
   const ids=part.triangles.flat()
   if(!exterior&&!mirror){if(!oldInner)for(const id of ids)kept.push(id);continue}
   const panel=new T.BufferGeometry()
   for(const [name,attribute] of Object.entries(geometry.attributes)){
    const values:number[]=[]
    for(const id of ids){if(name==='position'){const p=worldPoints[id]!.clone().sub(doors[side]!.position);values.push(p.x,p.y,p.z)}else if(name==='normal'){const n=new T.Vector3().fromBufferAttribute(attribute,id).applyMatrix3(normalMatrix).normalize();values.push(n.x,n.y,n.z)}else for(let c=0;c<attribute.itemSize;c++)values.push(attribute.getComponent(id,c))}
    panel.setAttribute(name,new T.Float32BufferAttribute(values,attribute.itemSize))
   }
   const item=new T.Mesh(panel,mesh.material);item.name=mesh.name+'_door';item.castShadow=true;item.receiveShadow=true;doors[side]!.add(item)
  }
  if(kept.length===triangles.length*3)continue
  const replacement=geometry.clone();replacement.setIndex(kept);replacement.clearGroups();mesh.geometry=replacement;geometry.dispose()
 }
 doors.forEach((d,i)=>addDoorInterior(d,i===0?-1:1,leather))
 return doors
}
