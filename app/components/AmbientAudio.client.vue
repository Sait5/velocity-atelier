<script setup lang="ts">
import {musicThemes} from '~/data/music'
const s=useAtelier(),route=useRoute(),first=ref<HTMLAudioElement>(),second=ref<HTMLAudioElement>()
const selected=computed(()=>musicThemes.find(t=>t.id===(s.musicTheme.value==='auto'?(s.car.value.id==='revuelto'?'pulse':'atelier'):s.musicTheme.value))??musicThemes[0]!)
let active=0,started=false,fade=0,disposed=false
function channels(){return [first.value,second.value]}
function level(){return Math.min(1,s.volume.value*(route.path.startsWith('/drive')?.35:.9))}
function volume(){const audio=channels()[active];if(audio&&!fade)audio.volume=level()}
function begin(){if(disposed||document.hidden||!s.music.value)return;const audio=channels()[active];if(!audio)return;volume();void audio.play().then(()=>{started=true}).catch(()=>{})}
function change(){const pair=channels(),old=pair[active],next=pair[1-active];if(!next)return;cancelAnimationFrame(fade);fade=0;next.pause();next.src=selected.value.src;next.load();next.volume=0;active=1-active
 if(!started||!s.music.value||document.hidden){old?.pause();volume();begin();return}
 void next.play().then(()=>{const start=performance.now(),oldVolume=old?.volume??0;function step(now:number){if(disposed)return;const p=Math.min(1,(now-start)/900);next!.volume=level()*p;if(old)old.volume=oldVolume*(1-p);if(p<1)fade=requestAnimationFrame(step);else{fade=0;old?.pause()}}fade=requestAnimationFrame(step)}).catch(()=>{old?.pause();fade=0;volume()})
}
function visibility(){if(document.hidden){cancelAnimationFrame(fade);fade=0;channels().forEach(a=>a?.pause())}else if(started)begin()}
onMounted(()=>{first.value!.src=selected.value.src;volume();begin();window.addEventListener('pointerdown',begin);window.addEventListener('keydown',begin);document.addEventListener('visibilitychange',visibility)})
watch(selected,change);watch(()=>s.music.value,on=>{if(on)begin();else{cancelAnimationFrame(fade);fade=0;channels().forEach(a=>a?.pause())}});watch(()=>s.volume.value,volume);watch(()=>route.path,volume)
onBeforeUnmount(()=>{disposed=true;cancelAnimationFrame(fade);window.removeEventListener('pointerdown',begin);window.removeEventListener('keydown',begin);document.removeEventListener('visibilitychange',visibility);channels().forEach(a=>{if(a){a.pause();a.removeAttribute('src');a.load()}})})
</script>
<template><audio ref="first" loop preload="auto" hidden /><audio ref="second" loop preload="auto" hidden /></template>
