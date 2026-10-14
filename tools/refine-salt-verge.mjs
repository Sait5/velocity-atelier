import fs from 'node:fs'
const file='app/three/saltFlatRoad.ts';let s=fs.readFileSync(file,'utf8')
s=s.replace("ownedMaterial.push(vergeMaterial)",`vergeMaterial.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',\`#include <map_fragment>
 float gravel=texture2D(map,vMapUv).r;
 diffuseColor.rgb=mix(vec3(.27,.235,.19),vec3(.48,.43,.35),clamp(gravel*2.,0.,1.));\`)};vergeMaterial.customProgramCacheKey=()=>'salt-gravel-verge-v1';ownedMaterial.push(vergeMaterial)`)
fs.writeFileSync(file,s)
const scene='app/components/VehicleScene.client.vue';fs.writeFileSync(scene,fs.readFileSync(scene,'utf8').replace("new T.Fog('#c9dce9',900,2600)","new T.Fog('#c9dce9',200,1800)"))
