<script setup lang="ts">
import {vehicles} from '~/data/vehicles'
import {createEngineAudio} from '~/three/engineAudio'
import {createStraightMotion} from '~/three/straightMotion'
// Trailer garage: each detailed car is a full-screen chapter with short films of it driving on each of the four maps,
// recorded by the site's own renderer (public/video/garage/<car>-<map>.webm). The map buttons switch the film (they do not
// leave the page); «Поехать» drives the car on the map that is showing. Only the chapter on screen loads and plays its
// clip; the others show a poster. Chapters settle into place as the page scrolls and their film and copy fade in.
const s=useAtelier(),{t}=useLocale()
const maps=[{id:'tunnel',ru:'Тоннель',en:'Tunnel'},{id:'desert',ru:'Солончак',en:'Salt flat'},{id:'mountain',ru:'Горная долина',en:'Mountain valley'},{id:'winter',ru:'Зимний перевал',en:'Winter pass'}] as const
const chapters=[{id:'tourbillon',map:'desert'},{id:'458',map:'tunnel'},{id:'gt3',map:'mountain'},{id:'revuelto',map:'winter'},{id:'750s',map:'mountain'},{id:'valhalla',map:'tunnel'},{id:'amg',map:'winter'},{id:'jesko',map:'desert'}].map(c=>({...c,car:vehicles.find(v=>v.id===c.id)!}))
const drafts=vehicles.filter(v=>![0,1,3,4,5,6,7,8].includes(v.shape))
const videos=ref<HTMLVideoElement[]>([]),sections=ref<HTMLElement[]>([]),active=ref(0)
const chosen=reactive<Record<string,string>>(Object.fromEntries(chapters.map(c=>[c.id,c.map]))),started=reactive<Record<string,boolean>>({}),switching=reactive<Record<string,boolean>>({})
// the Valhalla films were re-recorded once its wheels ran true
// Safari (Macs, iPhones, iPads) decodes the VP9 WebM films badly or not at all: it gets the same films in H.264 MP4
// (tools/trailers-to-mp4.py); other browsers keep the WebM
const safari=import.meta.client&&(/iPhone|iPad|iPod/.test(navigator.userAgent)||/^((?!chrome|chromium|crios|android|edg).)*safari/i.test(navigator.userAgent)||!document.createElement('video').canPlayType('video/webm; codecs="vp9"'))
const film=(id:string,map:string,type:'webm'|'webp')=>`/video/garage/${id}-${map}.${type}?v=${id==='amg'?16:id==='valhalla'?11:10}`
function pickMap(id:string,map:string){if(chosen[id]===map)return;switching[id]=!!started[id];chosen[id]=map}
const still=import.meta.client&&matchMedia('(prefers-reduced-motion: reduce)').matches
let observer:IntersectionObserver|undefined,current=0
const names=chapters.map(c=>c.car.brand+' '+c.car.name),warmed=new Set<string>()
useHead({htmlAttrs:{class:'garage-snap'}})
const {go,past}=useChapterPager('section.trailer')
useChapterParallax('section.trailer','.trailer-film','.trailer-copy','.trailer-dim')
// One film at a time: the chapter that fills the screen plays and stops any other one still on its way out.
function show(i:number){
 current=i;active.value=i
 videos.value.forEach((v,j)=>{if(j!==i)v.pause()})
 const c=chapters[i]!
 // the other maps' posters wait in the cache, so a map switch shows its first frame at once instead of an empty one
 for(const m of maps){const url=film(c.id,m.id,'webp');if(!warmed.has(url)){warmed.add(url);new Image().src=url}}
 if(still)return
 started[c.id]=true;void nextTick(()=>videos.value[i]?.play().catch(()=>{}))
}
// A chapter that leaves the screen lets its film go (the poster stays): five 1080p60 films decoding at once ran out of
// hardware decoders by the fifth chapter and stalled the scroll.
function release(i:number){const v=videos.value[i],id=chapters[i]!.id;if(!v)return;v.pause();if(started[id]){started[id]=false;void nextTick(()=>v.load())}}
onMounted(async()=>{
 await nextTick()
 // the root is 1 px short at both ends, so a chapter that only touches the screen's edge counts as gone
 observer=new IntersectionObserver(entries=>{for(const e of entries){const i=sections.value.indexOf(e.target as HTMLElement);if(i<0)continue
  if(e.intersectionRatio>=.55)show(i);else if(!e.isIntersecting)release(i)}},{threshold:[0,.55],rootMargin:'-1px 0px'})
 sections.value.forEach(el=>observer!.observe(el))
})
// Engine sound over the films: the car's own drive recordings, driven by the same gearbox model as the drive page and kept
// in step with the clip on screen (each clip starts 3.3 s into a full-throttle run, as it was recorded).
const engineOn=ref(false),preroll=3.3
let engine:ReturnType<typeof createEngineAudio>|undefined,engineChapter=-1,motion:ReturnType<typeof createStraightMotion>|undefined,motionTime=0,engineFrame=0
function engineTick(){
 engineFrame=requestAnimationFrame(engineTick);const video=videos.value[current],chapter=chapters[current];if(!video||!chapter)return
 if(engineChapter!==current){engine?.dispose();engine=createEngineAudio(chapter.id==='tourbillon'||chapter.id==='gt3'||chapter.id==='revuelto'||chapter.id==='750s'||chapter.id==='valhalla'||chapter.id==='jesko'||chapter.id==='amg'?chapter.id:chapter.id==='458');engine.start();engineChapter=current;motion=undefined}
 if(video.paused||video.readyState<3){engine!.update(900,false,s.volume.value,false,0);return}
 const target=preroll+video.currentTime
 if(!motion||target<motionTime-.05){motion=createStraightMotion(chapter.id==='revuelto'?370:parseFloat(chapter.car.speed)||325,chapter.car.shape===0?8:7);motionTime=0}
 let step={speed:0,rpm:900,shifting:false,gear:1,distance:0};while(motionTime<target){const dt=Math.min(1/60,target-motionTime);step=motion.step(dt,true,false,false);motionTime+=dt}
 engine!.update(step.rpm,true,s.volume.value,true,step.speed,step.shifting,false,false)
}
function stopEngine(){cancelAnimationFrame(engineFrame);engine?.dispose();engine=undefined;engineChapter=-1;motion=undefined}
function toggleEngine(){engineOn.value=!engineOn.value;if(engineOn.value)engineTick();else stopEngine()}
onBeforeUnmount(()=>{stopEngine();observer?.disconnect();videos.value.forEach(v=>{v.pause();v.removeAttribute('src');v.load()})})
</script>

<template><main class="trailers">
 <section v-for="(c,i) in chapters" :key="c.id" :ref="el=>{if(el)sections[i]=el as HTMLElement}" class="trailer" :class="{active:active===i}" :aria-label="c.car.brand+' '+c.car.name">
  <video :ref="el=>{if(el)videos[i]=el as HTMLVideoElement}" class="trailer-film" :class="{switching:switching[c.id]}" :src="started[c.id]?film(c.id,chosen[c.id]!,'webm').replace('.webm?',safari?'.mp4?':'.webm?'):undefined" :poster="film(c.id,chosen[c.id]!,'webp')" muted loop playsinline autoplay preload="none" aria-hidden="true" @loadeddata="switching[c.id]=false" />
  <div class="trailer-shade" />
  <div class="trailer-dim" />
  <button class="trailer-sound" :aria-pressed="engineOn" @click="toggleEngine"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><template v-if="engineOn"><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></template><path v-else d="m16 9.5 5 5m0-5-5 5"/></svg>{{engineOn?t('ЗВУК МОТОРА ВКЛ.','ENGINE SOUND ON'):t('ЗВУК МОТОРА','ENGINE SOUND')}}</button>
  <div class="trailer-copy">
   <span class="trailer-brand">{{c.car.brand.toUpperCase()}}</span>
   <h2>{{c.car.name}}</h2>
   <NuxtLink class="trailer-open" to="/" @click="s.select(c.id)">{{t('ОТКРЫТЬ АВТОМОБИЛЬ','EXPLORE THE MACHINE')}} <span>↗</span></NuxtLink>
   <div class="trailer-maps" role="group" :aria-label="t('Карта','Map')"><NuxtLink class="trailer-go" :to="'/drive/'+c.id+'?map='+chosen[c.id]" @click="s.select(c.id)">{{t('ПОЕХАТЬ','DRIVE')}} <span>↗</span></NuxtLink><button v-for="m in maps" :key="m.id" type="button" :class="{own:m.id===chosen[c.id]}" :aria-pressed="m.id===chosen[c.id]" @click="pickMap(c.id,m.id)">{{t(m.ru,m.en)}}</button></div>
  </div>
 </section>
 <GarageChapterRail :names="names" :current="active" :past="past" @go="go" />
 <section v-if="drafts.length" class="trailer-drafts" :aria-label="t('Коллекция в разработке','Collection in development')">
  <small>{{t('ДАЛЕЕ В КОЛЛЕКЦИИ','NEXT IN THE COLLECTION')}}</small>
  <ul><li v-for="v in drafts" :key="v.id"><span>{{v.brand.toUpperCase()}}</span><strong>{{v.name}}</strong><em>{{t('В разработке','In development')}}</em></li></ul>
 </section>
</main></template>


<style scoped>
.trailers{background:#070908}
.trailer{position:relative;height:100vh;height:100svh;min-height:560px;overflow:hidden;background:#070908;scroll-snap-align:start}
.trailer-film{position:absolute;inset:-8vh 0;width:100%;height:calc(100% + 16vh);object-fit:cover;will-change:translate,scale;opacity:.5;transform:scale(1.04);transition:opacity 1.1s ease,transform 2.4s cubic-bezier(.2,.7,.2,1)}
.trailer.active .trailer-film{opacity:1;transform:none}
.trailer.active .trailer-film.switching{opacity:.35;transition:opacity .25s ease}
.trailer-shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(0deg,#050706b3 0%,#05070600 34%),linear-gradient(90deg,#05070666 0%,#05070600 40%)}
/* the parallax dims a chapter on its way in or out through this layer's opacity */
.trailer-dim{position:absolute;inset:0;pointer-events:none;background:#000;opacity:0;will-change:opacity}
.trailer-copy{position:absolute;left:4.5%;bottom:9vh;z-index:2;width:min(620px,calc(91% - 210px))}
.trailer-copy>*{opacity:0;transform:translateY(18px);transition:opacity .7s ease,transform .9s cubic-bezier(.2,.7,.2,1)}
.trailer.active .trailer-copy>*{opacity:1;transform:none}
.trailer.active .trailer-copy>:nth-child(2){transition-delay:.08s}.trailer.active .trailer-copy>:nth-child(3){transition-delay:.16s}.trailer.active .trailer-copy>:nth-child(4){transition-delay:.24s}
.trailer-brand{display:block;font-size:11px;letter-spacing:3px;color:#c9cec6}
.trailer-copy h2{font-family:Barlow Condensed,Impact,sans-serif;font-weight:500;font-size:clamp(54px,6.5vw,104px);line-height:.95;margin:8px 0 22px}
.trailer-open{display:inline-flex;gap:18px;padding:13px 18px;border:1px solid #ffffff38;background:#05070699;color:#f1f2ea;text-decoration:none;font-family:Barlow Condensed,Arial,sans-serif;font-size:12px;letter-spacing:2px;transition:border-color .2s,color .2s}
.trailer-maps{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:14px}
.trailer-maps .trailer-go{display:inline-flex;gap:10px;margin-right:6px;padding:9px 16px;border:1px solid var(--accent);border-radius:30px;background:var(--accent);color:#10150f;text-decoration:none;font-family:Barlow Condensed,Arial,sans-serif;font-size:12px;letter-spacing:2px;transition:background .2s,color .2s}
.trailer-maps button{padding:9px 14px;border:1px solid #ffffff2e;border-radius:30px;background:#05070699;color:#eef0e8;font-size:12px;cursor:pointer;transition:border-color .2s,color .2s,background .2s}
.trailer-maps button.own{border-color:var(--accent);color:var(--accent);background:#0b0f0ccc}
.trailer-open:hover,.trailer-open:focus-visible,.trailer-maps button:hover,.trailer-maps button:focus-visible{border-color:var(--accent);color:var(--accent);outline:none}
.trailer-maps .trailer-go:hover,.trailer-maps .trailer-go:focus-visible{background:transparent;color:var(--accent);outline:none}
.trailer-sound{position:absolute;z-index:3;right:4.5%;bottom:9vh;display:flex;align-items:center;gap:10px;padding:11px 16px;border:1px solid #ffffff38;border-radius:30px;background:#050706a6;backdrop-filter:blur(10px);color:#f1f2ea;font-family:Barlow Condensed,Arial,sans-serif;font-size:12px;letter-spacing:2px;transition:border-color .2s,color .2s}
.trailer-sound svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.trailer-sound:hover,.trailer-sound:focus-visible,.trailer-sound[aria-pressed=true]{border-color:var(--accent);color:var(--accent);outline:none}
.trailer-drafts{padding:70px 4.5% 80px;background:#0b0e0d}
.trailer-drafts>small{font-size:10px;letter-spacing:3px;color:var(--muted)}
.trailer-drafts ul{list-style:none;margin:22px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.trailer-drafts li{border:1px solid #ffffff17;padding:20px 22px;display:flex;flex-direction:column;gap:6px}
.trailer-drafts li span{font-size:9px;letter-spacing:2px;color:var(--muted)}.trailer-drafts li strong{font-size:20px;font-weight:500}.trailer-drafts li em{font-style:normal;font-size:9px;letter-spacing:1px;color:#7f877f}
@media(max-width:900px){.trailer-drafts ul{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:700px){.trailer{height:88vh;height:88svh}.trailer-copy{left:16px;right:16px;width:auto;bottom:5vh}.trailer-sound{right:16px;bottom:auto;top:160px;padding:9px 13px;font-size:11px}.trailer-maps button,.trailer-maps .trailer-go{padding:8px 11px;font-size:11px}.trailer-drafts{padding:48px 16px 56px}}
@media(prefers-reduced-motion:reduce){.trailer-film,.trailer-copy>*{transition:none;opacity:1;transform:none}}
/* touch screens scroll natively, without the depth effect: the media fit their chapter */
@media (hover:none) and (pointer:coarse){.trailer-film{inset:0;height:100%}}
</style>
