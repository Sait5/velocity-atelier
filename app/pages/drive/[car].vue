<script setup lang="ts">
const {t}=useLocale();const s=useAtelier(),route=useRoute(),speed=ref(0),telemetry=ref({gear:1,rpm:900}),ready=ref(false),progress=ref(0),error=ref(''),cruise=ref(false),scene=ref<any>(),retry=ref(0)
s.select(String(route.params.car));const gear=computed(()=>telemetry.value.gear)
type MapId='tunnel'|'desert'|'mountain'|'winter'
const maps:MapId[]=['tunnel','desert','mountain','winter']
const mapDialog=ref<HTMLDialogElement>()
const roadMap=ref<MapId>(maps.includes(String(route.query.map) as MapId)?route.query.map as MapId:'tunnel')
const mapLabel=(id:MapId)=>({tunnel:t('Тоннель','Tunnel'),desert:t('Солончак','Salt flats'),mountain:t('Горная долина','Mountain valley'),winter:t('Зимний перевал','Winter pass')}[id])
function chooseMap(value:MapId){mapDialog.value?.close();if(value===roadMap.value)return;scene.value?.setKey('w',false);cruise.value=false;roadMap.value=value;void navigateTo({query:{...route.query,map:value}},{replace:true})}
const mapName=computed(()=>mapLabel(roadMap.value))
onMounted(()=>{if(route.query.map&&!maps.includes(String(route.query.map) as MapId))void navigateTo({query:{...route.query,map:'tunnel'}},{replace:true})})
function auto(){cruise.value=!cruise.value;scene.value?.setKey('w',cruise.value)}
function cancelAuto(){cruise.value=false;scene.value?.setKey('w',false)}
function resetDrive(){cruise.value=false;scene.value?.setKey('w',false);scene.value?.reset()}
function beginLoading(){clearTimeout(revealTimer);ready.value=false;progress.value=0;error.value='';cruise.value=false}
let revealTimer:ReturnType<typeof setTimeout>|undefined
function finishLoading(){clearTimeout(revealTimer);progress.value=100;}
function retryScene(){beginLoading();retry.value++}
onBeforeUnmount(()=>{clearTimeout(revealTimer);scene.value?.setKey('w',false)})
</script>
<template>
 <div class="drive-page" :aria-busy="!ready&&!error">
  <AtelierHeader />
  <ClientOnly><VehicleScene ref="scene" :key="retry" drive :road-map="roadMap" @loading="beginLoading" @ready="finishLoading" @progress="progress=Math.max(progress,$event)" @speed="speed=$event" @telemetry="telemetry=$event" @brake="cancelAuto" @error="error=$event" /></ClientOnly>
  <div class="drive-title"><small>{{mapName}}</small><h2>{{s.car.value.brand}} {{s.car.value.name}}</h2></div>
  <NuxtLink to="/" class="drive-exit outline">{{t('ВЫЙТИ','EXIT')}} ↗</NuxtLink>
  <SceneLoading @complete="ready=true" :active="!ready" :progress="progress" :title="mapName" :vehicle="s.car.value.brand+' '+s.car.value.name" :error="error" @retry="retryScene" />
  <div v-if="error" class="error-panel"><p>{{t('Не удалось запустить сцену:','Scene could not initialize:')}} {{error}}</p><button class="outline" @click="retryScene">{{t('ПОВТОРИТЬ','RETRY')}}</button></div>
  <dialog ref="mapDialog" class="drive-map-dialog">
   <div class="map-dialog-heading"><h2>{{t('Выбрать карту','Choose map')}}</h2><button aria-label="Закрыть" @click="mapDialog?.close()">×</button></div>
   <div class="drive-map-options"><button v-for="id in maps" :key="id" :class="{selected:id===roadMap}" @click="chooseMap(id)"><strong>{{mapLabel(id)}}</strong><small>{{id==='mountain'?t('Утро · склон слева · долина справа','Morning · mountain slope · open valley'):id==='winter'?t('Зимняя ночь · снежные горы','Winter night · snowy mountains'):t('Прямая дорога','Straight road')}}</small></button></div>
  </dialog>
  <div v-show="ready" class="drive-hud"><strong>{{String(speed).padStart(3,'0')}}</strong><small>{{t('КМ/Ч','KM/H')}}</small><div class="rpm"><i :style="{width:Math.min(100,telemetry.rpm/8500*100)+'%'}"/></div><small>{{t('ПЕРЕДАЧА','GEAR')}} {{gear}}</small></div>
  <div v-show="ready" class="drive-controls">
   <div class="drive-hints">W / ↑ {{t('ГАЗ','ACCELERATE')}} · S / ↓ {{t('ТОРМОЗ','BRAKE')}} · A / D {{t('ПОЛОСА','LANE')}}<br>{{t('ПЕРЕТАСКИВАНИЕ — ОСМОТР','DRAG TO LOOK AROUND')}} · C {{t('КАМЕРА','CAMERA')}}</div>
   <div class="drive-button-grid">
    <button :aria-pressed="cruise" @click="auto">{{cruise?t('ОСТАНОВИТЬ РАЗГОН','STOP ACCELERATING'):t('АВТОРАЗГОН','AUTO ACCELERATE')}}</button>
    <button :aria-pressed="s.engine.value" @click="s.engine.value=!s.engine.value">{{s.engine.value?t('ВЫКЛЮЧИТЬ МОТОР','MUTE ENGINE'):t('ЗВУК МОТОРА','ENGINE SOUND')}}</button>
    <button v-if="[0,3,8].includes(s.car.value.shape)" :aria-pressed="s.windowsDown.value" @click="s.windowsDown.value=!s.windowsDown.value">{{s.windowsDown.value?t('ПОДНЯТЬ ОКНА','RAISE WINDOWS'):t('ОПУСТИТЬ ОКНА','LOWER WINDOWS')}}</button>
    <button @click="scene?.cycleCamera()">{{t('КАМЕРА','CAMERA')}}</button>
    <button @click="mapDialog?.showModal()">{{t('СМЕНИТЬ КАРТУ','CHANGE MAP')}}</button>
    <button @click="resetDrive">{{t('СБРОС','RESET')}}</button>
   </div>
   <div class="drive-light-grid">
    <button :aria-pressed="s.headlights.value" @click="s.headlights.value=!s.headlights.value"><ActionIcon kind="lamp"/><span>{{t('Передние фары','Headlights')}}<small>{{s.headlights.value?t('Включены','On'):t('Выключены','Off')}}</small></span><i/></button>
    <button :aria-pressed="s.taillights.value" @click="s.taillights.value=!s.taillights.value"><ActionIcon kind="lamp"/><span>{{t('Задние фонари','Taillights')}}<small>{{s.taillights.value?t('Включены','On'):t('Выключены','Off')}}</small></span><i/></button>
   </div>
   <small v-if="s.car.value.id==='tourbillon'" class="engine-credit">{{t('Запись Bugatti · пользовательский звук','Bugatti · user recording')}}</small>
   <small v-else-if="[0,1,8].includes(s.car.value.shape)" class="engine-credit"><a href="/audio/CREDITS.html" target="_blank" rel="noopener">{{s.car.value.id==='tourbillon'?t('Запись Bugatti · пользовательский звук','Bugatti · user recording'):s.car.value.id==='gt3'?t('Запись Porsche GT3 RS · источник','Porsche GT3 RS recording · source'):s.car.value.id==='revuelto'?t('Запись V12 · источник','V12 recording · source'):t('Запись Ferrari 458 · источник','Ferrari 458 recording · source')}}</a></small>
  </div>
 </div>
</template>
<style scoped>
.drive-controls{width:292px;max-width:calc(100vw - 32px);bottom:24px;padding:11px;border:1px solid #ffffff20;background:linear-gradient(145deg,#17201ef2,#101513ed);box-shadow:0 12px 40px #0004;backdrop-filter:blur(16px)}
.drive-controls .drive-hints{font-size:9px;line-height:1.6;margin-bottom:7px}
.drive-controls .drive-button-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;opacity:1}
.drive-controls button{width:100%;min-width:0;min-height:34px;margin:0;padding:7px 6px;border-radius:8px;border:1px solid #ffffff25;font-size:10px;line-height:1.4;background:#ffffff04;transition:background .2s,border-color .2s,color .2s}
.drive-controls button[aria-pressed=true]{border-color:#d9ec8a80;color:var(--accent);background:#d9ec8a10}
.drive-controls button:hover{background:#ffffff0d;border-color:#ffffff55}
.drive-controls button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.drive-light-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:8px;padding-top:8px;border-top:1px solid #ffffff15}
.drive-light-grid button{display:flex;align-items:center;gap:6px;text-align:left;text-transform:none}
.drive-light-grid svg{width:17px;height:17px;flex-shrink:0}
.drive-light-grid span{flex:1}.drive-light-grid small{display:block;margin-top:3px;font-size:9px;opacity:.55}
.drive-light-grid i{width:5px;height:5px;border-radius:50%;background:#ffffff35}
.drive-light-grid [aria-pressed=true] i{background:var(--accent);box-shadow:0 0 8px #d9ec8a55}
.engine-credit{display:block;margin-top:6px;font-size:8px}
.drive-map-dialog{width:min(620px,92vw);max-height:85svh;overflow:auto;padding:24px;border:1px solid #ffffff24;border-radius:18px;background:#101613;color:#edf0e7;box-shadow:0 30px 100px #0009}
.drive-map-dialog::backdrop{background:#030805b8;backdrop-filter:blur(10px)}
.map-dialog-heading{display:flex;justify-content:space-between;align-items:start}.map-dialog-heading h2{font-size:27px;letter-spacing:-.5px;margin:14px 0 24px}.map-dialog-heading>button{font-size:25px;width:32px;height:32px}
.drive-map-options{display:grid;grid-template-columns:1fr 1fr;gap:14px}.drive-map-options>button{border:1px solid #ffffff24;border-radius:12px;padding:8px;text-align:left;background:#ffffff03}.drive-map-options>button.selected{border-color:#d9ec8a90}
.drive-map-options strong,.drive-map-options small,.drive-map-options b{display:block;margin:14px 8px}.drive-map-options strong{font-size:17px;font-weight:500}.drive-map-options small{font-size:9px;letter-spacing:.5px}.drive-map-options b{font-size:9px;color:#d9ec8a;letter-spacing:1px}
@media(max-width:650px){.drive-controls{left:16px;bottom:18px;width:244px;padding:9px}.drive-controls .drive-hints{font-size:8px}.drive-controls button{font-size:9px;min-height:32px}.drive-hud{bottom:250px;right:16px}.drive-map-dialog{padding:18px}.drive-map-options{gap:8px}.map-preview{height:100px}.drive-map-options strong{font-size:14px}.drive-map-options small{font-size:8px}.drive-map-options b{font-size:8px}}

</style>


