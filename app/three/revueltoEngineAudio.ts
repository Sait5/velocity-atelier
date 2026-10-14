/** Owner-selected V12 recording. Original speed and pitch; baked long circular continuation. */
export function createRevueltoEngineAudio(){
 let context:AudioContext|undefined,master:GainNode|undefined,loading:Promise<void>|undefined
 let ready=false,disposed=false,lastEnabled=false,lastBrake=false
 const abort=new AbortController(),buffers=new Map<string,AudioBuffer>()
 let timing={loopStart:28.58501133786848,loopEnd:38.62002267573696}
 let coastTiming={loopStart:31.8,loopEnd:38.2}
 type Take={source:AudioBufferSourceNode,gain:GainNode}
 const playing=new Set<Take>()
 let ignition:Take|undefined,brake:Take|undefined,drive:Take|undefined,coast:Take|undefined
 let desired={rpm:900,throttle:false,volume:.2,enabled:false,speed:0,shifting:false,inside:false,braking:false}
 function stop(take:Take|undefined){
  if(!take||!context)return
  take.gain.gain.setTargetAtTime(0,context.currentTime,.02)
  try{take.source.stop(context.currentTime+.1)}catch{}
 }
 function play(name:string,gainValue:number,loop=false,bounds=timing){
  const buffer=buffers.get(name);if(!buffer||!context||!master)return
  const source=context.createBufferSource(),gain=context.createGain()
  source.buffer=buffer;source.playbackRate.value=1;source.loop=loop
  if(loop){source.loopStart=bounds.loopStart;source.loopEnd=Math.min(bounds.loopEnd,buffer.duration)}
  gain.gain.value=gainValue;source.connect(gain);gain.connect(master)
  const take={source,gain};playing.add(take)
  source.onended=()=>{
   playing.delete(take);source.disconnect();gain.disconnect()
   if(ignition===take)ignition=undefined;if(brake===take)brake=undefined;if(drive===take)drive=undefined
   if(coast===take)coast=undefined
  }
  source.start();return take
 }
 function preload(){
  if(disposed)return Promise.resolve();if(loading)return loading
  context=new AudioContext();master=context.createGain();master.gain.value=0;master.connect(context.destination)
  const ctx=context
  const timingReady=fetch('/audio/miura-user-timing.json?v=6',{signal:abort.signal}).then(async response=>{
   if(!response.ok)throw Error('V12 loop timing unavailable');timing=await response.json()
  })
  const coastTimingReady=fetch('/audio/aventador-user-coast-timing.json?v=2',{signal:abort.signal}).then(async response=>{
   if(!response.ok)throw Error('Coast loop timing unavailable');coastTiming=await response.json()
  })
  loading=Promise.all([timingReady,coastTimingReady,...['miura-user-driving','aventador-user-coast','aventador-ignition-exhaust','car-braking'].map(async name=>{
   const response=await fetch('/audio/'+name+'.wav?v=miura-coast-8',{signal:abort.signal})
   if(!response.ok)throw Error('Engine audio unavailable')
   const buffer=await ctx.decodeAudioData(await response.arrayBuffer());if(!disposed)buffers.set(name,buffer)
  })]).then(()=>{
   if(disposed)return;ready=true
   update(desired.rpm,desired.throttle,desired.volume,desired.enabled,desired.speed,desired.shifting,desired.inside,desired.braking)
  }).catch(error=>{if(!disposed){master?.gain.setValueAtTime(0,ctx.currentTime);console.warn('V12 audio could not be prepared',error)}})
  return loading
 }
 function start(){if(disposed)return;void preload();void context?.resume()}
 function update(rpm:number,throttle:boolean,volume:number,enabled:boolean,speed=0,shifting=false,inside=false,braking=false){
  desired={rpm,throttle,volume,enabled,speed,shifting,inside,braking}
  if(!ready||!context||!master)return
  const time=context.currentTime,moving=Math.abs(speed)>.35,loaded=throttle&&!braking
  const stopping=enabled&&braking&&moving
  if(enabled&&!lastEnabled&&!moving&&!throttle)ignition=play('aventador-ignition-exhaust',.7)
  if(!enabled||moving||loaded){stop(ignition);ignition=undefined}
  if(enabled&&loaded&&!drive)drive=play('miura-user-driving',0,true)
  // Keep this same source through braking, standstill and acceleration again.
  // Its cursor advances silently at rest; neither gear shifts nor cockpit changes restart it.
  if(!enabled){stop(drive);drive=undefined}
  // This take contains acceleration: never let it suggest acceleration on coast or brake.
  // The supplied deceleration take replaces acceleration whenever the gas is released.
  if(drive){
   if(braking){drive.gain.gain.cancelScheduledValues(time);drive.gain.gain.setValueAtTime(0,time)}
   else drive.gain.gain.setTargetAtTime(loaded?1:0,time,loaded?.16:.02)
  }
  const coasting=enabled&&moving&&!loaded
  if(coasting&&!coast)coast=play('aventador-user-coast',0,true,coastTiming)
  if(coast){
   if(!coasting){stop(coast);coast=undefined}
   else coast.gain.gain.setTargetAtTime(Math.min(.8,.2+Math.abs(speed)/30),time,.08)
  }
  if(!enabled){stop(brake);brake=undefined}
  if(stopping&&!lastBrake)brake=play('car-braking',Math.min(.4,.14+Math.abs(speed)*.003))
  if(!stopping&&lastBrake){stop(brake);brake=undefined}
  lastEnabled=enabled;lastBrake=stopping
  // Quieter cabin only: no pitch shift, EQ or change of recording.
  master.gain.setTargetAtTime(enabled?Math.max(0,Math.min(1,volume))*(inside?.5:1):0,time,.06)
 }
 function dispose(){
  disposed=true;abort.abort();playing.forEach(take=>{try{take.source.stop()}catch{}})
  playing.clear();buffers.clear();if(context)void context.close();context=undefined
 }
 return {preload,start,update,dispose}
}
