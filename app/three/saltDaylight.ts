import * as T from 'three'

/** One static sky capture shared by paint, glass, asphalt and salt. No per-frame reflections. */
export function createSaltDaylight(pmrem:T.PMREMGenerator){
 const scene=new T.Scene(),geometry=new T.SphereGeometry(100,32,16)
 const material=new T.ShaderMaterial({side:T.BackSide,uniforms:{zenith:{value:new T.Color('#1267af')},horizon:{value:new T.Color('#c9dce9')}},vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 direction;uniform vec3 zenith,horizon;
 void main(){vec3 d=normalize(direction);float h=pow(clamp(d.y/.65,0.,1.),.65);vec3 colour=mix(horizon,zenith,h);if(d.y<0.)colour=mix(horizon,vec3(.75,.76,.72),smoothstep(0.,.055,-d.y));vec3 sun=normalize(vec3(-28.,11.713,15.));colour+=vec3(1.,.94,.83)*5.*pow(max(dot(d,sun),0.),600.);gl_FragColor=vec4(colour,1.);}`})
 scene.add(new T.Mesh(geometry,material))
 const target=pmrem.fromScene(scene,.015,.1,200)
 geometry.dispose();material.dispose()
 return target
}
