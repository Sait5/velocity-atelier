/** One latch/release for the paired-door action, with the close impact at the end. */
export function createDoorAudio(porsche=false){
 let context:AudioContext|undefined,output:GainNode|undefined,disposed=false,serial=0
 const buffers=new Map<boolean|'seat',AudioBuffer>(),sources=new Set<AudioBufferSourceNode>()
 let loading:Promise<void>|undefined
 function preload(){
  if(disposed)return
  context??=new AudioContext();if(!output){output=context.createGain();output.connect(context.destination)}
  loading??=Promise.all(([true,false,'seat'] as const).map(async clip=>{
   const url=clip==='seat'?'/audio/seat-creak-entry.wav':porsche?(clip?'/audio/porsche-door-open.wav':'/audio/porsche-door-close.wav'):clip?'/audio/car-door-open.wav':'/audio/car-door-close-ferrari.wav'
   const response=await fetch(url)
   if(!response.ok)throw new Error('Door recording unavailable')
   const decoded=await context!.decodeAudioData(await response.arrayBuffer());if(!disposed)buffers.set(clip,decoded)
  })).then(()=>{}).catch(()=>{})
  return loading
 }
 function unlock(){preload();void context?.resume().catch(()=>{})}
 async function play(clip:boolean|'seat',volume:number,delay=0,offset=0){
  unlock();const request=++serial,scheduledTime=(context?.currentTime??0)+delay;await loading
  const buffer=buffers.get(clip);if(disposed||request!==serial||!context||!output||!buffer)return
  for(const source of sources){try{source.stop()}catch{}}sources.clear()
  if(volume<=0)return
  output.gain.setValueAtTime(Math.min(1,Math.max(0,volume))*.65,context.currentTime)
  const source=context.createBufferSource();source.buffer=buffer;source.connect(output);sources.add(source)
  source.onended=()=>{source.disconnect();sources.delete(source)};source.start(Math.max(context.currentTime,scheduledTime),offset)
 }
 function setVolume(volume:number){if(context&&output)output.gain.setValueAtTime(Math.min(1,Math.max(0,volume))*.65,context.currentTime)}
 function dispose(){disposed=true;serial++;for(const source of sources){try{source.stop()}catch{}}sources.clear();output?.disconnect();void context?.close().catch(()=>{})}
 return {preload,unlock,play,setVolume,dispose}
}
