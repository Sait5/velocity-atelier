import {musicThemes} from '~/data/music'
export default defineNuxtPlugin(()=>{
 const s=useAtelier(),key='velocity-music-v1'
 try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved){if(saved.theme==='auto'||musicThemes.some(t=>t.id===saved.theme))s.musicTheme.value=saved.theme;if(typeof saved.enabled==='boolean')s.music.value=saved.enabled}}catch{}
 watch([()=>s.musicTheme.value,()=>s.music.value],()=>{try{localStorage.setItem(key,JSON.stringify({theme:s.musicTheme.value,enabled:s.music.value}))}catch{}})
})
