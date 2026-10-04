<script setup lang="ts">
import {renderRoadPreview} from '~/three/roadPreview'
const props=defineProps<{map:'italy'|'night'}>(),src=ref(''),failed=ref(false),{t}=useLocale()
onMounted(async()=>{try{src.value=await renderRoadPreview(props.map)}catch{failed.value=true}})
</script>
<template><div class="road-preview"><img v-if="src" :src="src" :alt="map==='italy'?t('Итальянская улица — превью карты','Italian streets — map preview'):t('Ночная дорога — превью карты','Night road — map preview')" width="720" height="400"><span v-else>{{failed?t('Превью недоступно','Preview unavailable'):t('ГОТОВИМ ПРЕВЬЮ','RENDERING PREVIEW')}}</span></div></template>
<style scoped>.road-preview{height:135px;background:#141b20;border-radius:7px;overflow:hidden;display:grid;place-items:center}.road-preview img{display:block;width:100%;height:100%;object-fit:cover}.road-preview span{font-size:8px;letter-spacing:1.5px;color:#aab8bd}@media(max-width:650px){.road-preview{height:100px}}</style>
