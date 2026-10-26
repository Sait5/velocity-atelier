<script setup lang="ts">
// Photo mode: the interface steps aside (html.photo-mode) and the scene stays live and interactive. A side panel sets
// the lens, exposure, colour look, vignette, depth of field, frame and a thirds grid (and, while driving, a stop-frame);
// the shutter saves a PNG straight from the renderer (VehicleScene), cut to the chosen frame. Esc leaves, H hides the panel.
const state=useAtelier(),{t}=useLocale(),route=useRoute()
const p=state.photoSettings
const driving=computed(()=>route.path.startsWith('/drive'))
const panelOpen=ref(true),flash=ref(false),toast=ref('')
const lenses=[0,24,35,50,85]
const looks=[{id:'natural',ru:'Натуральный',en:'Natural'},{id:'warm',ru:'Тёплый',en:'Warm'},{id:'cool',ru:'Холодный',en:'Cool'},{id:'cinema',ru:'Кино',en:'Cinema'},{id:'mono',ru:'Ч/Б',en:'B&W'},{id:'film',ru:'Плёнка',en:'Film'},{id:'golden',ru:'Золотой час',en:'Golden hour'},{id:'noir',ru:'Нуар',en:'Noir'},{id:'vivid',ru:'Сочный',en:'Vivid'}] as const
const blurs=[{id:0,ru:'Выкл.',en:'Off'},{id:1,ru:'Мягко',en:'Soft'},{id:2,ru:'Сильно',en:'Strong'}]
const frames=[{id:'free',ru:'Весь экран',en:'Full'},{id:'16:9',ru:'16:9',en:'16:9'},{id:'2.39:1',ru:'Кино 2.39',en:'Cinema 2.39'},{id:'4:5',ru:'4:5',en:'4:5'},{id:'1:1',ru:'1:1',en:'1:1'},{id:'9:16',ru:'Сторис 9:16',en:'Story 9:16'}] as const
const ratios:Record<string,number>={'16:9':16/9,'2.39:1':2.39,'4:5':.8,'1:1':1,'9:16':9/16}
const ratio=computed(()=>ratios[p.value.frame])
// the frame is drawn over the 3D canvas itself (the saved photo is cut from the canvas), wherever the page puts it
const box=ref({left:0,top:0,width:0,height:0})
function measure(){const canvas=document.querySelector('.vehicle-canvas');if(!canvas)return;const r=canvas.getBoundingClientRect();box.value={left:r.left,top:r.top,width:r.width,height:r.height}}
const boxStyle=computed(()=>({left:box.value.left+'px',top:box.value.top+'px',width:box.value.width+'px',height:box.value.height+'px'}))
const exposureLabel=computed(()=>(p.value.exposure>0?'+':p.value.exposure<0?'−':'±')+Math.abs(p.value.exposure).toFixed(1)+' EV')
function reset(){p.value={lens:0,exposure:0,look:'natural',vignette:.2,grain:0,blur:0,frame:'free',grid:false,freeze:false}}
let flashTimer:ReturnType<typeof setTimeout>|undefined,toastTimer:ReturnType<typeof setTimeout>|undefined
function shoot(){state.photoRequest.value++;flash.value=true;clearTimeout(flashTimer);flashTimer=setTimeout(()=>flash.value=false,180);toast.value=t('Снимок сохранён в загрузки','Photo saved to downloads');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.value='',2600)}
function key(event:KeyboardEvent){if((event.target as HTMLElement)?.tagName==='INPUT')return;if(event.key==='Escape')state.photoMode.value=false;else if(event.code==='KeyH')panelOpen.value=!panelOpen.value}
onMounted(()=>{measure();window.addEventListener('resize',measure);document.documentElement.classList.add('photo-mode');window.addEventListener('keydown',key);if(matchMedia('(max-width:700px)').matches)panelOpen.value=false})
onBeforeUnmount(()=>{window.removeEventListener('resize',measure);document.documentElement.classList.remove('photo-mode');window.removeEventListener('keydown',key);clearTimeout(flashTimer);clearTimeout(toastTimer);p.value.freeze=false})
</script>

<template><div class="photo-studio">
 <div class="photo-canvas" :style="boxStyle"><div v-if="ratio" class="photo-frame" :style="{'--ratio':ratio,'--fit':box.width/Math.max(1,box.height)>ratio?'height':'width'}" :class="box.width/Math.max(1,box.height)>ratio?'fit-height':'fit-width'"><template v-if="p.grid"><i v-for="n in 4" :key="n" class="photo-third" :class="'third-'+n" /></template></div>
 <div v-else-if="p.grid" class="photo-frame photo-frame-full"><i v-for="n in 4" :key="n" class="photo-third" :class="'third-'+n" /></div></div>
 <div class="photo-flash" :class="{on:flash}" />
 <Transition name="photo-panel"><aside v-if="panelOpen" class="photo-panel" :aria-label="t('Настройки снимка','Photo settings')">
  <header><strong>{{t('ФОТОРЕЖИМ','PHOTO MODE')}}</strong><button type="button" class="photo-reset" @click="reset">{{t('Сбросить','Reset')}}</button></header>
  <section><small>{{t('ОБЪЕКТИВ','LENS')}}</small><div class="photo-chips five"><button v-for="lens in lenses" :key="lens" type="button" :aria-pressed="p.lens===lens" @click="p.lens=lens">{{lens?lens+' мм':t('Авто','Auto')}}</button></div></section>
  <section><small>{{t('ЭКСПОЗИЦИЯ','EXPOSURE')}}<b>{{exposureLabel}}</b></small><input v-model.number="p.exposure" type="range" min="-1.5" max="1.5" step="0.1" :aria-label="t('Экспозиция','Exposure')"></section>
  <section><small>{{t('СТИЛЬ','LOOK')}}</small><div class="photo-chips three"><button v-for="look in looks" :key="look.id" type="button" :aria-pressed="p.look===look.id" @click="p.look=look.id">{{t(look.ru,look.en)}}</button></div></section>
  <section><small>{{t('ВИНЬЕТКА','VIGNETTE')}}<b>{{Math.round(p.vignette*100)}}%</b></small><input v-model.number="p.vignette" type="range" min="0" max="0.8" step="0.02" :aria-label="t('Виньетка','Vignette')"></section>
  <section><small>{{t('ЗЕРНО ПЛЁНКИ','FILM GRAIN')}}<b>{{Math.round(p.grain*100)}}%</b></small><input v-model.number="p.grain" type="range" min="0" max="1" step="0.05" :aria-label="t('Зерно плёнки','Film grain')"></section>
  <section><small>{{t('ГЛУБИНА РЕЗКОСТИ','DEPTH OF FIELD')}}</small><div class="photo-chips three"><button v-for="blur in blurs" :key="blur.id" type="button" :aria-pressed="p.blur===blur.id" @click="p.blur=blur.id">{{t(blur.ru,blur.en)}}</button></div></section>
  <section><small>{{t('КАДР','FRAME')}}</small><div class="photo-chips three"><button v-for="frame in frames" :key="frame.id" type="button" :aria-pressed="p.frame===frame.id" @click="p.frame=frame.id">{{t(frame.ru,frame.en)}}</button></div></section>
  <section class="photo-toggles"><label><input v-model="p.grid" type="checkbox">{{t('Сетка третей','Thirds grid')}}</label><label v-if="driving"><input v-model="p.freeze" type="checkbox">{{t('Стоп-кадр','Freeze motion')}}</label></section>
  <p class="photo-hint">{{t('Перетаскивание — ракурс · колесо — масштаб · H — панель · Esc — выход','Drag to frame · wheel to zoom · H panel · Esc leave')}}</p>
 </aside></Transition>
 <div class="photo-dock">
  <button type="button" class="photo-side" @click="state.photoMode.value=false">{{t('ВЫЙТИ','EXIT')}}</button>
  <button type="button" class="photo-shutter" :aria-label="t('Сохранить снимок','Save photo')" @click="shoot"><i /></button>
  <button type="button" class="photo-side" :aria-expanded="panelOpen" @click="panelOpen=!panelOpen">{{panelOpen?t('СКРЫТЬ','HIDE'):t('НАСТРОЙКИ','SETTINGS')}}</button>
 </div>
 <Transition name="photo-toast"><div v-if="toast" class="photo-toast" role="status">{{toast}}</div></Transition>
</div></template>

<style scoped>
.photo-studio{position:fixed;inset:0;z-index:90;pointer-events:none;font-family:Manrope,Arial,sans-serif}
.photo-studio button,.photo-studio input,.photo-studio label{pointer-events:auto}
.photo-canvas{position:absolute;overflow:hidden}
.photo-frame{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);aspect-ratio:var(--ratio);box-shadow:0 0 0 200vmax #000000a8;outline:1px solid #ffffff40}
.photo-frame.fit-height{height:100%}.photo-frame.fit-width{width:100%}
.photo-frame-full{inset:0;transform:none;width:100%;height:100%;box-shadow:none;outline:0}
.photo-third{position:absolute;background:#ffffff38}
.third-1,.third-2{top:0;bottom:0;width:1px}.third-1{left:33.333%}.third-2{left:66.666%}
.third-3,.third-4{left:0;right:0;height:1px}.third-3{top:33.333%}.third-4{top:66.666%}
.photo-flash{position:absolute;inset:0;background:#fff;opacity:0;transition:opacity .35s ease}.photo-flash.on{opacity:.55;transition:none}
.photo-panel{position:absolute;top:24px;right:24px;width:300px;max-height:calc(100vh - 150px);overflow-y:auto;pointer-events:auto;padding:18px 18px 14px;background:#0b100dd9;border:1px solid #ffffff22;border-radius:16px;backdrop-filter:blur(14px);box-shadow:0 18px 50px #0009;color:#e9eee2}
.photo-panel header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.photo-panel header strong{font-family:Barlow Condensed,Arial,sans-serif;font-weight:500;font-size:14px;letter-spacing:3px;color:var(--accent)}
.photo-reset{font-size:11px;color:#a5ae9f;padding:6px 2px}.photo-reset:hover{color:var(--accent)}
.photo-panel section{padding:12px 0;border-top:1px solid #ffffff12}
.photo-panel small{display:flex;justify-content:space-between;align-items:center;font-family:Barlow Condensed,Arial,sans-serif;font-size:10px;letter-spacing:2px;color:#98a293;margin-bottom:9px}
.photo-panel small b{font-family:Manrope,Arial,sans-serif;font-weight:600;font-size:11px;letter-spacing:0;color:#e2e8d8}
.photo-chips{display:grid;gap:6px}.photo-chips.five{grid-template-columns:repeat(5,1fr)}.photo-chips.three{grid-template-columns:repeat(3,1fr)}
.photo-chips button{padding:8px 4px;border:1px solid #ffffff24;border-radius:8px;font-size:11px;color:#d9dfd2;white-space:nowrap;transition:border-color .2s,color .2s,background .2s}
.photo-chips button:hover{border-color:#d9ec8a80;color:var(--accent)}
.photo-chips button[aria-pressed=true]{border-color:var(--accent);background:#d9ec8a1f;color:var(--accent)}
.photo-panel input[type=range]{width:100%;accent-color:var(--accent)}
.photo-toggles{display:flex;gap:16px;flex-wrap:wrap}.photo-toggles label{display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer}.photo-toggles input{accent-color:var(--accent);width:15px;height:15px}
.photo-hint{margin:10px 0 0;font-size:10px;line-height:1.6;color:#8d978a}
.photo-dock{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);display:flex;align-items:center;gap:22px;pointer-events:auto}
.photo-side{min-width:112px;padding:12px 16px;border:1px solid #ffffff38;border-radius:30px;background:#0b100dcc;backdrop-filter:blur(10px);font-family:Barlow Condensed,Arial,sans-serif;font-size:12px;letter-spacing:2px;color:#eef1e8;transition:border-color .2s,color .2s}
.photo-side:hover{border-color:var(--accent);color:var(--accent)}
.photo-shutter{width:72px;height:72px;border-radius:50%;border:2px solid #f2f5ea;background:#0b100d66;display:grid;place-items:center;box-shadow:0 8px 30px #0008;transition:transform .15s,border-color .2s}
.photo-shutter i{width:56px;height:56px;border-radius:50%;background:var(--accent);transition:transform .15s}
.photo-shutter:hover{border-color:var(--accent)}.photo-shutter:active i{transform:scale(.88)}
.photo-toast{position:absolute;left:50%;bottom:118px;transform:translateX(-50%);padding:10px 18px;border-radius:30px;background:#0b100de6;border:1px solid #d9ec8a66;color:#e9f3c4;font-size:12px;white-space:nowrap}
.photo-panel-enter-active,.photo-panel-leave-active{transition:opacity .25s ease,transform .3s cubic-bezier(.2,.7,.2,1)}.photo-panel-enter-from,.photo-panel-leave-to{opacity:0;transform:translateX(24px)}
.photo-toast-enter-active,.photo-toast-leave-active{transition:opacity .3s}.photo-toast-enter-from,.photo-toast-leave-to{opacity:0}
@media(max-width:700px){
 .photo-panel{top:auto;bottom:116px;left:12px;right:12px;width:auto;max-height:52vh;padding:14px}
 .photo-dock{bottom:18px;gap:14px}.photo-side{min-width:92px;padding:11px 12px;font-size:11px}
 .photo-shutter{width:64px;height:64px}.photo-shutter i{width:50px;height:50px}
 .photo-toast{bottom:100px}
 .photo-panel-enter-from,.photo-panel-leave-to{transform:translateY(24px)}
}
</style>
