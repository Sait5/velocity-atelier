import * as T from 'three'
import ferrariMounts from './ferrariDoorHingeMounts.json'

type Vehicle={root:T.Group;doors:T.Group[];setDoors?:(left:number,right?:number)=>void}
export type SideDoorCar='porsche'|'ferrari'
/** Bounds of disconnected, obsolete hardware only, in car coordinates. */
export const retiredItaliaHardware=[
 {name:'fer_f142_10_s_lod0_body_body__carpaint_0',bounds:[-.721,-.682,.251,.305,.86,.94]},
 {name:'fer_f142_10_s_lod0_body_body__carpaint_0',bounds:[-.721,-.682,.60,.65,.86,.94]},
 {name:'fer_f142_10_s_lod0_body_body__carpaint_0',bounds:[-.614,-.587,.503,.533,.880,.906]},
 {name:'fer_f142_10_s_lod0_body_metal__emblem_0',bounds:[-.665,-.587,.520,.535,.807,.905]},
 {name:'fer_f142_10_s_lod0_body_rubber_trim__rubber_0',bounds:[-.623,-.598,.504,.526,.865,.892]},
]
/** Remove the old hinge leaves and the unused silver door check, including its boot and housing. */
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
}
/** Rigid connections independent of the original car meshes and materials. */
export function installSideDoorConnections<V extends Vehicle>(vehicle:V,key:SideDoorCar){
 const {root,doors}=vehicle
 const authoredSetDoors=vehicle.setDoors
 root.updateWorldMatrix(true,true)
 const rootInverse=root.matrixWorld.clone().invert()
 const steel=new T.MeshStandardMaterial({name:'Compact door hinge steel',color:key==='ferrari'?0x101213:0x34383c,metalness:key==='ferrari'?.15:.7,roughness:key==='ferrari'?.85:.4})
 function mesh(parent:T.Object3D,name:string,geometry:T.BufferGeometry,position:T.Vector3){const o=new T.Mesh(geometry,steel);o.name=name;o.position.copy(position);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
 function orientBar(o:T.Mesh,a:T.Vector3,b:T.Vector3){o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(1,0,0),b.clone().sub(a).normalize())}
 const controllers=doors.map((door,i)=>{
  const closed=rootInverse.clone().multiply(door.matrixWorld),rest=new T.Vector3().setFromMatrixPosition(closed),side=Math.sign(rest.z)
  const pivot=new T.Vector3(key==='porsche'?-.77:rest.x-.14,rest.y,side*.84)
  const assembly=new T.Group();assembly.name=key+' compact door hinges '+(i?'R':'L');root.add(assembly)
  const bindDoor=(name:string,position:T.Vector3)=>{
   const mount=new T.Group();mount.name=name;mount.matrix.copy(closed).invert().multiply(new T.Matrix4().makeTranslation(position.x,position.y,position.z));mount.matrixAutoUpdate=false;door.add(mount);return mount
  }
  const linkages: Array<{a:T.Vector3;b:T.Vector3;bias:T.Vector3;length:number;first:T.Mesh;second:T.Mesh;middle:T.Mesh;end:T.Mesh}>=[]
  for(const [j,height] of (key==='porsche'?[.44,.67]:[.275,.621]).entries()){
   let a:T.Vector3,b:T.Vector3,an=new T.Vector3(0,0,1),bn=an.clone()
   const fitted=key==='ferrari'?ferrariMounts[i*2+j]!:undefined
   if(key==='porsche'){
    const nearest=(objects:T.Mesh[],target:T.Vector3,body=false)=>{
     let best=target.clone(),bestNormal=new T.Vector3(0,0,1),distance=Infinity
     const triangle=new T.Triangle(),point=new T.Vector3(),normal=new T.Vector3()
     for(const o of objects){const transform=rootInverse.clone().multiply(o.matrixWorld),p=o.geometry.getAttribute('position'),ids=o.geometry.index,count=ids?.count??p.count
      for(let k=0;k<count;k+=3){const vertices=[triangle.a,triangle.b,triangle.c];for(let n=0;n<3;n++)vertices[n]!.fromBufferAttribute(p,ids?ids.getX(k+n):k+n).applyMatrix4(transform)
       if(body&&triangle.getNormal(normal).x<.3)continue
       triangle.closestPointToPoint(target,point);const d=point.distanceToSquared(target);if(d<distance){distance=d;best.copy(point);triangle.getNormal(bestNormal)}
      }
     }
     return {point:best,normal:bestNormal}
    }
    const doorMeshes:T.Mesh[]=[];door.traverse(o=>{if(o instanceof T.Mesh&&o.material!==steel)doorMeshes.push(o)})
    const doorSurface=nearest(doorMeshes,new T.Vector3(pivot.x+.10,height,pivot.z-side*.04));b=doorSurface.point;bn=doorSurface.normal
    const fixedMeshes:T.Mesh[]=[];root.traverse(o=>{if(!(o instanceof T.Mesh)||!(Array.isArray(o.material)?o.material:[o.material]).some(m=>/paint/i.test(m.name)))return;let parent:T.Object3D|null=o;while(parent&&!doors.includes(parent as T.Group))parent=parent.parent;if(!parent)fixedMeshes.push(o)})
    const bodySurface=nearest(fixedMeshes,b,true);a=bodySurface.point;an=bodySurface.normal
   }else{
    a=new T.Vector3().fromArray(fitted!.a);b=new T.Vector3().fromArray(fitted!.b);an.fromArray(fitted!.an);bn.fromArray(fitted!.bn)
   }
   {
    const bodyPlate=mesh(assembly,'Body hinge plate '+j,new T.BoxGeometry(.020,.028,.008),a.clone().addScaledVector(an,fitted?-.002:0));bodyPlate.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),an)
    mesh(assembly,'Body hinge pin '+j,new T.CylinderGeometry(.005,.005,.022,12),a)
    const moving=bindDoor('Door hinge mounting '+j,b)
    const doorPlate=mesh(moving,'Door hinge plate '+j,new T.BoxGeometry(.020,.028,.008),bn.clone().multiplyScalar(fitted?-.002:0));doorPlate.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),bn)
    mesh(moving,'Moving hinge sleeve '+j,new T.CylinderGeometry(.006,.006,.012,12),new T.Vector3())
    const full=b.clone().sub(pivot).applyAxisAngle(new T.Vector3(0,1,0),-side*1.12).add(pivot)
    const length=fitted?.length??Math.max(.03,Math.max(a.distanceTo(full),a.distanceTo(b))*.505)
    const bias=fitted?new T.Vector3().fromArray(fitted.bias):new T.Vector3(-1,0,0)
    const first=mesh(assembly,'Body rigid hinge link '+j,new T.BoxGeometry(length,.008,.004),new T.Vector3())
    const second=mesh(assembly,'Door rigid hinge link '+j,new T.BoxGeometry(length,.008,.004),new T.Vector3())
    const smallCentre=key==='ferrari'&&i===1
    const middle=mesh(assembly,'Folding hinge pin '+j,new T.CylinderGeometry(smallCentre?.004:.006,smallCentre?.004:.006,smallCentre?.012:.019,12),new T.Vector3())
    const end=mesh(assembly,'Vertical hinge pin '+j,new T.CylinderGeometry(.0035,.0035,.019,12),b)
    linkages.push({a,b,bias,length,first,second,middle,end})
   }
  }
  return {door,closed,pivot,side,linkages}
 })
 function setDoors(left:number,right=left){
  authoredSetDoors?.(left,right)
  root.updateWorldMatrix(true,true)
  controllers.forEach(({door,closed,pivot,side,linkages},i)=>{
   const angle=-side*1.12*T.MathUtils.clamp(i?right:left,0,1)
   const delta=authoredSetDoors?root.matrixWorld.clone().invert().multiply(door.matrixWorld).multiply(closed.clone().invert()):new T.Matrix4().makeTranslation(pivot.x,pivot.y,pivot.z).multiply(new T.Matrix4().makeRotationY(angle)).multiply(new T.Matrix4().makeTranslation(-pivot.x,-pivot.y,-pivot.z))
   if(!authoredSetDoors){const local=door.parent!.matrixWorld.clone().invert().multiply(root.matrixWorld).multiply(delta).multiply(closed);local.decompose(door.position,door.quaternion,door.scale)}
   for(const {a,b,bias,length,first,second,middle,end} of linkages){
    const target=b.clone().applyMatrix4(delta),direction=target.clone().sub(a),distance=direction.length();direction.normalize()
    const fold=bias.clone().addScaledVector(direction,-bias.dot(direction)).normalize()
    const elbow=a.clone().add(target).multiplyScalar(.5).addScaledVector(fold,Math.sqrt(Math.max(0,length*length-distance*distance/4)))
    orientBar(first,a,elbow);orientBar(second,elbow,target);middle.position.copy(elbow);end.position.copy(target)
   }
  })
  root.updateWorldMatrix(true,true)
 }
 setDoors(0)
 return {...vehicle,setDoors}
}
