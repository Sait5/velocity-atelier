import * as T from 'three'
import {Sky} from 'three/addons/objects/Sky.js'

/** Clouds and the vehicle environment use the same sky, captured once at load. */
export function createMountainSky(pmrem:T.PMREMGenerator,winter=false){
 const sky=new Sky();sky.scale.setScalar(5000)
 const uniforms=sky.material.uniforms
 uniforms.turbidity!.value=winter?12:3.8;uniforms.rayleigh!.value=winter?.75:1.6;uniforms.mieCoefficient!.value=winter?.025:.003;uniforms.mieDirectionalG!.value=.72
 uniforms.sunPosition!.value=new T.Vector3(-.38,winter?.44:.23,-.65).normalize().multiplyScalar(1000)
 sky.material.fragmentShader=sky.material.fragmentShader.replace('void main()',`
 float cloudHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float cloudNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(cloudHash(i),cloudHash(i+vec2(1.,0.)),f.x),mix(cloudHash(i+vec2(0.,1.)),cloudHash(i+vec2(1.,1.)),f.x),f.y);}
 float cloudFbm(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=a*cloudNoise(p);p=mat2(.8,-.6,.6,.8)*p*2.03+vec2(7.1,13.2);a*=.5;}return n;}
 void main()`).replace('gl_FragColor = vec4( retColor, 1.0 );',`
 vec3 dir=normalize(vWorldPosition-cameraPosition);float elevation=max(dir.y,0.);
 vec2 cloudUV=dir.xz/(elevation+.24)*2.2;
 float cloudField=cloudFbm(cloudUV);float cloudCover=smoothstep(.40,.69,cloudField)*smoothstep(.015,.13,elevation);
 float cloudShade=cloudFbm(cloudUV+vec2(.18,-.13));
 ${winter?`vec3 night=mix(vec3(.011,.020,.044),vec3(.065,.092,.14),pow(1.-elevation,3.));
 vec3 cloudColor=mix(vec3(.040,.059,.091),vec3(.12,.16,.22),cloudShade);
 vec3 moonDir=normalize(vec3(-.38,.5,-.65));float moonAngle=dot(dir,moonDir);
 night+=vec3(.24,.32,.44)*pow(max(0.,moonAngle),160.)*(1.-cloudCover*.8);
 night+=vec3(.75,.84,1.)*smoothstep(.99972,.99986,moonAngle)*(1.-cloudCover);
 gl_FragColor=vec4(mix(night,cloudColor,cloudCover*.88),1.);`:`vec3 cloudColor=mix(vec3(.50,.61,.73),vec3(.92,.95,.98),cloudShade);
 gl_FragColor=vec4(mix(retColor,cloudColor,cloudCover*.87),1.);`}
 `)
 const capture=new T.Scene();const reflectionSky=sky.clone();reflectionSky.scale.setScalar(100);capture.add(reflectionSky)
 const environment=pmrem.fromScene(capture,.04,.1,200)
 return {sky,environment,dispose(){sky.geometry.dispose();sky.material.dispose();environment.dispose()}}
}

