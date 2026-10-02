export function createAutomaticDrive(maxKph=325){
 let gear=1,rpm=900,speed=0
 const ratios=[3.4,2.2,1.6,1.25,1.02,.85,.72],maximum=maxKph/3.6
 function step(dt:number,actualSpeed:number,throttle:boolean,brake:boolean,handbrake:boolean){
 speed=Math.max(0,actualSpeed);const wheelRpm=speed/(2*Math.PI*.34)*60;rpm=Math.max(900,wheelRpm*ratios[gear-1]!*3.6)
 if(rpm>7600&&gear<7)gear++;else if(rpm<2700&&gear>1)gear--
 rpm=Math.max(throttle?1250:900,wheelRpm*ratios[gear-1]!*3.6)
 // Available wheel force includes aero drag compensation, approaching the selected car's limit.
 const drag=.14+speed*.007+speed*speed*.00035
 const acceleration=throttle?drag+Math.max(.35,9.6*(1-Math.pow(speed/maximum,1.65))):0
 speed=Math.max(0,speed+(acceleration-(brake?18:0)-drag)*dt)
 if(handbrake)speed*=Math.pow(.04,dt);speed=Math.min(speed,maximum)
 return {speed,gear,rpm:Math.min(8500,Math.round(rpm))}
 }
 function reset(){gear=1;rpm=900;speed=0}
 return {step,reset}
}
