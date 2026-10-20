import * as T from 'three'

/** Analytic near-field BRDF supplements the unchanged studio floor, not a painted beam. */
export function createLampPool(x:number,rear=false){
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  uniforms:{lampPositions:{value:[new T.Vector3(),new T.Vector3()]},lampDirections:{value:[new T.Vector3(),new T.Vector3()]},lampPowers:{value:[0,0]},lampCos:{value:rear?-1:Math.cos(.42)},lampTint:{value:new T.Color(rear?'#ff2010':'#dceaff')},poolRoughness:{value:rear?.42:.32}},
  vertexShader:`varying vec3 surface;varying vec2 footprint;void main(){surface=(modelMatrix*vec4(position,1.)).xyz;footprint=uv*2.-1.;gl_Position=projectionMatrix*viewMatrix*vec4(surface,1.);}`,
  fragmentShader:`varying vec3 surface;varying vec2 footprint;
  uniform vec3 lampPositions[2];uniform vec3 lampDirections[2];uniform float lampPowers[2];uniform float lampCos;uniform vec3 lampTint;uniform float poolRoughness;
  void main(){
   vec3 N=vec3(0.,1.,0.),V=normalize(cameraPosition-surface);float nv=max(dot(N,V),.03);float radiance=0.;
   float a=poolRoughness*poolRoughness,a2=a*a;
   for(int i=0;i<2;i++){
    vec3 delta=lampPositions[i]-surface;float distance2=max(dot(delta,delta),.12);vec3 L=normalize(delta);float nl=max(dot(N,L),0.);
    float cone=lampCos<0.?1.:smoothstep(lampCos,min(.999,lampCos+.07),dot(-L,lampDirections[i]));
    vec3 H=normalize(L+V);float nh=max(dot(N,H),0.),vh=max(dot(V,H),0.);
    float denom=nh*nh*(a2-1.)+1.;float D=a2/(3.14159*denom*denom);
    float k=pow(poolRoughness+1.,2.)/8.;float G=(nv/(nv*(1.-k)+k))*(nl/(nl*(1.-k)+k));
    float F=.04+.96*pow(1.-vh,5.);float specular=D*G*F/max(4.*nv*nl,.01);
    float attenuation=1./distance2;float rangeFade=1.-smoothstep(3.,5.5,sqrt(distance2));
    radiance+=lampPowers[i]*attenuation*nl*cone*rangeFade*(.008/3.14159+specular*.07);
   }
   // an elliptical fade: the plane's straight edges showed on the road at night as a bright rectangle
   float boundary=1.-smoothstep(.3,1.,length(footprint));
   gl_FragColor=vec4(lampTint*min(radiance,1.2),boundary);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`});
 const mesh=new T.Mesh(new T.PlaneGeometry(rear?5:7,6),material);mesh.name=rear?'Rear lamp ground reflection':'Headlight physical floor spill';mesh.rotation.x=-Math.PI/2;mesh.position.set(x+(rear?1.1:-2),.012,0);return mesh
}
export function createHeadlightPool(frontX:number,_halfWidth:number){return createLampPool(frontX)}
