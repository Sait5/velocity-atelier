/** Real 997 GT3 RS recordings, with separate RPM banks for load and overrun. */
export function createPorscheEngineAudio(){
 let context:AudioContext|undefined,master:GainNode|undefined,filter:BiquadFilterNode|undefined,loading:Promise<void>|undefined
 let ready=false,disposed=false,wasEnabled=false,startUntil=0,stopUntil=0
 const abort=new AbortController(),buffers=new Map<string,AudioBuffer>()
 type Take={source:AudioBufferSourceNode,gain:GainNode}
 const playing=new Set<Take>(),loops=new Map<string,Take>();let ignition:Take|undefined
 let desired={rpm:900,throttle:false,volume:.2,enabled:false,speed:0,shifting:false,inside:false,braking:false}
 const banks=[['load-low',2600],['load-high',4900],['overrun-low',1900],['overrun-high',4600]] as const
 function stop(t:Take|undefined){if(!t||!context)return;t.gain.gain.setTargetAtTime(0,context.currentTime,.08);try{t.source.stop(context.currentTime+.4)}catch{}}
 function play(name:string,level=0,loop=false){
  if(!context||!filter||!buffers.has(name))return
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffers.get(name)!;source.loop=loop;gain.gain.value=level;source.connect(gain);gain.connect(filter)
  const t={source,gain};playing.add(t);source.onended=()=>{playing.delete(t);source.disconnect();gain.disconnect();if(ignition===t)ignition=undefined};source.start();return t
 }
 function preload(){
  if(disposed)return Promise.resolve();if(loading)return loading
  context=new AudioContext();master=context.createGain();master.gain.value=0;master.connect(context.destination);filter=context.createBiquadFilter();filter.type='lowpass';filter.Q.value=.3;filter.frequency.value=10000;filter.connect(master)
  const ctx=context
  loading=Promise.all(['start','idle','stop',...banks.map(([name])=>name)].map(async key=>{
   const r=await fetch('/audio/porsche-'+key+'.flac',{signal:abort.signal});if(!r.ok)throw Error('Porsche audio unavailable: '+key)
   const b=await ctx.decodeAudioData(await r.arrayBuffer());if(!disposed)buffers.set(key,b)
  })).then(()=>{if(disposed)return;ready=true;update(desired.rpm,desired.throttle,desired.volume,desired.enabled,desired.speed,desired.shifting,desired.inside,desired.braking)}).catch(e=>{if(!disposed)console.warn('Porsche recordings could not load',e)})
  return loading
 }
 function start(){if(disposed)return;void preload();void context?.resume()}
 function update(rpm:number,throttle:boolean,volume:number,enabled:boolean,speed=0,shifting=false,inside=false,braking=false){
  desired={rpm,throttle,volume,enabled,speed,shifting,inside,braking};if(!ready||!context||!master||!filter)return
  const now=context.currentTime
  if(enabled&&!wasEnabled){ignition=play('start',.65);startUntil=now+buffers.get('start')!.duration;stopUntil=0
   for(const name of ['idle',...banks.map(([name])=>name)]){const t=play(name,0,true);if(t)loops.set(name,t)}
  }
  if(!enabled&&wasEnabled){stop(ignition);ignition=undefined;loops.forEach(stop);loops.clear();play('stop',.65);stopUntil=now+buffers.get('stop')!.duration}
  const revs=Math.max(900,Math.min(9000,rpm)),loaded=throttle&&!braking
  const revWeight=Math.max(0,Math.min(1,(revs-1000)/900))
  const started=throttle||Math.abs(speed)>.35||now>startUntil-.35
  if(loaded&&ignition){stop(ignition);ignition=undefined}
  const level=(t:Take|undefined,value:number)=>t?.gain.gain.setTargetAtTime(enabled&&started?value:0,now,.12)
  level(loops.get('idle'),.65*(1-revWeight)+.08*revWeight)
  for(let i=0;i<banks.length;i++){
   const [name,base]=banks[i]!,t=loops.get(name),loadBank=i<2
   const low=banks[loadBank?0:2]![1],high=banks[loadBank?1:3]![1]
   const blend=Math.max(0,Math.min(1,(Math.log(revs)-Math.log(low))/(Math.log(high)-Math.log(low))))
   const weight=i%2===0?Math.cos(blend*Math.PI/2):Math.sin(blend*Math.PI/2)
   level(t,revWeight*weight*(loadBank?(loaded?.68:.12):(loaded?.10:.52))*(shifting?.72:1))
   t?.source.playbackRate.setTargetAtTime(Math.max(.6,Math.min(1.85,revs/base)),now,.09)
  }
  filter.frequency.setTargetAtTime(inside?3500:loaded?10000:7200,now,.15)
  master.gain.setTargetAtTime((enabled||now<stopUntil)?Math.max(0,Math.min(1,volume))*(inside?.5:1):0,now,.1)
  wasEnabled=enabled
 }
 function dispose(){disposed=true;abort.abort();playing.forEach(t=>{try{t.source.stop()}catch{}});playing.clear();loops.clear();buffers.clear();void context?.close();context=undefined}
 return {preload,start,update,dispose}
}
