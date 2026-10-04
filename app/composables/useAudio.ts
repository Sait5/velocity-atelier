let context:AudioContext|undefined
let lastClick=-Infinity
export function useAudio(){
 const state=useAtelier()
 function click(){if(!state.sound.value||performance.now()-lastClick<70)return;lastClick=performance.now();context??=new AudioContext();void context.resume();const oscillator=context.createOscillator(),gain=context.createGain(),now=context.currentTime;oscillator.type='sine';oscillator.frequency.setValueAtTime(880,now);oscillator.frequency.exponentialRampToValueAtTime(560,now+.055);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,state.volume.value*.14),now+.004);gain.gain.exponentialRampToValueAtTime(.0001,now+.065);oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(now+.07);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()}}
 return {click,sync:click,stop(){}}
}
