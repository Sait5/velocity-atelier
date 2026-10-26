import * as T from 'three'

/**
 * Car glass as a thin tinted pane. With plain alpha blending the pane's reflections were dimmed by its opacity like the
 * rest of it, so windows read as a flat grey film. Here the light through the pane is dimmed by the tint while what it
 * reflects is added on top at full strength, and the reflection follows Fresnel: faint looking straight through, a clean
 * mirror at grazing angles, where the pane also lets less of the background through. Drawn premultiplied:
 * colour = tint × alpha + reflection, background × (1 − alpha'), alpha' = alpha + (1 − alpha) × Fresnel.
 *
 * `layers` is how many glass surfaces a sight line crosses (a pane modelled as an outer and an inner face, or as a closed
 * slab, is crossed twice): each surface then takes the share of the tint that adds up to `opacity` over all of them.
 */
export type GlassLook={color?:T.ColorRepresentation,opacity?:number,roughness?:number,envMapIntensity?:number,layers?:number,side?:T.Side}
/** One tint for every car's windows: a dark neutral grey-green that lets about 58 % of the light through head-on. */
export const tintedWindow={color:'#0a1211',opacity:.42,roughness:.03,envMapIntensity:.8} satisfies GlassLook
export function carGlass(material:T.MeshStandardMaterial,look:GlassLook={}){
 if(look.color!==undefined)material.color.set(look.color)
 const layers=look.layers??1,opacity=look.opacity??material.opacity
 material.opacity=1-Math.pow(1-opacity,1/layers)
 material.roughness=look.roughness??.03;material.metalness=0
 if(look.envMapIntensity!==undefined)material.envMapIntensity=look.envMapIntensity
 material.side=look.side??T.DoubleSide
 material.map=null;material.roughnessMap=null;material.metalnessMap=null
 if(material instanceof T.MeshPhysicalMaterial){material.transmission=0;material.clearcoat=0;material.sheen=0;material.iridescence=0}
 material.transparent=true;material.depthWrite=false
 material.blending=T.CustomBlending;material.blendEquation=T.AddEquation;material.blendSrc=T.OneFactor;material.blendDst=T.OneMinusSrcAlphaFactor
 material.blendSrcAlpha=T.OneFactor;material.blendDstAlpha=T.OneMinusSrcAlphaFactor
 material.userData.carGlass=true
 install(material)
 material.needsUpdate=true
 return material
}
/** a clone of car glass (material.clone() does not carry the shader hook) */
export function fitWindowGlass(clone:T.Material,source:T.Material){if(source.userData.carGlass)install(clone)}
function install(m:T.Material){
 m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float glassFresnel = pow( 1.0 - saturate( dot( normal, geometryViewDir ) ), 5.0 );
float glassAlpha = diffuseColor.a + ( 1.0 - diffuseColor.a ) * glassFresnel;
gl_FragColor = vec4( totalDiffuse * diffuseColor.a + totalSpecular + totalEmissiveRadiance, glassAlpha );`)}
 m.customProgramCacheKey=()=>'car-glass-v1'
}
