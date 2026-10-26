/**
 * Depth while the chapters glide past: each chapter's film (or photograph) travels slower than the page, grows a little
 * and dims as it leaves or before it arrives, and its copy rides on a layer of its own. Driven by the scroll position,
 * so it follows the wheel pager's glide frame by frame. Media are laid 16vh taller than their chapter (CSS) so the
 * slower travel never uncovers an edge. Touch screens keep plain scrolling.
 * Only transform and opacity change, so the browser composites the frames without restyling the films: the dimming is
 * a black layer's opacity (a brightness filter on a 1080p film was redone on every frame).
 */
export function useChapterParallax(section:string,media:string,copy:string,dim:string){
 let frame=0
 function update(){
  frame=0
  const vh=window.innerHeight,list=[...document.querySelectorAll<HTMLElement>(section)]
  // every position first, then every write: no layout is forced in between
  const ps=list.map(s=>Math.max(-1,Math.min(1,s.getBoundingClientRect().top/vh)))
  list.forEach((s,i)=>{
   const p=ps[i]!,k=Math.abs(p)
   for(const m of s.querySelectorAll<HTMLElement>(media)){m.style.translate=`0 ${(-p*16).toFixed(2)}vh`;m.style.scale=String(1+k*.07)}
   const d=s.querySelector<HTMLElement>(dim)
   if(d)d.style.opacity=(k*.55).toFixed(3)
   const c=s.querySelector<HTMLElement>(copy)
   if(c)c.style.translate=`0 ${(p*10).toFixed(2)}vh`
  })
 }
 const queue=()=>{if(!frame)frame=requestAnimationFrame(update)}
 const coarse=import.meta.client&&matchMedia('(hover: none) and (pointer: coarse)').matches
 onMounted(()=>{if(coarse)return;window.addEventListener('scroll',queue,{passive:true});window.addEventListener('resize',queue);void nextTick(queue)})
 onBeforeUnmount(()=>{window.removeEventListener('scroll',queue);window.removeEventListener('resize',queue);cancelAnimationFrame(frame)})
}
