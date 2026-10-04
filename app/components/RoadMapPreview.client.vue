<script setup lang="ts">
const props=defineProps<{map:'italy'|'night'}>(),{t}=useLocale()
const src=computed(()=>'/images/maps/'+props.map+'.webp?v=2')
</script>
<template><div class="road-preview"><img :src="src" :alt="map==='italy'?t('Итальянская улица — превью карты','Italian streets — map preview'):t('Ночная дорога — превью карты','Night road — map preview')" width="1600" height="900"></div></template>
<style scoped>.road-preview{height:135px;background:#141b20;border-radius:7px;overflow:hidden;display:grid;place-items:center}.road-preview img{display:block;width:100%;height:100%;object-fit:cover}.road-preview span{font-size:8px;letter-spacing:1.5px;color:#aab8bd}@media(max-width:650px){.road-preview{height:100px}}</style>
