import fs from 'node:fs'
const file='app/three/saltFlatRoad.ts';let s=fs.readFileSync(file,'utf8')
s=s.replace("const profile=22+24*Math.pow", "const detail=3.4*Math.sin(a*47+layer)+2.1*Math.sin(a*91+1.6)+1.2*Math.sin(a*177+.9);const profile=16+detail+24*Math.pow")
s=s.replace("const material=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide});const mesh",`const material=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide});
 material.onBeforeCompile=s=>{
 s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\\nvarying vec3 ridgePosition;').replace('#include <begin_vertex>','#include <begin_vertex>\\nridgePosition=position;')
 s.fragmentShader=s.fragmentShader.replace('#include <common>',\`#include <common>
 varying vec3 ridgePosition;
 float rh(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
 float rn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(rh(i),rh(i+vec3(1,0,0)),f.x),mix(rh(i+vec3(0,1,0)),rh(i+vec3(1,1,0)),f.x),f.y),mix(mix(rh(i+vec3(0,0,1)),rh(i+vec3(1,0,1)),f.x),mix(rh(i+vec3(0,1,1)),rh(i+vec3(1,1,1)),f.x),f.y),f.z);}\`)
 s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',\`#include <color_fragment>
 float rock=rn(ridgePosition*vec3(.16,.3,.16))*.5+rn(ridgePosition*.58)*.3+rn(ridgePosition*1.9)*.2;
 float stratum=sin(ridgePosition.y*.7+rn(ridgePosition*.12)*5.);
 diffuseColor.rgb*=.78+rock*.34+stratum*.03;\`)
 };material.customProgramCacheKey=()=>'salt-horizon-rock-v1';const mesh`)
s=s.replace("s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',", "s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',")
// Fine surface normal variation only near the viewer; no displacement or shimmer in the distance.
s=s.replace("salt.customProgramCacheKey=()=>'salt-flat-crust-v1'", "salt.customProgramCacheKey=()=>'salt-flat-crust-v2'")
s=s.replace("diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.67,.59,.48),edge*(.62+.16*saltNoise(p*1.3)));`)", "diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.67,.59,.48),edge*(.62+.16*saltNoise(p*1.3)));`)\n s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>\n vec2 sp=vec2(saltPosition.x-saltTravel,saltPosition.z);\n float micro=saltNoise(sp*18.)*.012*(1.-smoothstep(12.,45.,length(vViewPosition)));\n normal=normalize(normal-cross(dFdx(saltPosition),normal)*dFdy(micro)*.6-cross(normal,dFdy(saltPosition))*dFdx(micro)*.6);`)")
fs.writeFileSync(file,s)
const page='app/pages/drive/[car].vue';fs.writeFileSync(page,fs.readFileSync(page,'utf8').replace("t('Пустынная дорога','Desert road')","t('Солончак','Salt-flat highway')"))
fs.appendFileSync('README.md','\nSalt-flat reference rebuild: the daylight driving scene now uses a new flat salt-crust surface, a straight PBR asphalt highway with yellow dashes, and two distant asymmetric mountain rings. No desert GLB, vegetation or stones are loaded. The supplied second photograph is a composition reference, not a downloaded model or a claim of an exact photographic match. Tunnel unchanged.\n')
