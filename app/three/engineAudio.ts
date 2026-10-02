import {createSyntheticEngineAudio} from './syntheticEngineAudio'
/** Ed Pond / Edvvc recording, CC BY-SA 3.0. See /audio/CREDITS.md.
 * Acceleration excerpts, not a separately recorded idle track. */
export function createEngineAudio(recorded458=true){
 if(!recorded458)return createSyntheticEngineAudio()
 let context:AudioContext|undefined,master:GainNode|undefined,filter:BiquadFilterNode|undefined,disposed=false
 const abort=new AbortController(),layers:{source:AudioBufferSourceNode,gain:GainNode,baseRpm:number}[]=[]
 let desired={rpm:900,throttle:false,volume:.5,enabled:false,speed:0}
 function start(){
  if(disposed)return
  if(context){void context.resume();return}
  context=new AudioContext();master=context.createGain();master.gain.value=0;master.connect(context.destination)
  filter=context.createBiquadFilter();filter.type='lowpass';filter.Q.value=.4;filter.frequency.value=10000;filter.connect(master)
  const ctx=context
  void Promise.all(['low','mid','high'].map(async(name,i)=>{
   const response=await fetch('/audio/ferrari-458-'+name+'.wav',{signal:abort.signal});if(!response.ok)throw new Error('Engine recording unavailable')
   const buffer=await ctx.decodeAudioData(await response.arrayBuffer());if(disposed)return
   const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(filter!);source.start()
   layers.push({source,gain,baseRpm:[1800,4500,6800][i]!})
  })).then(()=>{layers.sort((a,b)=>a.baseRpm-b.baseRpm);update(desired.rpm,desired.throttle,desired.volume,desired.enabled,desired.speed)}).catch(()=>{if(!disposed)master?.gain.setValueAtTime(0,ctx.currentTime)})
  void ctx.resume()
 }
 function update(rpm:number,throttle:boolean,volume:number,enabled:boolean,speed=0){
  desired={rpm,throttle,volume,enabled,speed};if(!context||!master)return
  const t=context.currentTime,r=Math.max(900,Math.min(8500,rpm)),mix=r<4500?Math.max(0,(r-1800)/2700):Math.min(1,(r-4500)/2300)
  const weights=r<4500?[Math.cos(mix*Math.PI/2),Math.sin(mix*Math.PI/2),0]:[0,Math.cos(mix*Math.PI/2),Math.sin(mix*Math.PI/2)]
  if(layers.length===3)layers.forEach((layer,i)=>{layer.gain.gain.setTargetAtTime(weights[i]!,t,.09);layer.source.playbackRate.setTargetAtTime(Math.max(.65,Math.min(1.35,r/layer.baseRpm)),t,.075)})
  filter?.frequency.setTargetAtTime(throttle?12000:4200,t,.13)
  master.gain.setTargetAtTime(enabled?Math.max(0,Math.min(1,volume))*(throttle?.70:.32):0,t,.12)
 }
 function dispose(){disposed=true;abort.abort();layers.forEach(l=>l.source.stop());layers.length=0;if(context)void context.close();context=undefined}
 return {start,update,dispose}
}
