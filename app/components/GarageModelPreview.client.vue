<script setup lang="ts">
import * as T from 'three'
import {loadVehicle} from '~/three/loadVehicle'
import {createStudioEnvironment} from '~/three/studioEnvironment'
import {installPaintFinish} from '~/three/paintFinish'
const props=defineProps<{shape:number,color:string,name:string}>()
const host=ref<HTMLDivElement>(),status=ref('loading'),{t}=useLocale()
let renderer:T.WebGLRenderer|undefined,vehicle:Awaited<ReturnType<typeof loadVehicle>>|undefined,environment:T.WebGLRenderTarget|undefined,observer:IntersectionObserver,resize:ResizeObserver,disposed=false
let scene:T.Scene,camera:T.PerspectiveCamera,visible=false
function draw(){if(!renderer||!vehicle||disposed||!visible)return;renderer.render(scene,camera)}
function turn(event:PointerEvent){if(!vehicle||!host.value)return;const bounds=host.value.getBoundingClientRect();vehicle.root.rotation.y=((event.clientX-bounds.left)/bounds.width-.5)*.48;draw()}
function leave(){if(vehicle){vehicle.root.rotation.y=0;draw()}}
async function initialize(){
 if(renderer||disposed)return
 try{
  renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);renderer.toneMapping=T.NeutralToneMapping;renderer.localClippingEnabled=true;host.value!.appendChild(renderer.domElement)
  scene=new T.Scene();camera=new T.PerspectiveCamera(32,1,.05,40);camera.position.set(-4.7,1.7,4.6);camera.lookAt(0,.58,0)
  const studio=createStudioEnvironment(),pmrem=new T.PMREMGenerator(renderer);environment=pmrem.fromScene(studio.scene,.025);scene.environment=environment.texture;studio.dispose();pmrem.dispose()
  scene.add(new T.HemisphereLight('#ffffff','#252b35',.7));const key=new T.DirectionalLight('#ffffff',2.5);key.position.set(-3,5,4);scene.add(key)
  vehicle=await loadVehicle(props.shape,()=>{},true)
  if(disposed){vehicle.dispose();return}
  installPaintFinish(vehicle.body);vehicle.body.color.set(props.color);vehicle.root.position.set(0,0,0);scene.add(vehicle.root)
  if('setDoors' in vehicle&&typeof vehicle.setDoors==='function')vehicle.setDoors(0);if('setLights' in vehicle&&typeof vehicle.setLights==='function')vehicle.setLights(false,false)
  await renderer.compileAsync(scene,camera);if(disposed)return;status.value='ready';size();draw()
 }catch{status.value='error'}
}
function size(){if(!host.value||!renderer)return;const {width,height}=host.value.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();draw()}
onMounted(async()=>{
 await nextTick();if(!host.value||disposed)return
 observer=new IntersectionObserver(entries=>{visible=!!entries[0]?.isIntersecting;if(visible){void initialize();draw()}},{rootMargin:'160px'});observer.observe(host.value!)
 resize=new ResizeObserver(size);resize.observe(host.value!)
 // No continuous animation: the two heavy authored models render only on
 // reveal, resize or pointer movement, leaving the GPU idle while browsing.
})
watch(()=>props.color,color=>{vehicle?.body.color.set(color);draw()})
onBeforeUnmount(()=>{disposed=true;observer?.disconnect();resize?.disconnect();vehicle?.dispose();environment?.dispose();renderer?.dispose()})
</script>
<template><div ref="host" class="garage-model" role="img" :aria-label="name+' · '+t('3D-модель','3D model')" @pointermove="turn" @pointerleave="leave"><span v-if="status==='loading'" class="model-status">{{t('ЗАГРУЗКА МОДЕЛИ','LOADING MODEL')}}<i/></span><span v-else-if="status==='error'" class="model-status">{{t('Модель доступна в шоуруме','Open the model in the showroom')}}</span></div></template>
<style scoped>
.garage-model{width:100%;height:100%;position:relative;min-height:220px}.garage-model :deep(canvas){display:block;width:100%;height:100%}.model-status{position:absolute;inset:0;display:flex;justify-content:center;align-items:center;gap:14px;font-size:9px;letter-spacing:2px;color:#b4bdb7}.model-status i{width:12px;height:12px;border:1px solid #ffffff20;border-top-color:#d9ec8a;border-radius:50%;animation:rotate 1s linear infinite}@keyframes rotate{to{transform:rotate(360deg)}}
</style>
