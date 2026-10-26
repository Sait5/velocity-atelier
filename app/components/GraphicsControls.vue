<script setup lang="ts">
// Graphics settings: quality (with what each level changes), frame-rate limit, shadows and glow, and the scene's live
// frame rate so the effect of a change is visible at once.
const s=useAtelier(),{t}=useLocale()
const performance=useState<{fps:number,visible:boolean}>('scene-performance')
const qualities=[{id:'Medium',ru:'Среднее',en:'Medium',note:['Без постобработки, обычная чёткость, облегчённые текстуры — для телефонов и слабых ноутбуков','No post-processing, standard resolution, lighter textures — for phones and slower laptops']},{id:'High',ru:'Высокое',en:'High',note:['Сглаживание, блики, полуторная чёткость','Anti-aliasing, glow, 1.5× resolution']},{id:'Ultra',ru:'Ультра',en:'Ultra',note:['Максимальная чёткость (2×) и все эффекты','Full 2× resolution and every effect']}] as const
const limits=[{value:30,label:'30'},{value:60,label:'60'},{value:120,label:'120'},{value:0,label:'∞'}]
const note=computed(()=>qualities.find(q=>q.id===s.quality.value)?.note??qualities[2].note)
</script>
<template><div class="graphics-controls">
 <div class="group"><span class="caption">{{t('Качество','Quality')}}</span><div class="chips three"><button v-for="q in qualities" :key="q.id" type="button" :aria-pressed="s.quality.value===q.id" @click="s.quality.value=q.id">{{t(q.ru,q.en)}}</button></div><small class="note">{{t(note[0],note[1])}}</small></div>
 <div class="group"><span class="caption">{{t('Ограничение FPS','FPS limit')}}<b v-if="performance?.visible">{{t('сейчас','now')}} {{performance.fps}} FPS</b></span><div class="chips four"><button v-for="l in limits" :key="l.value" type="button" :aria-pressed="s.fpsLimit.value===l.value" @click="s.fpsLimit.value=l.value">{{l.label}}</button></div></div>
 <div class="toggles"><label><input v-model="s.shadows.value" class="switch" type="checkbox">{{t('Тени','Shadows')}}</label><label><input v-model="s.bloom.value" class="switch" type="checkbox">{{t('Блики','Glow')}}</label></div>
</div></template>
<style scoped>
.graphics-controls{display:grid;gap:16px}
.group{display:flex;flex-direction:column;gap:9px}
.caption{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#aab6a6}
.caption b{font-weight:500;font-size:10px;color:var(--accent);font-variant-numeric:tabular-nums}
.chips{display:grid;gap:6px}.chips.three{grid-template-columns:repeat(3,1fr)}.chips.four{grid-template-columns:repeat(4,1fr)}
.chips button{min-height:38px;padding:8px 6px;border:1px solid #ffffff24;border-radius:9px;background:#ffffff04;color:#e7eadc;font-size:12px;transition:border-color .2s,color .2s,background .2s}
.chips button:hover{border-color:#d9ec8a80}
.chips button[aria-pressed=true]{border-color:var(--accent);background:#d9ec8a1a;color:var(--accent)}
.chips button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.note{font-size:10px;line-height:1.5;color:#8f998b;letter-spacing:0;font-family:Manrope,Arial,sans-serif}
.toggles{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.toggles label{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border:1px solid #ffffff1c;border-radius:9px;font-size:12px;color:#dfe4d8;cursor:pointer}
.toggles input{accent-color:var(--accent);width:16px;height:16px;order:2}
</style>
