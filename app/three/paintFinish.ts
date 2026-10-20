import * as T from 'three'

/** A thin pearlescent coat, driven by viewing angle rather than a painted stripe. */
export function installPaintFinish(material:T.MeshPhysicalMaterial){
 const coatTime={value:0};material.userData.coatTime=coatTime
 const previous=material.onBeforeCompile.bind(material),cache=material.customProgramCacheKey.bind(material)
 material.clearcoat=1;material.clearcoatRoughness=.065;material.roughness=.19;material.envMapIntensity=1.45
 material.iridescence=.22;material.iridescenceIOR=1.3;material.iridescenceThicknessRange=[110,220]
 material.onBeforeCompile=(shader,renderer)=>{
  previous(shader,renderer)
  shader.uniforms.coatTime=coatTime;shader.fragmentShader="uniform float coatTime;\n"+shader.fragmentShader
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float coatAngle=pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),1.6);
   float coatSaturation=max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b))-min(diffuseColor.r,min(diffuseColor.g,diffuseColor.b));
   vec3 coatTint=mix(vec3(1.075,.995,.955),vec3(.95,1.035,1.12),clamp(coatAngle+.14*sin(coatTime*.42+coatAngle*2.4),0.0,1.0));
   diffuseColor.rgb*=mix(vec3(1.0),coatTint,clamp(coatSaturation*3.0,.2,1.0));`)
 }
 material.customProgramCacheKey=()=>cache()+'-velocity-pearl-v3';material.needsUpdate=true
}

export function updatePaintFinish(material:T.MeshPhysicalMaterial,time:number){if(material.userData.coatTime)material.userData.coatTime.value=time}

/**
 * Liveries painted over the body colour in the car's own frame (x along the car, z across, y up): classic twin racing
 * stripes over bonnet, roof and tail; a single wide offset stripe (as on the 458 Speciale); a side band along the doors
 * with a fine pinstripe. Edges are filtered to the pixel; the stripes take the paint's finish (gloss, matte, chrome).
 */
export const liveryUniforms={liveryType:{value:0},liveryColour:{value:new T.Color('#f2f2ee')},liveryFrame:{value:new T.Matrix4()}}
export function installLivery(material:T.MeshPhysicalMaterial|T.MeshStandardMaterial){
 const previous=material.onBeforeCompile.bind(material),cache=material.customProgramCacheKey.bind(material)
 material.onBeforeCompile=(shader,renderer)=>{
  previous(shader,renderer)
  Object.assign(shader.uniforms,liveryUniforms)
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform mat4 liveryFrame;varying vec3 liveryPoint;varying vec3 liveryNormal;')
   .replace('#include <project_vertex>','#include <project_vertex>\nliveryPoint=(liveryFrame*modelMatrix*vec4(transformed,1.)).xyz;liveryNormal=mat3(liveryFrame*modelMatrix)*objectNormal;')
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float liveryType;uniform vec3 liveryColour;varying vec3 liveryPoint;varying vec3 liveryNormal;')
   .replace('#include <color_fragment>',`#include <color_fragment>
   if(liveryType>.5){
    vec3 ln=normalize(liveryNormal);float sideFacing=abs(ln.z);float stripe=0.;
    if(liveryType<1.5){float z=abs(liveryPoint.z),aa=max(fwidth(z),1e-4);stripe=(smoothstep(.055-aa,.055+aa,z)-smoothstep(.165-aa,.165+aa,z))*(1.-smoothstep(.5,.72,sideFacing));}
    else if(liveryType<2.5){float z=liveryPoint.z+.2,aa=max(fwidth(z),1e-4);stripe=(smoothstep(-.15-aa,-.15+aa,z)-smoothstep(.15-aa,.15+aa,z))*(1.-smoothstep(.5,.72,sideFacing));
     float pin=abs(liveryPoint.z+.2)-.185;stripe=max(stripe,(1.-smoothstep(.006-aa,.006+aa,abs(pin)))*(1.-smoothstep(.5,.72,sideFacing)));}
    else{float y=liveryPoint.y,aa=max(fwidth(y),1e-4);float band=smoothstep(.36-aa,.36+aa,y)-smoothstep(.46-aa,.46+aa,y);float pin=1.-smoothstep(.005-aa,.005+aa,abs(y-.49));stripe=max(band,pin)*smoothstep(.55,.8,sideFacing);}
    diffuseColor.rgb=mix(diffuseColor.rgb,liveryColour,stripe);
   }`)
 }
 material.customProgramCacheKey=()=>cache()+'-velocity-livery-v1';material.needsUpdate=true
}
