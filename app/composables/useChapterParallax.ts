/**
 * Depth while the chapters glide past: each chapter's film (or photograph) travels slower than the page, grows a little
 * and dims as it leaves or before it arrives, and its copy rides on a layer of its own. Driven by the scroll position,
 * so it follows the wheel pager's glide frame by frame. Media are laid 16vh taller than their chapter (CSS) so the
 * slower travel never uncovers an edge. Touch screens keep plain scrolling.
 */
export function useChapterParallax(section:string,media:string,copy:string){
 let frame=0
 function update(){
  frame=0
  const vh=window.innerHeight
  for(const s of document.querySelectorAll<HTMLElement>(section)){
   const p=Math.max(-1,Math.min(1,s.getBoundingClientRect().top/vh)),k=Math.abs(p)
   for(const m of s.querySelectorAll<HTMLElement>(media)){
    m.style.translate=`0 ${(-p*16).toFixed(2)}vh`
    m.style.scale=String(1+k*.07)
    m.style.filter=k>.002?`brightness(${(1-k*.55).toFixed(3)})`:''
   }
   const c=s.querySelector<HTMLElement>(copy)
   if(c)c.style.translate=`0 ${(p*10).toFixed(2)}vh`
  }
 }
 const queue=()=>{if(!frame)frame=requestAnimationFrame(update)}
 const coarse=import.meta.client&&matchMedia('(hover: none) and (pointer: coarse)').matches
 onMounted(()=>{if(coarse)return;window.addEventListener('scroll',queue,{passive:true});window.addEventListener('resize',queue);void nextTick(update)})
 onBeforeUnmount(()=>{window.removeEventListener('scroll',queue);window.removeEventListener('resize',queue);cancelAnimationFrame(frame)})
}
