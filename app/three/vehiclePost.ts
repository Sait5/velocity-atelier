import * as T from 'three'
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js'
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js'
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js'
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js'
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js'
import {BokehPass} from 'three/addons/postprocessing/BokehPass.js'

/** Photo mode finishing: colour look, vignette and depth of field (focus in metres from the camera). */
export type PhotoFinish={look:number,vignette:number,blur:number,focus:number}

// Colour looks, applied after tone mapping (display values): 0 natural, 1 warm, 2 cool, 3 cinema (teal shadows,
// amber highlights), 4 black and white, 5 film (lifted blacks, soft contrast, warm cast).
const gradeShader={
 uniforms:{tDiffuse:{value:null},look:{value:0},vignette:{value:0},aspect:{value:1}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform sampler2D tDiffuse;uniform float look,vignette,aspect;varying vec2 vUv;
 vec3 curve(vec3 c,float amount){return mix(c,c*c*(3.-2.*c),amount);}
 void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;float l=dot(c,vec3(.2126,.7152,.0722));
  if(look>.5&&look<1.5){c=curve(c*vec3(1.06,1.,.9),.12);}
  else if(look<2.5&&look>1.5){c=curve(c*vec3(.92,.99,1.08),.1);}
  else if(look<3.5&&look>2.5){c+=mix(vec3(-.02,.025,.05),vec3(.06,.015,-.05),smoothstep(.15,.85,l));c=mix(vec3(dot(c,vec3(.2126,.7152,.0722))),c,.9);c=curve(c,.3);}
  else if(look<4.5&&look>3.5){c=curve(vec3(l),.35);}
  else if(look>4.5){c=mix(vec3(.06,.055,.05),vec3(.97,.95,.9),c);c=mix(vec3(dot(c,vec3(.2126,.7152,.0722))),c,.82)*vec3(1.03,1.,.95);}
  float edge=length((vUv-.5)*vec2(aspect,1.));c*=1.-vignette*smoothstep(.3,.95,edge);
  gl_FragColor=vec4(clamp(c,0.,1.),1.);}`
}

export function createVehiclePost(renderer:T.WebGLRenderer,scene:T.Scene,camera:T.PerspectiveCamera){
 const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType});target.samples=4
 const composer=new EffectComposer(renderer,target),renderPass=new RenderPass(scene,camera)
 // Tight radius: highlights still glint, but the glow no longer spreads into a blob floating above the roof.
 const bloom=new UnrealBloomPass(new T.Vector2(640,480),.24,.08,1.8),output=new OutputPass()
 const bokeh=new BokehPass(scene,camera,{focus:6,aperture:.0002,maxblur:.008}),grade=new ShaderPass(gradeShader)
 bokeh.enabled=false;grade.enabled=false
 composer.addPass(renderPass);composer.addPass(bokeh);composer.addPass(bloom);composer.addPass(output);composer.addPass(grade)
 let photo:PhotoFinish|null=null
 return {
  // Same resolution as the canvas: a lower composer ratio was stretched back up and read as pixels on scaled displays.
  resize(width:number,height:number){composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(width,height);grade.uniforms.aspect!.value=width/Math.max(1,height)},
  /** Start compiling the scene's programs in the variant this pipeline draws: the composer renders into a linear
   *  target and tone-maps in OutputPass, so warming against the canvas would compile every material a second time. */
  compile(quality:string){const previous=renderer.getRenderTarget();if(!(quality==='Low'||quality==='Medium'))renderer.setRenderTarget(target);renderer.compile(scene,camera);renderer.setRenderTarget(previous)},
  /** Photo mode finishing; null switches it off. Depth of field: 0 off, 1 soft, 2 strong. */
  setPhoto(finish:PhotoFinish|null){photo=finish},
  render(quality:string,glare=true){
   bloom.enabled=glare;bloom.strength=scene.userData.daylightBloom??.24
   grade.enabled=!!photo&&(photo.look>0||photo.vignette>0);bokeh.enabled=!!photo&&photo.blur>0
   if(photo&&bokeh.enabled){const u=bokeh.uniforms as Record<string,T.IUniform>;u.focus!.value=photo.focus;u.aperture!.value=photo.blur>1.5?.00045:.00016;u.maxblur!.value=photo.blur>1.5?.012:.006}
   if(photo){grade.uniforms.look!.value=photo.look;grade.uniforms.vignette!.value=photo.vignette}
   // photo mode always takes the full pipeline, whatever the quality setting
   if((quality==='Low'||quality==='Medium')&&!photo)renderer.render(scene,camera);else composer.render()
  },
  dispose(){bloom.dispose();bokeh.dispose();grade.dispose();output.dispose();composer.dispose()}
 }
}
