/** One latch/release for the paired-door action, with the close impact at the end. */
export function createDoorAudio(){
 let context:AudioContext|undefined,output:GainNode|undefined,disposed=false,serial=0
 const buffers=new Map<boolean,AudioBuffer>(),sources=new Set<AudioBufferSourceNode>()
 let loading:Promise<void>|undefined
 function unlock(){
  if(disposed)return
  context??=new AudioContext();if(!output){output=context.createGain();output.connect(context.destination)}
  void context.resume().catch(()=>{})
  loading??=Promise.all([true,false].map(async opening=>{
   const response=await fetch(opening?'/audio/car-door-open.wav':'/audio/car-door-close.wav')
   if(!response.ok)throw new Error('Door recording unavailable')
   const decoded=await context!.decodeAudioData(await response.arrayBuffer());if(!disposed)buffers.set(opening,decoded)
  })).then(()=>{}).catch(()=>{})
 }
 async function play(opening:boolean,volume:number,delay=0,offset=0){
  unlock();const request=++serial;await loading
  const buffer=buffers.get(opening);if(disposed||request!==serial||!context||!output||!buffer)return
  for(const source of sources){try{source.stop()}catch{}}sources.clear()
  if(volume<=0)return
  output.gain.setValueAtTime(Math.min(1,Math.max(0,volume))*.65,context.currentTime)
  const source=context.createBufferSource();source.buffer=buffer;source.connect(output);sources.add(source)
  source.onended=()=>{source.disconnect();sources.delete(source)};source.start(context.currentTime+delay,offset)
 }
 function setVolume(volume:number){if(context&&output)output.gain.setValueAtTime(Math.min(1,Math.max(0,volume))*.65,context.currentTime)}
 function dispose(){disposed=true;serial++;for(const source of sources){try{source.stop()}catch{}}sources.clear();output?.disconnect();void context?.close().catch(()=>{})}
 return {unlock,play,setVolume,dispose}
}
