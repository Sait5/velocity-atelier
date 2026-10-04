import * as T from 'three'
/** Short red light pools follow the vehicle and use real point lights on nearby surfaces. */
export function installTailGlow(root:T.Group,rearX:number){
 const lights=[-1,1].map(side=>{const light=new T.PointLight('#ff2010',1.6,2.6,2);light.position.set(rearX,.55,side*.72);root.add(light);return light})
 const glow=new T.Mesh(new T.PlaneGeometry(2.3,2.6),new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;void main(){float x=p.x*2.3;float z=(p.y-.5)*2.6;float lobes=exp(-pow((z-.72)/.43,2.))+exp(-pow((z+.72)/.43,2.));float fade=smoothstep(0.,.22,x)*exp(-x*1.9)*(1.-smoothstep(1.4,2.3,x));gl_FragColor=vec4(1.,.025,.008,.35*lobes*fade);}' }));glow.rotation.x=-Math.PI/2;glow.position.set(rearX+.95,.018,0);glow.name='Rear lamp ground reflection';root.add(glow)
 function set(enabled:boolean){glow.visible=enabled;lights.forEach(l=>l.intensity=enabled?1.6:0)}
 return {set}
}
