import * as T from 'three'
import {createHeadlightPool} from './lampPool'
import {liftDarkUpholstery} from './upholstery'

/**
 * Aston Martin Valhalla (Ddiaz Design, Sketchfab), rigged by tools/prepare-valhalla-model.py: metre scale, front -x,
 * driver's door at +z, wheel groups at the axle centres and door groups at the hinge in the door's front top corner.
 * Materials keep the source names: one body paint, the textured caliper atlas, tinted window glass, the lamp atlas split
 * into front and rear by the prepare script, and the clear headlamp covers.
 */
/** Dihedral door: the hinge axis (through the BeamNG mod's two hinge nodes) runs out of the car, down and a little
 *  forward, so the door rises forward and up with its half of the roof. */
const OPEN=1.15
export function prepareValhalla(root:T.Group){
 const body=new T.MeshPhysicalMaterial({name:'Valhalla paint',color:'#4e7064',metalness:.35,roughness:.2,clearcoat:1,clearcoatRoughness:.06})
 const materials=new Map<string,T.MeshStandardMaterial>()
 root.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.set(m.name,m as T.MeshStandardMaterial)})
 const need=(name:string)=>{const m=materials.get(name);if(!m)throw Error('Valhalla material missing: '+name);return m}
 const paint=need('AMAT_Aston_Martin_Valhalla_032'),rim=need('AMAT_Hub1'),brake=need('AMAT_Tire_Brake1'),leather=need('AMAT_Details_INT1')
 const glass=need('AMAT_Glass_005'),lampGlass=need('Valhalla lamp glass'),head=need('AMAT_Light1'),tail=need('Valhalla tail lamp')
 const white=new T.MeshStandardMaterial({color:'#edf5ff',emissive:'#cbdfff',emissiveIntensity:0})
 const rimRight=materials.get('AMAT_Hub_010')
 root.traverse(o=>{
  if(!(o instanceof T.Mesh))return
  o.castShadow=true;o.receiveShadow=true
  const list=Array.isArray(o.material)?o.material:[o.material]
  const swapped=list.map(m=>{
   const mat=m as T.MeshStandardMaterial
   for(const v of Object.values(mat))if(v instanceof T.Texture)v.anisotropy=16
   if(mat===paint)return body
   // the right-hand rims carry a copy of the left-hand material: one material, so the rims stay alike
   if(mat===rimRight)return rim
   return mat
  })
  o.material=Array.isArray(o.material)?swapped:swapped[0]!
  if(swapped.some(m=>m===glass||m===lampGlass))o.castShadow=false
 })
 paint.dispose();if(rimRight&&rimRight!==rim)rimRight.dispose()
 // the source glass is near-black at 25 % opacity: tint it like the other cars' windows so the cabin shows through
 glass.name='Valhalla window glass';glass.color.set('#0d1214');glass.opacity=.36;glass.roughness=.05;glass.metalness=.1;glass.transparent=true;glass.depthWrite=false;glass.side=T.DoubleSide
 lampGlass.color.set('#d3dfde');lampGlass.opacity=.14;lampGlass.roughness=.05;lampGlass.transparent=true;lampGlass.depthWrite=false
 leather.metalness=0;leather.roughness=.72
 // the hidden hinge pocket, the closed door ends and the lining inside the door skins: matte black with no reflections,
 // so the game's rough triangles there read as one dark recess once the door is up
 for(const name of ['Valhalla hinge pocket','Valhalla door closure','Valhalla door lining']){const m=materials.get(name);if(m){m.roughness=1;m.metalness=0;m.envMapIntensity=0}}
 // the rear light panel's lettering and strips are cut out by its texture's alpha: a hard cut-out keeps it in the depth
 // buffer, where alpha blending let the bodywork behind show through out of order
 const panel=materials.get('AMAT_Alpha_02');if(panel){panel.transparent=false;panel.alphaTest=.5;panel.depthWrite=true;panel.needsUpdate=true}
 head.emissive.set('#eef4ff');head.emissiveIntensity=0
 tail.emissive.set('#ff1a0a');tail.emissiveIntensity=0
 // a little local bounce so the black cabin reads, as in the other cars
 for(const [x,y,z,power] of [[-.1,1.0,0,1.0],[-.45,.8,.3,.45],[.15,.75,-.3,.35]]){
  const bounce=new T.PointLight('#f4f6f5',power,1.4,2);bounce.name='Valhalla cabin bounce';bounce.position.set(x!,y!,z!);root.add(bounce)
 }
 const doors=['Valhalla_door_L','Valhalla_door_R'].map(name=>root.getObjectByName(name) as T.Group)
 const wheels=[0,1,2,3].map(i=>root.getObjectByName('Valhalla_wheel_'+i) as T.Group)
 if(doors.some(d=>!d)||wheels.some(w=>!w))throw Error('Valhalla rig unavailable')
 const axes=doors.map(d=>{const side=Math.sign(d.position.z);return {axis:new T.Vector3(-.0146,-.0852,.0931*side).normalize(),side}})
 function setDoors(left:number,right=left){doors.forEach((door,i)=>door.quaternion.setFromAxisAngle(axes[i]!.axis,T.MathUtils.clamp(i===0?left:right,0,1)*OPEN*axes[i]!.side))}
 const panes=doors.flatMap(d=>d.children.filter(o=>o.name.endsWith('__glass')).map(mesh=>({mesh,rest:mesh.position.clone()})))
 function setWindows(value:number){for(const {mesh,rest} of panes){mesh.position.copy(rest);mesh.position.y-=value*.25;mesh.visible=value<.99}}
 const headlights:T.SpotLight[]=[]
 const spill=createHeadlightPool(-2.1,.62);root.add(spill)
 for(const side of [-1,1]){const lamp=new T.SpotLight('#dceaff',0,8,.42,.8,2);lamp.position.set(-1.95,.6,side*.78);lamp.target.position.set(-5,.05,side*.85);root.add(lamp,lamp.target);headlights.push(lamp)}
 function setLights(front:boolean,rear:boolean,frontLevel=Number(front),rearLevel=Number(rear)){root.userData.frontEnabled=front;root.userData.tailEnabled=rear;spill.visible=front;head.emissiveIntensity=4*frontLevel;tail.emissiveIntensity=3.2*rearLevel;headlights.forEach(l=>l.intensity=65*frontLevel)}
 function setUpholstery(color:string){liftDarkUpholstery(color,leather.color)}
 function updateInstruments(){}
 function dispose(){const geo=new Set<T.BufferGeometry>(),mats=new Set<T.Material>([body,white]),tex=new Set<T.Texture>();root.traverse(o=>{if(o instanceof T.Mesh){geo.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m)}});geo.forEach(g=>g.dispose());mats.forEach(m=>{for(const v of Object.values(m))if(v instanceof T.Texture)tex.add(v);m.dispose()});tex.forEach(t=>t.dispose())}
 setDoors(0)
 return {root,body,rim,brake,glass,leather,white,doors,wheels,spokes:[] as T.Group[],setDoors,setWindows,setLights,setUpholstery,updateInstruments,dispose}
}
