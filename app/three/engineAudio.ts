import {createTourbillonEngineAudio} from './tourbillonEngineAudio'
import {createSyntheticEngineAudio} from './syntheticEngineAudio'
import {createRevueltoEngineAudio} from './revueltoEngineAudio'
import {createFerrariEngineAudio} from './ferrariEngineAudio'
import {createPorscheEngineAudio} from './porscheEngineAudio'
import {createMcLarenEngineAudio} from './mclarenEngineAudio'
import {createValhallaEngineAudio} from './valhallaEngineAudio'
import {createJeskoEngineAudio} from './jeskoEngineAudio'
import {createAmgEngineAudio} from './amgEngineAudio'
/** Smooth 0..1 levels every engine gets from createEngineAudio besides the raw keys. */
export type EngineDrive={
 /** the throttle pedal (W): up in about 0.15 s, down in about 0.35 s */
 gas:number,
 /** the load on the engine: the pedal, or a light 0.35 while the car is driven backwards (B) */
 load:number,
 /** the brake pedal (S): on in about 0.08 s, off in about 0.25 s */
 brake:number,
 /** the torque cut of a gear change: in about 0.04 s, out in about 0.1 s */
 shift:number,
}
type Kind=boolean|'revuelto'|'gt3'|'tourbillon'|'750s'|'valhalla'|'jesko'|'amg'
function pick(kind:Kind){
 if(kind==='amg')return createAmgEngineAudio()
 if(kind==='jesko')return createJeskoEngineAudio()
 if(kind==='valhalla')return createValhallaEngineAudio()
 if(kind==='750s')return createMcLarenEngineAudio()
 if(kind==='tourbillon')return createTourbillonEngineAudio()
 if(kind==='gt3')return createPorscheEngineAudio()
 if(kind==='revuelto')return createRevueltoEngineAudio()
 return kind?createFerrariEngineAudio():createSyntheticEngineAudio()
}
/**
 * Every engine is driven through smoother inputs than the raw keys. Tapping W and S quickly used to flip the recordings
 * between their load and overrun takes (and the brake) several times a second, restarting some of them, and the sound
 * broke up. Here the pedals become continuous levels (EngineDrive) that the engines crossfade their takes by, with equal
 * power and without restarting them, so a quick tap is a short swell of the engine rather than a switch; and the revs
 * the sound follows have a flywheel's inertia: a critically damped follower (about 0.1 s) with no steps or overshoot.
 */
export function createEngineAudio(kind:Kind=true){
 const engine=pick(kind)
 let gas=0,brake=0,reverse=0,cut=0,revs=-1,spin=0,last=-1,lastSpeed=0
 const ramp=(value:number,target:number,dt:number,up:number,down:number)=>target>value?Math.min(target,value+dt/up):Math.max(target,value-dt/down)
 const ease=(v:number)=>v*v*(3-2*v)
 function update(rpm:number,throttle:boolean,volume:number,enabled:boolean,speed=0,shifting=false,inside=false,braking=false){
  const now=performance.now(),dt=last<0?0:Math.min(.1,Math.max(0,(now-last)/1000));last=now
  if(!enabled||revs<0){gas=brake=reverse=cut=spin=0;revs=rpm}
  else{
   // driven backwards: B alone, rolling back and not slowing down (coasting back loses about 0.5 m/s every second)
   const backwards=!throttle&&!braking&&speed<-.35&&speed-lastSpeed<.25*dt
   gas=ramp(gas,throttle&&!braking?1:0,dt,.15,.35);brake=ramp(brake,braking?1:0,dt,.08,.25);cut=ramp(cut,shifting?1:0,dt,.04,.1)
   if(dt>0)reverse=ramp(reverse,backwards?1:0,dt,.15,.35)
   // exact step of the follower towards this frame's rpm, stable for any frame time
   const w=30,e=Math.exp(-w*dt),c1=revs-rpm,c2=spin+w*c1
   revs=rpm+(c1+c2*dt)*e;spin=(c2-w*(c1+c2*dt))*e
  }
  lastSpeed=speed
  engine.update(revs,throttle,volume,enabled,speed,shifting,inside,braking,{gas:ease(gas),load:Math.max(ease(gas),.35*ease(reverse)),brake:ease(brake),shift:ease(cut)})
 }
 return {...engine,update}
}
