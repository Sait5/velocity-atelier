/**
 * Full-screen chapters paged by the mouse wheel and the keyboard: one wheel gesture (or ↓ / PageDown / Space) glides to
 * the next chapter, one the other way to the previous one, and the end of the page is the last stop.
 * CSS scroll snapping did this badly in Chrome together with the site's smooth scrolling: a wheel tick started a smooth
 * scroll, the snap interrupted it and pulled it back, so the page stuck between two chapters until enough scrolling
 * piled up and then jumped. Touch screens keep native scrolling (with soft snapping in CSS).
 */
export function useChapterPager(selector:string){
 let busy=false,acc=0,frame=0,lastWheel=0,quiet=0
 const stops=()=>{
  const ys=[...document.querySelectorAll<HTMLElement>(selector)].map(e=>Math.round(e.getBoundingClientRect().top+window.scrollY))
  const end=document.documentElement.scrollHeight-window.innerHeight
  if(!ys.length||ys.at(-1)!<end-4)ys.push(end)
  return ys
 }
 // after a glide, wait until the wheel has been still for a moment: a trackpad's inertia must not page again
 function settle(){window.clearTimeout(quiet);quiet=window.setTimeout(()=>{if(performance.now()-lastWheel<180)settle();else{busy=false;acc=0}},120)}
 function glide(to:number){
  const from=window.scrollY,start=performance.now(),duration=Math.min(950,Math.max(520,Math.abs(to-from)*.62))
  busy=true;cancelAnimationFrame(frame)
  const step=(t:number)=>{
   const k=Math.min(1,(t-start)/duration),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2
   window.scrollTo({top:from+(to-from)*e,behavior:'instant'})
   if(k<1)frame=requestAnimationFrame(step);else settle()
  }
  frame=requestAnimationFrame(step)
 }
 function page(direction:number){
  const ys=stops(),y=window.scrollY
  const to=direction>0?ys.find(s=>s>y+8):[...ys].reverse().find(s=>s<y-8)
  if(to!==undefined)glide(to)
 }
 function wheel(e:WheelEvent){
  if(e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return
  e.preventDefault();lastWheel=performance.now()
  if(busy)return
  acc+=e.deltaMode===1?e.deltaY*33:e.deltaMode===2?e.deltaY*window.innerHeight:e.deltaY
  if(Math.abs(acc)<35)return
  const direction=Math.sign(acc);acc=0;page(direction)
 }
 function key(e:KeyboardEvent){
  const target=e.target as HTMLElement|null
  if(e.altKey||e.ctrlKey||e.metaKey||target?.closest('input,textarea,select,button,[contenteditable]'))return
  const direction=['ArrowDown','PageDown',' '].includes(e.key)?(e.shiftKey&&e.key===' '?-1:1):['ArrowUp','PageUp'].includes(e.key)?-1:0
  if(!direction)return
  e.preventDefault();if(!busy)page(direction)
 }
 const coarse=import.meta.client&&matchMedia('(hover: none) and (pointer: coarse)').matches
 onMounted(()=>{if(coarse)return;window.addEventListener('wheel',wheel,{passive:false});window.addEventListener('keydown',key)})
 onBeforeUnmount(()=>{window.removeEventListener('wheel',wheel);window.removeEventListener('keydown',key);cancelAnimationFrame(frame);window.clearTimeout(quiet)})
}
