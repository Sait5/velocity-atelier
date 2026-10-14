import * as T from 'three'
import {createHeadlightPool} from './lampPool'

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
 for(const [x,y,z,power] of [[-.45,1.03,-.38,.8],[.2,1.08,.3,.55],[.05,.62,0,.22]]){const l=new T.PointLight('#fff3e2',power,1.65,2);l.name='Tourbillon cabin bounce';l.position.set(x!,y!,z!);root.add(l)}

 const head={value:0},tail={value:0}
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;o.castShadow=true;o.receiveShadow=true
  for(const raw of Array.isArray(o.material)?o.material:[o.material]){const m=raw as T.MeshPhysicalMaterial
   for(const v of Object.values(m))if(v instanceof T.Texture)v.anisotropy=8
   if(/Window_|sliding glass|red_glass/.test(m.name)){m.transmission=0;m.transparent=true;m.opacity=m.name==='red_glass'?.75:.23;m.depthWrite=false;m.side=T.DoubleSide;m.roughness=.08;o.castShadow=false}
   if(/Interior|Carbon/.test(m.name)){m.metalness=0;m.roughness=.72;if(/Interior/.test(m.name)){m.transparent=false;m.opacity=1;m.depthWrite=true;m.side=T.DoubleSide}}
   if(/GrilleAlpha/.test(m.name)){m.alphaTest=.4;m.transparent=false;m.depthWrite=true}
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
 const doorQuaternion=new T.Quaternion()
 function setDoors(left:number,right=left){doors.forEach((d,i)=>{
  const p=T.MathUtils.clamp(i===0?left:right,0,1),samples=d.userData.siteDoorSamples as number[][]|undefined
  if(samples?.length){const frame=p*(samples.length-1),index=Math.floor(frame),a=samples[index]!,b=samples[Math.min(index+1,samples.length-1)]!,t=frame-index;d.position.set(a[0]!+(b[0]!-a[0]!)*t,a[1]!+(b[1]!-a[1]!)*t,a[2]!+(b[2]!-a[2]!)*t);d.quaternion.set(a[3]!,a[4]!,a[5]!,a[6]!);doorQuaternion.set(b[3]!,b[4]!,b[5]!,b[6]!);d.quaternion.slerp(doorQuaternion,t)}
  else d.rotation.set(0,-Math.sign(d.position.z)*p*.25,p*1.05)
  // Close the exposed mounting gap only after the door has cleared the jamb.
  if(samples?.length){const fit=T.MathUtils.smoothstep(p,.4,1);d.position.x-=.04*fit;d.position.z-=Math.sign(samples[0]![2]!)*.08*fit}
 })}
 const panes=doors.flatMap(d=>d.children.filter(o=>o.name.includes('sliding_glass')||o.name.includes('sliding glass')).map(mesh=>({mesh,rest:mesh.position.clone()})))
 function setWindows(value:number){for(const {mesh,rest} of panes){mesh.position.copy(rest);mesh.position.y-=T.MathUtils.clamp(value,0,1)*.3;mesh.visible=value<.98}}
 function setUpholstery(color:string){trimTargets.forEach(m=>m.color.set(color))}
 function dispose(){const geometries=new Set<T.BufferGeometry>(),mats=new Set<T.Material>(),textures=new Set<T.Texture>();root.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m)}});geometries.forEach(g=>g.dispose());mats.forEach(m=>{for(const v of Object.values(m))if(v instanceof T.Texture)textures.add(v);m.dispose()});textures.forEach(t=>t.dispose())}
 setLights(false,false)
 return {root,body,rim,brake,glass,leather,white,doors,wheels,spokes:[] as T.Group[],setDoors,setWindows,setLights,setUpholstery,setSecondaryPaint,dispose}
}
