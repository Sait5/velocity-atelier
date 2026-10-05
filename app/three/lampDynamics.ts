import * as T from 'three'

/** Update real lamp transforms for analytic surface reflection; keep a bounded shadow budget. */
export function createLampDynamics(root:T.Group){
 const spots:T.SpotLight[]=[],tails:T.PointLight[]=[],spills:T.Mesh[]=[]
 root.traverse(o=>{
  if(o instanceof T.SpotLight){spots.push(o);o.shadow.mapSize.set(512,512);o.shadow.bias=-.00008;o.shadow.normalBias=.025;o.shadow.camera.near=.15;o.shadow.camera.far=10}
  if(o instanceof T.PointLight&&o.color.r>o.color.g*2)tails.push(o)
  if(o instanceof T.Mesh&&/floor spill|ground reflection/i.test(o.name)&&o.material instanceof T.ShaderMaterial){o.material.uniforms.lampTravel={value:0};spills.push(o)}
 })
 let road=false;const direction=new T.Vector3()
 return {
  configure(quality:string,shadows:boolean,driving:boolean){road=driving;spots.forEach((l,i)=>{l.castShadow=shadows&&quality!=='Medium'&&i===0&&l.intensity>0});spills.forEach(m=>{m.visible=!road&&m.userData.enabled!==false})},
  update(distance:number){spills.forEach(m=>{
   const material=m.material as T.ShaderMaterial,u=material.uniforms;u.lampTravel!.value=distance;
   const rear=m.name.includes('Rear'),enabled=rear?root.userData.tailEnabled:root.userData.frontEnabled;m.userData.enabled=enabled;m.visible=!road&&enabled!==false;
   const sources=rear?tails:spots;
   if(!road&&u.lampPositions)for(let i=0;i<2;i++){const lamp=sources[i];if(!lamp)continue;lamp.getWorldPosition(u.lampPositions.value[i]);u.lampPowers!.value[i]=lamp.intensity;
    if(lamp instanceof T.SpotLight){lamp.target.getWorldPosition(direction);u.lampDirections!.value[i].copy(direction).sub(u.lampPositions.value[i]).normalize();u.lampCos!.value=Math.cos(lamp.angle)}
   }
  })},
 }
}
