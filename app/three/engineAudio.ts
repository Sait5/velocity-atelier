import {createSyntheticEngineAudio} from './syntheticEngineAudio'
/** Real user-supplied exterior and cabin recordings, prepared as steady loops. */
export function createEngineAudio(recorded458=true){
 if(!recorded458)return createSyntheticEngineAudio()
 let context:AudioContext|undefined,master:GainNode|undefined,filter:BiquadFilterNode|undefined,disposed=false
 const abort=new AbortController(),layers:{source:AudioBufferSourceNode,gain:GainNode,index:number}[]=[]
 let desired={rpm:900,throttle:false,volume:.5,enabled:false,speed:0,shifting:false,inside:false}
 function start(){
  if(disposed)return;if(context){void context.resume();return}
  context=new AudioContext();master=context.createGain();master.gain.value=0;master.connect(context.destination)
  filter=context.createBiquadFilter();filter.type='lowpass';filter.Q.value=.3;filter.frequency.value=8500;filter.connect(master);const ctx=context
  void Promise.all(['ferrari-458-user-low','ferrari-458-user-mid','ferrari-458-user-high','ferrari-cabin-low','ferrari-cabin-mid','ferrari-cabin-high'].map(async(name,i)=>{
   const response=await fetch('/audio/'+name+'.wav',{signal:abort.signal});if(!response.ok)throw new Error('Engine recording unavailable')
   const buffer=await ctx.decodeAudioData(await response.arrayBuffer());if(disposed)return
   const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(filter!);source.start(0,(i%3)*.13);layers.push({source,gain,index:i})
  })).then(()=>{layers.sort((a,b)=>a.index-b.index);update(desired.rpm,desired.throttle,desired.volume,desired.enabled,desired.speed,desired.shifting,desired.inside)}).catch(()=>{if(!disposed)master?.gain.setValueAtTime(0,ctx.currentTime)})
  void ctx.resume()
 }
 function update(rpm:number,throttle:boolean,volume:number,enabled:boolean,speed=0,shifting=false,inside=false){
  desired={rpm,throttle,volume,enabled,speed,shifting,inside};if(!context||!master)return
  const t=context.currentTime,r=Math.max(900,Math.min(9000,rpm)),anchors=[1600,4200,7200],interval=r<4200?0:1
  const mix=Math.max(0,Math.min(1,(r-anchors[interval]!)/(anchors[interval+1]!-anchors[interval]!))),weights=[0,0,0];weights[interval]=Math.cos(mix*Math.PI/2);weights[interval+1]=Math.sin(mix*Math.PI/2)
  for(const layer of layers){const band=layer.index%3,cabin=layer.index>=3;layer.gain.gain.setTargetAtTime(cabin===inside?weights[band]!:0,t,.22);const rate=Math.max(.88,Math.min(1.18,1+(r-anchors[band]!)/15000));layer.source.playbackRate.setTargetAtTime(rate,t,.14)}
  filter?.frequency.setTargetAtTime(inside?(throttle?4400:2700):(throttle?10000:5600),t,.25)
  master.gain.setTargetAtTime(enabled&&Math.abs(speed)>.35?Math.max(0,Math.min(1,volume))*(throttle?1:.62)*(inside?.78:1)*(shifting?.83:1):0,t,.16)
 }
 function dispose(){disposed=true;abort.abort();layers.forEach(l=>l.source.stop());layers.length=0;if(context)void context.close();context=undefined}
 return {start,update,dispose}
}
