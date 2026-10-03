<script setup lang="ts">
import * as T from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import {createStudioEnvironment} from '~/three/studioEnvironment'
import {createVehiclePost} from '~/three/vehiclePost'
import {createMotionRoad} from '~/three/motionRoad'
import {createStraightMotion} from '~/three/straightMotion'
import {createEngineAudio} from '~/three/engineAudio'
import gsap from 'gsap'
import { createVehicle } from '~/three/vehicle'
import { loadVehicle } from '~/three/loadVehicle'



import {createCockpitLook} from '~/three/cockpitLook'
import {createDriveLook} from '~/three/driveLook'
import {createDoorAudio} from '~/three/doorAudio'
import {createStudioFloor} from '~/three/studioFloor'
import {interiorDetails} from '~/data/finishes'
const props=defineProps<{drive?:boolean}>(),emit=defineEmits<{ready:[],progress:[number],speed:[number],telemetry:[{gear:number,rpm:number}],error:[string]}>()
const {t}=useLocale();const el=ref<HTMLDivElement>(),state=useAtelier();let renderer:T.WebGLRenderer,scene:T.Scene,camera:T.PerspectiveCamera,controls:OrbitControls,car:Awaited<ReturnType<typeof loadVehicle>>,frame=0,pmrem:T.PMREMGenerator,env:T.Texture
let studioFloor:ReturnType<typeof createStudioFloor>|undefined;let post:ReturnType<typeof createVehiclePost>|undefined;
let motionRoad:ReturnType<typeof createMotionRoad>|undefined;const transmission=createStraightMotion(parseFloat(state.car.value.speed)||325);let motionSpeed=0,engineAudio=createEngineAudio(state.car.value.shape===8);let stopped=false,angle=0,cam=0,paused=false;const keys=new Set<string>();const reduced=()=>!state.motion.value;let resize:ResizeObserver;let floor:T.Mesh,key:T.DirectionalLight,fill:T.PointLight,ambient:T.HemisphereLight,envTarget:T.WebGLRenderTarget
let look:ReturnType<typeof createCockpitLook>,cockpitActive=false,resizeFrame=0,transition:gsap.core.Timeline|undefined
let driveLook:ReturnType<typeof createDriveLook>;const doorAudio=createDoorAudio()
let pointer:number|null=null,previousX=0,previousY=0,lastHud=0
const windowMotion={value:state.windowsDown.value?1:0}
function applyWindows(){if(car&&'setWindows' in car&&typeof car.setWindows==='function')car.setWindows(windowMotion.value)}
function pointerDown(e:PointerEvent){if((!cockpitActive&&!props.drive)||pointer!==null)return;pointer=e.pointerId;previousX=e.clientX;previousY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)}
function pointerMove(e:PointerEvent){if(e.pointerId!==pointer)return;const dx=e.clientX-previousX,dy=e.clientY-previousY;if(props.drive)driveLook.turn(dx,dy,cam);else if(cockpitActive)look.turn(dx,dy);previousX=e.clientX;previousY=e.clientY}
function pointerUp(e:PointerEvent){if(e.pointerId===pointer){pointer=null;if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId)}}
function blur(){keys.clear();pointer=null}
function applyBackground(){if(!scene)return;if(studioFloor)studioFloor.visible=!props.drive;scene.background=new T.Color(props.drive?'#05070a':state.background.value);scene.fog=new T.Fog(props.drive?'#05070a':state.background.value,18,props.drive?100:65);(floor.material as T.MeshStandardMaterial).color.set(props.drive?'#080a0d':state.background.value).multiplyScalar(.28);scene.environment=env;if(camera){camera.far=160;camera.updateProjectionMatrix()}}
function applyLighting(){if(!key)return;const preset=state.lighting.value;key.intensity=preset==='Dark Room'?.65:preset==='Night'?.8:preset==='Soft Day'?2.2:2.7;key.color.set(preset==='Sunset'?'#ffdda9':'#ffffff');fill.color.set(preset==='Sunset'?'#ffd0a3':preset==='Night'?'#a5b9df':'#ffffff');fill.intensity=preset==='Dark Room'?8:preset==='Night'?11:26;ambient.intensity=preset==='Dark Room'?.18:preset==='Night'?.25:preset==='Soft Day'?.65:.38;scene.environmentIntensity=preset==='Dark Room'?.6:preset==='Night'?.7:1}
function applyLights(){if(!car)return;if('setLights' in car&&typeof car.setLights==='function')car.setLights(state.headlights.value,state.taillights.value);else car.white.emissiveIntensity=state.headlights.value?2:0}
function applyUpholstery(color:string){if(!car)return;if("setUpholstery" in car&&typeof car.setUpholstery==="function")car.setUpholstery(color);else car.leather.color.set(color)}
function applyConfiguration(){car.body.color.set(state.paint.value);applyUpholstery(state.upholstery.value);applyLights();applyWindows();applyBackground();applyLighting()}
function cycleCamera(){cam=(cam+1)%3;driveLook?.reset();if(camera){camera.fov=cam===1?76:camera.aspect<.8?65:36;camera.updateProjectionMatrix()}}
function reset(){driveLook?.reset();motionSpeed=0;transmission.reset();car?.wheels.forEach(w=>w.rotation.z=0);motionRoad?.update(0,0,0);emit('speed',0);emit('telemetry',{gear:1,rpm:900})}
function keyboard(e:KeyboardEvent){if(['INPUT','SELECT','TEXTAREA'].includes((e.target as HTMLElement)?.tagName))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();const physical:Record<string,string>={KeyW:'w',KeyS:'s',KeyA:'a',KeyD:'d',KeyB:'b',KeyR:'r',KeyC:'c',Space:' '};keys.add(physical[e.code]||e.key.toLowerCase());if(e.code==='KeyR'||e.key.toLowerCase()==='r')reset();if(e.code==='KeyC'||e.key.toLowerCase()==='c')cycleCamera();if(e.key==='Escape')paused=!paused;if(state.engine.value)engineAudio.start()}
function release(e:KeyboardEvent){const physical:Record<string,string>={KeyW:'w',KeyS:'s',KeyA:'a',KeyD:'d',KeyB:'b',Space:' '};keys.delete(physical[e.code]||e.key.toLowerCase())}
onMounted(async()=>{try{
 await nextTick();if(!el.value)throw new Error('Scene container is not mounted. Please retry.');
 emit('progress',10);const doorReady=doorAudio.preload();scene=new T.Scene();scene.background=new T.Color('#101313');scene.fog=new T.Fog('#101313',18,65)
 renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,{Low:.75,Medium:1,High:1.8,Ultra:2}[state.quality.value]||1));renderer.localClippingEnabled=true;renderer.shadowMap.enabled=state.shadows.value;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=1.02;el.value!.appendChild(renderer.domElement)
 camera=new T.PerspectiveCamera(36,1,.05,160);camera.position.set(-5.7,2.35,6.3);controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.65,0);controls.enableDamping=true;controls.minDistance=3;controls.maxDistance=13;controls.maxPolarAngle=Math.PI/2-.03;controls.minPolarAngle=.25;controls.enablePan=false;controls.enabled=!props.drive
 post=createVehiclePost(renderer,scene,camera);look=createCockpitLook(camera);driveLook=createDriveLook(camera);renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('pointercancel',pointerUp);window.addEventListener('blur',blur)
 emit('progress',35);pmrem=new T.PMREMGenerator(renderer);const studio=createStudioEnvironment();envTarget=pmrem.fromScene(studio.scene,.025);env=envTarget.texture;scene.environment=env;studio.dispose();
 ambient=new T.HemisphereLight('#ffffff','#171b22',.5);scene.add(ambient);key=new T.DirectionalLight('#ffffff',2.2);key.position.set(-3,7,4);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;key.shadow.bias=-.001;scene.add(key,key.target)
 fill=new T.PointLight('#ffffff',24,25);fill.position.set(5,3,-4);scene.add(fill)
 floor=new T.Mesh(new T.PlaneGeometry(250,250),new T.MeshStandardMaterial({color:'#060807',metalness:0,roughness:1,envMapIntensity:.01}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor)
 if(!props.drive){studioFloor=createStudioFloor();scene.add(studioFloor)}else motionRoad=createMotionRoad(scene);if(!props.drive){for(const radius of [3.7,3.73,4.4]){const ring=new T.Mesh(new T.RingGeometry(radius,radius+.008,128),new T.MeshBasicMaterial({color:'#475143',transparent:true,opacity:.3,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.003;scene.add(ring)}}
 emit('progress',65);car=await loadVehicle(state.car.value.shape,n=>emit('progress',n));if(stopped){car.dispose();return}applyConfiguration();scene.add(car.root)
 if(props.drive){state.doors.value=false;state.interior.value=false;window.addEventListener('keydown',keyboard);window.addEventListener('keyup',release)
 }else if(state.motion.value){camera.position.set(-3.4,1.3,4);gsap.to(camera.position,{x:-5.7,y:2.35,z:6.3,duration:2.5,ease:'power2.inOut'})}
 function sizeScene(){if(stopped||!el.value)return;const w=el.value.clientWidth,h=el.value.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);post?.resize(w,h);camera.aspect=w/h;camera.fov=(props.drive?cam===1:state.interior.value)?76:camera.aspect<.8?65:36;camera.updateProjectionMatrix()}
 resize=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(sizeScene)});resize.observe(el.value!);sizeScene()
 emit('progress',90);await doorReady;if(stopped)return;renderer.compile(scene,camera);emit('progress',100);emit('ready')
 let last=performance.now(),count=0,sum=0
 function tick(now:number){if(stopped)return;frame=requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.1);last=now
  if(props.drive&&!paused){const throttle=keys.has('w')||keys.has('arrowup'),braking=keys.has('s')||keys.has('arrowdown')||keys.has(' '),reverse=keys.has('b');const movement=transmission.step(dt,throttle,braking,reverse);motionSpeed=movement.speed;if(now-lastHud>=100){lastHud=now;emit('telemetry',{gear:movement.gear,rpm:movement.rpm});emit('speed',Math.round(Math.abs(motionSpeed)*3.6))}car.wheels.forEach((w,i)=>{w.rotation.z=(movement.distance/(i<2?.365:.335))%(Math.PI*2)});motionRoad?.update(movement.distance,motionSpeed,now/1000);car.root.position.y=state.motion.value?Math.sin(now*.012)*Math.min(Math.abs(motionSpeed)*.00015,.006):0;engineAudio.update(movement.rpm,throttle,state.volume.value,state.engine.value,motionSpeed,movement.shifting,cam===1,braking);if("updateInstruments" in car&&typeof car.updateInstruments==="function")car.updateInstruments(motionSpeed,movement.rpm,movement.gear);applyWindows();}else if(!props.drive&&controls.enabled)controls.update()
  if(props.drive&&car)driveLook.apply(car.root.position,angle,cam,dt);if(props.drive&&paused)engineAudio.update(900,false,state.volume.value,false);if(cockpitActive)look.apply();post?.render(state.quality.value);sum+=dt;count++;if(count===120){if(sum>4&&state.quality.value==='High'){renderer.setPixelRatio(1);post?.resize(el.value!.clientWidth,el.value!.clientHeight)}sum=0;count=0}
 }frame=requestAnimationFrame(tick)
 }catch(e){emit('error',e instanceof Error?e.message:'WebGL unavailable')}})
watch(()=>state.volume.value,v=>doorAudio.setVolume(v))
watch(()=>state.engine.value,v=>{if(props.drive&&v)engineAudio.start();if(!v)engineAudio.update(900,false,state.volume.value,false)},{flush:'sync'})
watch(()=>state.paint.value,v=>car?.body.color.set(v));watch(()=>state.upholstery.value,v=>applyUpholstery(v));watch(()=>state.headlights.value,applyLights);watch(()=>state.taillights.value,applyLights)
watch(()=>state.doors.value,v=>{if(car)void doorAudio.play(v,state.volume.value,v||reduced()?0:1.08);car?.doors.forEach((d,i)=>gsap.to(d.rotation,{y:state.car.value.shape===8&&v?(i===0?1.02:-1.02):0,z:state.car.value.shape!==8&&v?-1.05:0,x:state.car.value.shape!==8&&v?(i===0?-.15:.15):0,duration:reduced()?.01:1.2,ease:'power2.inOut'}))})
watch(()=>state.interior.value,v=>{
 if(stopped||!camera||props.drive)return;transition?.kill();gsap.killTweensOf(camera.position);cockpitActive=false;pointer=null;controls.enabled=false
 const target=new T.Vector3(-.55,.97,.35),begin=camera.position.clone(),progress={value:0}
 transition=gsap.timeline({onComplete(){if(v){if(!reduced())void doorAudio.play('seat',state.volume.value*.35);look.reset();const selected=interiorDetails.find(d=>d.id===state.detail.value);if(selected)look.aim(new T.Vector3(...selected.point as [number,number,number]));cockpitActive=true}else{controls.target.set(0,.65,0);controls.minDistance=3;controls.maxDistance=13;controls.enabled=true}}})
 if(v){
  state.doors.value=true
  const approach=new T.Vector3(-.13,1.18,1.75),entry=new T.CubicBezierCurve3(approach,new T.Vector3(-.22,1.17,1.15),new T.Vector3(-.18,1.12,.54),look.anchor.clone())
  transition.to(camera.position,{x:approach.x,y:approach.y,z:approach.z,duration:reduced()?.01:.85,ease:'power2.inOut',onUpdate(){camera.lookAt(target)}},0)
  transition.to(progress,{value:1,duration:reduced()?.01:1.45,ease:'sine.inOut',onUpdate(){camera.position.copy(entry.getPoint(progress.value));camera.lookAt(target);camera.rotateZ(Math.sin(progress.value*Math.PI)*.055)}},reduced()?0:.85)
  transition.to(camera,{fov:76,duration:reduced()?.01:1.45,ease:'sine.inOut',onUpdate(){camera.updateProjectionMatrix()}},reduced()?0:.85)
 }else{const exit=new T.CubicBezierCurve3(begin,new T.Vector3(-.05,1.28,1.3),new T.Vector3(-2.4,1.9,4.1),new T.Vector3(-5.7,2.35,6.3));transition.to(progress,{value:1,duration:reduced()?.01:1.7,ease:'power2.inOut',onUpdate(){camera.position.copy(exit.getPoint(progress.value));camera.lookAt(0,.65,0)}},0).to(camera,{fov:camera.aspect<.8?65:36,duration:reduced()?.01:1.5,onUpdate(){camera.updateProjectionMatrix()}},0)}
 // Glass stays visible from both sides, including when the camera is inside.
})
watch(()=>state.windowsDown.value,v=>{gsap.to(windowMotion,{value:v?1:0,duration:reduced()?.01:1.05,ease:'sine.inOut',onUpdate:applyWindows})})
watch(()=>state.detail.value,id=>{if(!cockpitActive)return;const detail=interiorDetails.find(d=>d.id===id);if(detail)look.aim(new T.Vector3(...detail.point as [number,number,number]));gsap.to(camera,{fov:id==='pedals'?54:id==='instruments'?48:id==='console'?58:76,duration:reduced()?.01:.6,ease:'sine.inOut',onUpdate(){camera.updateProjectionMatrix()}})})
watch(()=>state.focus.value,id=>{if(!id||state.interior.value||!camera||props.drive)return;const presets:Record<string,{position:number[],target:number[]}>= {front:{position:[-5,1.5,1.7],target:[-.6,.6,0]},side:{position:[-.3,1.65,7],target:[0,.6,0]},rear:{position:[5,1.7,3.8],target:[1,.65,0]},wheel:{position:[-1.7,.7,2.2],target:[-1.2,.37,.85]}};const preset=presets[id];if(!preset)return;gsap.killTweensOf(camera.position);controls.enabled=false;controls.minDistance=id==='wheel'?.8:3;controls.target.set(...preset.target as [number,number,number]);gsap.to(camera.position,{x:preset.position[0],y:preset.position[1],z:preset.position[2],duration:reduced()?.01:.9,onUpdate(){camera.lookAt(controls.target)},onComplete(){controls.enabled=true}})})
watch(()=>state.environment.value,applyBackground);watch(()=>state.background.value,applyBackground);watch(()=>state.lighting.value,applyLighting)
watch(()=>state.quality.value,v=>{if(studioFloor)studioFloor.visible=!props.drive&&state.environment.value==='studio'&&['High','Ultra'].includes(v);if(renderer){renderer.setPixelRatio(Math.min(devicePixelRatio,{Low:.75,Medium:1,High:1.8,Ultra:2}[v]||1));key.shadow.mapSize.set(v==='Medium'?1024:2048,v==='Medium'?1024:2048);post?.resize(el.value!.clientWidth,el.value!.clientHeight);key.shadow.map?.dispose();key.shadow.map=null}})
watch(()=>state.shadows.value,v=>{if(renderer)renderer.shadowMap.enabled=v})
watch(()=>state.car.value.id,()=>{if(!scene||!car)return;const old=car;gsap.to(old.root.scale,{x:.01,y:.01,z:.01,duration:.3,async onComplete(){scene.remove(old.root);old.dispose();try{const loaded=await loadVehicle(state.car.value.shape,n=>emit('progress',n));if(stopped){loaded.dispose();return}car=loaded;applyConfiguration();scene.add(car.root);car.root.scale.setScalar(.01);gsap.to(car.root.scale,{x:1,y:1,z:1,duration:.7})}catch(e){emit('error','Vehicle could not load. Please retry.')}}})})
onBeforeUnmount(()=>{stopped=true;gsap.killTweensOf(windowMotion);engineAudio.dispose();doorAudio.dispose();cancelAnimationFrame(frame);cancelAnimationFrame(resizeFrame);transition?.kill();resize?.disconnect();window.removeEventListener('keydown',keyboard);window.removeEventListener('keyup',release);window.removeEventListener('blur',blur);controls?.dispose();if(renderer){renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointermove',pointerMove);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('pointercancel',pointerUp)}gsap.killTweensOf(camera?.position);if(car){car.doors.forEach(d=>gsap.killTweensOf(d.rotation));scene.remove(car.root);car.dispose()}scene?.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();if(o instanceof T.InstancedMesh)o.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{for(const value of Object.values(m))if(value instanceof T.Texture)value.dispose();m.dispose()})}});motionRoad?.dispose();studioFloor?.dispose();envTarget?.dispose();post?.dispose();pmrem?.dispose();renderer?.dispose()})
defineExpose({reset,cycleCamera,setKey(key:string,down:boolean){down?keys.add(key):keys.delete(key);if(down&&state.engine.value)engineAudio.start()}})
</script>
<template><div ref="el" class="vehicle-canvas" tabindex="0" :aria-label="props.drive?t('Перетаскивайте для осмотра дороги. C меняет камеру.','Drag to look around the road. C changes the camera.'):t('Интерактивная 3D-модель. Перетаскивайте для поворота, используйте колесо для масштаба.','Interactive three-dimensional vehicle. Drag to rotate, scroll to zoom.')" /></template>








