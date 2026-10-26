import type {EngineDrive} from './engineAudio'
/**
 * Owner-selected V12 recording. Original speed and pitch; baked long circular continuation.
 * The acceleration and deceleration takes are mixed by the smoothed pedal (equal power) and keep running between
 * presses, so tapping W and S swells and eases the engine instead of cutting and restarting the recordings.
 */
export function createRevueltoEngineAudio(){
 let context:AudioContext|undefined,master:GainNode|undefined,loading:Promise<void>|undefined
 let ready=false,disposed=false,lastEnabled=false
 const abort=new AbortController(),buffers=new Map<string,AudioBuffer>()
 let timing={loopStart:28.58501133786848,loopEnd:38.62002267573696}
 let coastTiming={loopStart:31.8,loopEnd:38.2}
 let lastTime=-1,rolling=0,heldSince:number|undefined,coastQuietSince:number|undefined
 type Take={source:AudioBufferSourceNode,gain:GainNode}
 const playing=new Set<Take>()
 let ignition:Take|undefined,brake:Take|undefined,drive:Take|undefined,coast:Take|undefined
 let desired:{rpm:number,throttle:boolean,volume:number,enabled:boolean,speed:number,shifting:boolean,inside:boolean,braking:boolean,pedals?:EngineDrive}={rpm:900,throttle:false,volume:.2,enabled:false,speed:0,shifting:false,inside:false,braking:false}
 function stop(take:Take|undefined,fade=.02){
  if(!take||!context)return
  take.gain.gain.setTargetAtTime(0,context.currentTime,fade)
  try{take.source.stop(context.currentTime+fade*5)}catch{}
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
   const response=await fetch('/audio/'+name+'.flac?v=miura-coast-8',{signal:abort.signal})
   if(!response.ok)throw Error('Engine audio unavailable')
   const buffer=await ctx.decodeAudioData(await response.arrayBuffer());if(!disposed)buffers.set(name,buffer)
  })]).then(()=>{
   if(disposed)return;ready=true
   update(desired.rpm,desired.throttle,desired.volume,desired.enabled,desired.speed,desired.shifting,desired.inside,desired.braking,desired.pedals)
  }).catch(error=>{if(!disposed){master?.gain.setValueAtTime(0,ctx.currentTime);console.warn('V12 audio could not be prepared',error)}})
  return loading
 }
 function start(){if(disposed)return;void preload();void context?.resume()}
 function update(rpm:number,throttle:boolean,volume:number,enabled:boolean,speed=0,shifting=false,inside=false,braking=false,pedals?:EngineDrive){
  desired={rpm,throttle,volume,enabled,speed,shifting,inside,braking,pedals}
  if(!ready||!context||!master)return
  const time=context.currentTime,velocity=Math.abs(speed),moving=velocity>.35,dt=lastTime<0?0:Math.max(0,time-lastTime);lastTime=time
  // the pedals as createEngineAudio smooths them; the acceleration and deceleration takes share them with equal power
  const gas=pedals?.gas??(throttle&&!braking?1:0),pedal=pedals?.brake??(braking?1:0)
  const pull=Math.sin(gas*Math.PI/2),lift=Math.cos(gas*Math.PI/2)
  // 1 while the car moves, easing to 0 over half a second once it stands: passing through zero speed is not a gap
  rolling=moving?Math.min(1,rolling+dt/.1):Math.max(0,rolling-dt/.5)
  if(enabled&&!lastEnabled&&!moving&&!throttle)ignition=play('aventador-ignition-exhaust',.7)
  if(!enabled||moving||throttle&&!braking){stop(ignition,.05);ignition=undefined}
  if(!enabled){stop(drive);stop(coast);stop(brake);drive=coast=brake=undefined}
  // Keep this same source through braking, standstill and acceleration again.
  // Its cursor advances silently at rest; neither gear shifts nor cockpit changes restart it.
  // This take contains acceleration: it fades with the pedal and the deceleration take comes in for it.
  if(enabled&&gas>0&&!drive)drive=play('miura-user-driving',0,true)
  drive?.gain.gain.setTargetAtTime(pull,time,.03)
  // A press held a second is a real pull: the next lift is a new deceleration, so the deceleration take, silent under
  // the pedal, starts over. Shorter presses leave it running, and tapping never repeats its beginning.
  if(gas>.95)heldSince??=time;else heldSince=undefined
  const pulled=heldSince!==undefined&&time-heldSince>1
  if(pulled){stop(coast);coast=undefined}
  if(enabled&&rolling>0&&!pulled&&!coast)coast=play('aventador-user-coast',0,true,coastTiming)
  if(coast){
   // a take silent for two seconds is let go
   const target=Math.min(.8,.2+velocity/30)*lift*rolling
   if(target<.01)coastQuietSince??=time;else coastQuietSince=undefined
   if(coastQuietSince!==undefined&&time-coastQuietSince>2){stop(coast);coast=undefined}
   else coast.gain.gain.setTargetAtTime(target,time,.04)
  }
  // The brake recording: a press while rolling starts it, then its level follows the pedal and the speed; a press
  // while it is still sounding carries on with it rather than starting it again.
  const squeal=enabled&&moving?Math.min(.4,.14+velocity*.003)*Math.min(1,velocity/2):0
  if(pedal>.02&&squeal>0&&!brake)brake=play('car-braking',0)
  brake?.gain.gain.setTargetAtTime(pedal*squeal,time,.03)
  lastEnabled=enabled
  // Quieter cabin only: no pitch shift, EQ or change of recording.
  master.gain.setTargetAtTime(enabled?Math.max(0,Math.min(1,volume))*(inside?.5:1):0,time,.06)
 }
 function dispose(){
  disposed=true;abort.abort();playing.forEach(take=>{try{take.source.stop()}catch{}})
  playing.clear();buffers.clear();if(context)void context.close();context=undefined
 }
 return {preload,start,update,dispose}
}
