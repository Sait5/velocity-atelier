/**
 * Full-screen chapters paged by the mouse wheel and the keyboard: one wheel gesture (or ↓ / PageDown / Space) glides to
 * the next chapter, one the other way to the previous one, and the end of the page is the last stop.
 * CSS scroll snapping did this badly in Chrome together with the site's smooth scrolling: a wheel tick started a smooth
 * scroll, the snap interrupted it and pulled it back, so the page stuck between two chapters until enough scrolling
 * piled up and then jumped. Touch screens keep native scrolling (with soft snapping in CSS).
 * `go(i)` glides to a chapter (the garage's chapter rail); `past` turns true once the page is beyond the last chapter.
 */
export function useChapterPager(selector:string){
 let busy=false,locked=false,acc=0,frame=0,lastWheel=-1e9,track=0
 const past=ref(false)
 const sections=()=>[...document.querySelectorAll<HTMLElement>(selector)]
 const stops=()=>{
  const ys=sections().map(e=>Math.round(e.getBoundingClientRect().top+window.scrollY))
  const end=document.documentElement.scrollHeight-window.innerHeight
  if(!ys.length||ys.at(-1)!<end-4)ys.push(end)
  return ys
 }
 function glide(to:number){
  const from=window.scrollY,start=performance.now(),duration=Math.min(950,Math.max(520,Math.abs(to-from)*.62))
  busy=true;cancelAnimationFrame(frame)
  const step=(t:number)=>{
   const k=Math.min(1,(t-start)/duration),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2
   window.scrollTo({top:from+(to-from)*e,behavior:'instant'})
   if(k<1)frame=requestAnimationFrame(step);else{busy=false;locked=true}
  }
  frame=requestAnimationFrame(step)
 }
 function page(direction:number){
  const ys=stops(),y=window.scrollY
  const to=direction>0?ys.find(s=>s>y+8):[...ys].reverse().find(s=>s<y-8)
  if(to!==undefined)glide(to)
 }
 function go(index:number){
  const el=sections()[index];if(!el)return
  const to=Math.round(el.getBoundingClientRect().top+window.scrollY)
  if(coarse)window.scrollTo({top:to,behavior:'smooth'});else glide(to)
 }
 // One gesture pages once. A trackpad keeps sending ever smaller wheel events for a second or more after the fingers
 // lift (a Mac's inertia), so after a glide the wheel stays locked until its events pause. The pause is measured
 // between the events' own time stamps, not when they are handled: after a stalled frame the browser delivers the
 // queued tail of the inertia at once, and a timer would have taken the stall for the pause and paged again.
 function wheel(e:WheelEvent){
  if(e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return
  e.preventDefault()
  const now=e.timeStamp||performance.now(),gap=now-lastWheel;lastWheel=now
  if(busy)return
  if(locked){if(gap<200)return;locked=false}
  // a pause between gestures also forgets what a previous small nudge left behind
  if(gap>300)acc=0
  acc+=e.deltaMode===1?e.deltaY*33:e.deltaMode===2?e.deltaY*window.innerHeight:e.deltaY
  if(Math.abs(acc)<35)return
  const direction=Math.sign(acc);acc=0;page(direction)
 }
 function key(e:KeyboardEvent){
  const target=e.target as HTMLElement|null
  // Space presses a focused button or link; arrows and Page keys still page from them (the chapter rail keeps focus)
  if(e.altKey||e.ctrlKey||e.metaKey||target?.closest('input,textarea,select,[contenteditable]')||(e.key===' '&&target?.closest('button,a')))return
  const direction=['ArrowDown','PageDown',' '].includes(e.key)?(e.shiftKey&&e.key===' '?-1:1):['ArrowUp','PageUp'].includes(e.key)?-1:0
  if(!direction)return
  e.preventDefault();if(!busy)page(direction)
 }
 function where(){track=0;const last=sections().at(-1);if(last)past.value=last.getBoundingClientRect().bottom<window.innerHeight*.5}
 const queue=()=>{if(!track)track=requestAnimationFrame(where)}
 const coarse=import.meta.client&&matchMedia('(hover: none) and (pointer: coarse)').matches
 onMounted(()=>{window.addEventListener('scroll',queue,{passive:true});if(coarse)return;window.addEventListener('wheel',wheel,{passive:false});window.addEventListener('keydown',key)})
 onBeforeUnmount(()=>{window.removeEventListener('scroll',queue);window.removeEventListener('wheel',wheel);window.removeEventListener('keydown',key);cancelAnimationFrame(frame);cancelAnimationFrame(track)})
 return {go,past}
}
