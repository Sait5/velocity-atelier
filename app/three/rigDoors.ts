import * as T from 'three'
// Isolate side-panel triangles from the preview mesh. Production models should
// provide artist-authored door objects and pivots instead of geometric regions.
export function rigDoors(root:T.Group,body:T.MeshPhysicalMaterial){
 root.updateMatrixWorld(true);const doors=[new T.Group(),new T.Group()];doors.forEach((d,i)=>{d.position.set(-.65,.75,i===0?-.84:.84);root.add(d)})
 const buffers=[[] as number[],[] as number[]],normals=[[] as number[],[] as number[]]
 const meshes:T.Mesh[]=[];root.traverse(o=>{if(o instanceof T.Mesh&&o.name==='body')meshes.push(o)})
 for(const m of meshes){const g=m.geometry,p=g.getAttribute('position'),n=g.getAttribute('normal'),kept:number[]=[],keptNormals:number[]=[],normalMatrix=new T.Matrix3().getNormalMatrix(m.matrixWorld)
  for(let i=0;i<(g.index?.count||p.count);i+=3){const ids=[0,1,2].map(j=>g.index?g.index.getX(i+j):i+j);const points=ids.map(id=>new T.Vector3().fromBufferAttribute(p,id).applyMatrix4(m.matrixWorld));const c=points.reduce((v,p)=>v.add(p),new T.Vector3()).multiplyScalar(1/3);const side=c.z<0?0:1;const door=c.x>-.65&&c.x<.72&&c.y>.38&&c.y<1.08&&Math.abs(c.z)>.75
   ids.forEach((id,j)=>{if(door){const q=points[j]!.clone().sub(doors[side]!.position);buffers[side]!.push(q.x,q.y,q.z);const norm=new T.Vector3().fromBufferAttribute(n,id).applyMatrix3(normalMatrix).normalize();normals[side]!.push(norm.x,norm.y,norm.z)}else{kept.push(p.getX(id),p.getY(id),p.getZ(id));keptNormals.push(n.getX(id),n.getY(id),n.getZ(id))}})
  }
  const replacement=new T.BufferGeometry();replacement.setAttribute('position',new T.Float32BufferAttribute(kept,3));replacement.setAttribute('normal',new T.Float32BufferAttribute(keptNormals,3));m.geometry=replacement;g.dispose()
 }
 doors.forEach((d,i)=>{const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(buffers[i]!,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals[i]!,3));const panel=new T.Mesh(geometry,body);panel.castShadow=true;panel.receiveShadow=true;d.add(panel)})
 return doors
}
