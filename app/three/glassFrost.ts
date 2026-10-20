import * as T from 'three'

// Window glass of the four detailed cars (lamp lenses such as Ferrari 'glass', 'red_glass' or M_GlassClear stay clear).
const windowGlass=/^window$|Window_|M_GlassSide|windshield|sliding glass|rear cabin glass|McLaren window/i

/** Light frost on the car's window glass for the winter pass: a whitish crystalline bloom that leaves the panes
 * translucent (the cabin stays readable through them) and roughens their reflections. The pattern is fixed to the glass
 * in metres of object space, so it holds still from every angle; one shared uniform switches it on and off. */
export function installGlassFrost(root:T.Object3D){
 const amount={value:0},seen=new Set<T.Material>()
 root.traverse(o=>{if(!(o instanceof T.Mesh))return
  for(const m of Array.isArray(o.material)?o.material:[o.material]){
   if(seen.has(m)||!windowGlass.test(m.name)||!(m instanceof T.MeshStandardMaterial))continue
   seen.add(m)
   const previous=m.onBeforeCompile,key=m.customProgramCacheKey.bind(m)
   m.onBeforeCompile=(shader,renderer)=>{previous.call(m,shader,renderer)
    shader.uniforms.glassFrost=amount
    shader.vertexShader='varying vec3 frostPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfrostPoint=position*length(modelMatrix[0].xyz);')
    shader.fragmentShader=`varying vec3 frostPoint;uniform float glassFrost;
     float frostHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
     float frostNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(mix(frostHash(i),frostHash(i+vec3(1,0,0)),f.x),mix(frostHash(i+vec3(0,1,0)),frostHash(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(frostHash(i+vec3(0,0,1)),frostHash(i+vec3(1,0,1)),f.x),mix(frostHash(i+vec3(0,1,1)),frostHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
     `+shader.fragmentShader
     .replace('#include <alphamap_fragment>',`#include <alphamap_fragment>
      // a faint haze with frost crystals in patches; the panes stay clear to look through
      float crystals=frostNoise(frostPoint*14.)*.45+frostNoise(frostPoint*47.+3.7)*.33+frostNoise(frostPoint*150.+9.1)*.22;
      float frost=glassFrost*(.08+.3*smoothstep(.45,.85,crystals));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.80,.86,.93),frost*.35);
      diffuseColor.a=mix(diffuseColor.a,max(diffuseColor.a,.28),frost);`)
     .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.3,frost);')
   }
   m.customProgramCacheKey=()=>key()+'|glass-frost-v4'
   m.needsUpdate=true
  }
 })
 return {set(value:number){amount.value=value}}
}
