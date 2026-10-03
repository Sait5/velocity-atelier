import * as T from 'three'
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js'
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js'
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js'
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js'

export function createVehiclePost(renderer:T.WebGLRenderer,scene:T.Scene,camera:T.PerspectiveCamera){
 const composer=new EffectComposer(renderer),renderPass=new RenderPass(scene,camera)
 const bloom=new UnrealBloomPass(new T.Vector2(640,480),.18,.3,2.5),output=new OutputPass()
 composer.addPass(renderPass);composer.addPass(bloom);composer.addPass(output)
 return {
  resize(width:number,height:number){composer.setPixelRatio(Math.min(renderer.getPixelRatio(),1.25));composer.setSize(width,height)},
  render(quality:string){if(quality==='Low'||quality==='Medium')renderer.render(scene,camera);else composer.render()},
  dispose(){bloom.dispose();output.dispose();composer.dispose()}
 }
}
