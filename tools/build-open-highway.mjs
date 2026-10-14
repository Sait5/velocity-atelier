import fs from 'node:fs'
const file='app/three/saltFlatRoad.ts';let s=fs.readFileSync(file,'utf8')
s=s.replace("/** Salt-flat highway composed from the supplied photographic reference. */","/** Open, level speed-test highway; distant terrain exists only ahead (-X). */")
s=s.replace("repeat.set(3.4,400)","repeat.set(3.4,4000/3)")
s=s.replace("color:'#b7b5b3',normalScale:new T.Vector2(.32,.32),roughness:.9","color:'#ffffff',normalScale:new T.Vector2(.48,.48),roughness:.86")
s=s.replace("plane(9.2,1200,asphalt,level)","plane(9.2,4000,asphalt,level)")
const asphaltHook=`asphalt.onBeforeCompile=s=>{
 s.uniforms.roadTravel=travel
 s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\\nvarying vec3 highwayPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\\nhighwayPosition=(modelMatrix*vec4(position,1.)).xyz;')
 s.fragmentShader=s.fragmentShader.replace('#include <common>',\`#include <common>
 varying vec3 highwayPosition;uniform float roadTravel;
 float roadHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float roadNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(roadHash(i),roadHash(i+vec2(1.,0.)),f.x),mix(roadHash(i+vec2(0.,1.)),roadHash(i+vec2(1.)),f.x),f.y);}\`)
 s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',\`#include <map_fragment>
 float aggregate=dot(texture2D(map,vMapUv).rgb,vec3(.2126,.7152,.0722));
 diffuseColor.rgb=mix(vec3(.035,.037,.040),vec3(.145,.149,.153),clamp(aggregate*2.2,0.,1.));
 vec2 roadPoint=vec2(highwayPosition.x-roadTravel,highwayPosition.z);
 float wear=roadNoise(roadPoint*vec2(.021,.5));
 diffuseColor.rgb*=.92+wear*.12;\`)
 s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',\`#include <roughnessmap_fragment>
 float shoulderWear=smoothstep(3.4,4.6,abs(highwayPosition.z));
 roughnessFactor=clamp(roughnessFactor+shoulderWear*.06,.67,.98);\`)
 s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',\`#include <normal_fragment_maps>
 vec2 grainPoint=vec2(highwayPosition.x-roadTravel,highwayPosition.z)*180.;
 float grainFade=1.-smoothstep(.2,1.4,length(fwidth(grainPoint)));
 float grainHeight=(roadNoise(grainPoint)-.5)*.0005*grainFade;
 vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition),r1=cross(sy,normal),r2=cross(normal,sx);
 float determinant=dot(sx,r1);
 normal=normalize(abs(determinant)*normal-sign(determinant)*(dFdx(grainHeight)*r1+dFdy(grainHeight)*r2));\`)
 };asphalt.customProgramCacheKey=()=>'open-highway-asphalt-pbr-v1'
 `
s=s.replace("plane(9.2,4000,asphalt,level);",asphaltHook+"plane(9.2,4000,asphalt,level);")
s=s.replace("repeat.set(880,880)","repeat.set(3200,3200)").replace("plane(2200,2200,salt,level-.095)","plane(8000,8000,salt,level-.095)")
s=s.replace("// Asymmetric, continuous mountain silhouettes, with two depth layers and no nearby obstacles.","// A compact massif only ahead. Sides and the entire rear half-space stay empty.")
s=s.replace("const rock=assets.texture('/textures/rock_face_03_diff_4k.jpg',true)","const rock=assets.texture('/textures/rock_face_03_diff_4k.jpg',true),rockNormal=assets.texture('/textures/rock_face_03_nor_gl_2k.jpg'),rockRough=assets.texture('/textures/rock_face_03_rough_2k.jpg')")
s=s.replace("segments=layer?480:960,rows=layer?8:16,radius=layer?1100:800","segments=layer?160:320,rows=layer?32:64,distance=layer?1450:1150,width=layer?340:390,depth=layer?160:220")
const start=s.indexOf(' const a=(i%segments)/segments*Math.PI*2,t=row/rows')
const end=s.indexOf(' if(row<rows&&i<segments)',start)
s=s.slice(0,start)+` const u=i/segments,t=row/rows,z=(u-.5)*width
 const profile=22+32*noise(u*6+layer*107)+15*noise(u*17+11)+8*noise(u*43+3)+3*noise(u*109+1)
 const edge=T.MathUtils.smoothstep(u,0,.12)*(1-T.MathUtils.smoothstep(u,.88,1)),valley=T.MathUtils.smoothstep(Math.abs(z),23,78)
 const peak=Math.pow(Math.max(0,Math.sin(t*Math.PI)),.78),erosion=(noise(u*72+t*9+layer*17)-.5)*11*peak
 const h=Math.max(0,(profile*peak+erosion)*edge*valley)
 positions.push(-distance-t*depth,level-1+h,z)
 const color=base.clone().lerp(ridge,t*.4+noise(u*23+t*3)*.25);colors.push(color.r,color.g,color.b)
 `+s.slice(end)
s=s.replace("geometry.setIndex(indices);geometry.computeVertexNormals()\n const material=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide})","geometry.setIndex(indices);const mountainUV:number[]=[];for(let i=0;i<positions.length;i+=3)mountainUV.push(positions[i+2]!/3,positions[i+1]!/3);geometry.setAttribute('uv',new T.Float32BufferAttribute(mountainUV,2));geometry.computeVertexNormals()\n const material=new T.MeshStandardMaterial({vertexColors:true,normalMap:rockNormal.map,roughnessMap:rockRough.map,normalScale:new T.Vector2(.4,.4),roughness:1,side:T.DoubleSide})")
s=s.replace("vec3 cliff=texture2D(horizonRock,vec2(length(ridgePosition.xz)*.06+atan(ridgePosition.z,ridgePosition.x)*70.,ridgePosition.y*.065)).rgb;",`vec3 weights=pow(abs(normalize(cross(dFdx(ridgePosition),dFdy(ridgePosition)))),vec3(4.));weights/=max(dot(weights,vec3(1.)),.001);
 vec3 cliff=texture2D(horizonRock,ridgePosition.yz/3.).rgb*weights.x+texture2D(horizonRock,ridgePosition.xz/3.).rgb*weights.y+texture2D(horizonRock,ridgePosition.xy/3.).rgb*weights.z;`)
s=s.replace("salt-horizon-rock-v2","forward-massif-rock-v3")
s=s.replace("segments=800","segments=1600").replace("x=i/segments*1200-600","x=i/segments*4000-2000").replace("x/1200","x/4000").replace("plane(.09,1200,white","plane(.09,4000,white")
s=s.replace("yellow,120)","yellow,400)").replace("i<120;i++","i<400;i++").replace("i*10-600","i*10-2000")
s=s.replace("rock.ready]),update","rock.ready,rockNormal.ready,rockRough.ready]),update")
fs.writeFileSync(file,s)
fs.appendFileSync('README.md','\nOpen speed-test location: removed the encircling mountain rings. Two compact, PBR-textured terrain layers now exist only in front of the vehicle (-X), with an open central valley aligned to the straight road. The level asphalt corridor extends 4 km and scrolls continuously; charcoal albedo remap, original normal/roughness maps, distance-filtered aggregate micro-normal detail, and longer gravel verges. No side/rear mountains, water, buildings or vegetation.\n')
