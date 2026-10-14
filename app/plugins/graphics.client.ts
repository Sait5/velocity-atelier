export default defineNuxtPlugin(()=>{
 const s=useAtelier(),key='velocity-graphics-v1'
 try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved){if(['Medium','High','Ultra'].includes(saved.quality))s.quality.value=saved.quality;if([0,30,60,120].includes(saved.fps))s.fpsLimit.value=saved.fps;if(typeof saved.bloom==='boolean')s.bloom.value=saved.bloom;s.graphicsPrompt.value=false}}catch{}
 watch([()=>s.quality.value,()=>s.fpsLimit.value,()=>s.graphicsPrompt.value,()=>s.bloom.value],()=>{try{localStorage.setItem(key,JSON.stringify({quality:s.quality.value,fps:s.fpsLimit.value,bloom:s.bloom.value}))}catch{}})
})

