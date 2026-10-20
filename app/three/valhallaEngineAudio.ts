/**
 * Aston Martin Valhalla: the engine loops of the "Aston Martin Valhalla" mod for BeamNG.drive by S7471C (named M840T
 * there): engine and exhaust, on load and on overrun, one loop every ~400 rpm from 1100 to 8200, packed into four banks
 * by tools/pack-valhalla-audio.cjs, and the mod's exhaust and engine idles mixed into one loop. In each bank only the two
 * loops either side of the current rpm play, crossfaded with equal power in log rpm and pitched by the small remaining
 * rpm ratio. The mod has no start or stop of its own: those are the McLaren takes, the same M840T family.
 */
// [rpm, first sample, samples] of every loop in public/audio/valhalla-<bank>.flac (48 kHz mono)
const BANKS:Record<string,[number,number,number][]>={
 'exhaust-load':[[1110,0,28505],[1537,28505,28435],[1923,56940,27429],[2115,84369,26419],[2426,110788,28367],[2763,139155,28604],[3001,167759,28768],[3404,196527,28728],[3801,225255,28711],[4219,253966,28280],[4608,282246,28081],[5000,310327,28748],[5403,339075,27715],[5800,366790,27751],[6206,394541,27808],[6613,422349,27840],[7007,450189,27949],[7413,478138,27899],[7826,506037,27967],[8135,534004,28106]],
 'exhaust-overrun':[[894,0,27805],[1238,27805,27370],[1639,55175,27644],[2008,82819,28197],[2406,111016,28717],[2815,139733,28021],[3223,167754,28085],[3611,195839,27908],[4008,223747,27898],[4393,251645,28077],[4796,279722,28151],[5004,307873,27599],[5408,335472,27613],[5812,363085,27722],[6233,390807,27689],[6590,418496,27688],[7007,446184,27914],[7432,474098,27863],[7804,501961,28006],[8011,529967,28078],[8263,558045,27938]],
 'engine-load':[[1103,0,36143],[1547,36143,29372],[1934,65515,28890],[2349,94405,28112],[2709,122517,28126],[3003,150643,28263],[3412,178906,27802],[3428,206708,28157],[3804,234865,28576],[4213,263441,28022],[4500,291463,28143],[4906,319606,28129],[5308,347735,29267],[5702,377002,28281],[6108,405283,28291],[6530,433574,27951],[6906,461525,28322],[7300,489847,28293],[7690,518140,28258],[8147,546398,28239]],
 'engine-overrun':[[1106,0,27903],[1475,27903,27658],[1730,55561,27594],[2034,83155,27836],[2414,110991,28101],[2702,139092,28710],[3010,167802,28210],[3817,196012,28595],[4207,224607,28370],[4604,252977,27470],[5026,280447,27409],[5418,307856,28168],[5806,336024,28001],[6200,364025,28041],[6613,392066,28021],[7015,420087,28058],[7403,448145,27964],[7804,476109,28044],[8205,504153,28578]],
}
// the mod's takes are quiet (about -25 to -37 dB RMS, the idle -37): lift them to the McLaren's level, exhaust ahead of
// the engine; the low-rpm loops are 7 dB quieter than the top ones, so the lift eases off as the revs rise
const GAIN={exhaust:5.3,engine:2.75,idle:19}
const lift=(revs:number)=>1.5-.68*Math.min(1,Math.max(0,Math.log(revs/1100)/Math.log(8000/1100)))
export function createValhallaEngineAudio(){
 let context:AudioContext|undefined,master:GainNode|undefined,filter:BiquadFilterNode|undefined,loading:Promise<void>|undefined
 let ready=false,disposed=false,wasEnabled=false,startUntil=0,stopUntil=0
 const abort=new AbortController(),banks=new Map<string,{rpm:number,buffer:AudioBuffer}[]>(),takes=new Map<string,AudioBuffer>()
 type Take={source:AudioBufferSourceNode,gain:GainNode}
 const playing=new Set<Take>(),active=new Map<string,Take>();let ignition:Take|undefined,idle:Take|undefined
 let desired={rpm:900,throttle:false,volume:.2,enabled:false,speed:0,shifting:false,inside:false,braking:false}
 const idleBase=900
 function stop(t:Take|undefined,fade=.08){if(!t||!context)return;t.gain.gain.setTargetAtTime(0,context.currentTime,fade);try{t.source.stop(context.currentTime+fade*5)}catch{}}
 function play(buffer:AudioBuffer|undefined,level=0,loop=false){
  if(!context||!filter||!buffer)return
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.loop=loop;gain.gain.value=level;source.connect(gain);gain.connect(filter)
  const t={source,gain};playing.add(t);source.onended=()=>{playing.delete(t);source.disconnect();gain.disconnect();if(ignition===t)ignition=undefined};source.start();return t
 }
 async function fetchBuffer(ctx:AudioContext,url:string){const r=await fetch(url,{signal:abort.signal});if(!r.ok)throw Error('Valhalla audio unavailable: '+url);return ctx.decodeAudioData(await r.arrayBuffer())}
 function preload(){
  if(disposed)return Promise.resolve();if(loading)return loading
  context=new AudioContext();master=context.createGain();master.gain.value=0;master.connect(context.destination);filter=context.createBiquadFilter();filter.type='lowpass';filter.Q.value=.3;filter.frequency.value=10000;filter.connect(master)
  const ctx=context
  loading=Promise.all([
   ...Object.entries(BANKS).map(async([name,rows])=>{
    const whole=await fetchBuffer(ctx,`/audio/valhalla-${name}.flac?v=1`),data=whole.getChannelData(0),list:{rpm:number,buffer:AudioBuffer}[]=[]
    // two engine loops sit 16 rpm apart (3412 and 3428): one is enough
    for(const [rpm,start,length] of rows){if(list.length&&rpm-list.at(-1)!.rpm<100)continue;const b=ctx.createBuffer(1,length,whole.sampleRate);b.copyToChannel(data.subarray(start,start+length),0);list.push({rpm,buffer:b})}
    if(!disposed)banks.set(name,list)
   }),
   ...[['idle','/audio/valhalla-idle.flac?v=1'],['start','/audio/mclaren-start.flac?v=2'],['stop','/audio/mclaren-stop.flac?v=2']].map(async([key,url])=>{const b=await fetchBuffer(ctx,url!);if(!disposed)takes.set(key!,b)}),
  ]).then(()=>{if(disposed)return;ready=true;update(desired.rpm,desired.throttle,desired.volume,desired.enabled,desired.speed,desired.shifting,desired.inside,desired.braking)}).catch(e=>{if(!disposed)console.warn('Valhalla recordings could not load',e)})
  return loading
 }
 function start(){if(disposed)return;void preload();void context?.resume()}
 /** the two loops either side of this rpm and their equal-power weights in log rpm */
 function neighbours(list:{rpm:number}[],revs:number):[number,number][]{
  if(revs<=list[0]!.rpm)return [[0,1]];if(revs>=list.at(-1)!.rpm)return [[list.length-1,1]]
  const i=list.findIndex(b=>b.rpm>revs)-1,blend=(Math.log(revs)-Math.log(list[i]!.rpm))/(Math.log(list[i+1]!.rpm)-Math.log(list[i]!.rpm))
  return [[i,Math.cos(blend*Math.PI/2)],[i+1,Math.sin(blend*Math.PI/2)]]
 }
 function update(rpm:number,throttle:boolean,volume:number,enabled:boolean,speed=0,shifting=false,inside=false,braking=false){
  desired={rpm,throttle,volume,enabled,speed,shifting,inside,braking};if(!ready||!context||!master||!filter)return
  const now=context.currentTime
  if(enabled&&!wasEnabled){ignition=play(takes.get('start'),.8);startUntil=now+takes.get('start')!.duration;stopUntil=0;idle=play(takes.get('idle'),0,true)}
  if(!enabled&&wasEnabled){stop(ignition);ignition=undefined;stop(idle);idle=undefined;active.forEach(t=>stop(t));active.clear();play(takes.get('stop'),.8);stopUntil=now+takes.get('stop')!.duration}
  wasEnabled=enabled
  master.gain.setTargetAtTime((enabled||now<stopUntil)?Math.max(0,Math.min(1,volume))*(inside?.5:1):0,now,.1)
  filter.frequency.setTargetAtTime(inside?3400:10000,now,.15)
  if(!enabled)return
  const revs=Math.max(900,Math.min(8200,rpm)),loaded=throttle&&!braking,moving=Math.abs(speed)>.35
  const revWeight=Math.max(0,Math.min(1,(revs-1250)/600)),started=throttle||moving||now>startUntil-.3
  if((loaded||moving)&&ignition){stop(ignition);ignition=undefined}
  const on=started?1:0,shift=shifting?.65:1
  idle?.gain.gain.setTargetAtTime(on*GAIN.idle*.75*(1-revWeight),now,.07);idle?.source.playbackRate.setTargetAtTime(Math.max(.9,Math.min(1.25,revs/idleBase)),now,.08)
  // inside the cabin the engine behind the seats carries more than the tailpipes
  const wanted=new Map<string,number>()
  for(const [name,list] of banks){
   const part=name.startsWith('exhaust')?'exhaust':'engine',load=name.endsWith('load')
   const level=on*revWeight*shift*(load?(loaded?.85:0):(loaded?0:.6))*GAIN[part]*lift(revs)*(inside&&part==='engine'?1.4:1)
   if(level<=0)continue
   for(const [i,w] of neighbours(list,revs)){
    const key=name+':'+i;wanted.set(key,level*w)
    let t=active.get(key);if(!t){t=play(list[i]!.buffer,0,true);if(!t)continue;active.set(key,t)}
    t.gain.gain.setTargetAtTime(level*w,now,.06);t.source.playbackRate.setTargetAtTime(Math.max(.7,Math.min(1.35,revs/list[i]!.rpm)),now,.06)
   }
  }
  for(const [key,t] of active)if(!wanted.has(key)){stop(t,.06);active.delete(key)}
 }
 function dispose(){disposed=true;abort.abort();playing.forEach(t=>{try{t.source.stop()}catch{}});playing.clear();active.clear();banks.clear();takes.clear();void context?.close();context=undefined}
 return {preload,start,update,dispose}
}
