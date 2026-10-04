<script setup lang="ts">
const {t}=useLocale();const s=useAtelier(),route=useRoute(),speed=ref(0),telemetry=ref({gear:1,rpm:900}),ready=ref(false),progress=ref(0),error=ref(''),cruise=ref(false),scene=ref<any>(),retry=ref(0)
s.select(String(route.params.car));const gear=computed(()=>telemetry.value.gear)
const roadMap=useState<'italy'|'night'>('drive-map-'+s.car.value.id,()=>s.car.value.shape===0?'italy':'night')
const mapDialog=ref<HTMLDialogElement>(),mapButton=ref<HTMLButtonElement>()
const mapName=computed(()=>roadMap.value==='italy'?t('Италия · Рим','Italy · Rome'):t('Ночная дорога','Night road'))
function auto(){cruise.value=!cruise.value;scene.value?.setKey('w',cruise.value)}
function resetDrive(){cruise.value=false;scene.value?.setKey('w',false);scene.value?.reset()}
function beginLoading(){ready.value=false;progress.value=0;error.value='';cruise.value=false}
function openMaps(){scene.value?.setPaused(true);mapDialog.value?.showModal()}
function onMapClose(){scene.value?.setPaused(false);scene.value?.setKey('w',cruise.value);mapButton.value?.focus()}
function closeMaps(){mapDialog.value?.close()}
function chooseMap(map:'italy'|'night'){closeMaps();if(map===roadMap.value)return;resetDrive();beginLoading();roadMap.value=map}
function retryScene(){beginLoading();retry.value++}
onBeforeUnmount(()=>scene.value?.setKey('w',false))
</script>
<template>
 <div class="drive-page" :aria-busy="!ready&&!error">
  <AtelierHeader />
  <ClientOnly><VehicleScene ref="scene" :key="retry" drive :road-map="roadMap" @loading="beginLoading" @ready="ready=true" @progress="progress=Math.max(progress,$event)" @speed="speed=$event" @telemetry="telemetry=$event" @error="error=$event" /></ClientOnly>
  <div class="drive-title"><small>{{mapName}}</small><h2>{{s.car.value.brand}} {{s.car.value.name}}</h2></div>
  <NuxtLink to="/" class="drive-exit outline">{{t('ВЫЙТИ','EXIT')}} ↗</NuxtLink>
  <Transition name="drive-reveal">
   <div v-if="!ready&&!error" class="drive-loading" role="status" aria-live="polite">
    <div class="drive-load-orbit" aria-hidden="true"><i/><i/><i/></div>
    <small>VELOCITY / {{t('В ДВИЖЕНИИ','IN MOTION')}}</small>
    <h2>{{mapName}}</h2>
    <p>{{s.car.value.brand}} {{s.car.value.name}}</p>
    <div class="drive-load-track" role="progressbar" :aria-label="t('Загрузка карты','Loading map')" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100"><i :style="{width:progress+'%'}"/></div>
    <div class="drive-load-status"><span>{{progress<65?t('Подготовка автомобиля и карты','Preparing vehicle and map'):progress<90?t('Загрузка деталей и текстур','Loading details and textures'):t('Настройка света и отражений','Preparing light and reflections')}}</span><b>{{progress}}<small>%</small></b></div>
   </div>
  </Transition>
  <div v-if="error" class="error-panel"><p>{{t('Не удалось запустить сцену:','Scene could not initialize:')}} {{error}}</p><button class="outline" @click="retryScene">{{t('ПОВТОРИТЬ','RETRY')}}</button></div>
  <div v-show="ready" class="drive-hud"><strong>{{String(speed).padStart(3,'0')}}</strong><small>{{t('КМ/Ч','KM/H')}}</small><div class="rpm"><i :style="{width:Math.min(100,telemetry.rpm/8500*100)+'%'}"/></div><small>{{t('ПЕРЕДАЧА','GEAR')}} {{gear}}</small></div>
  <div v-show="ready" class="drive-controls">
   <div class="drive-hints">W / ↑ {{t('ГАЗ','ACCELERATE')}} · S / ↓ {{t('ТОРМОЗ','BRAKE')}} · SPACE {{t('ТОРМОЗ','BRAKE')}}<br>{{t('ПЕРЕТАСКИВАНИЕ — ОСМОТР','DRAG TO LOOK AROUND')}} · C {{t('КАМЕРА','CAMERA')}}</div>
   <div class="drive-button-grid">
    <button :aria-pressed="cruise" @click="auto">{{cruise?t('ОСТАНОВИТЬ РАЗГОН','STOP ACCELERATING'):t('АВТОРАЗГОН','AUTO ACCELERATE')}}</button>
    <button :aria-pressed="s.engine.value" @click="s.engine.value=!s.engine.value">{{s.engine.value?t('ВЫКЛЮЧИТЬ МОТОР','MUTE ENGINE'):t('ЗВУК МОТОРА','ENGINE SOUND')}}</button>
    <button v-if="[0,8].includes(s.car.value.shape)" :aria-pressed="s.windowsDown.value" @click="s.windowsDown.value=!s.windowsDown.value">{{s.windowsDown.value?t('ПОДНЯТЬ ОКНА','RAISE WINDOWS'):t('ОПУСТИТЬ ОКНА','LOWER WINDOWS')}}</button>
    <button @click="scene?.cycleCamera()">{{t('КАМЕРА','CAMERA')}}</button>
    <button ref="mapButton" aria-haspopup="dialog" @click="openMaps">{{t('СМЕНИТЬ КАРТУ','CHANGE MAP')}}</button>
    <button @click="resetDrive">{{t('СБРОС','RESET')}}</button>
   </div>
   <small v-if="s.car.value.shape===8" class="engine-credit"><a href="/audio/CREDITS.html" target="_blank" rel="noopener">{{t('Запись Ferrari 458 · источник','Ferrari 458 recording · source')}}</a></small>
  </div>
  <dialog ref="mapDialog" class="drive-map-dialog" aria-labelledby="map-heading" @close="onMapClose">
   <div class="map-dialog-heading"><div><small>VELOCITY / {{t('МАРШРУТЫ','ROUTES')}}</small><h2 id="map-heading">{{t('Выберите карту','Choose a map')}}</h2></div><button :aria-label="t('Закрыть','Close')" @click="closeMaps">×</button></div>
   <div class="drive-map-options">
    <button :class="{selected:roadMap==='italy'}" :aria-pressed="roadMap==='italy'" @click="chooseMap('italy')"><div class="map-preview map-preview-city" aria-hidden="true"><i/><i/><i/><span/></div><strong>{{t('Италия · Рим','Italy · Rome')}}</strong><small>{{t('Тихая улица · ясный день','Quiet streets · clear daylight')}}</small><b>{{roadMap==='italy'?t('ВЫБРАНО','SELECTED'):t('ВЫБРАТЬ →','SELECT →')}}</b></button>
    <button :class="{selected:roadMap==='night'}" :aria-pressed="roadMap==='night'" @click="chooseMap('night')"><div class="map-preview map-preview-night" aria-hidden="true"><i/><i/><i/><span/></div><strong>{{t('Ночная дорога','Night road')}}</strong><small>{{t('Тёмный фон · свет фонарей','Dark backdrop · overhead lights')}}</small><b>{{roadMap==='night'?t('ВЫБРАНО','SELECTED'):t('ВЫБРАТЬ →','SELECT →')}}</b></button>
   </div>
  </dialog>
 </div>
</template>
<style scoped>
.drive-controls{width:340px;max-width:calc(100vw - 32px);bottom:35px;padding:14px}
.drive-controls .drive-hints{font-size:9px;line-height:1.8;margin-bottom:10px}
.drive-controls .drive-button-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;opacity:1}
.drive-controls button{width:100%;min-width:0;min-height:43px;margin:0;padding:10px 6px;font-size:10px;line-height:1.4;background:#ffffff04;transition:background .2s,border-color .2s}
.drive-controls button[aria-pressed=true]{border-color:#d9ec8a80;color:var(--accent);background:#d9ec8a10}
.engine-credit{display:block;margin-top:8px;font-size:8px}
.drive-loading{position:fixed;inset:0;z-index:70;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 38%,#202922,#060a08 64%);text-align:center;overflow:hidden}
.drive-loading>small{color:#c7d0bd;letter-spacing:4px;margin-top:30px}
.drive-loading h2{font-size:clamp(32px,5vw,60px);letter-spacing:-1px;margin:18px 0 12px}
.drive-loading p{font-size:12px;color:#9aa693;margin:0 0 32px}
.drive-load-orbit{position:relative;width:110px;height:110px;border:1px solid #d9ec8a18;border-radius:50%}
.drive-load-orbit i{position:absolute;inset:9px;border:1px solid #d9ec8a22;border-top-color:#d9ec8a;border-radius:50%;animation:load-orbit 3s linear infinite}
.drive-load-orbit i:nth-child(2){inset:25px;animation-direction:reverse;animation-duration:4s}
.drive-load-orbit i:nth-child(3){inset:44px;border:0;background:#d9ec8a;box-shadow:0 0 28px #d9ec8a55;animation:none}
.drive-load-track{height:2px;width:min(360px,76vw);background:#d9ec8a20;overflow:hidden}
.drive-load-track i{display:block;height:100%;background:#d9ec8a;transition:width .6s ease}
.drive-load-status{display:flex;align-items:center;justify-content:space-between;width:min(360px,76vw);margin-top:16px;font-size:10px;color:#9aa693;gap:15px;text-align:left}
.drive-load-status b{font-size:24px;font-weight:400;color:#e9efdf}.drive-load-status b small{margin-left:3px}
.drive-reveal-leave-active{transition:opacity .7s ease}.drive-reveal-leave-to{opacity:0;pointer-events:none}
.drive-map-dialog{width:min(620px,92vw);max-height:85svh;overflow:auto;padding:24px;border:1px solid #ffffff24;border-radius:18px;background:#101613;color:#edf0e7;box-shadow:0 30px 100px #0009}
.drive-map-dialog::backdrop{background:#030805b8;backdrop-filter:blur(10px)}
.map-dialog-heading{display:flex;justify-content:space-between;align-items:start}.map-dialog-heading h2{font-size:27px;letter-spacing:-.5px;margin:14px 0 24px}.map-dialog-heading>button{font-size:25px;width:32px;height:32px}
.drive-map-options{display:grid;grid-template-columns:1fr 1fr;gap:14px}.drive-map-options>button{border:1px solid #ffffff24;border-radius:12px;padding:8px;text-align:left;background:#ffffff03}.drive-map-options>button.selected{border-color:#d9ec8a90}
.drive-map-options strong,.drive-map-options small,.drive-map-options b{display:block;margin:14px 8px}.drive-map-options strong{font-size:17px;font-weight:500}.drive-map-options small{font-size:9px;letter-spacing:.5px}.drive-map-options b{font-size:9px;color:#d9ec8a;letter-spacing:1px}
.map-preview{height:135px;position:relative;border-radius:7px;overflow:hidden}.map-preview-city{background:linear-gradient(#94c9e5,#e4eff2 58%,#c4bda8 59%)}.map-preview-city i{position:absolute;bottom:31%;left:4%;width:24%;height:60%;background:repeating-linear-gradient(90deg,transparent 0 13px,#333f3d 14px 19px,transparent 20px 28px),#b88767;box-shadow:inset 0 -5px #86725d}.map-preview-city i:nth-child(2){left:30%;height:42%;background-color:#dbceb0}.map-preview-city i:nth-child(3){left:68%;height:70%;background-color:#899780}
.map-preview span{position:absolute;bottom:-25px;left:15%;width:70%;height:70px;background:#343734;transform:perspective(60px) rotateX(30deg)}.map-preview span:after{content:'';position:absolute;left:50%;top:0;height:100%;border-left:2px dashed #c4cab8}
.map-preview-night{background:radial-gradient(ellipse at 50% 100%,#253038,#040707 80%)}.map-preview-night i{position:absolute;top:20%;left:18%;width:14%;height:3px;background:#e8f2ed;box-shadow:0 0 20px #d8e9e4}.map-preview-night i:nth-child(2){left:43%;top:35%;width:12%}.map-preview-night i:nth-child(3){left:68%;top:20%}
@keyframes load-orbit{to{transform:rotate(360deg)}}
@media(max-width:650px){.drive-controls{left:16px;bottom:18px;width:260px;padding:10px}.drive-controls .drive-hints{font-size:8px}.drive-controls button{font-size:9px;min-height:39px}.drive-hud{bottom:220px;right:16px}.drive-map-dialog{padding:18px}.drive-map-options{gap:8px}.map-preview{height:100px}.drive-map-options strong{font-size:14px}.drive-map-options small{font-size:8px}.drive-map-options b{font-size:8px}}
@media(prefers-reduced-motion:reduce){.drive-load-orbit i{animation:none}.drive-reveal-leave-active,.drive-load-track i{transition:none}}
</style>
