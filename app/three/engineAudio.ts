import {createSyntheticEngineAudio} from './syntheticEngineAudio'
/** Three steady exterior bands; a long cabin take and brake recording play once per action. */
export function createEngineAudio(recorded458=true){
 if(!recorded458)return createSyntheticEngineAudio()
 let context:AudioContext|undefined,master:GainNode|undefined,filter:BiquadFilterNode|undefined,disposed=false
 const abort=new AbortController(),layers:{source:AudioBufferSourceNode,gain:GainNode,index:number}[]=[]
 const takes:Record<string,AudioBuffer>={}
 let acceleration:{source:AudioBufferSourceNode,gain:GainNode}|undefined,brake:{source:AudioBufferSourceNode,gain:GainNode}|undefined,lastAcceleration=false,lastBrake=false,lastInside=false
 let desired={rpm:900,throttle:false,volume:.5,enabled:false,speed:0,shifting:false,inside:false,braking:false}
 function fade(take:typeof acceleration){if(!take||!context)return;const t=context.currentTime;take.gain.gain.setTargetAtTime(0,t,.035);take.source.stop(t+.2)}
 function play(name:string,level:number){if(!context||!master||!takes[name])return;const source=context.createBufferSource(),gain=context.createGain();source.buffer=takes[name]!;source.loop=false;gain.gain.value=level;source.connect(gain);gain.connect(filter!);source.start();return {source,gain}}
 function start(){
  if(disposed)return;if(context){void context.resume();return}
  context=new AudioContext();master=context.createGain();master.gain.value=0;master.connect(context.destination)
  filter=context.createBiquadFilter();filter.type='lowpass';filter.Q.value=.3;filter.frequency.value=8500;filter.connect(master);const ctx=context
  void Promise.all(['ferrari-458-user-low','ferrari-458-user-mid','ferrari-458-user-high','ferrari-cabin-acceleration','car-braking','ferrari-exterior-acceleration'].map(async(name,i)=>{
   const response=await fetch('/audio/'+name+'.wav',{signal:abort.signal});if(!response.ok)throw new Error('Engine recording unavailable')
   const buffer=await ctx.decodeAudioData(await response.arrayBuffer());if(disposed)return
   if(i>=3){takes[name]=buffer;return}
   const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(filter!);source.start(0,i*.13);layers.push({source,gain,index:i})
  })).then(()=>{layers.sort((a,b)=>a.index-b.index);lastAcceleration=lastBrake=false;update(desired.rpm,desired.throttle,desired.volume,desired.enabled,desired.speed,desired.shifting,desired.inside,desired.braking)}).catch(()=>{if(!disposed)master?.gain.setValueAtTime(0,ctx.currentTime)})
  void ctx.resume()
 }
 function update(rpm:number,throttle:boolean,volume:number,enabled:boolean,speed=0,shifting=false,inside=false,braking=false){
  desired={rpm,throttle,volume,enabled,speed,shifting,inside,braking};if(!context||!master)return
  const t=context.currentTime,moving=Math.abs(speed)>.35,accelerating=enabled&&moving&&throttle&&!braking,stopping=enabled&&braking&&Math.abs(speed)>6
  if(inside!==lastInside){fade(acceleration);acceleration=undefined;lastAcceleration=false;lastInside=inside}
  if(accelerating&&!lastAcceleration){acceleration=play(inside?'ferrari-cabin-acceleration':'ferrari-exterior-acceleration',inside?.72:.82);if(acceleration){const take=acceleration;take.source.onended=()=>{take.source.disconnect();take.gain.disconnect();if(acceleration===take)acceleration=undefined}}}
  if(!accelerating&&lastAcceleration){fade(acceleration);acceleration=undefined}lastAcceleration=accelerating
  if(stopping&&!lastBrake){brake=play('car-braking',Math.min(.4,.08+Math.abs(speed)*.004));if(brake){const take=brake;take.source.onended=()=>{take.source.disconnect();take.gain.disconnect();if(brake===take)brake=undefined}}}
  if(!stopping&&lastBrake){fade(brake);brake=undefined}lastBrake=stopping
  const r=Math.max(900,Math.min(9000,rpm)),anchors=[1600,4200,7200],interval=r<4200?0:1
  const mix=Math.max(0,Math.min(1,(r-anchors[interval]!)/(anchors[interval+1]!-anchors[interval]!))),weights=[0,0,0];weights[interval]=Math.cos(mix*Math.PI/2);weights[interval+1]=Math.sin(mix*Math.PI/2)
  for(const layer of layers){const band=layer.index;const drift=inside?0:.006*Math.sin(t*.43+band*2.1)+.003*Math.sin(t*.19+band);layer.gain.gain.setTargetAtTime(weights[band]!*(acceleration?(inside?.35:.28):inside?.7:1),t,inside?.22:.32);const rate=inside?Math.max(.88,Math.min(1.18,1+(r-anchors[band]!)/15000)):Math.max(.94,Math.min(1.12,1+(r-anchors[band]!)/22000+drift));layer.source.playbackRate.setTargetAtTime(rate,t,inside?.14:.26)}
  filter?.frequency.setTargetAtTime(inside?(throttle?3200:2100):(throttle?8800:4800),t,.25)
  master.gain.setTargetAtTime(enabled&&moving?Math.max(0,Math.min(1,volume))*(throttle?1:.62)*(inside?.85:1)*(shifting?(inside?.83:.94):1):0,t,.16)
 }
 function dispose(){disposed=true;abort.abort();layers.forEach(l=>l.source.stop());acceleration?.source.stop();brake?.source.stop();layers.length=0;if(context)void context.close();context=undefined}
 return {start,update,dispose}
}

