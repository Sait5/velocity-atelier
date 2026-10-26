import type {EngineDrive} from './engineAudio'
/**
 * User recording: 0–25s acceleration; 27s–end coast, at original pitch.
 * The acceleration and coast takes are mixed by the smoothed pedal (equal power) and keep running between presses, so
 * tapping W and S swells and eases the engine instead of cutting one recording and starting another from its beginning.
 */
export function createTourbillonEngineAudio(){
 let context:AudioContext|undefined,master:GainNode|undefined,loading:Promise<void>|undefined,disposed=false
 const timing:Record<string,{loopStart:number,loopEnd:number}>={}
 const abort=new AbortController(),buffers=new Map<string,AudioBuffer>()
 type Take={source:AudioBufferSourceNode,gain:GainNode}
 const playing=new Set<Take>()
 let ignition:Take|undefined,pull:Take|undefined,coast:Take|undefined,ending:Take|undefined
 let lastEnabled=false,coastEntrySpeed=0,finishStarted=false,lastTime=-1,rolling=0
 let heldSince:number|undefined,pullQuietSince:number|undefined,coastQuietSince:number|undefined
 let desired:{throttle:boolean,volume:number,enabled:boolean,speed:number,inside:boolean,braking:boolean,pedals?:EngineDrive}={throttle:false,volume:0,enabled:false,speed:0,inside:false,braking:false}
 function play(name:string){
  const source=context!.createBufferSource(),gain=context!.createGain()
  source.buffer=buffers.get(name)!;source.loop=name==='acceleration'||name==='coast';source.playbackRate.value=1
  if(source.loop){source.loopStart=timing[name]!.loopStart;source.loopEnd=timing[name]!.loopEnd}
  gain.gain.value=0;source.connect(gain);gain.connect(master!)
  const take={source,gain};playing.add(take)
  source.onended=()=>{playing.delete(take);source.disconnect();gain.disconnect();if(ignition===take)ignition=undefined;if(pull===take)pull=undefined;if(coast===take)coast=undefined;if(ending===take)ending=undefined}
  source.start();return take
 }
 function stop(take:Take|undefined){if(!take||!context)return;take.gain.gain.setTargetAtTime(0,context.currentTime,.04);try{take.source.stop(context.currentTime+.25)}catch{}}
 function apply(){
  if(!context||!master||buffers.size!==4||disposed)return
  const now=context.currentTime,velocity=Math.abs(desired.speed),moving=velocity>.01,dt=lastTime<0?0:Math.max(0,now-lastTime);lastTime=now
  const gas=desired.pedals?.gas??(desired.throttle&&!desired.braking?1:0),lift=Math.cos(gas*Math.PI/2)
  // 1 while the car moves, easing to 0 over half a second once it stands: passing through zero speed is not a gap
  rolling=moving?Math.min(1,rolling+dt/.1):Math.max(0,rolling-dt/.5)
  const ignite=desired.enabled&&!lastEnabled&&!moving&&!desired.throttle
  lastEnabled=desired.enabled
  if(!desired.enabled){stop(ignition);stop(pull);stop(coast);stop(ending);ignition=pull=coast=ending=undefined;finishStarted=false}
  else{
   if(ignite){ignition=play('ignition');ignition.gain.gain.setTargetAtTime(1,now,.04)}
   if(moving||desired.throttle&&!desired.braking){stop(ignition);ignition=undefined}
   // The acceleration take: a press after more than 1.5 s off the pedal starts it from its beginning (low revs); between
   // quicker presses the same take runs on silently, so tapping the pedal never repeats its opening.
   if(gas>0&&!pull)pull=play('acceleration')
   if(pull){
    if(gas<.01)pullQuietSince??=now;else pullQuietSince=undefined
    if(pullQuietSince!==undefined&&now-pullQuietSince>1.5){stop(pull);pull=undefined;pullQuietSince=undefined}
    else pull.gain.gain.setTargetAtTime(Math.sin(gas*Math.PI/2),now,.03)
   }
   // A press held a second is a real pull: the next lift is a new coast, so the coast take (silent under the pedal)
   // starts over; shorter presses leave it running.
   if(gas>.95)heldSince??=now;else heldSince=undefined
   const pulled=heldSince!==undefined&&now-heldSince>1
   if(pulled){stop(coast);coast=undefined;finishStarted=false}
   if(!moving&&!ending&&rolling===0)finishStarted=false
   // the coast fades with the speed lost since the pedal lifted
   if(gas>=.5||!moving&&!ending&&rolling===0)coastEntrySpeed=0;else if(!coastEntrySpeed)coastEntrySpeed=Math.max(velocity,.01)
   const speedFade=coastEntrySpeed?Math.pow(Math.min(1,velocity/coastEntrySpeed),.65):1
   const timeToStop=desired.braking?velocity/(1.05*9.81):Math.log1p(velocity*.015/.4)/.015
   if(moving&&gas<.5&&!finishStarted&&timeToStop<=2){ending=play('coast-end');finishStarted=true}
   if(rolling>0&&!pulled&&!ending&&!coast)coast=play('coast')
   if(coast){
    // the end of the recording crossfades in for it; a take silent for two seconds is let go
    const target=ending?0:lift*speedFade*rolling
    if(target<.01)coastQuietSince??=now;else coastQuietSince=undefined
    if(coastQuietSince!==undefined&&now-coastQuietSince>2){stop(coast);coast=undefined}
    else coast.gain.gain.setTargetAtTime(target,now,ending?.05:.04)
   }
   ending?.gain.gain.setTargetAtTime(lift*speedFade,now,.05)
  }
  master.gain.setTargetAtTime(desired.enabled?Math.max(0,Math.min(1,desired.volume))*(desired.inside?.6:1):0,now,.05)
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
 function update(_rpm:number,throttle:boolean,volume:number,enabled:boolean,speed=0,_shifting=false,inside=false,braking=false,pedals?:EngineDrive){desired={throttle,volume,enabled,speed,inside,braking,pedals};apply()}
 function dispose(){disposed=true;abort.abort();playing.forEach(({source})=>{try{source.stop()}catch{}});playing.clear();buffers.clear();void context?.close();context=undefined}
 return {preload,start,update,dispose}
}
