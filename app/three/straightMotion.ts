/** Straight presentation motion with seven gears and a 325 km/h limit. */
export function createStraightMotion(maxKph=325){
 let speed=0,distance=0,gear=1,shiftCooldown=0,rpm=900
 const maximum=maxKph/3.6,ratios=[3.4,2.2,1.6,1.25,1.02,.85,.72]
 function step(dt:number,forward:boolean,brake:boolean,reverse:boolean){
  dt=Math.max(0,Math.min(dt,.15));shiftCooldown=Math.max(0,shiftCooldown-dt)
  const acceleration=forward?Math.max(.4,9.2*(1-Math.pow(Math.max(0,speed)/maximum,1.5))):reverse?-4*(1-Math.max(0,-speed)/8):0
  speed+=acceleration*dt
  if(brake)speed=Math.sign(speed)*Math.max(0,Math.abs(speed)-18*dt)
  else if(!forward&&!reverse)speed=Math.sign(speed)*Math.max(0,Math.abs(speed)-(.4+Math.abs(speed)*.015)*dt)
  speed=Math.max(-8,Math.min(maximum,speed));distance+=speed*dt
  const wheelRpm=Math.abs(speed)/(2*Math.PI*.34)*60
  const revs=wheelRpm*ratios[gear-1]!*3.6
  if(!shiftCooldown&&speed>=0){if(revs>7400&&gear<7){gear++;shiftCooldown=.4}else if(revs<2700&&gear>1){gear--;shiftCooldown=.4}}
  const target=Math.max(forward||reverse?1300:900,wheelRpm*ratios[gear-1]!*3.6)
  rpm+=(Math.min(9000,target)-rpm)*(1-Math.exp(-dt*16))
  return {speed,distance,gear,rpm:Math.round(rpm),shifting:shiftCooldown>.25}
 }
 function reset(){speed=distance=shiftCooldown=0;gear=1;rpm=900}
 return {step,reset}
}

