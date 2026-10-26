import {musicThemes} from '~/data/music'
export default defineNuxtPlugin(()=>{
 const s=useAtelier(),key='velocity-music-v1'
 try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved){if(saved.theme==='auto'||musicThemes.some(t=>t.id===saved.theme))s.musicTheme.value=saved.theme;if(typeof saved.enabled==='boolean')s.music.value=saved.enabled;if(typeof saved.autoAdvance==='boolean')s.musicAutoAdvance.value=saved.autoAdvance;if(typeof saved.interfaceSound==='boolean')s.sound.value=saved.interfaceSound;if(typeof saved.volume==='number'&&Number.isFinite(saved.volume))s.volume.value=Math.max(0,Math.min(1,saved.volume))}}catch{}
 // every visit opens on the first track (01), whatever was playing last time; the visitor can still pick another
 s.musicTheme.value=musicThemes[0]!.id
 const save=()=>{try{localStorage.setItem(key,JSON.stringify({theme:s.musicTheme.value,enabled:s.music.value,autoAdvance:s.musicAutoAdvance.value,interfaceSound:s.sound.value,volume:s.volume.value}))}catch{}}
 save()
 watch([()=>s.musicTheme.value,()=>s.music.value,()=>s.musicAutoAdvance.value,()=>s.sound.value,()=>s.volume.value],save)
})
