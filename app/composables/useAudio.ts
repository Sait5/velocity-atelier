let context:AudioContext|undefined
export function useAudio(){
 const state=useAtelier()
 function click(){if(!state.sound.value)return;context??=new AudioContext();void context.resume();const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(660,context.currentTime);oscillator.frequency.exponentialRampToValueAtTime(440,context.currentTime+.04);gain.gain.setValueAtTime(Math.max(.0001,state.volume.value*.025),context.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+.045);oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.05);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()}}
 return {click,sync:click,stop(){}}
}
