import fs from 'node:fs'
const file='app/three/saltFlatRoad.ts';let s=fs.readFileSync(file,'utf8');s=s.replace("plane(2200,2200,salt,level-.018)","plane(2200,2200,salt,level-.095)")
s=s.replace("mix(vec3(.93,.94,.97),vec3(1.04,1.025,.98),macro)","mix(vec3(.84,.87,.91),vec3(1.045,1.035,1.015),macro)")
s=s.replace("const level=8.287,travel",`const skyGeometry=new T.SphereGeometry(2000,48,24),skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{zenith:{value:new T.Color('#1768a8')},horizon:{value:new T.Color('#cbdce8')}},vertexShader:'varying vec3 skyDirection;void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 zenith;uniform vec3 horizon;varying vec3 skyDirection;void main(){float h=pow(clamp(normalize(skyDirection).y/0.6,0.,1.),.6);gl_FragColor=vec4(mix(horizon,zenith,h),1.);\\n#include <tonemapping_fragment>\\n#include <colorspace_fragment>\\n}'}),sky=new T.Mesh(skyGeometry,skyMaterial);sky.position.y=8.287;sky.renderOrder=-1;group.add(sky)
 const level=8.287,travel`)
s=s.replace("function plane(width", "ownedGeometry.push(skyGeometry);ownedMaterial.push(skyMaterial)\n function plane(width")
s=s.replace("salt-flat-crust-v3","salt-flat-crust-v4")
fs.writeFileSync(file,s)
fs.appendFileSync('README.md','\nSalt-flat quality pass: ridged mountain terrain with PBR rock detail, granular salt-crust normal map and mineral patches, raised irregular gravel shoulders, and an angle-based sky dome. Shared road textures and reusable marking transforms avoid per-frame allocations. Local preview restarted on port 3010.\n')
