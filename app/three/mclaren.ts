import * as T from 'three'
import {createHeadlightPool} from './lampPool'
import {liftDarkUpholstery} from './upholstery'

/**
 * McLaren 750S (geyges, Sketchfab Free Standard), rigged by tools/prepare-mclaren-model.py: metre scale, front -x,
 * driver's door at +z, wheel groups at the axle centres and door groups at the dihedral hinge under the A-pillar.
 * The source materials keep their game names (m_0_*): the four Papaya paint slots, the textured caliper atlas, the
 * dark tinted glass and the named lamp materials below.
 */
const PAINT=/^m_0_(1413|1416|1419|1425)$/,CALIPER=/^m_0_(966|948|1560)$/
/** Dihedral door: the hinge axis runs mostly across the car and leans outward, so the door rises forward and up and
 *  swings a little away from the body. */
const OPEN=1.3
export function prepareMcLaren(root:T.Group){
 const body=new T.MeshPhysicalMaterial({name:'McLaren paint',color:'#ff8000',metalness:.3,roughness:.2,clearcoat:1,clearcoatRoughness:.07})
 const materials=new Map<string,T.MeshStandardMaterial>()
 root.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.set(m.name,m as T.MeshStandardMaterial)})
 const need=(name:string)=>{const m=materials.get(name);if(!m)throw Error('McLaren material missing: '+name);return m}
 const rim=need('m_0_153'),brake=need('m_0_966'),leather=need('m_0_2478'),glass=need('m_0_705')
 const drl=need('DRLstrip'),tail=need('TailLED')
 const white=new T.MeshStandardMaterial({color:'#edf5ff',emissive:'#cbdfff',emissiveIntensity:0})
 const retired=new Set<T.Material>()
 root.traverse(o=>{
  if(!(o instanceof T.Mesh))return
  o.castShadow=true;o.receiveShadow=true
  const list=Array.isArray(o.material)?o.material:[o.material]
  const swapped=list.map(m=>{
   const mat=m as T.MeshStandardMaterial
   for(const v of Object.values(mat))if(v instanceof T.Texture)v.anisotropy=16
   // The rear marker's tiny normal map has degenerate texels: at some angles its shading turns to Inf/NaN, which the
   // bloom blur spreads into black squares over the whole frame. The marker is a few millimetres deep: drop the map.
   if(mat.name==='m_0_300'&&mat.normalMap){mat.normalMap=null;mat.needsUpdate=true}
   if(PAINT.test(mat.name)){retired.add(mat);return body}
   // the rear calipers use the same atlas as the front ones: one material, so the configurator colours all four
   if(CALIPER.test(mat.name)&&mat!==brake){retired.add(mat);return brake}
   // The game glass is near-black at 80–95 % alpha: in the browser that reads as painted-over windows. Tint it like the
   // other cars' glass so the cabin shows through.
   if(mat.transparent&&mat.color.r<.05&&mat.color.g<.05&&mat.color.b<.05&&!/Headlight/.test(mat.name)){
    const lens=mat.opacity<.3
    if(!lens&&!mat.name.startsWith('McLaren window'))mat.name='McLaren window '+mat.name
    mat.color.set(lens?'#c9d3d6':'#0d1214');mat.opacity=lens?.16:.36;mat.roughness=.05;mat.metalness=.1;mat.depthWrite=false;mat.side=T.DoubleSide;o.castShadow=false
   }
   if(mat.name==='HeadlightLens'){mat.color.set('#d3dfde');mat.opacity=.14;mat.depthWrite=false;o.castShadow=false}
   return mat
  })
  o.material=Array.isArray(o.material)?swapped:swapped[0]!
 })
 retired.forEach(m=>{if(m!==brake)m.dispose()})
 leather.metalness=0;leather.roughness=.72
 // the side markers carry their own emission in the source: amber at the front, red at the rear; they follow the lamps
 const markers=[...materials.values()].filter(m=>!m.emissiveMap&&m.emissive&&m.emissive.getHex()!==0&&m.emissiveIntensity>0&&m!==drl&&m!==tail).map(m=>({m,base:m.emissiveIntensity,front:m.emissive.g>.2}))
 drl.emissive.set('#eef4ff');drl.emissiveIntensity=0
 tail.emissive.set('#ff1a0a');tail.emissiveIntensity=0
 // a little local bounce so the black cabin reads, as in the other cars
 for(const [x,y,z,power] of [[-.1,1.0,0,1.0],[-.45,.8,.3,.45],[.15,.75,-.3,.35]]){
  const bounce=new T.PointLight('#f4f6f5',power,1.4,2);bounce.name='McLaren cabin bounce';bounce.position.set(x!,y!,z!);root.add(bounce)
 }
 const doors=['McLaren_door_L','McLaren_door_R'].map(name=>root.getObjectByName(name) as T.Group)
 const wheels=[0,1,2,3].map(i=>root.getObjectByName('McLaren_wheel_'+i) as T.Group)
 if(doors.some(d=>!d)||wheels.some(w=>!w))throw Error('McLaren rig unavailable')
 // The game model gives the door's perimeter seal a glossy light grey; hidden while the door is shut, it showed as a pale,
 // toothed panel on the raised door's tail. Real seals are black rubber.
 const seal=new T.MeshStandardMaterial({name:'McLaren door seal',color:'#0f1110',roughness:.62,metalness:0})
 // Inside the door the game left bare glossy metal under the trim: raised, it glinted through the gaps as pale teeth.
 const frame=new T.MeshStandardMaterial({name:'McLaren door frame',color:'#090a0a',roughness:.85,metalness:0})
 for(const door of doors)door.traverse(o=>{
  if(!(o instanceof T.Mesh)||Array.isArray(o.material))return
  if(o.material.name==='m_0_2316')o.material=seal
  else if(o.material.name==='m_0_1188')o.material=frame
  // the shut faces built round the door (tools/prepare-mclaren-model.py) are single walls: show both sides
  else if(o.material.name==='McLaren door shut'){o.material.side=T.DoubleSide;o.castShadow=false}
 })
 const axes=doors.map(d=>new T.Vector3(0,.35*Math.sign(d.position.z)*-1,.92).normalize())
 function setDoors(left:number,right=left){doors.forEach((door,i)=>door.quaternion.setFromAxisAngle(axes[i]!,T.MathUtils.clamp(i===0?left:right,0,1)*OPEN))}
 const panes=doors.flatMap(d=>d.children.filter(o=>o.name.startsWith('McLaren_door_glass')).map(mesh=>({mesh,rest:mesh.position.clone()})))
 function setWindows(value:number){for(const {mesh,rest} of panes){mesh.position.copy(rest);mesh.position.y-=value*.3;mesh.visible=value<.99}}
 const headlights:T.SpotLight[]=[]
 const spill=createHeadlightPool(-2.02,.62);root.add(spill)
 for(const side of [-1,1]){const lamp=new T.SpotLight('#dceaff',0,8,.42,.8,2);lamp.position.set(-1.9,.6,side*.66);lamp.target.position.set(-5,.05,side*.75);root.add(lamp,lamp.target);headlights.push(lamp)}
 function setLights(head:boolean,tailOn:boolean,frontLevel=Number(head),rearLevel=Number(tailOn)){root.userData.frontEnabled=head;root.userData.tailEnabled=tailOn;spill.visible=head;drl.emissiveIntensity=4*frontLevel;tail.emissiveIntensity=3.2*rearLevel;for(const {m,base,front} of markers)m.emissiveIntensity=base*(front?frontLevel:rearLevel);headlights.forEach(l=>l.intensity=65*frontLevel)}
 function setUpholstery(color:string){liftDarkUpholstery(color,leather.color)}
 function updateInstruments(){}
 function dispose(){const geo=new Set<T.BufferGeometry>(),mats=new Set<T.Material>([body,white]),tex=new Set<T.Texture>();root.traverse(o=>{if(o instanceof T.Mesh){geo.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m)}});geo.forEach(g=>g.dispose());mats.forEach(m=>{for(const v of Object.values(m))if(v instanceof T.Texture)tex.add(v);m.dispose()});tex.forEach(t=>t.dispose())}
 setDoors(0)
 return {root,body,rim,brake,glass,leather,white,doors,wheels,spokes:[] as T.Group[],setDoors,setWindows,setLights,setUpholstery,updateInstruments,dispose}
}
