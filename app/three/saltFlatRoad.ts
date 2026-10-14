import * as T from 'three'
import {createRoadAssets} from './roadAssets'

/** Open, level speed-test highway; distant terrain exists only ahead (-X). */
export function createSaltFlatRoad(scene:T.Scene){
 const assets=createRoadAssets(),group=new T.Group();group.name='Salt flat highway';scene.add(group)
 const skyGeometry=new T.SphereGeometry(2000,48,24),skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{zenith:{value:new T.Color('#1768a8')},horizon:{value:new T.Color('#cbdce8')}},vertexShader:'varying vec3 skyDirection;void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 zenith;uniform vec3 horizon;varying vec3 skyDirection;void main(){float h=pow(clamp(normalize(skyDirection).y/0.6,0.,1.),.6);gl_FragColor=vec4(mix(horizon,zenith,h),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}),sky=new T.Mesh(skyGeometry,skyMaterial);sky.position.y=8.287;sky.renderOrder=-1;group.add(sky)
 const level=8.287,travel={value:0},ownedGeometry:T.BufferGeometry[]=[],ownedMaterial:T.Material[]=[]
 ownedGeometry.push(skyGeometry);ownedMaterial.push(skyMaterial)
 function plane(width:number,length:number,material:T.Material,y:number){const geometry=new T.PlaneGeometry(width,length),mesh=new T.Mesh(geometry,material);mesh.rotation.set(-Math.PI/2,0,-Math.PI/2);mesh.position.y=y;mesh.receiveShadow=true;group.add(mesh);ownedGeometry.push(geometry);return mesh}
 const diffuse=assets.texture('/textures/asphalt_01_diff_4k.jpg',true),normal=assets.texture('/textures/asphalt_01_nor_gl_2k.jpg'),rough=assets.texture('/textures/asphalt_01_rough_2k.jpg')
 for(const entry of [diffuse,normal,rough])entry.map.repeat.set(3.4,4000/3)
 const asphalt=new T.MeshStandardMaterial({map:diffuse.map,normalMap:normal.map,roughnessMap:rough.map,color:'#ffffff',normalScale:new T.Vector2(.48,.48),roughness:.86})
 asphalt.onBeforeCompile=s=>{
 s.uniforms.roadTravel=travel
 s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 highwayPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nhighwayPosition=(modelMatrix*vec4(position,1.)).xyz;')
 s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 highwayPosition;uniform float roadTravel;
 float roadHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float roadNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(roadHash(i),roadHash(i+vec2(1.,0.)),f.x),mix(roadHash(i+vec2(0.,1.)),roadHash(i+vec2(1.)),f.x),f.y);}`)
 s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 float aggregate=dot(texture2D(map,vMapUv).rgb,vec3(.2126,.7152,.0722));
 diffuseColor.rgb=mix(vec3(.035,.037,.040),vec3(.145,.149,.153),clamp(aggregate*2.2,0.,1.));
 vec2 roadPoint=vec2(highwayPosition.x-roadTravel,highwayPosition.z);
 float wear=roadNoise(roadPoint*vec2(.021,.5));
 diffuseColor.rgb*=.92+wear*.12;`)
 s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 float shoulderWear=smoothstep(3.4,4.6,abs(highwayPosition.z));
 roughnessFactor=clamp(roughnessFactor+shoulderWear*.06,.67,.98);`)
 s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 vec2 grainPoint=vec2(highwayPosition.x-roadTravel,highwayPosition.z)*180.;
 float grainFade=1.-smoothstep(.2,1.4,length(fwidth(grainPoint)));
 float grainHeight=(roadNoise(grainPoint)-.5)*.0005*grainFade;
 vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition),r1=cross(sy,normal),r2=cross(normal,sx);
 float determinant=dot(sx,r1);
 normal=normalize(abs(determinant)*normal-sign(determinant)*(dFdx(grainHeight)*r1+dFdy(grainHeight)*r2));`)
 };asphalt.customProgramCacheKey=()=>'open-highway-asphalt-pbr-v1'
 plane(9.2,4000,asphalt,level);ownedMaterial.push(asphalt)
 const saltDiffuse=assets.texture('/textures/sand_01_diff_4k.jpg',true);saltDiffuse.map.repeat.set(3200,3200)
 const saltNormal=assets.texture('/textures/sand_01_nor_gl_2k.jpg');saltNormal.map.repeat.set(880,880)
 const salt=new T.MeshStandardMaterial({color:'#efede8',map:saltDiffuse.map,normalMap:saltNormal.map,normalScale:new T.Vector2(.16,.16),roughness:.93,metalness:0})
 salt.onBeforeCompile=s=>{
 s.uniforms.saltTravel=travel
 s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 saltPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nsaltPosition=(modelMatrix*vec4(position,1.)).xyz;')
 s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 saltPosition;uniform float saltTravel;
 vec2 saltHash(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
 float saltNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(saltHash(i).x,saltHash(i+vec2(1.,0.)).x,f.x),mix(saltHash(i+vec2(0.,1.)).x,saltHash(i+vec2(1.)).x,f.x),f.y);}
 float saltCrust(vec2 p){vec2 i=floor(p),f=fract(p);float a=9.,b=9.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 n=vec2(float(x),float(y));vec2 r=n+.2+.6*saltHash(i+n)-f;float d=dot(r,r);if(d<a){b=a;a=d;}else b=min(b,d);}return sqrt(b)-sqrt(a);}`)
 s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 float saltLuma=dot(texture2D(map,vMapUv).rgb,vec3(.2126,.7152,.0722));
 diffuseColor.rgb=vec3(.9,.895,.88)*mix(.78,1.08,smoothstep(.015,.3,saltLuma));`)
 s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 p=vec2(saltPosition.x-saltTravel,saltPosition.z);
 float macro=saltNoise(p*.028)*.5+saltNoise(p*.13)*.3+saltNoise(p*.47)*.2;
 float cracks=1.-smoothstep(.015,.045,saltCrust(p*.8));
 float fade=1.-smoothstep(.035,.2,length(fwidth(p)));
 float grain=(saltNoise(p*24.)-.5)*.12*fade;
 float crust=saltNoise(p*vec2(3.8,5.2));
 float mineral=saltNoise(p*.34+saltNoise(p*.03)*2.);
 float pools=smoothstep(.64,.85,saltNoise(p*.008)+saltNoise(p*.037)*.14);
 float edge=1.-smoothstep(4.55,6.4+saltNoise(p*vec2(.25,.7))*.9,abs(p.y));
 diffuseColor.rgb*=mix(vec3(.84,.87,.91),vec3(1.045,1.035,1.015),macro);
 diffuseColor.rgb*=1.-cracks*.17*fade+grain+(crust-.5)*.08*fade;
 diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.84,.87,.91),pools*.16);
 diffuseColor.rgb*=.96+mineral*.07;
 diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.67,.59,.48),edge*(.62+.16*saltNoise(p*1.3)));`)
 s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 vec2 sp=vec2(saltPosition.x-saltTravel,saltPosition.z);
 float micro=saltNoise(sp*18.)*.012*(1.-smoothstep(12.,45.,length(vViewPosition)));
 normal=normalize(normal-cross(dFdx(saltPosition),normal)*dFdy(micro)*.6-cross(normal,dFdy(saltPosition))*dFdx(micro)*.6);`)
 }
 salt.customProgramCacheKey=()=>'salt-flat-crust-v5';plane(8000,8000,salt,level-.095);ownedMaterial.push(salt)
 // A compact massif only ahead. Sides and the entire rear half-space stay empty.
 function hash(n:number){return T.MathUtils.euclideanModulo(Math.sin(n*127.1+311.7)*43758.5453,1)}
 function noise(n:number){const i=Math.floor(n),t=n-i,f=t*t*(3-2*t);return T.MathUtils.lerp(hash(i),hash(i+1),f)}
 const rock=assets.texture('/textures/rock_face_03_diff_4k.jpg',true),rockNormal=assets.texture('/textures/rock_face_03_nor_gl_2k.jpg'),rockRough=assets.texture('/textures/rock_face_03_rough_2k.jpg')
 for(let layer=0;layer<2;layer++){
 const positions:number[]=[],colors:number[]=[],indices:number[]=[],segments=layer?160:320,rows=layer?32:64,distance=layer?1450:1150,width=layer?340:390,depth=layer?160:220
 const base=new T.Color(layer?'#8292a5':'#736b68'),ridge=new T.Color(layer?'#9aa4b0':'#9c8b7d')
 for(let row=0;row<=rows;row++)for(let i=0;i<=segments;i++){
 const u=i/segments,t=row/rows,z=(u-.5)*width
 const profile=22+32*noise(u*6+layer*107)+15*noise(u*17+11)+8*noise(u*43+3)+3*noise(u*109+1)
 const edge=T.MathUtils.smoothstep(u,0,.12)*(1-T.MathUtils.smoothstep(u,.88,1)),valley=T.MathUtils.smoothstep(Math.abs(z),23,78)
 const peak=Math.pow(Math.max(0,Math.sin(t*Math.PI)),.78),erosion=(noise(u*72+t*9+layer*17)-.5)*11*peak
 const h=Math.max(0,(profile*peak+erosion)*edge*valley)
 positions.push(-distance-t*depth,level-1+h,z)
 const color=base.clone().lerp(ridge,t*.4+noise(u*23+t*3)*.25);colors.push(color.r,color.g,color.b)
  if(row<rows&&i<segments){const k=row*(segments+1)+i;indices.push(k,k+segments+1,k+1,k+1,k+segments+1,k+segments+2)}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);const mountainUV:number[]=[];for(let i=0;i<positions.length;i+=3)mountainUV.push(positions[i+2]!/3,positions[i+1]!/3);geometry.setAttribute('uv',new T.Float32BufferAttribute(mountainUV,2));geometry.computeVertexNormals()
 const material=new T.MeshStandardMaterial({vertexColors:true,normalMap:rockNormal.map,roughnessMap:rockRough.map,normalScale:new T.Vector2(.4,.4),roughness:1,side:T.DoubleSide});
 material.onBeforeCompile=s=>{
 s.uniforms.horizonRock={value:rock.map};s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 ridgePosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nridgePosition=position;')
 s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 ridgePosition;uniform sampler2D horizonRock;
 float rh(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
 float rn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(rh(i),rh(i+vec3(1,0,0)),f.x),mix(rh(i+vec3(0,1,0)),rh(i+vec3(1,1,0)),f.x),f.y),mix(mix(rh(i+vec3(0,0,1)),rh(i+vec3(1,0,1)),f.x),mix(rh(i+vec3(0,1,1)),rh(i+vec3(1,1,1)),f.x),f.y),f.z);}`)
 s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float rock=rn(ridgePosition*vec3(.16,.3,.16))*.5+rn(ridgePosition*.58)*.3+rn(ridgePosition*1.9)*.2;
 float stratum=sin(ridgePosition.y*.7+rn(ridgePosition*.12)*5.);
 vec3 weights=pow(abs(normalize(cross(dFdx(ridgePosition),dFdy(ridgePosition)))),vec3(4.));weights/=max(dot(weights,vec3(1.)),.001);
 vec3 cliff=texture2D(horizonRock,ridgePosition.yz/3.).rgb*weights.x+texture2D(horizonRock,ridgePosition.xz/3.).rgb*weights.y+texture2D(horizonRock,ridgePosition.xy/3.).rgb*weights.z;
 diffuseColor.rgb*=.68+rock*.23+stratum*.025;
 diffuseColor.rgb*=mix(vec3(.85),cliff*1.4,.48);`)
 };material.customProgramCacheKey=()=>'forward-massif-rock-v3';const mesh=new T.Mesh(geometry,material);group.add(mesh);ownedGeometry.push(geometry);ownedMaterial.push(material)
 }
 const vergeMaterial=new T.MeshStandardMaterial({map:diffuse.map,normalMap:normal.map,normalScale:new T.Vector2(.7,.7),color:'#a39a87',roughness:1});vergeMaterial.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 float gravel=texture2D(map,vMapUv).r;
 diffuseColor.rgb=mix(vec3(.27,.235,.19),vec3(.48,.43,.35),clamp(gravel*2.,0.,1.));`)};vergeMaterial.customProgramCacheKey=()=>'salt-gravel-verge-v1';ownedMaterial.push(vergeMaterial)
 for(const side of [-1,1]){
 const positions:number[]=[],uv:number[]=[],indices:number[]=[],segments=1600
 for(let i=0;i<=segments;i++)for(let row=0;row<4;row++){
 const x=i/segments*4000-2000,z=side*(4.6+row*.37+(row===3?noise(i*.21+side*20)*.22:0)),y=level-.025-row*.014+(row>0?(noise(i*.31+row+side*57)-.5)*.045:0)
 positions.push(x,y,z);uv.push(row*.3/3.4,x/4000)
 if(i<segments&&row<3){const k=i*4+row;if(side>0)indices.push(k,k+1,k+4,k+1,k+5,k+4);else indices.push(k,k+4,k+1,k+1,k+4,k+5)}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();const mesh=new T.Mesh(geometry,vergeMaterial);mesh.receiveShadow=true;group.add(mesh);ownedGeometry.push(geometry)
 }
 const white=new T.MeshStandardMaterial({color:'#dfd9c9',roughness:1}),yellow=new T.MeshStandardMaterial({color:'#caa451',roughness:1});ownedMaterial.push(white,yellow)
 for(const z of [-4.12,4.12]){const stripe=plane(.09,4000,white,level+.004);stripe.position.z=z}
 const dashGeometry=new T.PlaneGeometry(3,.095),dashes=new T.InstancedMesh(dashGeometry,yellow,400),matrix=new T.Matrix4(),rotation=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,0));group.add(dashes);ownedGeometry.push(dashGeometry);dashes.frustumCulled=false
 // One soft car contact patch, rather than hundreds of shadow-casting props.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d')!,gradient=ctx.createRadialGradient(32,32,5,32,32,32);gradient.addColorStop(0,'rgba(0,0,0,.4)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64)
 const contactMap=new T.CanvasTexture(canvas),contactMaterial=new T.MeshBasicMaterial({map:contactMap,transparent:true,depthWrite:false,opacity:.7}),contactGeometry=new T.PlaneGeometry(.7,.48);ownedMaterial.push(contactMaterial);ownedGeometry.push(contactGeometry)
 const patches=Array.from({length:4},()=>{const mesh=new T.Mesh(contactGeometry,contactMaterial);mesh.rotation.x=-Math.PI/2;mesh.visible=false;group.add(mesh);return mesh})
 const markingPosition=new T.Vector3(),markingScale=new T.Vector3(1,1,1)
 for(let i=0;i<400;i++){matrix.compose(markingPosition.set(i*10-2000,level+.006,0),rotation,markingScale);dashes.setMatrixAt(i,matrix)}dashes.instanceMatrix.needsUpdate=true
 function update(distance:number){travel.value=distance;saltDiffuse.map.offset.y=saltNormal.map.offset.y=-distance/2.5;for(const entry of [diffuse,normal,rough])entry.map.offset.y=-distance/3;dashes.position.x=T.MathUtils.euclideanModulo(distance,10)}
 update(0)
 return {ready:Promise.all([diffuse.ready,normal.ready,rough.ready,saltDiffuse.ready,saltNormal.ready,rock.ready,rockNormal.ready,rockRough.ready]),update,heightAt:()=>level,setContacts:(points:T.Vector3[])=>patches.forEach((patch,i)=>{const p=points[i];patch.visible=!!p;if(p){patch.position.copy(p);patch.position.y+=.012}}),setVisible:(visible:boolean)=>{group.visible=visible},dispose(){scene.remove(group);dashes.dispose();ownedGeometry.forEach(g=>g.dispose());ownedMaterial.forEach(m=>m.dispose());contactMap.dispose();assets.dispose()}}
}




