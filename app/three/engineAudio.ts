import {createSyntheticEngineAudio} from './syntheticEngineAudio'
/** User-supplied 458-labelled recording. See /audio/CREDITS.md for exact ranges.
 * Quiet/low/mid/high are playback bands, not calibrated source RPM or verified idle. */
export function createEngineAudio(recorded458=true){
 if(!recorded458)return createSyntheticEngineAudio()
 let context:AudioContext|undefined,master:GainNode|undefined,filter:BiquadFilterNode|undefined,disposed=false
 const abort=new AbortController(),layers:{source:AudioBufferSourceNode,gain:GainNode,index:number}[]=[]
 let desired={rpm:900,throttle:false,volume:.5,enabled:false,speed:0}
 function start(){
  if(disposed)return
  if(context){void context.resume();return}
  context=new AudioContext();master=context.createGain();master.gain.value=0;master.connect(context.destination)
  filter=context.createBiquadFilter();filter.type='lowpass';filter.Q.value=.4;filter.frequency.value=10000;filter.connect(master)
  const ctx=context
  void Promise.all(['quiet','low','mid','high'].map(async(name,i)=>{
   const response=await fetch('/audio/ferrari-458-user-'+name+'.wav',{signal:abort.signal});if(!response.ok)throw new Error('Engine recording unavailable')
   const buffer=await ctx.decodeAudioData(await response.arrayBuffer());if(disposed)return
   const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(filter!);source.start()
   layers.push({source,gain,index:i})
  })).then(()=>{layers.sort((a,b)=>a.index-b.index);update(desired.rpm,desired.throttle,desired.volume,desired.enabled,desired.speed)}).catch(()=>{if(!disposed)master?.gain.setValueAtTime(0,ctx.currentTime)})
  void ctx.resume()
 }
 function update(rpm:number,throttle:boolean,volume:number,enabled:boolean,speed=0){
  desired={rpm,throttle,volume,enabled,speed};if(!context||!master)return
  const t=context.currentTime,r=Math.max(900,Math.min(8500,rpm))
  // These are controls for crossfading uncalibrated recordings, not measured RPM.
  const anchors=[900,1250,4200,6800],interval=r<4200?1:2
  const mix=Math.max(0,Math.min(1,(r-anchors[interval]!)/(anchors[interval+1]!-anchors[interval]!)))
  const weights=[0,0,0,0];weights[interval]=Math.cos(mix*Math.PI/2);weights[interval+1]=Math.sin(mix*Math.PI/2)
  if(layers.length===4)layers.forEach((layer,i)=>{
   layer.gain.gain.setTargetAtTime(weights[i]!,t,.09)
   // Preserve the recorded engine character; no half-speed pseudo-idle.
   const rate=i===0?1:Math.max(.92,Math.min(1.10,1+(r-anchors[i]!)/18000))
   layer.source.playbackRate.setTargetAtTime(rate,t,.075)
  })
  filter?.frequency.setTargetAtTime(throttle?12000:4200,t,.13)
  master.gain.setTargetAtTime(enabled&&Math.abs(speed)>.35?Math.max(0,Math.min(1,volume))*(throttle?1.15:.58):0,t,.12)
 }
 function dispose(){disposed=true;abort.abort();layers.forEach(l=>l.source.stop());layers.length=0;if(context)void context.close();context=undefined}
 return {start,update,dispose}
}
