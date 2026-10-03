export function createSyntheticEngineAudio(){
 let context:AudioContext|undefined,master:GainNode,pulse:OscillatorNode,bass:OscillatorNode,filter:BiquadFilterNode,air:GainNode,noise:AudioBufferSourceNode
 function start(){
  if(context){void context.resume();return}
  context=new AudioContext();master=context.createGain();master.gain.value=0;master.connect(context.destination)
  filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=700;filter.Q.value=.65;filter.connect(master)
  const real=new Float32Array(32),imaginary=new Float32Array(32);for(let i=1;i<32;i++)imaginary[i]=(i%4===0?.16:1)/Math.pow(i,1.2)
  pulse=context.createOscillator();pulse.setPeriodicWave(context.createPeriodicWave(real,imaginary));pulse.frequency.value=60;const combustion=context.createGain();combustion.gain.value=.30;pulse.connect(combustion);combustion.connect(filter);pulse.start()
  bass=context.createOscillator();bass.type='triangle';bass.frequency.value=30;const low=context.createGain();low.gain.value=.28;bass.connect(low);low.connect(filter);bass.start()
  const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),data=buffer.getChannelData(0);let previous=0;for(let i=0;i<data.length;i++){previous=(previous+(Math.random()*2-1)*.1)/1.03;data[i]=previous}
  noise=context.createBufferSource();noise.buffer=buffer;noise.loop=true;air=context.createGain();air.gain.value=.035;noise.connect(air);air.connect(filter);noise.start();void context.resume()
 }
 function update(rpm:number,throttle:boolean,volume:number,enabled:boolean,speed=0,_shifting=false,_inside=false){if(!context)return;const time=context.currentTime;pulse.frequency.setTargetAtTime(rpm/15,time,.065);bass.frequency.setTargetAtTime(rpm/60,time,.085);filter.frequency.setTargetAtTime(350+rpm*.38+(throttle?500:0),time,.12);air.gain.setTargetAtTime(.025+speed*.001,time,.2);master.gain.setTargetAtTime(enabled?volume*(throttle?.26:.13):0,time,.13)}
 function dispose(){if(!context)return;noise.stop();pulse.stop();bass.stop();void context.close();context=undefined}
 return {start,update,dispose}
}



