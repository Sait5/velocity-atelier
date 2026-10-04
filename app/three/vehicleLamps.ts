import * as T from 'three'
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
 const spill=new T.Mesh(new T.PlaneGeometry(4,3),new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 v;void main(){float d=(1.-v.x)*4.;float z=(v.y-.5)*3.;float w=.24+d*.13;float lobes=exp(-2.*pow((z-.67)/w,2.))+exp(-2.*pow((z+.67)/w,2.));float fade=exp(-d*.65)*smoothstep(0.,.5,d)*(1.-smoothstep(2.,4.,d));gl_FragColor=vec4(.84,.9,1.,.14*lobes*fade);}'
 }));spill.name='Headlight floor spill';spill.rotation.x=-Math.PI/2;spill.position.set(-3.9,.012,0);root.add(spill)
 for(const side of [-1,1]){
  const light=new T.SpotLight('#dceaff',14,9,.28,.8,2);light.position.set(-1.92,.57,side*.67);light.target.position.set(-7,.04,side*.9);root.add(light,light.target);headlights.push(light)
  const tail=new T.PointLight('#ff260a',.8,1.8,2);tail.position.set(2.1,.77,side*.76);root.add(tail);taillights.push(tail)
 }
 function setLights(frontOn:boolean,rearOn:boolean){
  tailGlow.set(rearOn)
  spill.visible=frontOn
  front.emissiveIntensity=frontOn?5.3:0;projector.emissiveIntensity=frontOn?8:0
  rear.emissiveIntensity=rearOn?1.6:0;rearLens.emissiveIntensity=rearOn?.9:0
  headlights.forEach(l=>l.intensity=frontOn?20:0);taillights.forEach(l=>l.intensity=rearOn?.8:0)
 }
 setLights(true,true)
 return {white:front,setLights}
}
