<script setup lang="ts">
// The garage pages by chapters, so instead of the system scrollbar (hidden there: it looked different in every browser
// and its thumb could stop between two chapters) the right edge carries one thin mark per car. The chapter on screen is
// lit, hovering a mark names its car and a click glides to it. It fades away below the last chapter.
defineProps<{names:string[],current:number,past:boolean}>()
const emit=defineEmits<{go:[index:number]}>()
const {t}=useLocale()
const two=(n:number)=>String(n).padStart(2,'0')
</script>

<template><nav class="chapter-rail" :class="{past}" :aria-label="t('Главы гаража','Garage chapters')">
 <button v-for="(n,i) in names" :key="n" type="button" :aria-current="i===current?'true':undefined" :aria-label="n" @click="emit('go',i)"><span>{{n}}</span></button>
 <small aria-hidden="true">{{two(current+1)}}<i>/</i>{{two(names.length)}}</small>
</nav></template>

<style scoped>
.chapter-rail{position:fixed;z-index:20;right:14px;top:50%;display:flex;flex-direction:column;align-items:flex-end;transform:translateY(-50%);transition:opacity .4s ease}
.chapter-rail.past{opacity:0;pointer-events:none}
.chapter-rail button{position:relative;display:block;width:34px;height:22px;padding:0}
.chapter-rail button::before{content:'';position:absolute;right:6px;top:50%;width:24px;height:2px;margin-top:-1px;border-radius:2px;background:#f1f2ea;box-shadow:0 0 3px #0009;opacity:.45;transform:scaleX(.5);transform-origin:right;transition:transform .35s cubic-bezier(.2,.7,.2,1),opacity .25s,background .25s}
.chapter-rail button:hover::before,.chapter-rail button:focus-visible::before{opacity:.85;transform:scaleX(.75)}
.chapter-rail button[aria-current=true]::before{background:var(--accent);opacity:1;transform:none}
.chapter-rail button span{position:absolute;right:40px;top:50%;padding:5px 10px;border-radius:20px;background:#050706cc;color:#f1f2ea;font-family:Barlow Condensed,Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;white-space:nowrap;pointer-events:none;opacity:0;transform:translate(6px,-50%);transition:opacity .2s,transform .2s}
.chapter-rail button:hover span,.chapter-rail button:focus-visible span{opacity:1;transform:translate(0,-50%)}
.chapter-rail button:focus-visible{outline:none}
.chapter-rail small{margin:8px 6px 0 0;font-family:Barlow Condensed,Arial,sans-serif;font-size:10px;letter-spacing:1.5px;color:#c9cec6;text-shadow:0 1px 3px #000b;font-variant-numeric:tabular-nums}
.chapter-rail small i{font-style:normal;margin:0 3px;opacity:.5}
/* phones and tablets: smaller marks, no names (there is no hover), clear of the copy at the bottom */
@media (hover:none) and (pointer:coarse){.chapter-rail button span{display:none}}
@media(max-width:700px){.chapter-rail{right:2px;top:calc(50% - 70px)}.chapter-rail button{width:26px;height:18px}.chapter-rail button::before{right:6px;width:16px}.chapter-rail small{display:none}}
@media(prefers-reduced-motion:reduce){.chapter-rail,.chapter-rail button::before,.chapter-rail button span{transition:none}}
</style>
