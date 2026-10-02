export function createAutomaticDrive(){
 let gear=1,rpm=900,speed=0
 const ratios=[3.4,2.2,1.6,1.25,1.02,.85,.72]
 function step(dt:number,actualSpeed:number,throttle:boolean,brake:boolean,handbrake:boolean){
 speed=Math.max(0,actualSpeed);const wheelRpm=speed/(2*Math.PI*.34)*60;rpm=Math.max(900,wheelRpm*ratios[gear-1]!*3.6)
 if(rpm>7600&&gear<7)gear++;else if(rpm<2700&&gear>1)gear--
 rpm=Math.max(throttle?1250:900,wheelRpm*ratios[gear-1]!*3.6)
 const acceleration=throttle?Math.max(2,10-speed*.07):0;speed=Math.max(0,speed+(acceleration-(brake?15:0)-speed*.022-speed*speed*.0009)*dt)
 if(handbrake)speed*=Math.pow(.04,dt);speed=Math.min(speed,90)
 return {speed,gear,rpm:Math.min(8500,Math.round(rpm))}
 }
 function reset(){gear=1;rpm=900;speed=0}
 return {step,reset}
}
