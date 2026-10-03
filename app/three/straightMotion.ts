/** Presentation motion, with forward/reverse and braking; never steers off the road. */
export function createStraightMotion(){
 let speed=0,distance=0
 function step(dt:number,forward:boolean,brake:boolean,reverse:boolean){
  const acceleration=forward?6.5*(1-Math.max(0,speed)/55):reverse?-4*(1-Math.max(0,-speed)/8):0
  speed+=acceleration*dt
  if(brake){speed=Math.sign(speed)*Math.max(0,Math.abs(speed)-16*dt)}
  else if(!forward&&!reverse){speed=Math.sign(speed)*Math.max(0,Math.abs(speed)-(.4+Math.abs(speed)*.015)*dt)}
  speed=Math.max(-8,Math.min(55,speed));distance+=speed*dt
  const gear=Math.min(7,Math.max(1,Math.floor(Math.abs(speed)/9)+1)),rpm=Math.round(Math.max(900,1300+(Math.abs(speed)%9)*570))
  return {speed,distance,gear,rpm}
 }
 function reset(){speed=distance=0}
 return {step,reset}
}
