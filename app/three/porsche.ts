import * as T from 'three'
import {installPorscheLampEmission} from './porscheLamps'
import {createHeadlightPool} from './lampPool'
import {installPorscheInnerTrim} from './innerDoorTrim'
import {installPorscheRimFinish} from './porscheRimFinish'

/** Authored 992.2 geometry, with baked metre scale and independent door/wheel pivots. */
export function preparePorsche(root:T.Group){
 const body=new T.MeshPhysicalMaterial({name:'Porsche paint',color:'#c0c3c1',metalness:.25,roughness:.22,clearcoat:1,clearcoatRoughness:.08})
 const materials=new Map<string,T.MeshStandardMaterial>()
 root.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.set(m.name,m as T.MeshStandardMaterial)})
 const glass=[...materials.values()].find(m=>/2025Window_/.test(m.name))!
 const leather=[...materials.values()].find(m=>/Porsche[ _]upholstery/.test(m.name))!
 const rim=installPorscheRimFinish(root)
 const brake=[...materials.values()].find(m=>/CalliperA_Zone/.test(m.name))!
 const white=new T.MeshStandardMaterial({color:'#edf5ff',emissive:'#cbdfff',emissiveIntensity:0})
 const retired=new Set<T.Material>(),lamps:((front:number,rear:number)=>void)[]=[]
 root.traverse(o=>{
  if(!(o instanceof T.Mesh))return
  if(!Array.isArray(o.material)&&/2025ManufacturerPlateA_/.test(o.material.name))o.visible=false
  o.receiveShadow=true;o.castShadow=true
  const list=Array.isArray(o.material)?o.material:[o.material]
  for(const m of list){const mat=m as T.MeshStandardMaterial
   for(const v of Object.values(mat))if(v instanceof T.Texture)v.anisotropy=8
   if(/2025Paint_/.test(mat.name)){retired.add(mat);o.material=body}
   if(/Window_|red_glass/.test(mat.name)){mat.transparent=true;mat.opacity=/red_glass/.test(mat.name)?.85:.22;mat.depthWrite=false;mat.roughness=.07;mat.metalness=.1;o.castShadow=false;mat.side=T.DoubleSide}
   if(/Interior|dash|Carbon/.test(mat.name)){mat.metalness=0;mat.roughness=.7}
   // The CSR atlas carries alpha even on solid cabin surfaces. Treating those
   // panels as blended glass makes door trim disappear behind adjacent meshes.
   if(/Interior|dash/.test(mat.name)){mat.transparent=false;mat.opacity=1;mat.alphaTest=.35;mat.depthWrite=true;mat.side=T.FrontSide}
   if(/BadgeA_/.test(mat.name)){mat.transparent=false;mat.opacity=1;mat.alphaTest=.45;mat.depthWrite=true;mat.roughness=.85;mat.metalness=0}
   if(/GrilleAlpha/.test(mat.name)){mat.alphaTest=.4;mat.transparent=false;mat.depthWrite=true}
   if(/LightA_/.test(mat.name)){lamps.push(installPorscheLampEmission(mat))}
   if(/red_glass/.test(mat.name)){lamps.push(installPorscheLampEmission(mat,true))}
  }
 })
 retired.forEach(m=>m.dispose())
 installPorscheInnerTrim(root)
 leather.metalness=0;leather.roughness=.78;leather.transparent=false;leather.opacity=1;leather.side=T.FrontSide
 // Low-cost local bounce makes the enclosed cabin readable without changing
 // exterior exposure or tinting the dashboard and carbon trim.
 for(const [x,y,z,power] of [[.05,1.12,0,.65],[.5,.74,0,.3],[-.4,.72,.32,.25]]){
  const bounce=new T.PointLight('#f4f6f5',power,1.45,2);bounce.name='Porsche cabin bounce';bounce.position.set(x!,y!,z!);root.add(bounce)
 }
 const doors=['Porsche door L','Porsche door R'].map(name=>root.getObjectByName(name.replaceAll(' ','_')) as T.Group)
 const wheels=[0,1,2,3].map(i=>root.getObjectByName('Porsche_wheel_'+i) as T.Group)
 if(doors.some(d=>!d)||wheels.some(w=>!w))throw Error('Porsche rig unavailable')
 const panes=doors.flatMap(d=>d.children.filter(o=>o.name.startsWith('Porsche_door_glass')).map(mesh=>({mesh,rest:mesh.position.clone()})))
 function setWindows(value:number){for(const {mesh,rest} of panes){mesh.position.copy(rest);mesh.position.y-=value*.30;mesh.visible=value<.99}}
 const doorRest=doors.map(d=>d.position.clone())
 const hingeAxis=new T.Vector3(0,1,0)
 function setDoors(left:number,right=left){doors.forEach((door,i)=>{const p=T.MathUtils.clamp(i===0?left:right,0,1),side=Math.sign(doorRest[i]!.z),pivot=new T.Vector3(-.77,.70,side*.84),angle=-side*p*1.12;door.position.copy(doorRest[i]!).sub(pivot).applyAxisAngle(hingeAxis,angle).add(pivot);door.rotation.y=angle})}
 const headlights:T.SpotLight[]=[],taillights:T.PointLight[]=[]
 const spill=createHeadlightPool(-1.94,.63);root.add(spill)
 for(const side of [-1,1]){const lamp=new T.SpotLight('#dceaff',0,8,.42,.8,2);lamp.position.set(-1.95,.66,side*.65);lamp.target.position.set(-5,.05,side*.75);root.add(lamp,lamp.target);headlights.push(lamp);const rear=new T.PointLight('#ff2315',0,1.5,2);rear.position.set(2.20,.71,side*.65);root.add(rear);taillights.push(rear)}
 function setLights(head:boolean,tail:boolean,frontLevel=Number(head),rearLevel=Number(tail)){root.userData.frontEnabled=head;root.userData.tailEnabled=tail;spill.visible=head;lamps.forEach(set=>set(frontLevel,rearLevel));headlights.forEach(l=>l.intensity=65*frontLevel);taillights.forEach(l=>l.intensity=0)}
 function setUpholstery(color:string){leather.color.set(color)}
 function dispose(){const geo=new Set<T.BufferGeometry>(),mats=new Set<T.Material>([body,white]),tex=new Set<T.Texture>();root.traverse(o=>{if(o instanceof T.Mesh){geo.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m)}});geo.forEach(g=>g.dispose());mats.forEach(m=>{for(const v of Object.values(m))if(v instanceof T.Texture)tex.add(v);m.dispose()});tex.forEach(t=>t.dispose())}
 return {root,body,rim,brake,glass,leather,white,doors,wheels,spokes:[] as T.Group[],setDoors,setWindows,setLights,setUpholstery,dispose}
}


