import * as T from 'three'
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import {buildJoinedDoorShell} from './doorShell'
export function addDoorInterior(door:T.Group,side:number,leather:T.Material){
 const trim=new T.MeshStandardMaterial({color:'#171c1a',roughness:.72}),metal=new T.MeshStandardMaterial({color:'#59615e',metalness:.9,roughness:.32}),thread=new T.MeshStandardMaterial({color:'#a4977e',roughness:.9})
 const hinge=door.position.clone();function mesh(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number){const o=new T.Mesh(g,m);o.position.set(x-hinge.x,y-hinge.y,z-hinge.z);o.castShadow=true;o.receiveShadow=true;door.add(o);return o}
 function box(w:number,h:number,d:number,m:T.Material,x:number,y:number,z:number,r=.012){return mesh(new RoundedBoxGeometry(w,h,d,3,r),m,x,y,z)}
 buildJoinedDoorShell(door,side,leather,trim)
 box(.84,.105,.085,trim,-.10,.61,side*.698,.025)
 box(.60,.045,.105,leather,-.02,.58,side*.67,.018)
 box(.53,.105,.05,trim,.03,.405,side*.718,.018)
 box(.48,.016,.075,trim,.03,.455,side*.695,.006)
 const handle=mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(-.19,.635,side*.663),new T.Vector3(-.09,.653,side*.644),new T.Vector3(.06,.65,side*.657)]),24,.008,8,false),metal,0,0,0)
 handle.name='door_handle_inner'
 const speaker=mesh(new T.CylinderGeometry(.087,.087,.014,64),trim,-.46,.445,side*.717);speaker.rotation.x=Math.PI/2
 const holes=new T.InstancedMesh(new T.CircleGeometry(.0017,6),new T.MeshBasicMaterial({color:'#050706'}),180);for(let i=0;i<180;i++){const r=.075*Math.sqrt((i+.5)/180),a=i*2.39996;const pos=new T.Vector3(-.46+Math.cos(a)*r-hinge.x,.445+Math.sin(a)*r-hinge.y,side*.704-hinge.z);holes.setMatrixAt(i,new T.Matrix4().compose(pos,new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),side>0?Math.PI:0),new T.Vector3(1,1,1)))}door.add(holes)
 for(let i=0;i<3;i++)box(.035,.012,.025,metal,-.34+i*.048,.67,side*.68,.003)
 const lock=box(.021,.054,.025,metal,.46,.64,side*.781,.003);lock.name='door_latch';for(const y of [.61,.67]){const fastener=mesh(new T.CylinderGeometry(.004,.004,.012,10),trim,.473,y,side*.78);fastener.rotation.z=Math.PI/2}
 for(const y of [.39,.67])box(.048,.055,.05,metal,-.698,y,side*.79,.006)
 const seam=new T.CatmullRomCurve3([new T.Vector3(-.56,.72,side*.724),new T.Vector3(-.08,.735,side*.724),new T.Vector3(.39,.722,side*.724)]);mesh(new T.TubeGeometry(seam,40,.0011,5,false),thread,0,0,0)
 const lamp=new T.MeshStandardMaterial({color:'#dce6cf',emissive:'#dce6cf',emissiveIntensity:.3,roughness:.5});box(.11,.014,.012,lamp,.32,.344,side*.718,.003)
}
