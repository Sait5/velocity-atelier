import * as T from 'three'

/** Follow the authored panel seams so trim never spills onto exterior paint. */
export function installItaliaJambTrim(root:T.Group){
 root.updateWorldMatrix(true,true)
 const inverse=root.matrixWorld.clone().invert()
 const trim=new T.MeshStandardMaterial({name:'Italia inner hinge recess trim',color:0x121516,metalness:0,roughness:.86,envMapIntensity:.3})
 const point=new T.Vector3()
 root.traverse(o=>{
  if(!(o instanceof T.Mesh)||Array.isArray(o.material)||o.material.name!=='Italia paint')return
  const body=o.name==='fer_f142_10_s_lod0_body_body__carpaint_0'
  const door=/^fer_f142_10_s_lod0_door[LR]F_body_2__carpaint_0$/.test(o.name)
  if(!body&&!door)return
  const source=o.geometry,p=source.getAttribute('position'),ids=source.index,count=ids?.count??p.count
  const parents=Array.from({length:p.count},(_,i)=>i)
  const find=(i:number):number=>{while(parents[i]!==i){parents[i]=parents[parents[i]!]!;i=parents[i]!}return i}
  const vertex=(i:number)=>ids?ids.getX(i):i
  for(let k=0;k<count;k+=3){const a=find(vertex(k));parents[find(vertex(k+1))]=a;parents[find(vertex(k+2))]=a}
  const transform=inverse.clone().multiply(o.matrixWorld)
  const bounds=new Map<number,T.Box3>()
  for(let k=0;k<count;k++){
   const i=vertex(k),component=find(i)
   let box=bounds.get(component)
   if(!box){box=new T.Box3();bounds.set(component,box)}
   point.fromBufferAttribute(p,i).applyMatrix4(transform);point.z=Math.abs(point.z);box.expandByPoint(point)
  }
  const selected=new Set<number>()
  for(const [component,{min,max}] of bounds){
   // These bounds identify whole disconnected panels, not individual triangles.
   const aperture=body&&min.x>-.78&&max.x<.57&&min.y>.19&&max.y<.90&&min.z>.74&&max.z<.96
   // The continuous outer skin is the wide, outboard island. The other
   // islands belong to the inner shell, including its latch end and lower rim.
   // A small separate patch lying in the outermost skin (on the right door, beside the handle) is paint too: as trim
   // it showed as a black rectangle on the door.
   const outerDoorSkin=(min.z>.84&&max.z>.95&&max.x-min.x>1)||min.z>.935
   const innerDoor=door&&!outerDoorSkin
   if(aperture||innerDoor)selected.add(component)
  }
  const painted:number[]=[],upholstered:number[]=[]
  for(let k=0;k<count;k+=3){const target=selected.has(find(vertex(k)))?upholstered:painted;target.push(vertex(k),vertex(k+1),vertex(k+2))}
  if(!upholstered.length)return
  const geometry=source.clone();geometry.setIndex([...painted,...upholstered]);geometry.clearGroups()
  if(painted.length)geometry.addGroup(0,painted.length,0)
  geometry.addGroup(painted.length,upholstered.length,1)
  o.geometry=geometry;o.material=[o.material,trim]
 })
}
