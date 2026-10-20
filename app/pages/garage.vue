<script setup lang="ts">
const {t}=useLocale()
// Two ways to present the collection: trailers of each car driving on its map, and studio photographs rendered in
// Blender Cycles (front, side, rear, cabin).
const view=useState<'trailers'|'photos'>('garage-view',()=>'trailers')
// Entry splash (the showroom's loader): it waits for the first chapter's film (or photo) and never longer than 6 s.
const loading=ref(true),progress=ref(8)
onMounted(()=>{
 const finish=()=>{progress.value=100},started=performance.now()
 const watchMedia=()=>{
  const film=document.querySelector<HTMLVideoElement>('.trailer-film'),photo=document.querySelector<HTMLImageElement>('.photo.shown')
  if(film){progress.value=Math.max(progress.value,45);if(film.readyState>=2)finish();else film.addEventListener('loadeddata',finish,{once:true});return}
  if(photo){progress.value=Math.max(progress.value,45);if(photo.complete&&photo.naturalWidth)finish();else photo.addEventListener('load',finish,{once:true});return}
  if(performance.now()-started<6000)requestAnimationFrame(watchMedia)
 }
 watchMedia();setTimeout(finish,6000)
})
</script>

<template><SceneLoading :active="loading" :progress="progress" :title="t('Гараж','Garage')" vehicle="Bugatti · Ferrari · Porsche · Lamborghini · McLaren · Aston Martin" :status="progress<45?t('Открываем гараж','Opening the garage'):t('Загрузка ролика','Loading the film')" @complete="loading=false" /><AtelierHeader /><div class="garage-view" role="group" :aria-label="t('Вид гаража','Garage view')"><button type="button" :aria-pressed="view==='trailers'" :class="{active:view==='trailers'}" @click="view='trailers'">{{t('Трейлеры','Trailers')}}</button><button type="button" :aria-pressed="view==='photos'" :class="{active:view==='photos'}" @click="view='photos'">{{t('Фото','Photos')}}</button></div>
<ClientOnly><GaragePhotos v-if="view==='photos'" /><GarageTrailers v-else /></ClientOnly>
<footer><span class="wordmark">VELOCITY 3</span><small>{{t('Характеристики приведены для справки.','Illustrative specifications; configurations may vary.')}}</small><NuxtLink to="/">{{t('В ШОУРУМ','RETURN TO EXPERIENCE')}} ↗</NuxtLink></footer></template>

<style>
/* mouse and keyboard page the chapters in script (useChapterPager); touch screens keep a soft CSS snap */
@media (hover:none) and (pointer:coarse){html.garage-snap{scroll-snap-type:y proximity}}
</style>
<style scoped>
.garage-view{position:fixed;top:118px;right:4.5%;z-index:21;display:flex;border:1px solid #ffffff2e;background:#050706b3;backdrop-filter:blur(8px)}
.garage-view button{border:0;background:none;color:#c9cec6;font-family:Barlow Condensed,Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;padding:10px 16px;cursor:pointer}
.garage-view button.active{color:#0a0d0c;background:var(--accent)}
.garage-view button:focus-visible{outline:1px solid var(--accent);outline-offset:-3px}
@media(max-width:700px){.garage-view{top:106px;right:16px}}
</style>
