import * as T from 'three'
import {createHeadlightPool} from './lampPool'
import {installTailGlow} from './tailGlow'

/** Illuminate existing lamp geometry; light pools remain attached to the car. */
export function installItaliaLamps(root:T.Group,source:T.MeshStandardMaterial){
 const front=source.clone();front.name='Italia white lamp emitters';front.metalness=.05;front.roughness=.24;front.emissive.set('#eaf3ff');front.emissiveMap=source.map
 const projector=new T.MeshPhysicalMaterial({name:'Italia projector bulbs',color:'#d4dce5',roughness:.2,metalness:.05,emissive:'#edf5ff',emissiveIntensity:6,side:T.DoubleSide})
 const rear=source.clone();rear.name='Italia red lamp rings';rear.color.set('#bd1709');rear.metalness=.1;rear.roughness=.26;rear.emissive.set('#ff1808');rear.emissiveMap=null
 const rearLens=new T.MeshPhysicalMaterial({name:'Italia red lamp lenses',color:'#a71007',roughness:.18,metalness:.05,clearcoat:1,emissive:'#ff1808',emissiveIntensity:2,side:T.DoubleSide})
 root.traverse(o=>{if(!(o instanceof T.Mesh))return
  if(/headlight.*(lights_plastic|reflector)/.test(o.name))o.material=front
  else if(/headlight.*detail_glass_clear/.test(o.name))o.material=projector
  else if(/taillight.*lights_glass/.test(o.name))o.material=rear
  else if(/glass[LR]TL_detail_glass_red/.test(o.name))o.material=rearLens
 })
 const tailGlow=installTailGlow(root,2.1)
 const headlights:T.SpotLight[]=[],taillights:T.PointLight[]=[]
 const spill=createHeadlightPool(-1.92,0.67);root.add(spill)
 for(const side of [-1,1]){
  const light=new T.SpotLight('#dceaff',95,6,.42,.8,2);light.position.set(-1.92,.57,side*.67);light.target.position.set(-4.4,.03,side*.86);root.add(light,light.target);headlights.push(light)
 }
 function setLights(frontOn:boolean,rearOn:boolean,frontLevel=Number(frontOn),rearLevel=Number(rearOn)){root.userData.frontEnabled=frontOn;root.userData.tailEnabled=rearOn;
  tailGlow.set(rearOn,rearLevel)
  spill.visible=frontOn
  front.emissiveIntensity=5.3*frontLevel;projector.emissiveIntensity=8*frontLevel
  rear.emissiveIntensity=1.6*rearLevel;rearLens.emissiveIntensity=.9*rearLevel
  headlights.forEach(l=>l.intensity=95*frontLevel);taillights.forEach(l=>l.intensity=.8*rearLevel)
 }
 setLights(true,true)
 return {white:front,setLights}
}
