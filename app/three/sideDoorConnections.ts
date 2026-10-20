import * as T from 'three'

type Vehicle={root:T.Group;doors:T.Group[];setDoors?:(left:number,right?:number)=>void}
/** Bounds of hardware cut out of the body, in car coordinates: the two native hinge arms (they ride on the doors, see ferrari-door-hinges.glb) and the unused door check. */
export const retiredItaliaHardware=[
 {name:'fer_f142_10_s_lod0_body_body__carpaint_0',bounds:[-.708,-.686,.262,.300,.866,.912]},
 {name:'fer_f142_10_s_lod0_body_body__carpaint_0',bounds:[-.708,-.686,.608,.646,.866,.912]},
 {name:'fer_f142_10_s_lod0_body_body__carpaint_0',bounds:[-.614,-.587,.503,.533,.880,.906]},
 {name:'fer_f142_10_s_lod0_body_metal__emblem_0',bounds:[-.665,-.587,.520,.535,.807,.905]},
 {name:'fer_f142_10_s_lod0_body_rubber_trim__rubber_0',bounds:[-.623,-.598,.504,.526,.865,.892]},
]
/** Remove the native hinge arms and the unused silver door check, including its boot, housing and the comb on the doors. */
export function removeRetiredItaliaHinges(root:T.Group){
 root.updateWorldMatrix(true,true)
 for(const name of new Set(retiredItaliaHardware.map(row=>row.name))){
 const source=root.getObjectByName(name)
 if(!(source instanceof T.Mesh)||source.userData.retiredHingesRemoved)continue
 const regions=retiredItaliaHardware.filter(row=>row.name===name)
 const transform=root.matrixWorld.clone().invert().multiply(source.matrixWorld),position=source.geometry.getAttribute('position'),index=source.geometry.index
 const count=index?.count??position.count,kept:number[]=[],point=new T.Vector3()
 const inside=(id:number)=>{point.fromBufferAttribute(position,id).applyMatrix4(transform);return regions.some(({bounds:r})=>point.x>r[0]!&&point.x<r[1]!&&point.y>r[2]!&&point.y<r[3]!&&Math.abs(point.z)>r[4]!&&Math.abs(point.z)<r[5]!)}
 for(let i=0;i<count;i+=3){const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;if(!(inside(a)&&inside(b)&&inside(c)))kept.push(a,b,c)}
 const geometry=source.geometry.clone();geometry.setIndex(kept);geometry.clearGroups();source.geometry=geometry;source.userData.retiredHingesRemoved=(count-kept.length)/3
 }
 removeLooseHardware(root,/^fer_f142_10_s_lod0_door[LR]F_body_2__carpaint_0$/,italiaDoorCheckComb,400)
}
/**
 * Native hardware the Blender-built hinges replace, removed as whole loose islands: every island of a matching mesh
 * whose points all lie inside one of the boxes (car coordinates, |z|, closed doors) and that is smaller than
 * maxTriangles. The panels such parts sit on are large islands and stay intact.
 */
export function removeLooseHardware(root:T.Group,meshes:RegExp,boxes:number[][],maxTriangles:number){
 root.updateWorldMatrix(true,true)
 const rootInverse=root.matrixWorld.clone().invert(),point=new T.Vector3()
 root.traverse(o=>{
  if(!(o instanceof T.Mesh)||!meshes.test(o.name)||o.userData.looseHardwareRemoved!==undefined)return
  const position=o.geometry.getAttribute('position'),index=o.geometry.index;if(!index)return
  const transform=rootInverse.clone().multiply(o.matrixWorld),parents=Array.from({length:position.count},(_,i)=>i)
  const find=(i:number):number=>{while(parents[i]!==i){parents[i]=parents[parents[i]!]!;i=parents[i]!}return i}
  for(let i=0;i<index.count;i+=3){const a=find(index.getX(i));parents[find(index.getX(i+1))]=a;parents[find(index.getX(i+2))]=a}
  const inside=new Map<number,boolean[]>(),size=new Map<number,number>()
  for(let v=0;v<position.count;v++){
   point.fromBufferAttribute(position,v).applyMatrix4(transform);const z=Math.abs(point.z),island=find(v),flags=inside.get(island)??boxes.map(()=>true)
   boxes.forEach((r,k)=>{flags[k]=flags[k]!&&point.x>=r[0]!&&point.x<=r[1]!&&point.y>=r[2]!&&point.y<=r[3]!&&z>=r[4]!&&z<=r[5]!});inside.set(island,flags)
  }
  for(let i=0;i<index.count;i+=3){const island=find(index.getX(i));size.set(island,(size.get(island)??0)+1)}
  const kept:number[]=[]
  for(let i=0;i<index.count;i+=3){const island=find(index.getX(i));if(!(inside.get(island)?.some(Boolean)&&size.get(island)!<maxTriangles))kept.push(index.getX(i),index.getX(i+1),index.getX(i+2))}
  const geometry=o.geometry.clone();geometry.setIndex(kept);geometry.clearGroups();o.geometry=geometry;o.userData.looseHardwareRemoved=(index.count-kept.length)/3
 })
}
/** The door half of the retired Ferrari door check: a comb of thin plates and bolts on each door's hinge-side shut face, a saw-tooth when seen from the cabin. */
const italiaDoorCheckComb=[[-.676,-.630,.493,.684,.784,.911]]
/** Ferrari doors turn on the native hinge barrels: a vertical axis through them, mirrored across the centreline. */
export const italiaHingeAxis={x:-.7055,z:.9105},italiaDoorOpening=1.12
/** Doors turning about a vertical hinge axis at (x, ±z), opened by `opening` radians. */
export function swingDoors<V extends Vehicle>(vehicle:V,axisX:number,axisZ:number,opening:number){
 const {root,doors}=vehicle
 root.updateWorldMatrix(true,true)
 const rootInverse=root.matrixWorld.clone().invert(),closed=doors.map(door=>rootInverse.clone().multiply(door.matrixWorld)),axis=new T.Vector3(0,1,0)
 function setDoors(left:number,right=left){
  root.updateWorldMatrix(true,true)
  doors.forEach((door,i)=>{
   const side=Math.sign(closed[i]!.elements[14]),angle=-side*opening*T.MathUtils.clamp(i?right:left,0,1),z=side*axisZ
   const delta=new T.Matrix4().makeTranslation(axisX,0,z).multiply(new T.Matrix4().makeRotationAxis(axis,angle)).multiply(new T.Matrix4().makeTranslation(-axisX,0,-z))
   door.parent!.matrixWorld.clone().invert().multiply(root.matrixWorld).multiply(delta).multiply(closed[i]!).decompose(door.position,door.quaternion,door.scale)
  })
  root.updateWorldMatrix(true,true)
 }
 setDoors(0)
 return {...vehicle,setDoors}
}
/**
 * Hinge hardware built in Blender, in car coordinates for the closed doors. Part names carry the side: P = +z, N = -z.
 * hinge_body_* / check_body_* stay on the car, hinge_door_* / check_door_* ride on the doors and check_strap_* (origin at its
 * body pin, built along +x) is aimed at the centre of its check_door_* guide every time the doors move.
 * Gas struts: strut_cyl_* (origin at the body pin) and strut_rod_* (origin at the door pin), both built along +x, aim at each other.
 * concealWhenClosed: a side's hardware shows only while its door is open (the Tourbillon strut has no trim to hide behind
 * and would otherwise sit in plain view beside the dashboard).
 */
/** Real hinges are black e-coated steel, not body colour. */
const hingeBlack=new T.MeshStandardMaterial({name:'Hinge black e-coat',color:0x060708,metalness:.35,roughness:.42,envMapIntensity:.6})
export function installHingeHardware<V extends Vehicle>(vehicle:V,hardware:T.Object3D,{concealWhenClosed=false}={}){
 const {root,doors}=vehicle,authoredSetDoors=vehicle.setDoors
 authoredSetDoors?.(0)
 root.updateWorldMatrix(true,true)
 const sideOf=(door:T.Object3D)=>Math.sign(root.worldToLocal(door.getWorldPosition(new T.Vector3())).z)
 // a part belongs to the door of its side (P = +z) whose hinge (the door group's origin) is nearest: one door a side on
 // the coupés, front and rear on the AMG; check guides are keyed by the name's side and door (P, or P_F / P_R)
 const doorFor=(part:T.Object3D,side:number)=>{const c=new T.Box3().setFromObject(part).getCenter(new T.Vector3());let best:T.Object3D|undefined,d=Infinity;for(const door of doors){if(sideOf(door)!==side)continue;const e=door.getWorldPosition(new T.Vector3()).distanceTo(c);if(e<d){d=e;best=door}}return best}
 const keyOf=(name:string)=>/_([PN](?:_[FR])?)(?![A-Za-z])/.exec(name)?.[1]??''
 const straps:{strap:T.Object3D,door:T.Object3D,guide:T.Vector3}[]=[],guides=new Map<string,T.Vector3>()
 const struts:{cylinder?:T.Object3D,rod?:T.Object3D,door:T.Object3D,pin:T.Vector3}[]=[],sideParts=new Map<T.Object3D,T.Object3D[]>()
 for(const part of [...hardware.children]){
  const match=/^(hinge|check|strut)_(body|door|strap|cyl|rod)_([PN])/.exec(part.name) as [string,string,string,string]|null;if(!match)continue
  part.traverse(o=>{if(!(o instanceof T.Mesh))return;if(o.material.name==='carpaint'){o.material.dispose();o.material=hingeBlack}o.castShadow=true;o.receiveShadow=true})
  root.add(part);part.updateWorldMatrix(true,true)
  const door=doorFor(part,match[3]==='P'?1:-1);if(door)sideParts.set(door,[...(sideParts.get(door)??[]),part])
  if(match[2]==='body'||!door)continue
  if(match[2]==='strap'){straps.push({strap:part,door,guide:new T.Vector3()});continue}
  if(match[1]==='strut'){
   let strut=struts.find(s=>s.door===door);if(!strut)struts.push(strut={door,pin:new T.Vector3()})
   if(match[2]==='cyl')strut.cylinder=part;else{strut.rod=part;strut.pin.copy(door.worldToLocal(part.getWorldPosition(new T.Vector3())))}
   continue
  }
  door.attach(part)
  if(match[1]==='check')guides.set(keyOf(part.name),door.worldToLocal(new T.Box3().setFromObject(part).getCenter(new T.Vector3())))
 }
 for(const s of straps)s.guide.copy(guides.get(keyOf(s.strap.name))??new T.Vector3())
 const along=new T.Vector3(1,0,0),target=new T.Vector3()
 function setDoors(left:number,right=left){
  authoredSetDoors?.(left,right)
  root.updateWorldMatrix(true,true)
  if(concealWhenClosed)doors.forEach((door,i)=>{const open=(doors.length>2?sideOf(door)>0?left:right:i===0?left:right)>.015;for(const part of sideParts.get(door)??[])part.visible=open})
  for(const {strap,door,guide} of straps){
   strap.parent!.worldToLocal(door.localToWorld(target.copy(guide)))
   strap.quaternion.setFromUnitVectors(along,target.sub(strap.position).normalize())
  }
  for(const {cylinder,rod,door,pin} of struts){
   if(!cylinder||!rod)continue
   rod.position.copy(rod.parent!.worldToLocal(door.localToWorld(target.copy(pin))))
   const direction=rod.position.clone().sub(cylinder.position).normalize()
   cylinder.quaternion.setFromUnitVectors(along,direction);rod.quaternion.setFromUnitVectors(along,direction.negate())
  }
 }
 setDoors(0)
 return {...vehicle,setDoors}
}
