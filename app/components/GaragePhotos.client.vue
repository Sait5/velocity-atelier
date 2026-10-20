<script setup lang="ts">
import {vehicles} from '~/data/vehicles'
// Photo garage: each detailed car is a full-screen chapter of studio photographs rendered in Blender Cycles
// (tools/blender-studio, public/garage): three-quarter front, side, rear and the cabin, switched in place with a
// cross-fade. Only the chapter on screen loads its other angles.
const s=useAtelier(),{t}=useLocale()
const angles=[{id:'front',ru:'Спереди',en:'Front'},{id:'side',ru:'Сбоку',en:'Side'},{id:'rear',ru:'Сзади',en:'Rear'},{id:'interior',ru:'Салон',en:'Cabin'}] as const
const chapters=['tourbillon','458','gt3','revuelto','750s','valhalla','amg','jesko'].map(id=>({id,car:vehicles.find(v=>v.id===id)!}))
const view=reactive<Record<string,string>>(Object.fromEntries(chapters.map(c=>[c.id,'front'])))
const loaded=reactive<Record<string,boolean>>({}),sections=ref<HTMLElement[]>([]),active=ref(0)
const photo=(id:string,angle:string)=>`/garage/${id}-${angle}.webp?v=${id==='amg'?8:1}`
let observer:IntersectionObserver|undefined
useHead({htmlAttrs:{class:'garage-snap'}})
useChapterPager('.photo-chapter')
useChapterParallax('.photo-chapter','.photo','.photo-copy')
onMounted(async()=>{
 await nextTick()
 observer=new IntersectionObserver(entries=>{for(const e of entries){const i=sections.value.indexOf(e.target as HTMLElement);if(i<0||!e.isIntersecting)continue;active.value=i;loaded[chapters[i]!.id]=true}},{threshold:.55})
 sections.value.forEach(el=>observer!.observe(el))
})
onBeforeUnmount(()=>observer?.disconnect())
</script>

<template><main class="photos">
 <section v-for="(c,i) in chapters" :key="c.id" :ref="el=>{if(el)sections[i]=el as HTMLElement}" class="photo-chapter" :class="{active:active===i}" :aria-label="c.car.brand+' '+c.car.name">
  <template v-for="a in angles" :key="a.id"><img v-if="a.id==='front'||loaded[c.id]" class="photo" :class="{shown:view[c.id]===a.id}" :src="photo(c.id,a.id)" :alt="c.car.brand+' '+c.car.name+' — '+t(a.ru,a.en)" :loading="i===0&&a.id==='front'?'eager':'lazy'" decoding="async" width="2560" height="1440"></template>
  <div class="photo-shade" />
  <div class="photo-copy">
   <span class="photo-brand">{{c.car.brand.toUpperCase()}}</span>
   <h2>{{c.car.name}}</h2>
   <NuxtLink class="photo-open" to="/" @click="s.select(c.id)">{{t('ОТКРЫТЬ АВТОМОБИЛЬ','EXPLORE THE MACHINE')}} <span>↗</span></NuxtLink>
  </div>
  <div class="photo-angles" role="tablist" :aria-label="t('Ракурс','Angle')"><button v-for="a in angles" :key="a.id" role="tab" :aria-selected="view[c.id]===a.id" @click="view[c.id]=a.id;loaded[c.id]=true">{{t(a.ru,a.en)}}</button></div>
 </section>
</main></template>

<style scoped>
.photos{background:#070908}
.photo-chapter{position:relative;height:100vh;min-height:560px;overflow:hidden;background:#070908;scroll-snap-align:start}
.photo{position:absolute;inset:-8vh 0;width:100%;height:calc(100% + 16vh);object-fit:cover;opacity:0;transform:scale(1.03);transition:opacity .8s ease,transform 1.6s cubic-bezier(.2,.7,.2,1)}
.photo.shown{opacity:1;transform:none}
.photo-shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(0deg,#050706b3 0%,#05070600 34%),linear-gradient(90deg,#05070666 0%,#05070600 40%)}
.photo-copy{position:absolute;left:4.5%;bottom:9vh;z-index:2;width:min(560px,90%)}
.photo-copy>*{opacity:0;transform:translateY(18px);transition:opacity .7s ease,transform .9s cubic-bezier(.2,.7,.2,1)}
.photo-chapter.active .photo-copy>*{opacity:1;transform:none}
.photo-chapter.active .photo-copy>:nth-child(2){transition-delay:.08s}.photo-chapter.active .photo-copy>:nth-child(3){transition-delay:.16s}
.photo-brand{display:block;font-size:11px;letter-spacing:3px;color:#c9cec6}
.photo-copy h2{font-family:Barlow Condensed,Impact,sans-serif;font-weight:500;font-size:clamp(54px,6.5vw,104px);line-height:.95;margin:8px 0 22px}
.photo-open{display:inline-flex;gap:18px;padding:13px 18px;border:1px solid #ffffff38;background:#05070699;color:#f1f2ea;text-decoration:none;font-family:Barlow Condensed,Arial,sans-serif;font-size:12px;letter-spacing:2px;transition:border-color .2s,color .2s}
.photo-open:hover,.photo-open:focus-visible{border-color:var(--accent);color:var(--accent);outline:none}
.photo-angles{position:absolute;z-index:3;right:4.5%;bottom:9vh;display:flex;gap:4px;padding:4px;border:1px solid #ffffff24;border-radius:30px;background:#050706a6;backdrop-filter:blur(10px)}
.photo-angles button{padding:9px 14px;border:0;border-radius:30px;background:none;color:#c9cec6;font-size:12px;cursor:pointer;transition:background .2s,color .2s}
.photo-angles button[aria-selected=true]{background:var(--accent);color:#10150f}
.photo-angles button:hover:not([aria-selected=true]),.photo-angles button:focus-visible{color:var(--accent);outline:none}
@media(max-width:700px){.photo-chapter{height:88vh}.photo{object-fit:contain;object-position:center 34%}.photo-copy{left:16px;right:16px;width:auto;bottom:calc(5vh + 56px)}.photo-angles{left:16px;right:16px;bottom:3vh;justify-content:space-between}.photo-angles button{padding:8px 10px;font-size:11px}}
@media(prefers-reduced-motion:reduce){.photo,.photo-copy>*{transition:none}}
/* touch screens scroll natively, without the depth effect: the media fit their chapter */
@media (hover:none) and (pointer:coarse){.photo{inset:0;height:100%}}
</style>
