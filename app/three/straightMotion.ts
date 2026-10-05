/** Straight presentation motion with vehicle-specific gears and a configurable speed limit. */
export function createStraightMotion(maxKph=325,gearCount:7|8=maxKph>350?8:7){
 const mass=1800,grip=1.05,gravity=9.81
 let speed=0,distance=0,gear=1,shiftCooldown=0,rpm=900
 const maximum=maxKph/3.6,ratios=gearCount===8?[3.9,2.7,2.1,1.72,1.45,1.24,1.05,.88]:[3.4,2.2,1.6,1.25,1.02,.85,.72]
 function step(dt:number,forward:boolean,brake:boolean,reverse:boolean,lateralAcceleration=0){
  dt=Math.max(0,Math.min(dt,.15));shiftCooldown=Math.max(0,shiftCooldown-dt)
  const availableGrip=Math.sqrt(Math.max(0,(grip*gravity)**2-lateralAcceleration**2))
  const acceleration=forward?Math.max(.4,9.2*(1-Math.pow(Math.max(0,speed)/maximum,1.5))):reverse?-4*(1-Math.max(0,-speed)/8):0
  speed+=Math.max(-availableGrip,Math.min(availableGrip,acceleration))*(forward&&shiftCooldown>.25?.48:1)*dt
  if(brake)speed=Math.sign(speed)*Math.max(0,Math.abs(speed)-Math.min(18,availableGrip)*dt)
  else if(!forward&&!reverse)speed=Math.sign(speed)*Math.max(0,Math.abs(speed)-(.4+Math.abs(speed)*.015)*dt)
  speed=Math.max(-8,Math.min(maximum,speed));distance+=speed*dt
  const wheelRpm=Math.abs(speed)/(2*Math.PI*.34)*60
  const revs=wheelRpm*ratios[gear-1]!*3.6
  if(!shiftCooldown&&speed>=0){if(revs>7400&&gear<ratios.length){gear++;shiftCooldown=.4}else if(revs<2700&&gear>1){gear--;shiftCooldown=.4}}
  const target=Math.max(forward||reverse?1300:900,wheelRpm*ratios[gear-1]!*3.6)
  rpm+=(Math.min(9000,target)-rpm)*(1-Math.exp(-dt*16))
  return {speed,distance,gear,rpm:Math.round(rpm),shifting:shiftCooldown>.25}
 }
 function reset(){speed=distance=shiftCooldown=0;gear=1;rpm=900}
 return {step,reset,parameters:{mass,grip}}
}

