import fs from 'node:fs'
const file='app/three/saltFlatRoad.ts';let s=fs.readFileSync(file,'utf8')
s=s.replace("color:'#b1aaa0'","color:'#b7b5b3'")
s=s.replace("const salt=new T.MeshStandardMaterial", "const saltNormal=assets.texture('/textures/sand_01_nor_gl_2k.jpg');saltNormal.map.repeat.set(880,880)\n const salt=new T.MeshStandardMaterial")
s=s.replace("{color:'#eae8df',roughness:.95,metalness:0}","{color:'#efede8',normalMap:saltNormal.map,normalScale:new T.Vector2(.16,.16),roughness:.93,metalness:0}")
s=s.replace("float grain=(saltNoise(p*24.)-.5)*.07*fade;", "float grain=(saltNoise(p*24.)-.5)*.12*fade;\n float crust=saltNoise(p*vec2(3.8,5.2));\n float mineral=saltNoise(p*.34+saltNoise(p*.03)*2.);\n float pools=smoothstep(.64,.85,saltNoise(p*.008)+saltNoise(p*.037)*.14);")
s=s.replace("float edge=1.-smoothstep(4.6,7.6,abs(p.y));","float edge=1.-smoothstep(4.55,6.4+saltNoise(p*vec2(.25,.7))*.9,abs(p.y));")
s=s.replace("diffuseColor.rgb*=1.-cracks*.1*fade+grain;","diffuseColor.rgb*=1.-cracks*.17*fade+grain+(crust-.5)*.08*fade;\n diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.84,.87,.91),pools*.16);\n diffuseColor.rgb*=.96+mineral*.07;")
s=s.replace("salt-flat-crust-v2","salt-flat-crust-v3")
// Terrain cross sections use ridged fractal noise, not a smooth sinusoidal mound.
s=s.replace("for(let layer=0;layer<2;layer++){",`function hash(n:number){return T.MathUtils.euclideanModulo(Math.sin(n*127.1+311.7)*43758.5453,1)}
 function noise(n:number){const i=Math.floor(n),t=n-i,f=t*t*(3-2*t);return T.MathUtils.lerp(hash(i),hash(i+1),f)}
 function ridge(a:number,layer:number){const phase=a/(Math.PI*2)*72+layer*107;return 13+32*noise(phase*.34)+18*noise(phase)+8*noise(phase*3.7)+3*noise(phase*9.1)}
 const rock=assets.texture('/textures/rock_face_03_diff_4k.jpg',true)
 for(let layer=0;layer<2;layer++){`)
s=s.replace("segments=720,rows=8,radius=layer?950:680","segments=960,rows=24,radius=layer?1100:800")
s=s.replace("layer?'#939fab':'#85818b'","layer?'#8292a5':'#736b68'").replace("layer?'#aeb4bb':'#b6a99f'","layer?'#9aa4b0':'#9c8b7d'")
s=s.replace(/const detail=.*?const profile=.*?\r?\n/,"const profile=ridge(a,layer)\n")
s=s.replace("const r=radius+t*180,h=Math.sin(t*Math.PI*.8)*profile*(layer?1.3:1)+Math.sin(a*53+t*15)*2.2*Math.sin(t*Math.PI)","const r=radius+t*230,peak=Math.max(0,1-Math.abs(t-.46)*2.15),erosion=(noise(a*68+t*3)-.5)*9*peak,h=profile*Math.pow(peak,.8)*(layer?1.08:1)+erosion")
s=s.replace("s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\\nvarying vec3 ridgePosition;')", "s.uniforms.horizonRock={value:rock.map};s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\\nvarying vec3 ridgePosition;')")
s=s.replace("varying vec3 ridgePosition;\n float rh", "varying vec3 ridgePosition;uniform sampler2D horizonRock;\n float rh")
s=s.replace("diffuseColor.rgb*=.78+rock*.34+stratum*.03;", "vec3 cliff=texture2D(horizonRock,vec2(length(ridgePosition.xz)*.06+atan(ridgePosition.z,ridgePosition.x)*70.,ridgePosition.y*.065)).rgb;\n diffuseColor.rgb*=.68+rock*.23+stratum*.025;\n diffuseColor.rgb*=mix(vec3(.85),cliff*1.4,.48);")
s=s.replace("salt-horizon-rock-v1","salt-horizon-rock-v2")
s=s.replace("rough.ready]),update", "rough.ready,saltNormal.ready,rock.ready]),update")
// Raised gravelly verges: irregular geometry and a rough granular finish, shared across both sides.
s=s.replace("const white=new T.MeshStandardMaterial",`const vergeMaterial=new T.MeshStandardMaterial({map:diffuse.map,normalMap:normal.map,normalScale:new T.Vector2(.7,.7),color:'#a39a87',roughness:1});ownedMaterial.push(vergeMaterial)
 for(const side of [-1,1]){
 const positions:number[]=[],uv:number[]=[],indices:number[]=[],segments=800
 for(let i=0;i<=segments;i++)for(let row=0;row<4;row++){
 const x=i/segments*1200-600,z=side*(4.6+row*.37+(row===3?noise(i*.21+side*20)*.22:0)),y=level-.025-row*.014+(row>0?(noise(i*.31+row+side*57)-.5)*.045:0)
 positions.push(x,y,z);uv.push(row*.3,x/3)
 if(i<segments&&row<3){const k=i*4+row;indices.push(k,k+4,k+1,k+1,k+4,k+5)}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();const mesh=new T.Mesh(geometry,vergeMaterial);mesh.receiveShadow=true;group.add(mesh);ownedGeometry.push(geometry)
 }
 const white=new T.MeshStandardMaterial`)
// Avoid allocating vectors for every marking every frame.
s=s.replace("function update(distance:number)", "const markingPosition=new T.Vector3(),markingScale=new T.Vector3(1,1,1)\n function update(distance:number)")
s=s.replace("new T.Vector3(i*10-600+T.MathUtils.euclideanModulo(distance,10),level+.006,0),rotation,new T.Vector3(1,1,1)","markingPosition.set(i*10-600+T.MathUtils.euclideanModulo(distance,10),level+.006,0),rotation,markingScale")
fs.writeFileSync(file,s)
const scene='app/components/VehicleScene.client.vue';let v=fs.readFileSync(scene,'utf8');v=v.replace("linear('#287db5')","linear('#12609d')").replace("linear('#87bedc')","linear('#83b9d9')").replace("new T.Fog('#c9dce9',550,1800)","new T.Fog('#c9dce9',900,2600)");fs.writeFileSync(scene,v)
