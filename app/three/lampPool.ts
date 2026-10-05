import * as T from 'three'

/** Soft near-field scattering supplements real lamps on the polished studio floor. */
export function createHeadlightPool(frontX:number,halfWidth:number){
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  vertexShader:'varying vec2 pool;void main(){pool=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 pool;void main(){
   float distance=(1.-pool.x)*3.8;float lateral=(pool.y-.5)*3.6;
   float spread=.55+distance*.18;
   float left=exp(-pow((lateral-${halfWidth.toFixed(2)})/spread,2.));
   float right=exp(-pow((lateral+${halfWidth.toFixed(2)})/spread,2.));
   float falloff=exp(-pow((distance-1.35)/1.25,2.));
   float boundary=smoothstep(0.,.25,distance)*(1.-smoothstep(2.6,3.8,distance));
   float sideFade=1.-smoothstep(1.05,1.8,abs(lateral));
   gl_FragColor=vec4(.82,.90,1.,.11*(left+right)*falloff*boundary*sideFade);
  }`});
 const mesh=new T.Mesh(new T.PlaneGeometry(3.8,3.6),material);mesh.name='Headlight soft floor spill';mesh.rotation.x=-Math.PI/2;mesh.position.set(frontX-1.9,.012,0);return mesh
}
