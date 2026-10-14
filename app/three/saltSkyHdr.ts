import * as T from 'three'
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js'

// Measured solar disc in the CC0 panorama: azimuth 36°, elevation 43°.
export const saltSunDirection=new T.Vector3(.590,.683,.429).normalize()

export function createSaltSky(texture:T.Texture,size=4000){
 const material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{panorama:{value:texture},clouds:{value:texture.userData.clouds}},vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w;}',fragmentShader:`
 uniform sampler2D panorama,clouds;varying vec3 direction;
 void main(){vec3 d=normalize(direction);vec2 uv=vec2(atan(d.z,d.x)/6.2831853+.5,asin(clamp(d.y,-1.,1.))/3.14159265+.5);
 vec3 colour=min(texture2D(panorama,uv).rgb,vec3(6.));
 float cover=texture2D(clouds,uv).r*.42;
 colour=mix(colour,vec3(1.25,1.29,1.32),cover);
 if(d.y<0.)colour=mix(colour,vec3(.70,.72,.73),smoothstep(0.,.045,-d.y));
 gl_FragColor=vec4(colour,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`})
 const sky=new T.Mesh(new T.BoxGeometry(1,1,1),material);sky.scale.setScalar(size);sky.frustumCulled=false;return sky
}

/** One shared real sky, captured only while loading. No per-frame reflection pass. */
export async function createSaltDaylight(pmrem:T.PMREMGenerator,renderer:T.WebGLRenderer,cancelled=()=>false){
 const [skyTexture,clouds]=await Promise.all([new HDRLoader().loadAsync('/textures/saltflat-clear-sky-2k.hdr'),new T.TextureLoader().loadAsync('/textures/saltflat-high-clouds.png')])
 clouds.wrapS=T.RepeatWrapping;skyTexture.userData.clouds=clouds
 if(cancelled()){skyTexture.dispose();clouds.dispose();throw new Error('Scene closed while preparing daylight')}
 const scene=new T.Scene(),sky=createSaltSky(skyTexture,100);scene.add(sky)
 const reflection=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter})
 new T.CubeCamera(.1,200,reflection).update(renderer,scene)
 const environment=pmrem.fromCubemap(reflection.texture)
 sky.geometry.dispose();sky.material.dispose()
 return {environment,reflection,skyTexture,dispose(){environment.dispose();reflection.dispose();skyTexture.dispose();clouds.dispose()}}
}
