import * as T from 'three'
import {Sky} from 'three/addons/objects/Sky.js'

export type TimeOfDay='day'|'sunset'|'night'
export type SkyMode={winter:boolean,time:TimeOfDay,rain:boolean}

// Where the light comes from in each mode (shared with the scene's key light and the water shaders): the summer valley's
// morning sun, a low sunset sun straight down the road ahead, a high winter day sun, and the full moon over the road.
export const moonDirection=new T.Vector3(-.992,.122,.035).normalize()
export function sunFor(mode:SkyMode){
 if(mode.time==='night')return moonDirection.clone()
 if(mode.time==='sunset')return new T.Vector3(-.95,.055,-.3).normalize()
 return new T.Vector3(-.38,mode.winter?.44:.23,-.65).normalize()
}

/**
 * The sky of the drive maps in every time of day and weather: three's physical Sky for day and sunset, a night sky with
 * stars, a faint Milky Way and the full moon, and a low overcast for rain; drifting clouds on top. The vehicle
 * environment and a small reflection cube for water are captured from the same sky once, when the mode is set.
 */
export function createMountainSky(pmrem:T.PMREMGenerator,mode:SkyMode|boolean=false,renderer?:T.WebGLRenderer){
 const m:SkyMode=typeof mode==='boolean'?{winter:mode,time:mode?'night':'day',rain:false}:mode
 const sun=sunFor(m),night=m.time==='night',sunset=m.time==='sunset'
 const sky=new Sky();sky.scale.setScalar(5000)
 const uniforms=sky.material.uniforms
 uniforms.turbidity!.value=sunset?7.5:m.winter&&!night?2.6:m.winter?12:3.8
 uniforms.rayleigh!.value=sunset?2.6:m.winter&&!night?1.1:m.winter?.75:1.6
 uniforms.mieCoefficient!.value=sunset?.006:m.winter&&night?.025:.003
 uniforms.mieDirectionalG!.value=sunset?.86:.72
 uniforms.sunPosition!.value=sun.clone().multiplyScalar(1000)
 sky.material.fragmentShader=sky.material.fragmentShader.replace('void main()',`
 float cloudHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float cloudNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(cloudHash(i),cloudHash(i+vec2(1.,0.)),f.x),mix(cloudHash(i+vec2(0.,1.)),cloudHash(i+vec2(1.,1.)),f.x),f.y);}
 float cloudFbm(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=a*cloudNoise(p);p=mat2(.8,-.6,.6,.8)*p*2.03+vec2(7.1,13.2);a*=.5;}return n;}
 vec3 nightSky(vec3 dir,float elevation,float cloudCover){
  vec3 sky=mix(vec3(.004,.008,.02),vec3(.035,.05,.085),pow(1.-elevation,3.));
  // stars: a sparse grid of points, brighter and denser toward the zenith; a faint band of the Milky Way across them
  vec3 cell=floor(dir*420.);float starSeed=fract(sin(dot(cell,vec3(12.9898,78.233,37.719)))*43758.5453);
  vec3 local=fract(dir*420.)-.5;float star=step(.9965,starSeed)*smoothstep(.22,0.,length(local))*smoothstep(.02,.25,elevation);
  float band=exp(-pow(dot(dir,normalize(vec3(.35,.4,-.85)))*3.2,2.))*smoothstep(.0,.3,elevation);
  sky+=vec3(.06,.07,.1)*band*cloudFbm(dir.xz*6.+dir.y*3.);
  sky+=vec3(.75,.8,.95)*star*(.4+.6*fract(starSeed*91.7))*(1.-cloudCover);
  vec3 moonDir=normalize(vec3(-.992,.122,.035));float moonAngle=dot(dir,moonDir);
  sky+=vec3(.18,.24,.34)*pow(max(0.,moonAngle),70.)*(1.-cloudCover*.5);
  sky+=vec3(.32,.38,.50)*pow(max(0.,moonAngle),1600.)*(1.-cloudCover*.6);
  vec3 moonU=normalize(cross(moonDir,vec3(0.,1.,0.))),moonV=cross(moonU,moonDir);
  vec2 moonPoint=vec2(dot(dir,moonU),dot(dir,moonV))/.021;float moonRadius=length(moonPoint);
  float moonDisc=(1.-smoothstep(.95,1.,moonRadius))*step(0.,moonAngle);
  if(moonDisc>0.){
   float maria=cloudFbm(moonPoint*1.6+vec2(3.1,1.7)),craters=cloudFbm(moonPoint*7.+vec2(11.,5.));
   vec3 lunar=vec3(.86,.88,.92)*(1.-.34*smoothstep(.46,.70,maria))*(.88+.14*craters)*mix(1.,.70,pow(moonRadius,3.));
   sky=mix(sky,lunar*1.7,moonDisc*(1.-cloudCover*.55));
  }
  return sky;
 }
 void main()`).replace('gl_FragColor = vec4( retColor, 1.0 );',`
 vec3 dir=normalize(vWorldPosition-cameraPosition);float elevation=max(dir.y,0.);
 vec2 cloudUV=dir.xz/(elevation+.24)*2.2;
 float cloudField=cloudFbm(cloudUV);float cloudShade=cloudFbm(cloudUV+vec2(.18,-.13));
 ${m.rain?`// rain: a low, full overcast with darker rolls; the horizon pales into the rain haze
 float cloudCover=1.;float rolls=cloudFbm(cloudUV*.7+vec2(3.,1.));
 vec3 overcast=mix(vec3(.30,.33,.36),vec3(.52,.55,.58),rolls*.8+pow(1.-elevation,4.)*.5);
 ${night?'overcast*=.07;':sunset?'overcast*=mix(vec3(.62,.5,.44),vec3(.95,.72,.55),pow(1.-elevation,3.));':''}
 gl_FragColor=vec4(overcast,1.);`:night?`float cloudCover=smoothstep(.48,.74,cloudField)*smoothstep(.015,.13,elevation);
 vec3 cloudColor=mix(vec3(.012,.018,.03),vec3(.05,.065,.09),cloudShade);
 gl_FragColor=vec4(mix(nightSky(dir,elevation,cloudCover),cloudColor,cloudCover*.88),1.);`:sunset?`float cloudCover=smoothstep(.44,.72,cloudField)*smoothstep(.015,.13,elevation);
 // sunset clouds: their undersides take the sun's orange and rose, the tops stay grey-violet
 float sunSide=pow(max(dot(normalize(vec3(dir.x,0.,dir.z)),normalize(vec3(${sun.x.toFixed(3)},0.,${sun.z.toFixed(3)}))),0.),2.);
 vec3 cloudColor=mix(vec3(.30,.26,.34),mix(vec3(.95,.48,.32),vec3(1.,.72,.45),cloudShade),.35+.65*sunSide);
 gl_FragColor=vec4(mix(retColor,cloudColor*(.6+.6*sunSide),cloudCover*.8),1.);`:m.winter?`float cloudCover=smoothstep(.46,.72,cloudField)*smoothstep(.015,.13,elevation);
 vec3 cloudColor=mix(vec3(.62,.70,.80),vec3(.96,.98,1.),cloudShade);
 gl_FragColor=vec4(mix(retColor,cloudColor,cloudCover*.85),1.);`:`float cloudCover=smoothstep(.40,.69,cloudField)*smoothstep(.015,.13,elevation);
 vec3 cloudColor=mix(vec3(.50,.61,.73),vec3(.92,.95,.98),cloudShade);
 gl_FragColor=vec4(mix(retColor,cloudColor,cloudCover*.87),1.);`}
 `)
 const capture=new T.Scene();const reflectionSky=sky.clone();reflectionSky.scale.setScalar(100);capture.add(reflectionSky)
 const environment=pmrem.fromScene(capture,.04,.1,200)
 // a small cube of the same sky for water reflections (salt lake), only when a renderer is given
 let reflection:T.WebGLCubeRenderTarget|undefined
 if(renderer){reflection=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});new T.CubeCamera(.1,200,reflection).update(renderer,capture)}
 return {sky,environment,reflection,sun,mode:m,dispose(){sky.geometry.dispose();sky.material.dispose();environment.dispose();reflection?.dispose()}}
}
