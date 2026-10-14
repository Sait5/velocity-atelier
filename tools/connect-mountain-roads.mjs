import fs from 'node:fs/promises'
let p='app/components/VehicleScene.client.vue',s=await fs.readFile(p,'utf8')
s=s.replace("import {createTunnelRoad}","import {createMountainRoad} from '~/three/mountainRoad'\nimport {createMountainSky} from '~/three/mountainSky'\nimport {createTunnelRoad}")
s=s.replace("|'wet'|'desert'","|'wet'|'desert'|'mountain'|'winter'")
s=s.replace('let italianEnvironment:',"let mountainSky:ReturnType<typeof createMountainSky>|undefined, mountainSkyKind='';\nlet italianEnvironment:")
s=s.replace('function isDaylight()',`function isMountain(){return !!props.drive&&['mountain','winter'].includes(props.roadMap??'')}
function prepareMountainLight(){if(!isMountain()){if(mountainSky)scene.remove(mountainSky.sky);return}if(mountainSkyKind!==props.roadMap){if(mountainSky){scene.remove(mountainSky.sky);mountainSky.dispose()}mountainSky=createMountainSky(pmrem,props.roadMap==='winter');mountainSkyKind=props.roadMap!}scene.add(mountainSky!.sky)}
function isDaylight()`)
s=s.replace("['italy','coast','forest','desert']","['italy','coast','forest','desert','mountain','winter']")
s=s.replace("driveLook?.setDesert(props.roadMap==='desert')","driveLook?.setDesert(props.roadMap==='desert'||isMountain())")
s=s.replace("driveLook?.setTunnel(props.roadMap!=='desert')","driveLook?.setTunnel(props.roadMap==='tunnel')")
s=s.replace("return props.roadMap==='desert'?createDesertRoad(scene):createTunnelRoad(scene)","return isMountain()?createMountainRoad(scene,props.roadMap==='winter'):props.roadMap==='desert'?createDesertRoad(scene):createTunnelRoad(scene)")
s=s.replace('const italian=isDaylight();','const italian=isDaylight();prepareMountainLight();')
s=s.replace("scene.userData.daylightBloom=props.drive&&props.roadMap==='desert'?.07:.24", "scene.userData.daylightBloom=isMountain()?.025:props.drive&&props.roadMap==='desert'?.07:.24")
s=s.replace("scene.fog=props.roadMap==='desert'?", "scene.fog=isMountain()?new T.Fog(props.roadMap==='winter'?'#b5c3d0':'#afbecb',props.roadMap==='winter'?170:260,780):props.roadMap==='desert'?")
s=s.replace("scene.environment=props.roadMap==='desert'", "scene.environment=isMountain()&&mountainSky?mountainSky.environment.texture:props.roadMap==='desert'")
s=s.replace("scene.environmentRotation.y=props.roadMap==='desert'?0", "scene.environmentRotation.y=(props.roadMap==='desert'||isMountain())?0")
s=s.replace("renderer.toneMappingExposure=italian?1:1.02", "renderer.toneMappingExposure=isMountain()?(props.roadMap==='winter'?.85:.90):italian?1:1.02")
s=s.replace("camera.far=props.roadMap==='desert'?5000", "camera.far=isMountain()?6000:props.roadMap==='desert'?5000")
s=s.replaceAll('props.roadMap==="desert")?55:36','props.roadMap==="desert"||isMountain())?55:36')
s=s.replace("if(props.drive&&props.roadMap==='coast'){key.intensity",`if(isMountain()){const winter=props.roadMap==='winter';key.position.set(-28, winter?44:23,65);key.intensity=winter?.75:2;key.color.set(winter?'#dce6f1':'#fff0db');key.shadow.radius=winter?5:3;key.shadow.intensity=winter?.38:.7;key.shadow.camera.left=-18;key.shadow.camera.right=18;key.shadow.camera.top=18;key.shadow.camera.bottom=-18;key.shadow.camera.updateProjectionMatrix();key.shadow.normalBias=.025;key.shadow.bias=-.00008;fill.position.set(10,15,-12);fill.intensity=winter?5:3;fill.color.set('#d7e4f2');ambient.color.set('#d7e4f3');ambient.groundColor.set(winter?'#b2bec9':'#656c69');ambient.intensity=winter?.65:.35;scene.environmentIntensity=winter?.6:.48;return}if(props.drive&&props.roadMap==='coast'){key.intensity`)
s=s.replaceAll("()=>props.roadMap==='desert'","()=>props.roadMap==='desert'||isMountain()")
s=s.replace("state.rotateLighting.value&&props.roadMap!=='desert'","state.rotateLighting.value&&props.roadMap!=='desert'&&!isMountain()")
s=s.replace('saltEnvironment?.dispose();post?.dispose()','saltEnvironment?.dispose();mountainSky?.dispose();post?.dispose()')
await fs.writeFile(p,s)
p='app/pages/drive/[car].vue';s=await fs.readFile(p,'utf8')
let start=s.indexOf("const roadMap="),end=s.indexOf('function auto()',start)
s=s.slice(0,start)+`type MapId='tunnel'|'desert'|'mountain'|'winter'
const maps:MapId[]=['tunnel','desert','mountain','winter']
const mapDialog=ref<HTMLDialogElement>()
const roadMap=ref<MapId>(maps.includes(String(route.query.map) as MapId)?route.query.map as MapId:'tunnel')
const mapLabel=(id:MapId)=>({tunnel:t('Тоннель','Tunnel'),desert:t('Солончак','Salt flats'),mountain:t('Горная долина','Mountain valley'),winter:t('Зимний перевал','Winter pass')}[id])
function chooseMap(value:MapId){mapDialog.value?.close();if(value===roadMap.value)return;scene.value?.setKey('w',false);cruise.value=false;roadMap.value=value;void navigateTo({query:{...route.query,map:value}},{replace:true})}
const mapName=computed(()=>mapLabel(roadMap.value))
onMounted(()=>{if(route.query.map&&!maps.includes(String(route.query.map) as MapId))void navigateTo({query:{...route.query,map:'tunnel'}},{replace:true})})
`+s.slice(end)
s=s.replace(`<button @click="chooseMap(roadMap==='tunnel'?'desert':'tunnel')">{{roadMap==='tunnel'?t('СОЛОНЧАК','SALT FLATS'):t('ТОННЕЛЬ','TUNNEL')}}</button>`,`<button @click="mapDialog?.showModal()">{{t('СМЕНИТЬ КАРТУ','CHANGE MAP')}}</button>`)
s=s.replace('  <div v-show="ready" class="drive-hud">',`  <dialog ref="mapDialog" class="drive-map-dialog">
   <div class="map-dialog-heading"><h2>{{t('Выбрать карту','Choose map')}}</h2><button aria-label="Закрыть" @click="mapDialog?.close()">×</button></div>
   <div class="drive-map-options"><button v-for="id in maps" :key="id" :class="{selected:id===roadMap}" @click="chooseMap(id)"><strong>{{mapLabel(id)}}</strong><small>{{id==='mountain'?t('Утро · склон слева · долина справа','Morning · mountain slope · open valley'):id==='winter'?t('Пасмурный день · снежные горы','Overcast day · snowy mountains'):t('Прямая дорога','Straight road')}}</small></button></div>
  </dialog>
  <div v-show="ready" class="drive-hud">`)
await fs.writeFile(p,s)
console.log('Two map factories, daylight rigs and map chooser connected.')
