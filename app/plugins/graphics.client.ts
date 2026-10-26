export default defineNuxtPlugin(()=>{
 const s=useAtelier(),key='velocity-graphics-v1'
 let saved:{quality?:string,fps?:number,bloom?:boolean,auto?:boolean}|null=null
 try{saved=JSON.parse(localStorage.getItem(key)||'null')}catch{}
 // A visitor who never chose a preset starts on one that suits the device: Ultra (a full-size render with post effects)
 // made phones drop the page and Retina MacBooks lag. Phones and tablets get Medium, Macs and laptops on integrated
 // graphics High, the rest Ultra. A preset picked in the settings is kept as it is.
 if(!saved||saved.auto){s.quality.value=deviceQuality();if(s.quality.value==='Medium')s.bloom.value=false}
 if(saved&&!saved.auto){if(['Medium','High','Ultra'].includes(saved.quality!))s.quality.value=saved.quality!;if([0,30,60,120].includes(saved.fps!))s.fpsLimit.value=saved.fps!;if(typeof saved.bloom==='boolean')s.bloom.value=saved.bloom;s.graphicsPrompt.value=false}
 let auto=!saved||!!saved.auto
 const write=()=>{try{localStorage.setItem(key,JSON.stringify({quality:s.quality.value,fps:s.fpsLimit.value,bloom:s.bloom.value,auto}))}catch{}}
 write()
 watch([()=>s.quality.value,()=>s.fpsLimit.value,()=>s.bloom.value],()=>{auto=false;write()})
})

/** Medium on phones and tablets, High on Macs and integrated GPUs, Ultra otherwise. */
export function deviceQuality():'Medium'|'High'|'Ultra'{
 const ua=navigator.userAgent,touch=navigator.maxTouchPoints>0&&matchMedia('(pointer:coarse)').matches
 if(/iPhone|iPad|iPod|Android|Mobile/i.test(ua)||touch)return 'Medium'
 let gpu=''
 try{const gl=document.createElement('canvas').getContext('webgl');const info=gl?.getExtension('WEBGL_debug_renderer_info');gpu=info?String(gl!.getParameter(info.UNMASKED_RENDERER_WEBGL)):'';gl?.getExtension('WEBGL_lose_context')?.loseContext()}catch{}
 if(/Mac/i.test(navigator.platform)||/Apple|Intel|Iris|UHD|Mali|Adreno|PowerVR|SwiftShader|llvmpipe/i.test(gpu))return 'High'
 return 'Ultra'
}
