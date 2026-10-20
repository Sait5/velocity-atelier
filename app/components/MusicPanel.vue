<script setup lang="ts">
import {musicThemes,musicForVehicle} from '~/data/music'
// The music dialog: what is playing (with a live equaliser while it plays), transport and volume, how tracks follow each
// other, and the whole library as a list.
const s=useAtelier(),{t}=useLocale()
const currentId=computed(()=>s.musicTheme.value==='auto'?musicForVehicle(s.car.value.id):s.musicTheme.value)
const current=computed(()=>musicThemes.find(theme=>theme.id===currentId.value)??musicThemes[0]!)
const index=computed(()=>musicThemes.findIndex(theme=>theme.id===current.value.id))
function pick(id:string){s.musicTheme.value=id;s.music.value=true}
function step(direction:number){pick(musicThemes[(index.value+direction+musicThemes.length)%musicThemes.length]!.id)}
const credited=musicThemes.filter(theme=>theme.artist==='Scott Buckley').map(theme=>theme.name).join(', ')
</script>

<template><section class="music-panel" :aria-label="t('Музыка','Music')">
 <div class="now" :class="{playing:s.music.value}">
  <div class="cover" aria-hidden="true"><i v-for="n in 5" :key="n" /></div>
  <div class="now-copy"><small>{{s.music.value?t('СЕЙЧАС ИГРАЕТ','NOW PLAYING'):t('МУЗЫКА ВЫКЛЮЧЕНА','MUSIC OFF')}}</small><strong>{{current.name}}</strong><span>{{current.artist}} · {{current.genre}}</span></div>
 </div>
 <div class="transport">
  <button type="button" class="round" :aria-label="t('Предыдущий трек','Previous track')" @click="step(-1)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6v12M18 6l-8 6 8 6z"/></svg></button>
  <button type="button" class="round play" :aria-label="s.music.value?t('Пауза','Pause'):t('Играть','Play')" @click="s.music.value=!s.music.value"><svg v-if="s.music.value" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg><svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg></button>
  <button type="button" class="round" :aria-label="t('Следующий трек','Next track')" @click="step(1)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 6v12M6 6l8 6-8 6z"/></svg></button>
  <label class="volume"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/></svg><input v-model.number="s.volume.value" type="range" min="0" max="1" step="0.01" :aria-label="t('Громкость','Volume')"><b>{{Math.round(s.volume.value*100)}}%</b></label>
 </div>
 <div class="modes" role="group" :aria-label="t('Порядок треков','Track order')">
  <button type="button" :aria-pressed="s.musicAutoAdvance.value" @click="s.musicAutoAdvance.value=true">{{t('Подряд','Play through')}}</button>
  <button type="button" :aria-pressed="!s.musicAutoAdvance.value" @click="s.musicAutoAdvance.value=false">{{t('Повтор трека','Repeat track')}}</button>
 </div>
 <ol class="tracks">
  <li v-for="(theme,i) in musicThemes" :key="theme.id"><button type="button" :aria-current="theme.id===current.id" @click="pick(theme.id)">
   <span class="number">{{theme.id===current.id&&s.music.value?'':String(i+1).padStart(2,'0')}}<span v-if="theme.id===current.id&&s.music.value" class="mini" aria-hidden="true"><i /><i /><i /></span></span>
   <span class="title">{{theme.name}}<small>{{theme.genre}}</small></span><span class="artist">{{theme.artist}}</span>
  </button></li>
 </ol>
 <p class="credit">{{credited}} — <a href="https://www.scottbuckley.com.au/library/" target="_blank" rel="noopener">Scott Buckley</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a></p>
</section></template>

<style scoped>
.music-panel{display:flex;flex-direction:column;gap:16px;margin-top:6px}
.now{display:flex;align-items:center;gap:16px;padding:16px;border:1px solid #ffffff1c;border-radius:14px;background:linear-gradient(135deg,#1d2a1f,#0f1411)}
.cover{width:64px;height:64px;flex:none;border-radius:10px;background:radial-gradient(circle at 30% 30%,#2d3b2b,#111712);display:flex;align-items:flex-end;justify-content:center;gap:4px;padding:12px 10px}
.cover i{width:6px;height:10px;border-radius:3px;background:var(--accent);opacity:.45}
.now.playing .cover i{opacity:1;animation:eq 1.1s ease-in-out infinite}
.now.playing .cover i:nth-child(2){animation-delay:-.4s}.now.playing .cover i:nth-child(3){animation-delay:-.75s}.now.playing .cover i:nth-child(4){animation-delay:-.2s}.now.playing .cover i:nth-child(5){animation-delay:-.6s}
@keyframes eq{0%,100%{height:8px}50%{height:38px}}
.now-copy{display:flex;flex-direction:column;gap:4px;min-width:0}
.now-copy small{font-size:9px;letter-spacing:2.5px;color:var(--accent)}
.music-panel{scrollbar-color:#3a4538 transparent}
.now-copy strong{font-size:20px;font-weight:600;letter-spacing:-.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.now-copy span{font-size:11px;color:#a3ad9f}
.transport{display:flex;align-items:center;gap:10px}
.round{width:40px;height:40px;flex:none;border-radius:50%;border:1px solid #ffffff2a;display:grid;place-items:center;transition:border-color .2s,color .2s,background .2s}
.round svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.round.play{width:48px;height:48px;background:var(--accent);border-color:var(--accent);color:#10150f}
.round.play svg{fill:currentColor}
.round:hover{border-color:var(--accent);color:var(--accent)}.round.play:hover{background:#eaf8b8;color:#10150f}
.volume{display:flex;align-items:center;gap:8px;flex:1;margin-left:6px;font-size:11px;color:#a3ad9f;border:0;padding:0}
.volume svg{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linejoin:round}
.volume input{flex:1;accent-color:var(--accent)}.volume b{font-weight:500;min-width:34px;text-align:right}
.modes{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
.modes button{padding:9px 6px;border:1px solid #ffffff22;border-radius:9px;font-size:11px;color:#cfd6c9;transition:border-color .2s,color .2s,background .2s}
.modes button[aria-pressed=true]{border-color:var(--accent);color:var(--accent);background:#d9ec8a14}
.tracks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px;max-height:min(32vh,300px);overflow-y:auto;scrollbar-width:thin;scrollbar-color:#3a4538 transparent;border-top:1px solid #ffffff14;padding-top:8px}
.tracks button{width:100%;display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:10px;padding:9px 10px;border-radius:9px;text-align:left;font-size:12px;color:#dfe4d8;transition:background .15s,color .15s}
.tracks button:hover{background:#ffffff0a}
.tracks button[aria-current=true]{background:#d9ec8a14;color:#f1f6e0}
.number{font-size:11px;color:#7f897b;font-variant-numeric:tabular-nums;display:flex;align-items:center}
.title{display:flex;flex-direction:column;gap:2px;min-width:0}.title small{font-family:Manrope,Arial,sans-serif;letter-spacing:0;font-size:10px;color:#8f998b}
.artist{font-size:10px;color:#8f998b;white-space:nowrap}
.mini{display:flex;align-items:flex-end;gap:2px;height:14px}.mini i{width:3px;height:6px;border-radius:2px;background:var(--accent);animation:eq-mini .9s ease-in-out infinite}.mini i:nth-child(2){animation-delay:-.3s}.mini i:nth-child(3){animation-delay:-.6s}
@keyframes eq-mini{0%,100%{height:4px}50%{height:14px}}
.credit{font-size:10px!important;line-height:1.6!important;color:#8f998b!important;margin:0}.credit a{text-decoration:underline}
@media(prefers-reduced-motion:reduce){.now.playing .cover i,.mini i{animation:none}}
@media(max-width:600px){.transport{flex-wrap:wrap}.volume{flex-basis:100%;margin:6px 0 0}.artist{display:none}.tracks button{grid-template-columns:28px 1fr}}
</style>
