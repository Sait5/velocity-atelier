export default defineNuxtPlugin(nuxtApp=>{
 const audio=useAudio()
 const play=(event:Event)=>{const target=event.target;if(target instanceof Element&&target.closest('button,a,input[type="checkbox"],select'))audio.click()}
 nuxtApp.hook('app:mounted',()=>{document.addEventListener('click',play);document.addEventListener('change',play)})
 if(import.meta.hot)import.meta.hot.dispose(()=>{document.removeEventListener('click',play);document.removeEventListener('change',play)})
})
