import * as T from 'three'

/** Camera-dependent surface scattering; one bounded shadow projector per vehicle. */
export function createLampDynamics(root:T.Group){
 const spots:T.SpotLight[]=[],spills:T.Mesh[]=[]
 root.traverse(o=>{
  if(o instanceof T.SpotLight){spots.push(o);o.shadow.mapSize.set(512,512);o.shadow.bias=-.00008;o.shadow.normalBias=.025;o.shadow.camera.near=.15;o.shadow.camera.far=10}
  if(o instanceof T.Mesh&&/floor spill|ground reflection/i.test(o.name)&&o.material instanceof T.ShaderMaterial){
   const m=o.material;m.uniforms.lampTravel={value:0};
   m.vertexShader='varying vec3 lampWorld;'+m.vertexShader.replace('void main(){','void main(){lampWorld=(modelMatrix*vec4(position,1.)).xyz;');
   m.fragmentShader='varying vec3 lampWorld;uniform float lampTravel;'+m.fragmentShader.replace(/}\s*$/,`vec3 sight=normalize(cameraPosition-lampWorld);float grain=.88+.12*sin((lampWorld.x-lampTravel)*23.)*sin(lampWorld.z*31.);float grazing=pow(1.-abs(sight.y),3.);gl_FragColor.a*=grain*(.72+.28*grazing);}`);m.needsUpdate=true;spills.push(o)
  }
 })
 let road=false
 return {
  configure(quality:string,shadows:boolean,driving:boolean){road=driving;spots.forEach((l,i)=>{l.castShadow=shadows&&quality!=='Medium'&&i===0&&l.intensity>0});spills.forEach(m=>{m.visible=!road&&m.userData.enabled!==false})},
  update(distance:number){spills.forEach(m=>{const material=m.material as T.ShaderMaterial;material.uniforms.lampTravel!.value=distance;const enabled=m.name.includes('Rear')?root.userData.tailEnabled:root.userData.frontEnabled;m.userData.enabled=enabled;m.visible=!road&&enabled!==false})},
 }
}
