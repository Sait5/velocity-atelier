/** User recording: 0вЂ“25s acceleration; 27sвЂ“end coast, at original pitch. */
export function createTourbillonEngineAudio(){
 let context:AudioContext|undefined,master:GainNode|undefined,loading:Promise<void>|undefined,disposed=false
 const timing:Record<string,{loopStart:number,loopEnd:number}>={}
 const abort=new AbortController(),buffers=new Map<string,AudioBuffer>()
 type Take={source:AudioBufferSourceNode,gain:GainNode}
 const playing=new Set<Take>()
 let active:Take|undefined,mode='',lastEnabled=false,coastEntrySpeed=0
 let desired={throttle:false,volume:0,enabled:false,speed:0,inside:false,braking:false}
 function apply(){
  if(!context||!master||buffers.size!==4||disposed)return
  const now=context.currentTime,moving=Math.abs(desired.speed)>.01
  const ignition=desired.enabled&&!lastEnabled&&!moving&&!desired.throttle
  const velocity=Math.abs(desired.speed)
  const timeToStop=desired.braking?velocity/(1.05*9.81):Math.log1p(velocity*.015/.4)/.015
  const finishing=mode==='coast-end'||((mode==='coast'||moving)&&timeToStop<=2)
  const next=desired.enabled?(desired.throttle&&!desired.braking?'acceleration':moving?(finishing?'coast-end':'coast'):mode==='coast-end'&&active?'coast-end':ignition||mode==='ignition'?'ignition':''):''
  if((next==='coast'||next==='coast-end')&&mode!=='coast'&&mode!=='coast-end')coastEntrySpeed=Math.max(velocity,.01)
  lastEnabled=desired.enabled
  if(next!==mode){
   if(active){active.gain.gain.setTargetAtTime(0,now,.04);try{active.source.stop(now+.25)}catch{};active=undefined}
   mode=next
   if(next){
    const source=context.createBufferSource(),gain=context.createGain()
    source.buffer=buffers.get(next)!;source.loop=next==='acceleration'||next==='coast';source.playbackRate.value=1
    if(source.loop){source.loopStart=timing[next]!.loopStart;source.loopEnd=timing[next]!.loopEnd}
    gain.gain.value=0;source.connect(gain);gain.connect(master)
    const take={source,gain};playing.add(take)
    source.onended=()=>{playing.delete(take);source.disconnect();gain.disconnect();if(active===take)active=undefined}
    source.start();gain.gain.setTargetAtTime(1,now,.04);active=take
   }
  }
  const coasting=mode==='coast'||mode==='coast-end'
  const speedFade=coasting?Math.pow(Math.min(1,velocity/Math.max(coastEntrySpeed,.01)),.65):mode?1:0
  master.gain.setTargetAtTime(desired.enabled?speedFade*Math.max(0,Math.min(1,desired.volume))*(desired.inside?.6:1):0,now,.05)
 }
 function preload(){
  if(disposed)return Promise.resolve()
  if(loading)return loading
  context=new AudioContext();master=context.createGain();master.gain.value=0;master.connect(context.destination)
  const ctx=context
  const timingReady=fetch('/audio/bugatti/user-loop-timing.json?v=4',{signal:abort.signal}).then(async response=>{if(!response.ok)throw Error('Bugatti loop timing unavailable');Object.assign(timing,await response.json())})
  loading=Promise.all([timingReady,...['acceleration','coast','coast-end','ignition'].map(async name=>{
   const response=await fetch('/audio/bugatti/user-'+name+(name==='ignition'||name==='coast-end'?'':'-continuous')+'.flac?v=5',{signal:abort.signal})
   if(!response.ok)throw Error('Bugatti recording unavailable')
   const buffer=await ctx.decodeAudioData(await response.arrayBuffer());if(!disposed)buffers.set(name,buffer)
  })]).then(()=>apply()).catch(error=>{if(!disposed)console.warn('Bugatti audio could not load',error)})
  return loading
 }
 function start(){if(disposed)return;void preload();void context?.resume()}
 function update(_rpm:number,throttle:boolean,volume:number,enabled:boolean,speed=0,_shifting=false,inside=false,braking=false){desired={throttle,volume,enabled,speed,inside,braking};apply()}
 function dispose(){disposed=true;abort.abort();playing.forEach(({source})=>{try{source.stop()}catch{}});playing.clear();buffers.clear();void context?.close();context=undefined}
 return {preload,start,update,dispose}
}
