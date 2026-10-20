import * as T from 'three'
import {sunFor,type SkyMode} from './mountainSky'

/**
 * Time of day and rain on the drive maps. One bag of shared uniforms (scene.userData.atmosphere) is read by the maps'
 * own shaders that are not lit by three's lights (water, distant ranges, mist, rain), and `atmosphereLook` gives the
 * scene lighting, fog and exposure for each mode. The defaults are the maps' original daylight, so day without rain
 * looks exactly as before.
 */
export type AtmosphereUniforms={light:T.IUniform<number>,tint:T.IUniform<T.Color>,haze:T.IUniform<T.Color>,sun:T.IUniform<T.Vector3>,sunStrength:T.IUniform<number>,skyHorizon:T.IUniform<T.Color>,skyZenith:T.IUniform<T.Color>,wet:T.IUniform<number>}

export function atmosphereUniforms(scene:T.Scene):AtmosphereUniforms{
 return scene.userData.atmosphere??=({light:{value:1},tint:{value:new T.Color(1,1,1)},haze:{value:new T.Color(.64,.75,.81)},sun:{value:new T.Vector3(.590,.683,.429).normalize()},sunStrength:{value:1},skyHorizon:{value:new T.Color(.80,.82,.84)},skyZenith:{value:new T.Color(.30,.47,.70)},wet:{value:0}} as AtmosphereUniforms)
}

export type AtmosphereLook={key:{color:string,intensity:number,position:T.Vector3,shadow:number},fill:{color:string,intensity:number},ambient:{sky:string,ground:string,intensity:number},environment:number,exposure:number,fog:{color:string,near:number,far:number},bloom:number,light:number,tint:string,haze:string,sunStrength:number,skyHorizon:string,skyZenith:string,wet:number}

/** Lighting for a non-default mode of the salt flat ('desert') or the mountain maps. */
export function atmosphereLook(map:'desert'|'mountain'|'winter',mode:SkyMode,centre:T.Vector3):AtmosphereLook{
 const sun=sunFor(mode),salt=map==='desert',key=(distance:number)=>centre.clone().addScaledVector(sun,distance)
 const far=salt?1500:520,near=salt?260:220
 if(mode.rain){
  const dim=mode.time==='night'?.2:mode.time==='sunset'?.7:1
  return {key:{color:mode.time==='sunset'?'#e8c0a0':mode.time==='night'?'#8fa3c4':'#dfe5ec',intensity:.9*dim,position:centre.clone().add(new T.Vector3(-10,60,-20)),shadow:.25},
   fill:{color:'#c9d3dd',intensity:2.2*dim},ambient:{sky:'#bcc6cf',ground:'#3d4146',intensity:.55*dim+.05},environment:.55*Math.max(dim,.35),exposure:mode.time==='night'?1.28:1,
   fog:{color:mode.time==='night'?'#0b1016':mode.time==='sunset'?'#8f857f':'#8d979f',near:salt?90:70,far:salt?700:380},bloom:mode.time==='night'?.22:.05,
   light:mode.time==='night'?.09:mode.time==='sunset'?.55:.62,tint:mode.time==='sunset'?'#f2d8c4':'#e6ecf2',haze:mode.time==='night'?'#0b1016':mode.time==='sunset'?'#8f857f':'#8d979f',sunStrength:0,
   skyHorizon:mode.time==='night'?'#0c1117':'#8d979f',skyZenith:mode.time==='night'?'#06090d':'#5d666e',wet:1}
 }
 if(mode.time==='night')return {key:{color:'#a8c0ec',intensity:salt?1:.75,position:key(70),shadow:.4},fill:{color:'#45577a',intensity:.9},ambient:{sky:'#3a4766',ground:salt?'#2a3448':'#0b0d12',intensity:salt?.45:.32},environment:.7,exposure:1.18,
  fog:{color:mode.winter?'#1d2c40':'#0d1524',near,far},bloom:.22,light:.075,tint:'#9fb3d8',haze:'#0f182a',sunStrength:.35,skyHorizon:'#101a2c',skyZenith:'#03060c',wet:0}
 if(mode.time==='sunset')return {key:{color:'#ffb072',intensity:salt?2.8:2.2,position:key(70),shadow:.6},fill:{color:'#9fb0d0',intensity:2.2},ambient:{sky:'#f0c6a3',ground:salt?'#8a6e5c':'#5b4a40',intensity:.5},environment:.7,exposure:1.04,
  fog:{color:'#e6b590',near,far},bloom:.12,light:.78,tint:'#ffd2ab',haze:'#e6b590',sunStrength:1.4,skyHorizon:'#f2b98c',skyZenith:'#5d6f9a',wet:0}
 // winter day: bright, high sun over the snow
 return {key:{color:'#fff4e2',intensity:2.6,position:key(70),shadow:.7},fill:{color:'#cfe0f5',intensity:3},ambient:{sky:'#dfe8f3',ground:'#c8d2dc',intensity:.55},environment:.7,exposure:.95,
  fog:{color:'#c9d6e3',near,far},bloom:.03,light:1,tint:'#ffffff',haze:'#c9d6e3',sunStrength:1,skyHorizon:'#d6e2ee',skyZenith:'#5f86b8',wet:0}
}

export function applyAtmosphereUniforms(u:AtmosphereUniforms,look:AtmosphereLook|null,map:string,mode:SkyMode){
 const def=!look
 u.light.value=def?1:look.light;u.tint.value.set(def?'#ffffff':look.tint)
 u.haze.value.set(def?(map==='desert'?'#a3c0cf':'#dde4ea'):look.haze);if(def&&map==='desert')u.haze.value.setRGB(.64,.75,.81)
 u.sun.value.copy(map==='desert'&&def?new T.Vector3(.590,.683,.429).normalize():sunFor(mode))
 u.sunStrength.value=def?1:look.sunStrength
 u.skyHorizon.value.set(def?'#ccd1d6':look.skyHorizon);if(def)u.skyHorizon.value.setRGB(.80,.82,.84)
 u.skyZenith.value.set(def?'#4d78b3':look.skyZenith);if(def)u.skyZenith.value.setRGB(.30,.47,.70)
 u.wet.value=def?0:look.wet
}
