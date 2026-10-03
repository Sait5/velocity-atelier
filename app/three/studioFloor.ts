import * as T from 'three'
import {Reflector} from 'three/addons/objects/Reflector.js'

/** A restrained, softened reflection under the vehicle, at a fixed GPU budget. */
export function createStudioFloor(){
 const shader=(Reflector as typeof Reflector & {ReflectorShader:{uniforms:Record<string,T.IUniform>,vertexShader:string,fragmentShader:string}}).ReflectorShader
 const reflection=new Reflector(new T.PlaneGeometry(24,24),{
  textureWidth:768,textureHeight:768,multisample:2,clipBias:.003,color:'#707772',
  shader:{...shader,uniforms:T.UniformsUtils.clone(shader.uniforms),
   vertexShader:shader.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv;varying vec2 floorPosition;').replace('vUv = textureMatrix','floorPosition=position.xy;vUv = textureMatrix'),
   fragmentShader:shader.fragmentShader.replace('varying vec4 vUv;','varying vec4 vUv;varying vec2 floorPosition;')
    .replace('vec4 base = texture2DProj( tDiffuse, vUv );',`vec2 uv=vUv.xy/vUv.w;vec2 texel=vec2(1.0/768.0);vec4 base=texture2D(tDiffuse,uv)*.28;
     base+=(texture2D(tDiffuse,uv+texel*vec2(2.,0.))+texture2D(tDiffuse,uv-texel*vec2(2.,0.))+texture2D(tDiffuse,uv+texel*vec2(0.,2.))+texture2D(tDiffuse,uv-texel*vec2(0.,2.)))*.18;`)
    .replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );','gl_FragColor = vec4( blendOverlay( base.rgb, color ), 0.28*(1.0-smoothstep(3.0,8.0,length(floorPosition))) );')}
 })
 reflection.name='studio_soft_floor_reflection';reflection.rotation.x=-Math.PI/2;reflection.position.y=.004
 const material=reflection.material as T.ShaderMaterial;material.transparent=true;material.depthWrite=false
 return reflection
}
