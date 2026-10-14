import * as T from 'three'

const makeTrim=()=>new T.MeshStandardMaterial({name:'Black inner door trim',color:0x121516,metalness:0,roughness:.86,envMapIntensity:.3})
function blackUpholstery(material:T.Material,cache:Map<T.Material,T.Material>){
 let result=cache.get(material)
 if(!result){const lining=(material as T.MeshStandardMaterial).clone();lining.name='Black inner door upholstery';lining.color.set(0x121516);lining.metalness=0;lining.roughness=.86;lining.envMapIntensity=.3;lining.transparent=false;lining.opacity=1;lining.depthWrite=true;result=lining;cache.set(material,result)}
 return result
}

/** Keep the authored Revuelto shell, sill and exterior as separate materials. */
export function installRevueltoInnerTrim(source:T.Group){
 const trim=makeTrim(),linings=new Map<T.Material,T.Material>()
 source.traverse(o=>{
  if(o instanceof T.Mesh&&/^(DoorJamb[LR]F_CarPaint|DoorSill_CarPaint)$/.test(o.name))o.material=trim
  if(o instanceof T.Mesh&&/^DoorCard[LR]F/.test(o.name)){
   const apply=(m:T.Material)=>/^(M_Leather|M_Alcantara)$/.test(m.name)?blackUpholstery(m,linings):m
   o.material=Array.isArray(o.material)?o.material.map(apply):apply(o.material)
  }
 })
}

/** Select complete panels along mesh seams and hard folds, never a triangle crop. */
export function installPorscheInnerTrim(root:T.Group){
 root.updateWorldMatrix(true,true)
 const inverse=root.matrixWorld.clone().invert(),trim=makeTrim(),linings=new Map<T.Material,T.Material>()
 root.traverse(o=>{
  if(!(o instanceof T.Mesh))return
  let door=false
  for(let parent=o.parent;parent;parent=parent.parent)if(/^Porsche_door_[LR]$/.test(parent.name))door=true
  if(door){const apply=(m:T.Material)=>/Porsche[ _]upholstery/.test(m.name)?blackUpholstery(m,linings):m;o.material=Array.isArray(o.material)?o.material.map(apply):apply(o.material)}
  if(Array.isArray(o.material)||o.material.name!=='Porsche paint')return
  const source=o.geometry,p=source.getAttribute('position'),index=source.index
  if(!index)return
  const count=index.count/3,parents=Array.from({length:count},(_,i)=>i)
  const find=(i:number):number=>{while(parents[i]!==i){parents[i]=parents[parents[i]!]!;i=parents[i]!}return i}
  const join=(a:number,b:number)=>{parents[find(b)]=find(a)}
  const vertices=new Map<number,number>(),edges=new Map<string,number>()
  const normals:T.Vector3[]=[],a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3()
  const threshold=Math.cos(T.MathUtils.degToRad(20))
  for(let f=0;f<count;f++){
   const ids=[index.getX(f*3),index.getX(f*3+1),index.getX(f*3+2)]
   a.fromBufferAttribute(p,ids[0]!);b.fromBufferAttribute(p,ids[1]!);c.fromBufferAttribute(p,ids[2]!)
   normals.push(b.sub(a).cross(c.sub(a)).normalize().clone())
   for(let k=0;k<3;k++){
    const v=ids[k]!
    if(door){const previous=vertices.get(v);if(previous!==undefined)join(f,previous);else vertices.set(v,f)}
    else{
     const w=ids[(k+1)%3]!,key=v<w?`${v}:${w}`:`${w}:${v}`,previous=edges.get(key)
     if(previous!==undefined){if(normals[f]!.dot(normals[previous]!)>threshold)join(f,previous)}else edges.set(key,f)
    }
   }
  }
  const transform=inverse.clone().multiply(o.matrixWorld),parts=new Map<number,{box:T.Box3;faces:number[]}>()
  for(let f=0;f<count;f++){
   const id=find(f);let part=parts.get(id)
   if(!part){part={box:new T.Box3(),faces:[]};parts.set(id,part)}
   part.faces.push(f)
   for(let k=0;k<3;k++){a.fromBufferAttribute(p,index.getX(f*3+k)).applyMatrix4(transform);a.z=Math.abs(a.z);part.box.expandByPoint(a)}
  }
  const selected=new Set<number>()
  for(const {box:{min,max},faces} of parts.values()){
   const inside=door
    ? max.x-min.x>1&&min.z<.72&&min.z>.65&&max.y<.92
    : faces.length>15&&min.x>-1&&max.x<1.2&&min.y>.24&&max.y<.91&&min.z>.67
   if(inside)for(const f of faces)selected.add(f)
  }
  if(!selected.size)return
  const painted:number[]=[],lined:number[]=[]
  for(let f=0;f<count;f++)(selected.has(f)?lined:painted).push(index.getX(f*3),index.getX(f*3+1),index.getX(f*3+2))
  const geometry=source.clone();geometry.setIndex([...painted,...lined]);geometry.clearGroups()
  if(painted.length)geometry.addGroup(0,painted.length,0)
  geometry.addGroup(painted.length,lined.length,1);o.geometry=geometry;o.material=[o.material,trim]
 })
}
