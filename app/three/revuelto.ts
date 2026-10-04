import * as T from 'three'
import {installTailGlow} from './tailGlow'
import {installRevueltoDisplays} from './revueltoDisplays'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'

/** Batch only fixed opaque surfaces; door, wheel and transparent assemblies stay separate. */
function batchStaticSurfaces(source:T.Group,root:T.Group){
 const batches=new Map<string,T.Mesh[]>()
 source.traverse(o=>{if(!(o instanceof T.Mesh)||Array.isArray(o.material)||o instanceof T.SkinnedMesh)return
  const m=o.material as T.MeshPhysicalMaterial
  if(m.transparent||m.transmission>0||Object.keys(o.geometry.morphAttributes).length)return
  const attributes=Object.entries(o.geometry.attributes as Record<string,T.BufferAttribute|T.InterleavedBufferAttribute>).map(([name,a])=>`${name}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`).sort().join('|')
  const key=`${m.uuid}:${!!o.geometry.index}:${o.castShadow}:${o.receiveShadow}:${attributes}`
  const batch=batches.get(key)??[];batch.push(o);batches.set(key,batch)
 })
 root.updateMatrixWorld(true)
 for(const meshes of batches.values()){
  if(meshes.length<3)continue
  const geometries=meshes.map(mesh=>{const g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld)
   if(mesh.matrixWorld.determinant()<0&&g.index){for(let i=0;i<g.index.count;i+=3){const second=g.index.getX(i+1);g.index.setX(i+1,g.index.getX(i+2));g.index.setX(i+2,second)}}
   return g
  })
  const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(!geometry)continue
  const first=meshes[0]!,mesh=new T.Mesh(geometry,first.material);mesh.name='Revuelto fixed surfaces '+(first.material as T.Material).name;mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;root.add(mesh)
  meshes.forEach(m=>{m.visible=false})
 }
}

/** Authored Anatolian Studios model: metres, with +Z forward in the source. */
export function prepareRevuelto(source:T.Group){
 const root=new T.Group();root.name='Revuelto';root.add(source)
 source.rotation.y=-Math.PI/2;source.position.set(.10516,.00108,0);root.updateMatrixWorld(true)
 const materials=new Map<string,T.MeshStandardMaterial>()
 source.traverse(o=>{if(o instanceof T.Mesh){for(const m of Array.isArray(o.material)?o.material:[o.material])materials.set(m.name,m as T.MeshStandardMaterial)}})
 function material(name:string){const m=materials.get(name);if(!m)throw new Error('Revuelto material missing: '+name);return m}
 const originalPaint=material('car_paint_v3_03')
 const body=new T.MeshPhysicalMaterial({name:'Revuelto paint',color:originalPaint.color,metalness:.42,roughness:.27,clearcoat:1,clearcoatRoughness:.13,envMapIntensity:1.15})
 const leather=material('M_Leather'),rim=material('M_WheelRim'),brake=material('M_Caliper')
 material('M_Alcantara').color.set('#25272b')
 // Fine upholstery grain uses the authored UVs and preserves imported maps.
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d')!,pixels=c.createImageData(128,128)
  for(let i=0;i<pixels.data.length;i+=4){const v=110+Math.floor(Math.random()*40);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255}c.putImageData(pixels,0,0)
  const grain=new T.CanvasTexture(canvas);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(12,12);grain.anisotropy=8
  for(const m of [leather,material('M_Alcantara')]){if(!m.bumpMap){m.bumpMap=grain;m.bumpScale=.0013}m.roughness=.8;m.envMapIntensity=.65;m.needsUpdate=true}
 }

 const cabinFill=new T.PointLight('#e9efff',.6,1.8,2);cabinFill.position.set(.12,.94,0);root.add(cabinFill)
 const glass=material('M_GlassSide') as T.MeshPhysicalMaterial
 const white=material('HeadLights'),frontEmitter=material('M_Emitter'),rearEmitter=material('Emission Red')
 source.traverse(o=>{if(!(o instanceof T.Mesh))return
  const list=Array.isArray(o.material)?o.material:[o.material]
  o.castShadow=!list.some(m=>/Glass/.test(m.name));o.receiveShadow=true
  o.material=Array.isArray(o.material)?list.map(m=>/^(car_paint_v3_03|M_CarPaint)$/.test(m.name)?body:m):/^(car_paint_v3_03|M_CarPaint)$/.test(o.material.name)?body:o.material
  for(const m of list)for(const v of Object.values(m))if(v instanceof T.Texture)v.anisotropy=16
 })
 // Use transparent glass without the additional full-scene transmission pass.
 for(const name of ['M_GlassClear','M_GlassSide','M_GlassRed']){
  const m=material(name) as T.MeshPhysicalMaterial;m.transmission=0;m.transparent=true;m.opacity=name==='M_GlassRed'?.45:.22;m.depthWrite=false;m.envMapIntensity=1;m.needsUpdate=true
 }
 const doors:T.Group[]=[],windows:{mesh:T.Mesh,closed:T.Vector3,pane:T.MeshPhysicalMaterial,door:T.Group,side:number}[]=[]
 for(const [side,code] of [[1,'L'],[-1,'R']] as const){
  const door=new T.Group();door.name='Revuelto door '+code;door.position.set(-1.10,.64,side*.86);root.add(door);root.updateMatrixWorld(true)
  const parts:T.Object3D[]=[]
  // Fixed quarter glass stays on the body; main glass and mirror follow the door.
  source.traverse(o=>{if(o instanceof T.Mesh&&new RegExp(`^(Door${code}F_|DoorJamb${code}F_|DoorCard${code}F|WingMirror${code}_|MirrorBase${code}_|Glass${code}M_)`).test(o.name))parts.push(o)})
  for(const part of parts)door.attach(part)
  door.traverse(o=>{if(o instanceof T.Mesh&&o.name===`Glass${code}M_GlassSide`){const pane=glass.clone();pane.clippingPlanes=[new T.Plane()];o.material=pane;windows.push({mesh:o,closed:o.position.clone(),pane,door,side})}})
  doors.push(door)
 }
 const wheels:T.Group[]=[]
 for(const name of ['FL','FR','RL','RR']){
  const original=source.getObjectByName('CTRL_Wheel_'+name);if(!original)throw new Error('Revuelto wheel missing: '+name)
  // Controllers can be offset from the authored tyre centre. Spin around geometry, not the rig handle.
  const tyreBounds=new T.Box3();original.traverse(o=>{if(o instanceof T.Mesh){const mats=Array.isArray(o.material)?o.material:[o.material];if(mats.some(m=>/tyre|tire/i.test(m.name)))tyreBounds.expandByObject(o,true)}});if(tyreBounds.isEmpty())tyreBounds.setFromObject(original,true)
  const wheel=new T.Group();wheel.name='Revuelto wheel '+name;tyreBounds.getCenter(wheel.position);root.add(wheel);root.updateMatrixWorld(true);wheel.attach(original)
  const calipers:T.Mesh[]=[];wheel.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)&&o.material.name==='M_Caliper')calipers.push(o)})
  for(const caliper of calipers)root.attach(caliper)
  wheels.push(wheel)
 }
 const displays=installRevueltoDisplays(source)
 batchStaticSurfaces(source,root)
 let windowProgress=0
 function setWindows(progress:number){windowProgress=T.MathUtils.clamp(progress,0,1)
  for(const w of windows){w.mesh.position.copy(w.closed);w.mesh.position.y-=windowProgress*.34;w.mesh.position.z+=w.side*windowProgress*.14;w.mesh.visible=windowProgress<.995;w.door.updateWorldMatrix(true,false);w.pane.clippingPlanes![0]!.set(new T.Vector3(0,1,0),.065).applyMatrix4(w.door.matrixWorld)}
 }
 function setDoors(progress:number,rightProgress=progress){doors.forEach((door,i)=>{const p=T.MathUtils.clamp(i===0?progress:rightProgress,0,1),release=T.MathUtils.smoothstep(p,0,.22);const side=i===0?1:-1;door.position.z=side*(.86+.06*release);door.rotation.set(side*.055*p,-side*.16*release,1.12*T.MathUtils.smoothstep(p,.16,1),'YXZ')});setWindows(windowProgress)}
 const tailGlow=installTailGlow(root,2.15)
 const headlights:T.SpotLight[]=[]
 const spill=new T.Mesh(new T.PlaneGeometry(3.2,2.4),new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;void main(){float d=(1.-v.x)*3.2;float z=(v.y-.5)*2.4;float width=.22+d*.14;float lobes=exp(-2.*pow((z-.74)/width,2.))+exp(-2.*pow((z+.74)/width,2.));float fade=exp(-d*.8)*smoothstep(0.,.3,d)*(1.-smoothstep(2.,3.2,d));gl_FragColor=vec4(.82,.9,1.,.25*lobes*fade);}'}));spill.name='Revuelto short headlight floor spill';spill.rotation.x=-Math.PI/2;spill.position.set(-3.6,.014,0);root.add(spill)
 for(const side of [-1,1]){const light=new T.SpotLight('#e4efff',70,6,.32,.85,2);light.position.set(-2.12,.61,side*.76);light.target.position.set(-4.4,.03,side*.86);root.add(light,light.target);headlights.push(light)}
 function setLights(front:boolean,rear:boolean){root.userData.frontEnabled=front;root.userData.tailEnabled=rear;tailGlow.set(rear);spill.visible=front;headlights.forEach(light=>light.intensity=front?70:0);white.emissiveIntensity=front?2.55:0;frontEmitter.emissiveIntensity=front?2.55:0;rearEmitter.emissive.set('#ff1828');rearEmitter.emissiveIntensity=rear?2.6:0}
 function setUpholstery(color:string){leather.color.set(color)}
 return {root,body,leather,rim,brake,glass,white,doors,wheels,spokes:[] as T.Group[],setDoors,setWindows,setLights,setUpholstery,updateInstruments:displays.updateInstruments,dispose(){
  const geometries=new Set<T.BufferGeometry>(),mats=new Set<T.Material>([...materials.values(),body]),textures=new Set<T.Texture>()
  root.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m)}})
  geometries.forEach(g=>g.dispose());mats.forEach(m=>{for(const v of Object.values(m))if(v instanceof T.Texture)textures.add(v);m.dispose()});textures.forEach(t=>t.dispose())
 }}
}
