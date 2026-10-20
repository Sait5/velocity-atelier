/**
 * McLaren V8 from the exhaust takes of the "McLaren 720S" sound mod by Legacy DMC (the 720S shares the 750S's
 * twin-turbo 4.0 V8). Its acceleration and deceleration sweeps were cut into loops that each hold one rpm (five on load,
 * five on overrun, built by scratchpad tooling), plus the exhaust idle, start and stop. The two loops either side of the
 * current rpm are crossfaded (equal power, in log rpm) and pitched by the small remaining rpm ratio, so the sound never
 * stretches far from a real recording.
 */
export function createMcLarenEngineAudio(){
 let context:AudioContext|undefined,master:GainNode|undefined,filter:BiquadFilterNode|undefined,loading:Promise<void>|undefined
 let ready=false,disposed=false,wasEnabled=false,startUntil=0,stopUntil=0
 const abort=new AbortController(),buffers=new Map<string,AudioBuffer>()
 type Take={source:AudioBufferSourceNode,gain:GainNode}
 const playing=new Set<Take>(),loops=new Map<string,Take>();let ignition:Take|undefined
 let desired={rpm:900,throttle:false,volume:.2,enabled:false,speed:0,shifting:false,inside:false,braking:false}
 const idleBase=1300
 const load=[1800,3000,4500,6150,7650].map(rpm=>({name:'load-'+rpm,rpm}))
 const overrun=[1350,2250,3600,5400,7500].map(rpm=>({name:'overrun-'+rpm,rpm}))
 function stop(t:Take|undefined,fade=.08){if(!t||!context)return;t.gain.gain.setTargetAtTime(0,context.currentTime,fade);try{t.source.stop(context.currentTime+fade*5)}catch{}}
 function play(name:string,level=0,loop=false){
  if(!context||!filter||!buffers.has(name))return
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffers.get(name)!;source.loop=loop;gain.gain.value=level;source.connect(gain);gain.connect(filter)
  const t={source,gain};playing.add(t);source.onended=()=>{playing.delete(t);source.disconnect();gain.disconnect();if(ignition===t)ignition=undefined};source.start();return t
 }
 function preload(){
  if(disposed)return Promise.resolve();if(loading)return loading
  context=new AudioContext();master=context.createGain();master.gain.value=0;master.connect(context.destination);filter=context.createBiquadFilter();filter.type='lowpass';filter.Q.value=.3;filter.frequency.value=10000;filter.connect(master)
  const ctx=context
  loading=Promise.all(['start','idle','stop',...load.map(b=>b.name),...overrun.map(b=>b.name)].map(async key=>{
   const r=await fetch('/audio/mclaren-'+key+'.flac?v=2',{signal:abort.signal});if(!r.ok)throw Error('McLaren audio unavailable: '+key)
   const b=await ctx.decodeAudioData(await r.arrayBuffer());if(!disposed)buffers.set(key,b)
  })).then(()=>{if(disposed)return;ready=true;update(desired.rpm,desired.throttle,desired.volume,desired.enabled,desired.speed,desired.shifting,desired.inside,desired.braking)}).catch(e=>{if(!disposed)console.warn('McLaren recordings could not load',e)})
  return loading
 }
 function start(){if(disposed)return;void preload();void context?.resume()}
 /** weight of each bank at this rpm: the two neighbours share an equal-power crossfade in log rpm */
 function weights(banks:{rpm:number}[],revs:number){
  const w=banks.map(()=>0);if(revs<=banks[0]!.rpm){w[0]=1;return w}if(revs>=banks.at(-1)!.rpm){w[w.length-1]=1;return w}
  const i=banks.findIndex(b=>b.rpm>revs)-1,blend=(Math.log(revs)-Math.log(banks[i]!.rpm))/(Math.log(banks[i+1]!.rpm)-Math.log(banks[i]!.rpm))
  w[i]=Math.cos(blend*Math.PI/2);w[i+1]=Math.sin(blend*Math.PI/2);return w
 }
 function update(rpm:number,throttle:boolean,volume:number,enabled:boolean,speed=0,shifting=false,inside=false,braking=false){
  desired={rpm,throttle,volume,enabled,speed,shifting,inside,braking};if(!ready||!context||!master||!filter)return
  const now=context.currentTime
  if(enabled&&!wasEnabled){ignition=play('start',.8);startUntil=now+buffers.get('start')!.duration;stopUntil=0
   for(const name of ['idle',...load.map(b=>b.name),...overrun.map(b=>b.name)]){const t=play(name,0,true);if(t)loops.set(name,t)}
  }
  if(!enabled&&wasEnabled){stop(ignition);ignition=undefined;loops.forEach(t=>stop(t));loops.clear();play('stop',.8);stopUntil=now+buffers.get('stop')!.duration}
  const revs=Math.max(900,Math.min(8200,rpm)),loaded=throttle&&!braking,moving=Math.abs(speed)>.35
  const revWeight=Math.max(0,Math.min(1,(revs-1250)/600))
  const started=throttle||moving||now>startUntil-.3
  if((loaded||moving)&&ignition){stop(ignition);ignition=undefined}
  const level=(t:Take|undefined,value:number)=>t?.gain.gain.setTargetAtTime(enabled&&started?value:0,now,.07)
  const idle=loops.get('idle')
  level(idle,.75*(1-revWeight));idle?.source.playbackRate.setTargetAtTime(Math.max(.9,Math.min(1.2,revs/idleBase)),now,.08)
  const shift=shifting?.65:1
  const lw=weights(load,revs),ow=weights(overrun,revs)
  load.forEach((b,i)=>{const t=loops.get(b.name);level(t,revWeight*lw[i]!*(loaded?.85:0)*shift);t?.source.playbackRate.setTargetAtTime(Math.max(.7,Math.min(1.35,revs/b.rpm)),now,.06)})
  overrun.forEach((b,i)=>{const t=loops.get(b.name);level(t,revWeight*ow[i]!*(loaded?0:.6)*shift);t?.source.playbackRate.setTargetAtTime(Math.max(.7,Math.min(1.35,revs/b.rpm)),now,.06)})
  filter.frequency.setTargetAtTime(inside?3400:10000,now,.15)
  master.gain.setTargetAtTime((enabled||now<stopUntil)?Math.max(0,Math.min(1,volume))*(inside?.5:1):0,now,.1)
  wasEnabled=enabled
 }
 function dispose(){disposed=true;abort.abort();playing.forEach(t=>{try{t.source.stop()}catch{}});playing.clear();loops.clear();buffers.clear();void context?.close();context=undefined}
 return {preload,start,update,dispose}
}
