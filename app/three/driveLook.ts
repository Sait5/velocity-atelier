import * as T from 'three'

/** Views remain attached to the moving car; dragging only changes the sightline. */
export function createDriveLook(camera:T.PerspectiveCamera,anchor=new T.Vector3(.02,1.04,.35)){
 let yaw=0,pitch=0,targetYaw=0,targetPitch=0,narrowRoad=false,tunnel=false,coastal=false,desert=false
 const up=new T.Vector3(0,1,0),offset=new T.Vector3(),target=new T.Vector3()
 function reset(){yaw=pitch=targetYaw=targetPitch=0}
 function turn(dx:number,dy:number,view=0){
  targetYaw+=(view===1?-1:1)*T.MathUtils.clamp(dx,-80,80)*.00125
  const base=tunnel?(view===2?.5:.32):coastal?(view===2?.42:.28):view===2?(desert?.5:.74):narrowRoad?.75:(desert?.28:.35)
  const minimum=view===1?-.55:(tunnel?.18:coastal?.18:narrowRoad?.65:.12)-base,maximum=view===1?.65:(tunnel?.58:1.25)-base
  // Clamp the actual orbit target, so reverse dragging responds at the limit.
  targetPitch=T.MathUtils.clamp(targetPitch+(view===1?1:-1)*T.MathUtils.clamp(dy,-80,80)*.001,minimum,maximum)
 }

 function apply(position:T.Vector3,heading:number,view:number,dt:number){
  const smoothing=1-Math.exp(-dt*(tunnel?9:5));yaw=T.MathUtils.lerp(yaw,targetYaw,smoothing);pitch=T.MathUtils.lerp(pitch,targetPitch,smoothing)
  if(view===1){
   offset.copy(anchor).applyAxisAngle(up,heading);camera.position.copy(position).add(offset)
   camera.quaternion.setFromEuler(new T.Euler(-.08-pitch,Math.PI/2+heading+yaw,0,'YXZ'))
  }else if(tunnel){
   // Orbit inside the tunnel from the outset; no second camera clamp or wall collision snaps.
   const elevation=T.MathUtils.clamp((view===2?.5:.32)+pitch,.18,.58),azimuth=(view===2?Math.PI/2:2.55)+yaw;
   const side=Math.sin(azimuth),width=side>=0?3.55-position.z:3.55+position.z;
   offset.set(Math.cos(azimuth)*Math.cos(elevation)*(view===2?6.4:6),.65+Math.sin(elevation)*4.5,side*Math.cos(elevation)*width);
   camera.position.copy(position).add(offset);target.copy(position);target.y+=.65;camera.lookAt(target);
  }else{
   const radius=coastal?(view===2?28:12.5):narrowRoad?(view===2?13:10):view===2?13:8.6,elevation=T.MathUtils.clamp((coastal?(view===2?.42:.28):view===2?(desert?.5:.74):narrowRoad?.75:(desert?.28:.35))+pitch,coastal?.18:narrowRoad?.65:.12,1.25),azimuth=(view===2?(coastal?1.1:narrowRoad?-Math.PI/2:Math.PI/2):(desert?.22:2.55))+yaw
   const viewRadius=radius*(desert?.92:1)
   offset.set(Math.cos(azimuth)*Math.cos(elevation)*viewRadius,Math.sin(elevation)*viewRadius,Math.sin(azimuth)*Math.cos(elevation)*viewRadius).applyAxisAngle(up,heading)
   camera.position.copy(position).add(offset);target.copy(position);target.y+=.65;camera.lookAt(target)
  }
 }
 return {anchor,turn,apply,reset,setDesert:(value:boolean)=>{desert=value;reset()},setCoastal:(value:boolean)=>{coastal=value;reset()},setTunnel:(value:boolean)=>{tunnel=value;reset()},setNarrowRoad:(value:boolean)=>{narrowRoad=value;reset()}}
}

