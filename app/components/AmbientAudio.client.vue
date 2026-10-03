<script setup lang="ts">
const s=useAtelier(),route=useRoute(),element=ref<HTMLAudioElement>();let audio:HTMLAudioElement|undefined,started=false
function volume(){if(audio)audio.volume=Math.min(1,s.volume.value*(route.path.startsWith('/drive')?.16:.45))}
function begin(){if(!audio||!s.music.value)return;volume();void audio.play().then(()=>{started=true}).catch(()=>{})}
function visibility(){if(document.hidden)audio?.pause();else if(started)begin()}
onMounted(()=>{audio=element.value;volume();begin();window.addEventListener('pointerdown',begin);window.addEventListener('keydown',begin);document.addEventListener('visibilitychange',visibility)})
watch(()=>s.music.value,on=>{if(on)begin();else audio?.pause()});watch(()=>s.volume.value,volume);watch(()=>route.path,volume)
onBeforeUnmount(()=>{window.removeEventListener('pointerdown',begin);window.removeEventListener('keydown',begin);document.removeEventListener('visibilitychange',visibility);audio?.pause();if(audio)audio.src=''})
</script>
<template><audio ref="element" src="/audio/atelier-ambient.wav" loop preload="auto" hidden /></template>
