import fs from 'node:fs'
const file='app/three/saltFlatRoad.ts';let s=fs.readFileSync(file,'utf8');s=s.replace("const saltNormal=assets.texture", "const saltDiffuse=assets.texture('/textures/sand_01_diff_4k.jpg',true);saltDiffuse.map.repeat.set(880,880)\n const saltNormal=assets.texture")
s=s.replace("{color:'#efede8',normalMap", "{color:'#efede8',map:saltDiffuse.map,normalMap")
s=s.replace("s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\n vec2 p=", "s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>\n float saltLuma=dot(texture2D(map,vMapUv).rgb,vec3(.2126,.7152,.0722));\n diffuseColor.rgb=vec3(.9,.895,.88)*mix(.78,1.08,smoothstep(.015,.3,saltLuma));`)\n s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\n vec2 p=")
s=s.replace("salt-flat-crust-v4","salt-flat-crust-v5").replace("rough.ready,saltNormal.ready,rock.ready", "rough.ready,saltDiffuse.ready,saltNormal.ready,rock.ready")
fs.writeFileSync(file,s)
