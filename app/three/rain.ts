import * as T from 'three'

/**
 * Rain around the car: short streaks animated entirely on the GPU. Each drop falls at its own speed and, seen from the
 * moving car, draws a trail along its velocity relative to the car (so at speed the streaks lean back toward the
 * camera). The box stays around the car, which keeps near the origin while the road scrolls by; no drops inside the car.
 * Behind the rear tyres a plume of spray rises from the wet road once the car is moving.
 */
export function createRain(groundY:number,travel:T.IUniform<number>,light:T.IUniform<number>){
 const group=new T.Group();group.name='Rain';group.visible=false
 const count=6500,positions=new Float32Array(count*2*3),seeds=new Float32Array(count*2),tips=new Float32Array(count*2)
 for(let i=0;i<count;i++){const x=Math.random()*80-40,y=Math.random()*24,z=Math.random()*44-22,s=Math.random();for(let k=0;k<2;k++){positions.set([x,y,z],(i*2+k)*3);seeds[i*2+k]=s;tips[i*2+k]=k}}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('seed',new T.BufferAttribute(seeds,1));geometry.setAttribute('tip',new T.BufferAttribute(tips,1))
 const time={value:0},speed={value:0},car={value:new T.Vector2()},wheelA={value:new T.Vector3()},wheelB={value:new T.Vector3()}
 const material=new T.ShaderMaterial({fog:true,transparent:true,depthWrite:false,uniforms:{...T.UniformsUtils.clone(T.UniformsLib.fog),rainTravel:travel,rainTime:time,rainSpeed:speed,rainCar:car,rainLight:light,rainGround:{value:groundY}},
  vertexShader:`#include <fog_pars_vertex>
  attribute float seed,tip;uniform float rainTravel,rainTime,rainSpeed,rainLight,rainGround;uniform vec2 rainCar;varying float dropAlpha;varying float dropTip;
  void main(){
   float fall=9.+seed*3.;
   vec3 p=position;p.y=mod(p.y-rainTime*fall,24.);p.x=mod(p.x+rainTravel+rainTime*.6,80.)-40.;
   // the trail follows the drop's motion relative to the car over a short exposure (wind adds a little drift)
   vec3 relative=vec3(min(rainSpeed,25.)*.55+.6,-fall,0.);p-=relative*tip*(1./44.);
   p.y+=rainGround;
   vec4 mvPosition=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mvPosition;
   float inCar=step(abs(p.x-rainCar.x),2.6)*step(abs(p.z-rainCar.y),1.25)*step(p.y-rainGround,1.7);
   dropAlpha=smoothstep(0.,.6,p.y-rainGround)*smoothstep(24.,20.,p.y-rainGround)*smoothstep(.5,3.,-mvPosition.z)*(1.-smoothstep(25.,45.,-mvPosition.z))*(1.-inCar)*(.55+.45*seed);
   dropTip=tip;
   #include <fog_vertex>
  }`,
  // each streak is brightest at its head and fades along its trail
  fragmentShader:`#include <fog_pars_fragment>
  uniform float rainLight;varying float dropAlpha;varying float dropTip;
  void main(){if(dropAlpha<.01)discard;gl_FragColor=vec4(vec3(.74,.8,.86)*(.12+.88*rainLight),dropAlpha*.24*(1.-dropTip*.75));
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   #include <fog_fragment>
  }`})
 const lines=new T.LineSegments(geometry,material);lines.frustumCulled=false;lines.renderOrder=2;group.add(lines)
 // spray: soft puffs thrown up and back from both rear tyres, rising and spreading as they fall behind the car. Kept light
 // (the owner found a full plume too much water): a low, thin mist that stays close to the road.
 const puffs=700,sprayPositions=new Float32Array(puffs*3),spraySeeds=new Float32Array(puffs*3)
 for(let i=0;i<puffs;i++)spraySeeds.set([Math.random(),Math.random(),i%2],i*3)
 const sprayGeometry=new T.BufferGeometry();sprayGeometry.setAttribute('position',new T.BufferAttribute(sprayPositions,3));sprayGeometry.setAttribute('spray',new T.BufferAttribute(spraySeeds,3))
 const sprayMaterial=new T.ShaderMaterial({fog:true,transparent:true,depthWrite:false,uniforms:{...T.UniformsUtils.clone(T.UniformsLib.fog),rainTime:time,rainSpeed:speed,rainLight:light,wheelA,wheelB},
  vertexShader:`#include <fog_pars_vertex>
  attribute vec3 spray;uniform float rainTime,rainSpeed;uniform vec3 wheelA,wheelB;varying float puffAlpha;
  void main(){
   float age=fract(rainTime*2.+spray.x*7.31);
   vec3 origin=spray.z<.5?wheelA:wheelB;
   float back=min(rainSpeed,40.)*(.07+.06*spray.y),side=(fract(spray.x*31.7)-.5)*2.6,up=.35+.6*fract(spray.x*13.7);
   vec3 p=origin+vec3(back*age,up*age-1.2*age*age,(spray.z<.5?-1.:1.)*abs(side)*age*.45+side*.35*age);
   p.y=max(p.y,origin.y+.02);
   vec4 mvPosition=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mvPosition;
   gl_PointSize=min((.25+1.*age)*700./max(.1,-mvPosition.z),90.);
   puffAlpha=(1.-age)*smoothstep(.0,.08,age)*smoothstep(6.,24.,rainSpeed);
   #include <fog_vertex>
  }`,
  fragmentShader:`#include <fog_pars_fragment>
  uniform float rainLight;varying float puffAlpha;
  void main(){vec2 c=gl_PointCoord*2.-1.;float d=dot(c,c);if(d>1.||puffAlpha<.005)discard;
   gl_FragColor=vec4(vec3(.78,.82,.86)*(.14+.86*rainLight),puffAlpha*.009*(1.-d)*(1.-d));
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   #include <fog_fragment>
  }`})
 const sprayPoints=new T.Points(sprayGeometry,sprayMaterial);sprayPoints.frustumCulled=false;sprayPoints.renderOrder=3;group.add(sprayPoints)
 return {object:group,
  update(elapsed:number,carSpeed:number,contacts?:T.Vector3[]){
   time.value=elapsed;speed.value=Math.abs(carSpeed)
   if(contacts?.length){car.value.set(contacts.reduce((s,p)=>s+p.x,0)/contacts.length,contacts.reduce((s,p)=>s+p.z,0)/contacts.length)
    // the rear tyres are the two contacts furthest back (+x: the car drives toward -x)
    const rear=[...contacts].sort((a,b)=>b.x-a.x).slice(0,2);if(rear.length===2){wheelA.value.copy(rear[0]!.z<rear[1]!.z?rear[0]!:rear[1]!);wheelB.value.copy(rear[0]!.z<rear[1]!.z?rear[1]!:rear[0]!)}}
  },
  setVisible(visible:boolean){group.visible=visible},
  dispose(){geometry.dispose();material.dispose();sprayGeometry.dispose();sprayMaterial.dispose()}}
}
