let context:AudioContext|undefined, oscillator:OscillatorNode|undefined, gain:GainNode|undefined
export function useAudio(){
 const state=useAtelier()
 function sync(rev=false){if(!context)context=new AudioContext();void context.resume();if(!oscillator){oscillator=context.createOscillator();gain=context.createGain();oscillator.type='sawtooth';oscillator.connect(gain);gain.connect(context.destination);oscillator.start()};gain!.gain.setTargetAtTime(state.sound.value&&state.engine.value?state.volume.value*0.045:0,context.currentTime,0.15);oscillator.frequency.setTargetAtTime(rev?135:43,context.currentTime,0.2);if(rev)setTimeout(()=>sync(),800)}
 function stop(){if(gain&&context)gain.gain.setTargetAtTime(0,context.currentTime,0.1)}
 return {sync,stop}
}
