<script setup lang="ts">
const s=useAtelier(),{t}=useLocale()
</script>
<template><div class="graphics-controls"><label>{{t('Качество графики','Graphics quality')}}<select v-model="s.quality.value"><option value="Medium">{{t('Среднее','Medium')}}</option><option value="High">{{t('Высокое','High')}}</option><option value="Ultra">{{t('Ультра','Ultra')}}</option></select></label><label>{{t('Ограничение FPS','FPS limit')}}<select v-model.number="s.fpsLimit.value"><option :value="30">30 FPS</option><option :value="60">60 FPS</option><option :value="120">120 FPS</option><option :value="0">{{t('Без ограничения','Unlimited')}}</option></select></label></div></template>
<style scoped>.graphics-controls{display:grid;gap:14px}.graphics-controls label{display:flex;align-items:center;justify-content:space-between;gap:20px;font-size:12px}.graphics-controls select{background:#202928;border:1px solid #47504b;border-radius:7px;color:#e7eadc;padding:8px}</style>
