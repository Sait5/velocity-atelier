<script setup lang="ts">
import {paints,upholsteryColors,backgrounds,lightPresets,interiorDetails} from '~/data/finishes'
const s=useAtelier(),audio=useAudio(),{t}=useLocale(),ready=ref(false),progress=ref(0),error=ref(''),tab=ref('paint'),viewer=ref(0),cabinFinishes=ref(false)
const vehicleScene=ref<{playIntro:()=>void,stopIntro:()=>void}>(),introPlaying=ref(false)
function revealScene(){ready.value=true}
function startIntro(){vehicleScene.value?.playIntro()}
s.background.value='#030505';s.environment.value='studio';s.lighting.value='Studio'
const requestedCar=useRoute().query.car;if(typeof requestedCar==='string')s.select(requestedCar)
const tabs=[{id:'paint',ru:'Кузов',en:'Paint'},{id:'interior',ru:'Салон',en:'Interior'},{id:'environment',ru:'Окружение',en:'Environment'},{id:'details',ru:'Детали',en:'Details'}]
const paintZone=ref<'primary'|'secondary'>('primary')
const selectedPaint=computed({get:()=>s.car.value.id==='tourbillon'&&paintZone.value==='secondary'?s.secondaryPaint.value:s.paint.value,set:(v:string)=>{if(s.car.value.id==='tourbillon'&&paintZone.value==='secondary')s.secondaryPaint.value=v;else s.paint.value=v}})
const paintName=computed(()=>{const p=paints.find(p=>p.hex===selectedPaint.value);return p?t(p.ru,p.en):t('Индивидуальный цвет','Custom finish')})
const upholsteryName=computed(()=>{const p=upholsteryColors.find(p=>p.hex===s.upholstery.value);return p?t(p.ru,p.en):t('Графит','Graphite')})
const detail=computed(()=>{const d=interiorDetails.find(d=>d.id===s.detail.value);if(s.car.value.id!=='gt3'||!d)return d;return d.id==='instruments'?{...d,ruText:'Цифровая приборная панель исходной модели GT3. Скорость и передача во время поездки показаны в интерфейсе.',enText:'The GT3 model’s digital instrument panel. Live speed and gear are shown in the driving interface.'}:d.id==='steering'?{...d,ruText:'Спортивный руль Porsche с центральной эмблемой и кнопками управления.',enText:'Porsche sport steering wheel with its central crest and integrated controls.'}:d})
watch(()=>s.interior.value,v=>{document.body.style.overflow=v?'hidden':'';cabinFinishes.value=false;if(v)tab.value='interior';else s.detail.value=''})
onBeforeUnmount(()=>{document.body.style.overflow='';s.interior.value=false;audio.stop()})
function action(fn:()=>void){fn();audio.click()}
async function focus(id:string){s.focus.value='';await nextTick();s.focus.value=id}
async function inspect(id:string){s.detail.value='';await nextTick();s.detail.value=id}
let revealTimer:ReturnType<typeof setTimeout>|undefined
function finishLoading(){clearTimeout(revealTimer);progress.value=100;}
watch(()=>s.car.value.id,()=>{clearTimeout(revealTimer);ready.value=false;progress.value=0})
onBeforeUnmount(()=>clearTimeout(revealTimer))
function retry(){clearTimeout(revealTimer);error.value='';ready.value=false;progress.value=0;viewer.value++}
</script>
<template><div class="experience" :class="{'in-cockpit':s.interior.value,'cabin-finishes':cabinFinishes,'intro-playing':introPlaying}"><AtelierHeader />
 <div class="scene-wrap"><ClientOnly><VehicleScene ref="vehicleScene" @intro="introPlaying=$event" :key="viewer" @ready="finishLoading" @progress="progress=$event; if($event<100)ready=false" @error="error=$event" /></ClientOnly><div class="scene-shade" /></div>
 <SceneLoading @complete="revealScene" @revealed="startIntro" :active="!ready" :progress="progress" :title="s.car.value.name" :vehicle="s.car.value.brand+' / '+t('ШОУРУМ','SHOWROOM')" :error="error" @retry="retry" />
 <button v-if="introPlaying" class="intro-skip" @click="vehicleScene?.stopIntro()">{{t('ПРОПУСТИТЬ ОСМОТР','SKIP INTRO')}} →</button>
 <main><section class="hero"><div class="hero-heading"><h1>{{s.car.value.name.toUpperCase()}}</h1></div>
 <div class="hero-bottom"><div class="hero-specs"><div><strong>{{s.car.value.power}}<small>{{t('Л.С.','CV')}}</small></strong><span>{{t('МОЩНОСТЬ','POWER')}}</span></div><div><strong>{{s.car.value.accel}}<small>{{t('С','S')}}</small></strong><span>{{t('0—100 КМ/Ч','0—100 KM/H')}}</span></div><div><strong>{{s.car.value.speed}}<small>{{t('КМ/Ч','KM/H')}}</small></strong><span>{{t('МАКС. СКОРОСТЬ','TOP SPEED')}}</span></div></div><a href="#showroom" class="accent-button">{{t('ОТКРЫТЬ КОНФИГУРАТОР','ENTER SHOWROOM')}} <span>↗</span></a></div><div class="hero-foot"><a href="#showroom">↓ <span>{{t('К ВЫБОРУ ОТДЕЛКИ','EXPLORE THE FINISHES')}}</span></a><span>{{t('ПЕРЕТАЩИТЕ — ПОВОРОТ','DRAG TO ROTATE')}} <b>↔</b> {{t('КОЛЕСО — МАСШТАБ','WHEEL TO ZOOM')}}</span></div></section>
 <section id="showroom" class="showroom"><div class="configurator"><div class="config-heading"><span>{{s.car.value.name.toUpperCase()}} / {{t('КОНФИГУРАТОР','CONFIGURATOR')}}</span><span>↗</span></div><div class="config-tabs" role="tablist"><button v-for="item in tabs" :id="'tab-'+item.id" role="tab" :aria-selected="tab===item.id" :aria-controls="'panel-'+item.id" :class="{active:tab===item.id}" @click="tab=item.id">{{t(item.ru,item.en)}}</button></div><div class="config-content" role="tabpanel" :id="'panel-'+tab" :aria-labelledby="'tab-'+tab">
 <template v-if="tab==='paint'"><div v-if="s.car.value.id==='tourbillon'" class="option-buttons" role="group" :aria-label="t('Зона окраски Bugatti','Bugatti paint zone')"><button :aria-pressed="paintZone==='primary'" @click="paintZone='primary'">{{t('Основной цвет','Primary color')}}</button><button :aria-pressed="paintZone==='secondary'" @click="paintZone='secondary'">{{t('Второй цвет','Secondary color')}}</button></div><div class="swatches paint-swatches"><button v-for="p in paints" :aria-label="t(p.ru,p.en)" :title="t(p.ru,p.en)" :aria-pressed="selectedPaint===p.hex" :class="{selected:selectedPaint===p.hex}" :style="{'--swatch':p.hex}" @click="action(()=>selectedPaint=p.hex)" /></div><div class="selection-label"><span>{{paintName}}</span><small>{{t('МЕТАЛЛИК','METALLIC FINISH')}}</small></div><div v-if="s.car.value.id==='gt3'" class="rim-picker" role="group" :aria-label="t('Цвет дисков','Wheel finish')"><small>{{t('ДИСКИ','WHEELS')}}</small><button v-for="finish in [{hex:'#151719',ru:'Чёрный',en:'Black'},{hex:'#f2f2ee',ru:'Белый',en:'White'}] as const" :aria-pressed="s.porscheRim.value===finish.hex" @click="action(()=>s.porscheRim.value=finish.hex)"><i :style="{background:finish.hex}"/>{{t(finish.ru,finish.en)}}</button></div></template>
 <template v-else-if="tab==='interior'"><small class="field-caption">{{t('ЦВЕТ ОБИВКИ','UPHOLSTERY FINISH')}}</small><div class="swatches"><button v-for="p in upholsteryColors" :aria-label="t('Обивка: '+p.ru,'Upholstery: '+p.en)" :title="t(p.ru,p.en)" :aria-pressed="s.upholstery.value===p.hex" :class="{selected:s.upholstery.value===p.hex}" :style="{'--swatch':p.hex}" @click="action(()=>s.upholstery.value=p.hex)" /></div><div class="selection-label"><span>{{upholsteryName}}</span><small>{{t('КОЖА','LEATHER')}}</small></div></template>
 <template v-else-if="tab==='environment'"><small class="field-caption">{{t('ЦВЕТ ОКРУЖЕНИЯ','BACKGROUND COLOR')}}</small><div class="swatches background-swatches"><button v-for="p in backgrounds" :aria-label="t('Фон: '+p.ru,'Background: '+p.en)" :title="t(p.ru,p.en)" :aria-pressed="s.background.value===p.hex" :class="{selected:s.background.value===p.hex}" :style="{'--swatch':p.hex}" @click="action(()=>{s.environment.value='studio';s.background.value=p.hex})" /></div><div class="scene-toggles"><label class="light-option"><input type="checkbox" v-model="s.rotateLighting.value">{{t('Вращение света','Rotate lighting')}}</label><label class="light-option"><input type="checkbox" v-model="s.studioGrid.value">{{t('Сетка студии','Studio grid')}}</label></div><small class="field-caption">{{t('СВЕТОВАЯ СХЕМА','LIGHTING')}}</small><div class="option-buttons"><button v-for="l in lightPresets" :class="{active:s.lighting.value===l.id}" :aria-pressed="s.lighting.value===l.id" @click="action(()=>s.lighting.value=l.id)">{{t(l.ru,l.en)}}</button></div></template>
 <template v-else><label class="brake-color">{{t('Цвет суппортов','Brake caliper color')}}<input type="color" v-model="s.brakes.value"></label><div class="option-buttons"><button @click="action(()=>{s.interior.value=false;focus('wheel')})">{{t('Колёса и тормоза','Wheels & brakes')}}</button><button @click="action(()=>{s.interior.value=false;focus('rear')})">{{t('Задняя оптика','Rear lights')}}</button></div></template>
 </div><div class="vehicle-actions"><small class="action-caption">{{t('ДВЕРИ','DOORS')}}</small>
 <button v-for="side in ['left','right'] as const" class="vehicle-action" :aria-pressed="side==='left'?s.leftDoor.value:s.rightDoor.value" @click="side==='left'?s.leftDoor.value=!s.leftDoor.value:s.rightDoor.value=!s.rightDoor.value"><ActionIcon kind="door"/><span>{{side==='left'?t('Левая дверь','Left door'):t('Правая дверь','Right door')}}</span></button>
 <button class="vehicle-action all-doors-action" :aria-pressed="s.leftDoor.value&&s.rightDoor.value" @click="s.setDoors(!(s.leftDoor.value&&s.rightDoor.value))"><ActionIcon kind="door"/><span>{{s.leftDoor.value&&s.rightDoor.value?t('Закрыть все двери','Close all doors'):t('Открыть все двери','Open all doors')}}</span></button>
 <small class="action-caption">{{t('СТЁКЛА И САЛОН','WINDOWS & CABIN')}}</small><button v-if="[0,1,3,8].includes(s.car.value.shape)" class="vehicle-action window-action" :aria-pressed="s.windowsDown.value" @click="s.windowsDown.value=!s.windowsDown.value"><ActionIcon kind="window"/><span>{{s.windowsDown.value?t('Поднять окна','Raise windows'):t('Опустить окна','Lower windows')}}</span><b>{{s.windowsDown.value?'↑':'↓'}}</b></button><button class="vehicle-action enter-action" @click="action(()=>s.interior.value=true)"><ActionIcon kind="seat"/><span>{{t('В салон','Enter cabin')}}</span><b>↗</b></button>
 <small class="action-caption">{{t('ОСВЕЩЕНИЕ','LIGHTS')}}</small><button class="vehicle-action lamp-action" :class="{active:s.headlights.value}" :aria-pressed="s.headlights.value" :aria-label="t('Передние фары','Headlights')" @click="s.headlights.value=!s.headlights.value"><ActionIcon kind="lamp"/><span>{{t('Передние','Front lights')}}</span><i/></button>
 <button class="vehicle-action lamp-action" :class="{active:s.taillights.value}" :aria-pressed="s.taillights.value" :aria-label="t('Задние фонари','Tail lights')" @click="s.taillights.value=!s.taillights.value"><ActionIcon kind="lamp"/><span>{{t('Задние','Rear lights')}}</span><i/></button>
 </div></div>
 </section></main>
 <div v-if="s.interior.value" class="cockpit-ui"><div class="cockpit-title"><small>{{t('МЕСТО ВОДИТЕЛЯ','DRIVER’S SEAT')}}</small><h3>{{s.car.value.name}}</h3><p>{{t('Перетаскивайте, чтобы осмотреться','Drag to look around')}}</p></div><div class="cockpit-toolbar"><button class="outline" :aria-pressed="s.doors.value" @click="s.setDoors(!(s.leftDoor.value||s.rightDoor.value))"><ActionIcon kind="door"/>{{(s.leftDoor.value||s.rightDoor.value)?t('Закрыть двери','Close doors'):t('Открыть двери','Open doors')}}</button><button v-if="[0,1,3,8].includes(s.car.value.shape)" class="outline" :aria-pressed="s.windowsDown.value" @click="s.windowsDown.value=!s.windowsDown.value">▱ {{s.windowsDown.value?t('Поднять окна','Raise windows'):t('Опустить окна','Lower windows')}}</button><button class="outline" @click="cabinFinishes=!cabinFinishes">{{t('ОТДЕЛКА САЛОНА','UPHOLSTERY')}}</button><button class="outline" @click="s.interior.value=false">{{t('ВЫЙТИ','EXIT')}} ↗</button></div><div class="hotspots"><button v-for="d in interiorDetails" :class="{active:s.detail.value===d.id}" @click="inspect(d.id)">+ {{t(d.ru,d.en)}}</button><div v-if="detail" class="hotspot-card"><button @click="s.detail.value=''" :aria-label="t('Закрыть описание','Close detail')">×</button><h3>{{t(detail.ru,detail.en)}}</h3><p>{{t(detail.ruText,detail.enText)}}</p></div></div></div>
 <footer><span class="wordmark">VELOCITY 3</span><NuxtLink to="/garage">{{t('ГАРАЖ / 08','GARAGE / 08')}} ↗</NuxtLink><small><a v-if="s.car.value.shape===0" href="https://sketchfab.com/3d-models/lamborghini-revuelto-099b60042519463ead19ce054d479724" target="_blank" rel="noopener">Lamborghini Revuelto · Anatolian Studios</a><a v-else-if="s.car.value.id==='gt3'" href="https://sketchfab.com/3d-models/2025-porsche-911-gt3-992-2-1503f8d08f154ec7ab52f95a99c55134" target="_blank" rel="noopener">Porsche 911 GT3 · Ddiaz Design</a><a v-else-if="s.car.value.id==='tourbillon'" href="https://sketchfab.com/3d-models/2026-bugatti-tourbillon-4f63f5a74611477989cefd9861b9784a" target="_blank" rel="noopener">Bugatti Tourbillon · Ddiaz Design</a><a v-else href="https://sketchfab.com/3d-models/2011-ferrari-458-italia-bb6c7fa565c04ec59cd9d0e0a4d0098c" target="_blank" rel="noopener">Ferrari 458 Italia · Ddiaz Design</a><br>{{['gt3','tourbillon'].includes(s.car.value.id)?'CC BY-NC-SA 4.0':'CC BY 4.0'}} · {{t('Независимый проект','Independent experience')}}</small><NuxtLink to="/legal">{{t('Лицензии и авторы','Legal & credits')}}</NuxtLink><a href="#">{{t('НАВЕРХ','BACK TO TOP')}} ↑</a></footer>
</div></template>


<style scoped>
.experience main,.experience footer{transition:opacity .45s ease}
.intro-playing main,.intro-playing footer{visibility:hidden;opacity:0}
.swatches{flex-wrap:wrap;row-gap:18px}
.swatches button{flex:0 0 25px;aspect-ratio:1}
.paint-swatches button{background:linear-gradient(135deg,#ffffff70,transparent 32%,#00000045 78%),var(--swatch);box-shadow:inset 0 1px 3px #ffffff55,inset 0 -2px 4px #0005}
.intro-skip{position:fixed;z-index:50;right:30px;bottom:95px;padding:12px 18px;background:#10151bdd;border:1px solid #ffffff40;border-radius:30px;font-size:10px;letter-spacing:1px;backdrop-filter:blur(12px)}

.action-caption{grid-column:1/-1;font-size:8px;letter-spacing:1.5px;color:#98a69e;padding:5px 2px 0}
.vehicle-actions{gap:6px;padding:10px 12px 12px}
.vehicle-action{min-height:36px;padding:8px 9px;font-size:10px;transition:background .18s,border-color .18s,transform .18s,color .18s}
.vehicle-action svg{width:17px;height:17px}
.vehicle-action:active{transform:scale(.97)}
.vehicle-action:focus-visible,.rim-picker button:focus-visible{outline:2px solid #d9ec8a;outline-offset:2px}
.vehicle-action[aria-pressed="true"]{background:#d9ec8a12;color:#dfedb1;border-color:#d9ec8a60}
.all-doors-action{grid-column:1/-1;justify-content:center;min-height:29px;padding:5px}
.window-action{grid-column:auto}
.rim-picker{display:flex;align-items:center;gap:6px;margin-top:15px;padding-top:12px;border-top:1px solid #ffffff12}
.rim-picker small{margin-right:auto;font-size:8px;letter-spacing:1.2px;color:#9ea99f}
.rim-picker button{display:flex;align-items:center;gap:6px;border:1px solid #ffffff20;border-radius:6px;padding:6px 9px;font-size:10px;transition:border-color .18s,background .18s}
.rim-picker button[aria-pressed="true"]{border-color:#d9ec8a80;background:#d9ec8a10;color:#e0edb3}
.rim-picker i{width:12px;height:12px;border:1px solid #ffffff40;border-radius:50%;box-shadow:inset 0 1px 2px #fff5}
@media(max-height:760px) and (min-width:700px){.action-caption{padding-top:1px}.vehicle-action{min-height:32px;padding:6px 8px}.config-content{padding:13px 18px}}
@media(prefers-reduced-motion:reduce){.vehicle-action,.rim-picker button{transition:none}.vehicle-action:active{transform:none}}
</style>

<style scoped>.light-option{display:flex;align-items:center;gap:8px;margin:12px 0;font-size:12px}.brake-color{display:flex;align-items:center;justify-content:space-between;margin:12px 0;font-size:12px}.brake-color input{width:38px;height:28px;border:0;background:none}
.action-caption{grid-column:1/-1;font-size:8px;letter-spacing:1.5px;color:#98a69e;padding:5px 2px 0}
.vehicle-actions{gap:6px;padding:10px 12px 12px}
.vehicle-action{min-height:36px;padding:8px 9px;font-size:10px;transition:background .18s,border-color .18s,transform .18s,color .18s}
.vehicle-action svg{width:17px;height:17px}
.vehicle-action:active{transform:scale(.97)}
.vehicle-action:focus-visible,.rim-picker button:focus-visible{outline:2px solid #d9ec8a;outline-offset:2px}
.vehicle-action[aria-pressed="true"]{background:#d9ec8a12;color:#dfedb1;border-color:#d9ec8a60}
.all-doors-action{grid-column:1/-1;justify-content:center;min-height:29px;padding:5px}
.rim-picker{display:flex;align-items:center;gap:6px;margin-top:15px;padding-top:12px;border-top:1px solid #ffffff12}
.rim-picker small{margin-right:auto;font-size:8px;letter-spacing:1.2px;color:#9ea99f}
.rim-picker button{display:flex;align-items:center;gap:6px;border:1px solid #ffffff20;border-radius:6px;padding:6px 9px;font-size:10px;transition:border-color .18s,background .18s}
.rim-picker button[aria-pressed="true"]{border-color:#d9ec8a80;background:#d9ec8a10;color:#e0edb3}
.rim-picker i{width:12px;height:12px;border:1px solid #ffffff40;border-radius:50%;box-shadow:inset 0 1px 2px #fff5}
@media(max-height:760px) and (min-width:700px){.action-caption{padding-top:1px}.vehicle-action{min-height:32px;padding:6px 8px}.config-content{padding:13px 18px}}
@media(prefers-reduced-motion:reduce){.vehicle-action,.rim-picker button{transition:none}.vehicle-action:active{transform:none}}
</style>

<style scoped>.scene-toggles{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}.scene-toggles .light-option{margin:0;padding:12px 8px;border:1px solid #ffffff28;border-radius:5px;cursor:pointer}.scene-toggles input{accent-color:#c5ce94}
.action-caption{grid-column:1/-1;font-size:8px;letter-spacing:1.5px;color:#98a69e;padding:5px 2px 0}
.vehicle-actions{gap:6px;padding:10px 12px 12px}
.vehicle-action{min-height:36px;padding:8px 9px;font-size:10px;transition:background .18s,border-color .18s,transform .18s,color .18s}
.vehicle-action svg{width:17px;height:17px}
.vehicle-action:active{transform:scale(.97)}
.vehicle-action:focus-visible,.rim-picker button:focus-visible{outline:2px solid #d9ec8a;outline-offset:2px}
.vehicle-action[aria-pressed="true"]{background:#d9ec8a12;color:#dfedb1;border-color:#d9ec8a60}
.all-doors-action{grid-column:1/-1;justify-content:center;min-height:29px;padding:5px}
.rim-picker{display:flex;align-items:center;gap:6px;margin-top:15px;padding-top:12px;border-top:1px solid #ffffff12}
.rim-picker small{margin-right:auto;font-size:8px;letter-spacing:1.2px;color:#9ea99f}
.rim-picker button{display:flex;align-items:center;gap:6px;border:1px solid #ffffff20;border-radius:6px;padding:6px 9px;font-size:10px;transition:border-color .18s,background .18s}
.rim-picker button[aria-pressed="true"]{border-color:#d9ec8a80;background:#d9ec8a10;color:#e0edb3}
.rim-picker i{width:12px;height:12px;border:1px solid #ffffff40;border-radius:50%;box-shadow:inset 0 1px 2px #fff5}
@media(max-height:760px) and (min-width:700px){.action-caption{padding-top:1px}.vehicle-action{min-height:32px;padding:6px 8px}.config-content{padding:13px 18px}}
@media(prefers-reduced-motion:reduce){.vehicle-action,.rim-picker button{transition:none}.vehicle-action:active{transform:none}}
</style>
