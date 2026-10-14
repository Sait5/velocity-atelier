<script setup lang="ts">
import {musicThemes,musicForVehicle} from '~/data/music'
const s=useAtelier(),route=useRoute(),first=ref<HTMLAudioElement>(),second=ref<HTMLAudioElement>()
const selected=computed(()=>musicThemes.find(t=>t.id===(s.musicTheme.value==='auto'?musicForVehicle(s.car.value.id):s.musicTheme.value))??musicThemes[0]!)
let active=0,started=false,fade=0,disposed=false,selectionVersion=0
function channels(){return [first.value,second.value]}
function level(){return Math.max(0,Math.min(1,s.volume.value*selected.value.gain*(route.path.startsWith('/drive')?.35:.9)))}
function volume(){const audio=channels()[active];if(audio&&!fade)audio.volume=level()}
function ended(channel:number){if(channel!==active||disposed||!s.music.value||!s.musicAutoAdvance.value)return;const index=musicThemes.findIndex(t=>t.id===selected.value.id);s.musicTheme.value=musicThemes[(index+1)%musicThemes.length]!.id}
function begin(){if(disposed||document.hidden||!s.music.value)return;const audio=channels()[active];if(!audio)return;if(!audio.getAttribute("src"))audio.src=selected.value.src;volume();void audio.play().then(()=>{started=true}).catch(()=>{})}
function change(){const version=++selectionVersion,pair=channels(),old=pair[active],next=pair[1-active];if(!next)return;cancelAnimationFrame(fade);fade=0;next.pause();next.src=selected.value.src;next.load();next.volume=0;active=1-active
 if(!started||!s.music.value||document.hidden){old?.pause();volume();begin();return}
 void next.play().then(()=>{if(disposed||version!==selectionVersion||!s.music.value||document.hidden)return;const start=performance.now(),oldVolume=old?.volume??0;function step(now:number){if(disposed||version!==selectionVersion)return;const p=Math.max(0,Math.min(1,(now-start)/900));next!.volume=level()*p;if(old)old.volume=oldVolume*(1-p);if(p<1)fade=requestAnimationFrame(step);else{fade=0;old?.pause()}}fade=requestAnimationFrame(step)}).catch(()=>{if(version!==selectionVersion)return;old?.pause();fade=0;volume()})
}
function visibility(){if(document.hidden){cancelAnimationFrame(fade);fade=0;channels().forEach(a=>a?.pause())}else if(started)begin()}
onMounted(async()=>{await nextTick();if(disposed)return;if(first.value)first.value.src=selected.value.src;volume();begin();window.addEventListener('pointerdown',begin);window.addEventListener('keydown',begin);document.addEventListener('visibilitychange',visibility)})
watch(selected,change);watch(()=>s.music.value,on=>{if(on)begin();else{cancelAnimationFrame(fade);fade=0;channels().forEach(a=>a?.pause())}});watch(()=>s.volume.value,volume);watch(()=>route.path,volume)
onBeforeUnmount(()=>{disposed=true;cancelAnimationFrame(fade);window.removeEventListener('pointerdown',begin);window.removeEventListener('keydown',begin);document.removeEventListener('visibilitychange',visibility);channels().forEach(a=>{if(a){a.pause();a.removeAttribute('src');a.load()}})})
</script>
<template><div hidden><audio ref="first" :loop="!s.musicAutoAdvance.value" preload="auto" @ended="ended(0)" /><audio ref="second" :loop="!s.musicAutoAdvance.value" preload="auto" @ended="ended(1)" /></div></template>
