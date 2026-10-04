import * as T from 'three'

/** A thin pearlescent coat, driven by viewing angle rather than a painted stripe. */
export function installPaintFinish(material:T.MeshPhysicalMaterial){
 const previous=material.onBeforeCompile.bind(material),cache=material.customProgramCacheKey.bind(material)
 material.clearcoat=1;material.clearcoatRoughness=.09;material.roughness=.23
 material.iridescence=.12;material.iridescenceIOR=1.3;material.iridescenceThicknessRange=[110,220]
 material.onBeforeCompile=(shader,renderer)=>{
  previous(shader,renderer)
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float coatAngle=pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),1.6);
   float coatSaturation=max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b))-min(diffuseColor.r,min(diffuseColor.g,diffuseColor.b));
   vec3 coatTint=mix(vec3(1.035,.985,.96),vec3(.96,1.015,1.065),coatAngle);
   diffuseColor.rgb*=mix(vec3(1.0),coatTint,clamp(coatSaturation*3.0,.2,1.0));`)
 }
 material.customProgramCacheKey=()=>cache()+'-velocity-pearl-v1';material.needsUpdate=true
}
