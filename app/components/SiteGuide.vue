<script setup lang="ts">
// The site guide: a round «?» that can be dragged anywhere — it settles against the nearest screen edge, slides clear of
// the page's own buttons and remembers its place in this browser — or tucked into a small tab at the edge. A click opens
// a short help panel next to it: what the site is, what to press where (the page on screen comes first), the drive keys
// and what to do when the picture stutters.
const {t}=useLocale(),route=useRoute(),s=useAtelier()
const open=ref(false),mounted=ref(false),dragging=ref(false),glide=ref(false)
const button=ref<HTMLButtonElement>(),panel=ref<HTMLElement>()
const page=computed(()=>route.path.startsWith('/drive')?'drive':route.path.startsWith('/garage')?'garage':route.path.startsWith('/legal')?'legal':'showroom')
type Topic={id:string,ru:string,en:string,items:[string,string][]}
const topics:Topic[]=[
 {id:'showroom',ru:'Шоурум (Обзор)',en:'Showroom (Overview)',items:[
  ['Крутите машину мышью или пальцем, колесо мыши — приблизить.','Turn the car with the mouse or a finger; the wheel zooms.'],
  ['«Открыть конфигуратор» или прокрутка вниз — настройки по вкладкам: «Кузов» (цвет, покрытие, диски), «Двери и свет» (двери, окна, фары), «Салон», «Окружение», «Детали».','«Enter showroom» or scrolling down opens the settings in tabs: Paint (colour, finish, wheels), Doors & lights (doors, windows, lights), Interior, Environment, Details.'],
  ['«В салон» на вкладке «Двери и свет» — посмотреть машину изнутри.','«Enter cabin» on the Doors & lights tab shows the car from inside.'],
  ['«Смотреть обзор» заново показывает облёт машины, «Пропустить осмотр» — сразу к машине.','«Replay tour» plays the fly-around again, «Skip intro» goes straight to the car.'],
  ['Другая машина — в гараже: «Другие автомобили — гараж» или «Гараж» в меню, там «Открыть автомобиль».','Another car is picked in the garage: «More cars — garage» or «Garage» in the menu, then «Explore the machine».']]},
 {id:'garage',ru:'Гараж',en:'Garage',items:[
  ['Каждая машина — отдельная глава с роликом. Листайте колесом мыши, тачпадом, пальцем или стрелками ↓ ↑.','Each car is a chapter with its film. Scroll with the wheel, the trackpad, a finger or the ↓ ↑ keys.'],
  ['Кнопки карт — «Тоннель», «Солончак», «Горная долина», «Зимний перевал» — меняют ролик.','The map buttons (Tunnel, Salt flat, Mountain valley, Winter pass) switch the film.'],
  ['«Поехать» — сесть за руль на выбранной карте, «Открыть автомобиль» — рассмотреть и настроить машину в шоуруме.','«Drive» takes the wheel on that map, «Explore the machine» opens the car in the showroom.'],
  ['«Звук мотора» включает звук ролика.','«Engine sound» turns on the film\'s sound.'],
  ['«Фото» вверху справа — студийные снимки машин, «Трейлеры» — обратно к роликам.','«Photos» at the top right shows the studio shots, «Trailers» goes back to the films.']]},
 {id:'drive',ru:'В движении',en:'Driving',items:[
  ['W или ↑ — газ, S или ↓ — тормоз. Машина едет только прямо, поворотов нет.','W or ↑ accelerates, S or ↓ brakes. The car only goes straight, there are no turns.'],
  ['C — сменить камеру, K — кинокамера, N — следующий план кинокамеры, R — сброс в начало, Esc — пауза.','C switches the camera, K the cinema camera, N its next shot, R restarts, Esc pauses.'],
  ['Перетаскивайте мышью или пальцем, чтобы осмотреться.','Drag with the mouse or a finger to look around.'],
  ['«Звук мотора» — завести мотор, «Авторазгон» — машина разгоняется сама, «Сменить карту» — другая дорога, «Сброс» — в начало.','«Engine sound» starts the engine, «Auto accelerate» drives on its own, «Change map» picks another road, «Reset» restarts.'],
  ['«Фоторежим» — кадр без интерфейса, «Кинокамера» — съёмка как в кино.','«Photo mode» frames a shot without the interface, «Cinema camera» films it like a movie.'],
  ['На телефоне остальные кнопки — под «Ещё»: звук мотора, кинокамера, фоторежим, время суток, дождь и снег, окна, фары.','On a phone the other buttons are under «More»: engine sound, cinema camera, photo mode, time of day, rain and snow, windows, lights.'],
  ['«Скрыть» убирает панель кнопок, «Панель» возвращает её, «Выйти» — обратно в шоурум.','«Hide» tucks the controls away, «Controls» brings them back, «Exit» returns to the showroom.']]},
 {id:'legal',ru:'Лицензии',en:'Credits',items:[
  ['Здесь авторы моделей, карт, музыки и звуков, из которых собран проект.','The authors of the models, maps, music and sounds the project is built from.'],
  ['Кнопки вверху — «Автомобили», «Карты», «Материалы» и другие — переносят к нужному разделу.','The buttons at the top (Cars, Maps, Materials and the rest) jump to that section.']]}
]
const ordered=computed(()=>[...topics].sort((a,b)=>(b.id===page.value?1:0)-(a.id===page.value?1:0)))
const qualityName=computed(()=>({Medium:t('среднее','medium'),High:t('высокое','high'),Ultra:t('ультра','ultra')} as Record<string,string>)[s.quality.value]??s.quality.value)

// Where the button rests: the screen edge, how far along it (0 — the top or left end, 1 — the bottom or right end) and
// whether it is tucked into a tab. This is what the visitor chose and what is stored; the spot on screen may slide along
// the edge, away from a page's own buttons, and comes back when they are gone.
type Edge='left'|'right'|'top'|'bottom'
type Place={edge:Edge,along:number,tucked:boolean}
const storeKey='velocity-guide-place',edges:Edge[]=['left','right','top','bottom']
const place=ref<Place>({edge:'right',along:1,tucked:false}),spot=ref({x:0,y:0})
const clamp=(v:number,lo:number,hi:number)=>Math.min(Math.max(v,lo),Math.max(lo,hi))
const upright=(edge:Edge)=>edge==='left'||edge==='right'
const phone=()=>innerWidth<=600
const margin=()=>phone()?10:16
function size(p:Place){if(!p.tucked){const d=phone()?44:40;return{w:d,h:d}}return upright(p.edge)?{w:18,h:54}:{w:54,h:18}}
function pixels(p:Place){
 const {w,h}=size(p),m=margin(),off=p.tucked?0:m
 return upright(p.edge)?{x:p.edge==='left'?off:innerWidth-w-off,y:m+(innerHeight-h-2*m)*p.along}:{x:m+(innerWidth-w-2*m)*p.along,y:p.edge==='top'?off:innerHeight-h-off}
}
// the nearest edge to a point, and the place on it
function snap(cx:number,cy:number,tucked:boolean):Place{
 const gaps={left:cx,right:innerWidth-cx,top:cy,bottom:innerHeight-cy},edge=edges.reduce((a,b)=>gaps[b]<gaps[a]?b:a)
 const {w,h}=size({edge,along:0,tucked}),m=margin()
 return{edge,tucked,along:clamp(upright(edge)?(cy-h/2-m)/(innerHeight-h-2*m):(cx-w/2-m)/(innerWidth-w-2*m),0,1)}
}
function save(){try{localStorage.setItem(storeKey,JSON.stringify(place.value))}catch{}}
function restore(){
 try{
  const p=JSON.parse(localStorage.getItem(storeKey)||'null')
  if(p&&edges.includes(p.edge)&&Number.isFinite(p.along))place.value={edge:p.edge,along:clamp(p.along,0,1),tucked:!!p.tucked}
 }catch{}
}

// Keeping clear of the page: the button never sits over a button, link, field or tab of the page (nor the drive's speed
// readout, which ignores the mouse). Their boxes on screen are collected and, if the button's square (with a few pixels to
// spare) touches one, the button slides along its edge to the nearest free spot, or, when the whole edge is taken (the
// drive buttons along a phone's bottom), steps off it.
const avoid='button,a[href],input,select,textarea,summary,[role=button],[role=tab],[role=slider],.drive-hud'
const ours=(el:Element)=>!!(button.value?.contains(el)||panel.value?.contains(el))
let obstacles:DOMRect[]=[]
function gather(){
 obstacles=[...document.querySelectorAll(avoid)].filter(el=>!ours(el)&&(el.checkVisibility?.({opacityProperty:true,visibilityProperty:true})??true))
  .map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight)
}
const covers=(x:number,y:number,w:number,h:number)=>obstacles.some(r=>r.left<x+w+4&&r.right>x-4&&r.top<y+h+4&&r.bottom>y-4)
function settle(){
 if(!mounted.value||dragging.value)return
 gather()
 const p=place.value,{w,h}=size(p),base=pixels(p),m=margin(),along=upright(p.edge)
 const lo=m,hi=(along?innerHeight-h:innerWidth-w)-m,from=along?base.y:base.x
 let free:{x:number,y:number}|undefined
 for(let k=0;k<=Math.max(innerWidth,innerHeight)&&!free;k+=10){
  const tries=[from+k,from-k].filter(v=>v>=lo-.5&&v<=hi+.5)
  if(!tries.length)break
  free=tries.map(v=>along?{x:base.x,y:v}:{x:v,y:base.y}).find(c=>!covers(c.x,c.y,w,h))
 }
 // off the edge, towards the middle of the screen
 const inward={left:[1,0],right:[-1,0],top:[0,1],bottom:[0,-1]}[p.edge]
 for(let k=10;k<=(along?innerWidth:innerHeight)/2&&!free;k+=10){
  const c={x:base.x+inward[0]!*k,y:base.y+inward[1]!*k}
  if(!covers(c.x,c.y,w,h))free=c
 }
 free??=base
 if(Math.abs(free.x-spot.value.x)>.5||Math.abs(free.y-spot.value.y)>.5)spot.value=free
}

// Dragging with a mouse or a finger: the button follows the pointer inside the screen and settles on the nearest edge when
// let go; a tucked tab slides along the edges. A press without a drag is a click — it opens the panel (or brings the tab
// back as the round button).
let grab:{id:number,x:number,y:number,dx:number,dy:number}|undefined,dragged=false
function down(e:PointerEvent){
 if(e.button!==0||!button.value)return
 dragged=false
 const r=button.value.getBoundingClientRect()
 grab={id:e.pointerId,x:e.clientX,y:e.clientY,dx:e.clientX-r.left,dy:e.clientY-r.top}
 button.value.setPointerCapture(e.pointerId)
}
function move(e:PointerEvent){
 if(!grab||e.pointerId!==grab.id)return
 if(!dragging.value){if(Math.hypot(e.clientX-grab.x,e.clientY-grab.y)<(e.pointerType==='mouse'?4:8))return;dragging.value=true;open.value=false}
 if(place.value.tucked){place.value=snap(e.clientX,e.clientY,true);spot.value=pixels(place.value);return}
 const {w,h}=size(place.value)
 spot.value={x:clamp(e.clientX-grab.dx,0,innerWidth-w),y:clamp(e.clientY-grab.dy,0,innerHeight-h)}
}
function up(e:PointerEvent){
 if(!grab||e.pointerId!==grab.id)return
 grab=undefined
 if(!dragging.value)return
 dragged=true;dragging.value=false
 const {w,h}=size(place.value)
 if(!place.value.tucked)place.value=snap(spot.value.x+w/2,spot.value.y+h/2,false)
 spot.value=pixels(place.value);save();settle()
}
function press(){
 if(dragged){dragged=false;return}
 if(place.value.tucked){place.value={...place.value,tucked:false};save();spot.value=pixels(place.value);settle();return}
 open.value=!open.value
}
function tuck(){open.value=false;place.value={...place.value,tucked:true};save();spot.value=pixels(place.value);settle()}

// The panel opens beside the button — to the side with room on a wide screen, above or below it on a phone — and always
// stays inside the screen; a long panel scrolls.
const panelStyle=ref<Record<string,string>>({})
function placePanel(){
 const el=panel.value;if(!el)return
 const W=innerWidth,H=innerHeight,m=8,gap=10,{w,h}=size(place.value),b=spot.value
 const pw=el.offsetWidth,natural=el.scrollHeight+2
 const room={left:b.x-gap-m,right:W-b.x-w-gap-m,above:b.y-gap-m,below:H-b.y-h-gap-m}
 if(room.left>=pw||room.right>=pw){
  const left=room.left>=pw&&(room.left>=room.right||room.right<pw),maxH=Math.min(640,H-2*m),ph=Math.min(natural,maxH)
  const x=left?b.x-gap-pw:b.x+w+gap,y=clamp(b.y+h/2-ph/2,m,H-m-ph)
  panelStyle.value={left:x+'px',top:y+'px',maxHeight:maxH+'px',transformOrigin:`${left?'right':'left'} ${b.y+h/2-y}px`}
 }else{
  const upward=room.above>=room.below,maxH=Math.min(640,upward?room.above:room.below),ph=Math.min(natural,maxH)
  const x=clamp(b.x+w/2-pw/2,m,W-m-pw),y=upward?b.y-gap-ph:b.y+h+gap
  panelStyle.value={left:x+'px',top:y+'px',maxHeight:maxH+'px',transformOrigin:`${b.x+w/2-x}px ${upward?'bottom':'top'}`}
 }
}
watch(open,v=>{if(v)nextTick(placePanel)})
watch(spot,()=>{if(open.value)placePanel()})
watch(()=>route.path,()=>nextTick(()=>{settle();if(open.value)placePanel()}))

function key(e:KeyboardEvent){if(e.key==='Escape'&&open.value){open.value=false;e.stopPropagation()}}
function outside(e:PointerEvent){if(open.value&&!ours(e.target as Element))open.value=false}
let resizeTimer:ReturnType<typeof setTimeout>|undefined,scrollTimer:ReturnType<typeof setTimeout>|undefined,watcher:ReturnType<typeof setInterval>|undefined
function resized(){clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{spot.value=pixels(place.value);settle();if(open.value)placePanel()},120)}
function scrolled(){clearTimeout(scrollTimer);scrollTimer=setTimeout(settle,250)}
onMounted(()=>{
 restore();spot.value=pixels(place.value);mounted.value=true
 // the first spot without a slide; later moves glide
 nextTick(()=>{settle();requestAnimationFrame(()=>{glide.value=true})})
 window.addEventListener('keydown',key,true)
 window.addEventListener('pointerdown',outside,true)
 window.addEventListener('resize',resized)
 window.addEventListener('scroll',scrolled,{capture:true,passive:true})
 // pages change under the button (the drive panel appears when the scene is ready, menus open), so it looks again now and then
 watcher=setInterval(()=>{if(!document.hidden)settle()},1200)
})
onBeforeUnmount(()=>{
 window.removeEventListener('keydown',key,true)
 window.removeEventListener('pointerdown',outside,true)
 window.removeEventListener('resize',resized)
 window.removeEventListener('scroll',scrolled,{capture:true})
 clearTimeout(resizeTimer);clearTimeout(scrollTimer);clearInterval(watcher)
})
</script>

<template>
 <div v-if="mounted" class="site-guide">
  <button ref="button" type="button" class="guide-button" :class="[`edge-${place.edge}`,{tucked:place.tucked,dragging,glide}]" :style="{translate:`${spot.x}px ${spot.y}px`}" :aria-expanded="open" :aria-label="place.tucked?t('Показать помощника','Show the guide'):t('Помощник по сайту','Site guide')" :title="place.tucked?t('Показать помощника','Show the guide'):t('Помощник по сайту — можно перетащить','Site guide — drag to move')" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @click="press"><span aria-hidden="true">?</span></button>
  <transition name="guide">
   <aside v-if="open" ref="panel" class="guide-panel" :style="panelStyle" role="dialog" :aria-label="t('Помощник по сайту','Site guide')">
    <header>
     <strong>{{t('Помощник','Guide')}}</strong>
     <span class="tools">
      <button type="button" class="tuck" :title="t('Свернуть к краю экрана','Tuck to the screen edge')" @click="tuck"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 6l6 6-6 6M20 12H8M4 5v14"/></svg>{{t('Свернуть','Tuck away')}}</button>
      <button type="button" class="close" :aria-label="t('Закрыть','Close')" @click="open=false">×</button>
     </span>
    </header>
    <p class="intro">{{t('Velocity — интерактивная выставка суперкаров: машины можно рассмотреть со всех сторон, настроить, посмотреть ролики в гараже и прокатиться по четырём дорогам.','Velocity is an interactive supercar exhibition: look at each car from every side, configure it, watch its films in the garage and drive it on four roads.')}}</p>
    <section v-for="topic in ordered" :key="topic.id" :class="{current:topic.id===page}">
     <h3>{{t(topic.ru,topic.en)}}<small v-if="topic.id===page">{{t('вы здесь','you are here')}}</small></h3>
     <ul><li v-for="item in topic.items" :key="item[0]">{{t(item[0],item[1])}}</li></ul>
    </section>
    <section>
     <h3>{{t('Если тормозит','If it stutters')}}</h3>
     <ul>
      <li>{{t('Значок графики (монитор) в шапке: выберите качество пониже (сейчас — ','The graphics icon (a monitor) in the header: pick a lower quality (now: ')}}{{qualityName}}).</li>
      <li>{{t('Первая загрузка машины и карты занимает несколько секунд — дальше они берутся из кэша.','The first load of a car and a map takes a few seconds; after that they come from the cache.')}}</li>
      <li>{{t('Лучше всего сайт работает в свежем Chrome, Edge или Safari.','The site works best in an up-to-date Chrome, Edge or Safari.')}}</li>
     </ul>
    </section>
    <section>
     <h3>{{t('Сам помощник','This guide')}}</h3>
     <ul>
      <li>{{t('Кнопку «?» можно перетащить мышью или пальцем в любое место — она прилипнет к ближайшему краю и запомнит место.','Drag the «?» button anywhere with the mouse or a finger: it sticks to the nearest edge and remembers the spot.')}}</li>
      <li>{{t('«Свернуть» прячет её в узкий язычок у края; нажмите на язычок, чтобы вернуть.','«Tuck away» turns it into a slim tab at the edge; tap the tab to bring it back.')}}</li>
     </ul>
    </section>
   </aside>
  </transition>
 </div>
</template>

<style scoped>
.site-guide{display:contents}
.guide-button{position:fixed;left:0;top:0;z-index:90;display:grid;place-items:center;width:40px;height:40px;padding:0;border-radius:50%;border:1px solid #d9ec8a55;background:#0b0f0ccc;color:#d9ec8a;font:600 18px/1 Manrope,system-ui,sans-serif;cursor:grab;backdrop-filter:blur(8px);box-shadow:0 6px 24px #0008;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;transition:border-color .2s,scale .2s,background .2s,width .25s,height .25s,border-radius .25s}
.guide-button.glide{transition:translate .38s cubic-bezier(.2,.75,.2,1),border-color .2s,scale .2s,background .2s,width .25s,height .25s,border-radius .25s}
.guide-button.dragging{transition:scale .15s,border-color .2s;cursor:grabbing;scale:1.08;border-color:#d9ec8a;box-shadow:0 10px 34px #000a}
@media (hover:hover){.guide-button:hover{border-color:#d9ec8a}.guide-button:not(.tucked):not(.dragging):hover{scale:1.06}.guide-button.tucked:hover{background:#151c17f0}}
.guide-button:focus-visible{outline:2px solid #d9ec8a;outline-offset:3px}
.guide-button[aria-expanded=true]{background:#d9ec8a;color:#0b0f0c;border-color:#d9ec8a}
/* tucked: a slim tab flush with its edge */
.guide-button.tucked{width:18px;height:54px;font-size:12px;border-color:#d9ec8a40;background:#0b0f0ce6;box-shadow:0 4px 16px #0007}
.guide-button.tucked.edge-right{border-radius:10px 0 0 10px;border-right:0}
.guide-button.tucked.edge-left{border-radius:0 10px 10px 0;border-left:0}
.guide-button.tucked.edge-top{width:54px;height:18px;border-radius:0 0 10px 10px;border-top:0}
.guide-button.tucked.edge-bottom{width:54px;height:18px;border-radius:10px 10px 0 0;border-bottom:0}
.guide-panel{position:fixed;left:16px;top:16px;z-index:91;width:min(380px,calc(100vw - 16px));max-height:min(72vh,640px);overflow:auto;padding:16px 18px 18px;border:1px solid #ffffff1c;border-radius:14px;background:#0b0f0cf2;color:#dce2dc;font:13px/1.55 Manrope,system-ui,sans-serif;box-shadow:0 18px 60px #000b;scrollbar-width:thin;scrollbar-color:#5d6b3f transparent;overscroll-behavior:contain}
.guide-panel header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px}
.guide-panel header strong{font-size:12px;letter-spacing:2.5px;text-transform:uppercase;color:#d9ec8a}
.tools{display:flex;align-items:center;gap:6px}
.tuck{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border:1px solid #ffffff1f;border-radius:8px;background:#ffffff06;color:#c8d0c8;font:500 11px/1 Manrope,system-ui,sans-serif;cursor:pointer;transition:border-color .2s,color .2s}
.tuck:hover{border-color:#d9ec8a80;color:#d9ec8a}
.tuck svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.close{display:grid;place-items:center;width:28px;height:28px;padding:0;border:0;border-radius:6px;background:none;color:#aebbb1;font-size:22px;line-height:1;cursor:pointer}
.close:hover{background:#ffffff0d;color:#e5edc8}
.intro{color:#aebbb1;margin:0 0 10px}
.guide-panel section{padding:10px 0 2px;border-top:1px solid #ffffff12}
.guide-panel section.current h3{color:#d9ec8a}
.guide-panel h3{display:flex;align-items:center;gap:8px;margin:0 0 4px;font-size:13px;font-weight:600}
.guide-panel h3 small{font-size:10px;font-weight:500;color:#0b0f0c;background:#d9ec8a;border-radius:8px;padding:1px 7px}
.guide-panel ul{margin:0;padding-left:16px}
.guide-panel li{margin:3px 0;color:#c8d0c8}
.guide-enter-active,.guide-leave-active{transition:opacity .2s,transform .2s}
.guide-enter-from,.guide-leave-to{opacity:0;transform:scale(.96)}
@media (max-width:600px){.guide-button:not(.tucked){width:44px;height:44px;font-size:19px}.guide-panel{padding:14px 15px 16px}}
@media (prefers-reduced-motion:reduce){.guide-button.glide,.guide-enter-active,.guide-leave-active{transition:none}}
</style>
