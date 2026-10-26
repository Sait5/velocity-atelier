import * as T from 'three'
import {createHeadlightPool} from './lampPool'
import {installTourbillonGauges} from './tourbillonGauges'
import {liftDarkUpholstery} from './upholstery'
import {createWindowRegulator} from './windowRegulator'

export function prepareTourbillon(root:T.Group){
 const materials=new Map<string,T.MeshStandardMaterial>()
 root.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.set(m.name,m as T.MeshStandardMaterial)})
 const find=(part:string)=>{const m=[...materials.values()].find(m=>m.name.includes(part));if(!m)throw Error('Tourbillon material missing: '+part);return m}
 const body=find('2026Paint_') as T.MeshPhysicalMaterial,rim=find('3DWheel1A_'),brake=find('CalliperA_Zone'),glass=find('2026Window_'),leather=find('InteriorColourZoneA_'),white=find('2026LightA_')
 const rearPaint=find('col_2')
 // Bugatti keeps its two authored paint zones independently configurable.
 const paintTargets=[body,rearPaint]
 for(const m of paintTargets){m.metalness=.18;m.roughness=.32;m.metalnessMap=null;m.roughnessMap=null}
 const trimTargets=[...materials.values()].filter(m=>/Interior(ColourZone|TillingColourZone)A_|InteriorSeatColourZoneA/.test(m.name))
 for(const m of [...paintTargets,...trimTargets]){
  m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;', 'sampledDiffuseColor.rgb=vec3(.55+.45*dot(sampledDiffuseColor.rgb,vec3(.2126,.7152,.0722)));diffuseColor *= sampledDiffuseColor;'))}
  m.customProgramCacheKey=()=> 'tourbillon-neutral-tint-v1'
 }
 function setSecondaryPaint(color:string){rearPaint.color.set(color)}
 // Soft cabin fill: the black-and-graphite cockpit otherwise reads as a dark hole (driver side is -z).
 for(const [x,y,z,power] of [[-.45,1.03,-.38,1.45],[.2,1.08,.3,1.0],[.05,.62,0,.5],[-.55,.66,-.34,.55]]){const l=new T.PointLight('#fff3e2',power,1.7,2);l.name='Tourbillon cabin bounce';l.position.set(x!,y!,z!);root.add(l)}

 const head={value:0},tail={value:0}
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;o.castShadow=true;o.receiveShadow=true
  for(const raw of Array.isArray(o.material)?o.material:[o.material]){const m=raw as T.MeshPhysicalMaterial
   for(const v of Object.values(m))if(v instanceof T.Texture)v.anisotropy=16
   if(/Window_|sliding glass|red_glass/.test(m.name)){m.transmission=0;m.transparent=true;m.opacity=m.name==='red_glass'?.75:.23;m.depthWrite=false;m.side=T.DoubleSide;m.roughness=.08;o.castShadow=false}
   if(/Interior|Carbon/.test(m.name)){m.metalness=0;m.roughness=.72;if(/Interior/.test(m.name)){m.transparent=false;m.opacity=1;m.depthWrite=true;m.side=T.DoubleSide}}
   if(/GrilleAlpha/.test(m.name)){m.alphaTest=.4;m.transparent=false;m.depthWrite=true}
   // The fitted return around the door edge was exported untextured white; it is the door's dark carbon structure.
   // It is tucked just under the paint where they meet; the depth offset settles the sub-millimetre overlaps left there.
   if(/^Door return/.test(m.name)){m.color.set('#121417');m.metalness=.15;m.roughness=.62;m.envMapIntensity=.5;m.polygonOffset=true;m.polygonOffsetFactor=1;m.polygonOffsetUnits=2}
  }
 })
 white.emissive.set('#ffffff');white.emissiveIntensity=1
 white.onBeforeCompile=shader=>{
  shader.uniforms.tourHead=head;shader.uniforms.tourTail=tail
  shader.vertexShader='varying vec3 lampPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nlampPosition=position;')
  shader.fragmentShader='varying vec3 lampPosition;uniform float tourHead;uniform float tourTail;float bulb(vec3 p,vec3 c){return 1.-smoothstep(.8,1.,max(max(abs(p.x-c.x)/.031,abs(p.y-c.y)/.009),abs(p.z-c.z)/.038));}\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>',`float brightness=smoothstep(.25,.65,max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b)));
vec3 p=vec3(lampPosition.xy,abs(lampPosition.z));float front=max(max(bulb(p,vec3(-1.876,.583,.6165)),bulb(p,vec3(-1.822,.593,.706))),max(bulb(p,vec3(-1.767,.603,.796)),bulb(p,vec3(-1.71,.6125,.886))));
float rear=step(1.6,lampPosition.x)*step(.55,lampPosition.y)*(1.-step(.92,lampPosition.y))*brightness;
totalEmissiveRadiance=vec3(1.,.96,.88)*front*tourHead*2.+vec3(1.,.015,.005)*rear*tourTail*1.5;`)
 }
 white.customProgramCacheKey=()=> 'tourbillon-light-atlas-v1'
 const rearLens=[...materials.values()].find(m=>m.name==='red_glass')
 if(rearLens){rearLens.emissive.set('#ff1608');rearLens.emissiveIntensity=0
  rearLens.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 tailPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntailPosition=position;');shader.fragmentShader='varying vec3 tailPosition;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance*=step(1.5,tailPosition.x)*step(.6,tailPosition.y)*(1.-step(.95,tailPosition.y));')}
  rearLens.customProgramCacheKey=()=> 'tourbillon-rear-lens-v1'
 }
 const doors=[1,0].map(i=>root.getObjectByName('Tourbillon_door_'+i) as T.Group),wheels=[0,1,2,3].map(i=>root.getObjectByName('Tourbillon_wheel_'+i) as T.Group)
 if([...doors,...wheels].some(o=>!o))throw Error('Tourbillon assemblies missing')
 const spill=createHeadlightPool(-2.02,.75);root.add(spill)
 const headlights=[-1,1].map(side=>{const l=new T.SpotLight('#f7f4ee',0,8,.42,.8,2);l.position.set(-2.03,.6,side*.75);l.target.position.set(-5,.05,side*.8);root.add(l,l.target);return l})
 function setLights(front:boolean,rear:boolean,frontLevel=Number(front),rearLevel=Number(rear)){head.value=frontLevel;tail.value=rearLevel;root.userData.frontEnabled=front;root.userData.tailEnabled=rear;spill.visible=front;headlights.forEach(l=>l.intensity=85*frontLevel);if(rearLens)rearLens.emissiveIntensity=rearLevel*1.2}
 // Dihedral doors turn rigidly on a hinge axis hidden under the front fender skin (fitted in Blender, no
 // door/body collisions); the dark gas strut in the aperture comes from bugatti-door-hinges.glb and shows only while
 // the door is open. The old fitted
 // mounting brackets belonged to a sampled path that pushed the door 20 cm away from the body.
 root.traverse(o=>{if(o.name.includes('front mounting assembly'))o.visible=false})
 const doorRest=doors.map(d=>d.position.clone())
 function setDoors(left:number,right=left){doors.forEach((d,i)=>{
  const p=T.MathUtils.clamp(i===0?left:right,0,1),side=Math.sign(doorRest[i]!.z),pivot=new T.Vector3(-1.10,.78,side*.92)
  d.quaternion.setFromAxisAngle(new T.Vector3(0,-side*.55,1).normalize(),1.13*p)
  d.position.copy(doorRest[i]!).sub(pivot).applyQuaternion(d.quaternion).add(pivot)
 })}
 // the door glass slides as one rigid pane along its own slope into the door and is clipped under its own lowest edge
 // (windowRegulator.ts); the small lens parts in the glass material stay put. (Dropped straight down, the leaning pane
 // came out through the door skin together with those parts.)
 const {setWindows,dispose:disposeWindows}=createWindowRegulator(doors.flatMap(d=>d.children.filter((o):o is T.Mesh=>o instanceof T.Mesh&&(o.name.includes('sliding_glass')||o.name.includes('sliding glass')))))
 const lifted=new T.Color()
 function setUpholstery(color:string){liftDarkUpholstery(color,lifted);trimTargets.forEach(m=>m.color.copy(lifted))}
 function dispose(){disposeWindows();const geometries=new Set<T.BufferGeometry>(),mats=new Set<T.Material>(),textures=new Set<T.Texture>();root.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m)}});geometries.forEach(g=>g.dispose());mats.forEach(m=>{for(const v of Object.values(m))if(v instanceof T.Texture)textures.add(v);m.dispose()});textures.forEach(t=>t.dispose())}
 setLights(false,false)
 const {updateInstruments}=installTourbillonGauges(root)
 return {root,body,secondaryPaint:rearPaint,rim,brake,glass,leather,white,doors,wheels,spokes:[] as T.Group[],setDoors,setWindows,setLights,setUpholstery,setSecondaryPaint,updateInstruments,dispose}
}
