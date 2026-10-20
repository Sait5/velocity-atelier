/** Procedural V12 presentation audio; this is not a recorded Revuelto engine. */
export function createSyntheticEngineAudio(){
 const abort=new AbortController();let disposed=false,brakeBuffer:AudioBuffer|undefined,brakeTake:{source:AudioBufferSourceNode,gain:GainNode}|undefined,lastBraking=false
 let context:AudioContext|undefined,master:GainNode,pulse:OscillatorNode,bass:OscillatorNode,filter:BiquadFilterNode,air:GainNode,windFilter:BiquadFilterNode,brake:GainNode,noise:AudioBufferSourceNode,combustion:GainNode
 function start(){
  if(disposed)return
  if(context){void context.resume();return}
  context=new AudioContext();master=context.createGain();master.gain.value=0;master.connect(context.destination)
  filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=700;filter.Q.value=.45;filter.connect(master)
  // Six firing events per crank revolution; softer harmonic roll-off avoids a buzz.
  const real=new Float32Array(24),imaginary=new Float32Array(24);for(let i=1;i<24;i++)imaginary[i]=(i%2===0?.55:1)/Math.pow(i,1.6)
  pulse=context.createOscillator();pulse.setPeriodicWave(context.createPeriodicWave(real,imaginary));pulse.frequency.value=90;combustion=context.createGain();combustion.gain.value=.25;pulse.connect(combustion);combustion.connect(filter);pulse.start()
  bass=context.createOscillator();bass.type='sine';bass.frequency.value=30;const low=context.createGain();low.gain.value=.22;bass.connect(low);low.connect(filter);bass.start()
  const buffer=context.createBuffer(1,context.sampleRate*7,context.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.4
  noise=context.createBufferSource();noise.buffer=buffer;noise.loop=true
  windFilter=context.createBiquadFilter();windFilter.type='lowpass';windFilter.frequency.value=550;air=context.createGain();air.gain.value=0;noise.connect(windFilter);windFilter.connect(air);air.connect(master)
  const brakeFilter=context.createBiquadFilter();brakeFilter.type='bandpass';brakeFilter.frequency.value=1100;brakeFilter.Q.value=.55;brake=context.createGain();brake.gain.value=0;noise.connect(brakeFilter);brakeFilter.connect(brake);brake.connect(master)
  noise.start();void context.resume()
  const ctx=context
  void fetch('/audio/car-braking.flac',{signal:abort.signal}).then(response=>{if(!response.ok)throw Error('Brake recording unavailable');return response.arrayBuffer()}).then(bytes=>ctx.decodeAudioData(bytes)).then(buffer=>{if(!disposed)brakeBuffer=buffer}).catch(()=>{})
 }
 function update(rpm:number,throttle:boolean,volume:number,enabled:boolean,speed=0,shifting=false,inside=false,braking=false){
  if(!context)return;const time=context.currentTime,velocity=Math.abs(speed),load=throttle&&!braking?1:.25,cut=shifting?.43:1
  pulse.frequency.setTargetAtTime(Math.max(900,rpm)/10,time,.09);bass.frequency.setTargetAtTime(rpm/30,time,.12)
  combustion.gain.setTargetAtTime((.14+load*.18)*cut,time,.08)
  filter.frequency.setTargetAtTime(inside?450+rpm*.14:650+rpm*.30+load*500,time,.16)
  windFilter.frequency.setTargetAtTime(inside?500:1250,time,.25)
  air.gain.setTargetAtTime(Math.min(.16,velocity*.0016)*(inside?.35:1),time,.25)
  const stopping=enabled&&braking&&velocity>6
  if(stopping&&!lastBraking&&brakeBuffer){const source=context.createBufferSource(),gain=context.createGain();source.buffer=brakeBuffer;gain.gain.value=Math.min(.8,.25+velocity*.006)*(inside?.45:1);source.connect(gain);gain.connect(master);source.start();const take={source,gain};brakeTake=take;source.onended=()=>{source.disconnect();gain.disconnect();if(brakeTake===take)brakeTake=undefined}}
  if(!stopping&&brakeTake){brakeTake.gain.gain.setTargetAtTime(0,time,.03);try{brakeTake.source.stop(time+.15)}catch{}brakeTake=undefined}
  lastBraking=stopping
  brake.gain.setTargetAtTime(!brakeBuffer&&stopping?Math.min(.065,velocity*.0008)*(inside?.45:1):0,time,.10)
  master.gain.setTargetAtTime(enabled?volume*(inside?.24:.31):0,time,.16)
 }
 function dispose(){disposed=true;abort.abort();if(!context)return;brakeTake?.source.stop();brakeTake=undefined;noise.stop();pulse.stop();bass.stop();void context.close();context=undefined}
 return {start,update,dispose}
}
