import * as T from 'three'
import {createItalianStreet} from './italianStreet'
import {createRoadAssets,type RoadAssets} from './roadAssets'

/** Open road preserves unobstructed orbit views; overhead lights repeat with travel. */
export function createMotionRoad(scene:T.Scene,italian=false,sharedAssets?:RoadAssets){
 const assets=sharedAssets??createRoadAssets()
 const group=new T.Group();group.name='Open night motion road';scene.add(group)
 const textureReady:Promise<void>[]=[]
 const roadMap=(url:string,color=false)=>{const entry=assets.texture(url,color);textureReady.push(entry.ready);return entry.map}
 const asphalt=roadMap('/textures/asphalt_01_diff_4k.jpg',true),normal=roadMap('/textures/asphalt_01_nor_gl_2k.jpg'),roughness=roadMap('/textures/asphalt_01_rough_2k.jpg')
 const paving:T.Texture[]=[]
 const street=italian?createItalianStreet(group,assets):undefined
 const uniforms={travel:{value:0}}
 const roadGeometry=new T.PlaneGeometry(italian?1200:240,10),surfaceScale=italian?3.8:2.08
 const positions=roadGeometry.getAttribute('position'),uv=roadGeometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,positions.getX(i)/surfaceScale,-positions.getY(i)/surfaceScale)
 const roadMaterial=new T.MeshPhysicalMaterial({map:asphalt,normalMap:normal,roughnessMap:roughness,normalScale:new T.Vector2(.65,.65),color:italian?'#929794':'#4d555b',roughness:.76,metalness:.075,envMapIntensity:.3,clearcoat:.16,clearcoatRoughness:.42})
 roadMaterial.onBeforeCompile=shader=>{
  shader.uniforms.travel=uniforms.travel;shader.uniforms.italian={value:italian?1:0}
  shader.vertexShader='varying vec3 roadWorld;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nroadWorld=(modelMatrix*vec4(transformed,1.)).xyz;')
  shader.fragmentShader='varying vec3 roadWorld;uniform float travel;uniform float italian;\n'+shader.fragmentShader.replace('#include <map_fragment>',`
   vec4 sampled=texture2D(map,vMapUv);
   vec3 aggregate=mix(sampled.rgb,vec3(dot(sampled.rgb,vec3(.2126,.7152,.0722))),italian*.65);
   vec2 p=vec2(roadWorld.x-travel,roadWorld.z);
   float wear=.5+.5*sin(p.x*.31+sin(p.y*1.8))*sin(p.y*.7+p.x*.12);aggregate*=.96+wear*.08;
   float pixel=max(fwidth(p.y),.002);
   float lane=1.-smoothstep(.045-pixel,.045+pixel,abs(abs(p.y)-1.75));
   float edge=(1.-smoothstep(.045-pixel,.045+pixel,abs(abs(p.y)-4.)))*(1.-italian);
   float dashDistance=abs(mod(p.x,8.)-4.);float dashPixel=max(fwidth(p.x),.005);
   float dash=1.-smoothstep(2.-dashPixel,2.+dashPixel,dashDistance);
   aggregate=mix(aggregate,vec3(.65),clamp(lane*dash+edge,0.,1.));
   vec2 cover=vec2(mod(p.x+20.,40.)-20.,p.y+2.75);float radius=length(cover);
   float rim=(1.-smoothstep(.39,.41,radius))*smoothstep(.34,.36,radius);float lid=1.-smoothstep(.34,.36,radius);
   float grip=step(.5,fract((cover.x+cover.y)*15.));aggregate=mix(aggregate,vec3(.13)+grip*.015,lid*.55);aggregate=mix(aggregate,vec3(.065),rim*.75);
   vec2 drain=vec2(mod(p.x+9.,18.)-9.,abs(p.y)-3.7);
   float grate=(1.-smoothstep(.4,.43,abs(drain.x)))*(1.-smoothstep(.16,.18,abs(drain.y)));
   aggregate=mix(aggregate,vec3(.035)+step(.35,fract(drain.x*15.))*.025,grate*.85);
   diffuseColor*=vec4(aggregate,sampled.a);
  `)
 }
 roadMaterial.customProgramCacheKey=()=> 'physical-scanned-road-'+italian
 const road=new T.Mesh(roadGeometry,roadMaterial);road.name='Continuous PBR asphalt road';road.rotation.x=-Math.PI/2;road.position.y=.007;road.receiveShadow=true;group.add(road)
 const metal=new T.MeshStandardMaterial({color:'#363c43',roughness:.42,metalness:.55}),lightMaterial=new T.MeshBasicMaterial({color:new T.Color(2.4,2.65,2.9),toneMapped:false})
 if(italian){
  const skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,depthTest:false,toneMapped:false,uniforms:{horizon:{value:new T.Color('#b1d3e4')},zenith:{value:new T.Color('#669fc4')}},vertexShader:`varying vec3 skyDirection;void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 skyDirection;uniform vec3 horizon;uniform vec3 zenith;void main(){float elevation=max(0.,normalize(skyDirection).y);gl_FragColor=vec4(mix(horizon,zenith,pow(elevation,.65)),1.);
  #include <colorspace_fragment>
  }`})
  const sky=new T.Mesh(new T.SphereGeometry(240,24,12),skyMaterial);sky.name='Clear Italian daylight sky';sky.renderOrder=-100;sky.frustumCulled=false;group.add(sky)
  const [map,normalMap,roughnessMap]=['diff-4k','normal','rough'].map((name,i)=>{const texture=roadMap('/textures/italian-pavement-'+name+'.webp',i===0);paving.push(texture);return texture})
  const pavementMaterial=new T.MeshStandardMaterial({color:'#c0c3bf',map,normalMap,roughnessMap,normalScale:new T.Vector2(.85,.85),roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})
  // World-sized UVs preserve square pavers on the top face and through courtyards.
  const pavingSurface=(length:number,depth:number,z:number,y:number,material:T.Material)=>{const geometry=new T.PlaneGeometry(length,depth);geometry.rotateX(-Math.PI/2);const positions=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,positions.getX(i)/3.2,(positions.getZ(i)+z)/3.2);const mesh=new T.Mesh(geometry,material);mesh.position.set(0,y,z);mesh.receiveShadow=true;group.add(mesh);return mesh}
  const slabMaterial=new T.MeshStandardMaterial({color:'#b9b7ad',roughness:.95})
  for(const side of [-1,1]){const slab=new T.Mesh(new T.BoxGeometry(1200,.10,19.5),slabMaterial);slab.name='Single continuous pavement foundation';slab.position.set(0,.065,side*14.75);slab.receiveShadow=true;group.add(slab);pavingSurface(1200,19.5,side*14.75,.122,pavementMaterial)}
  // Dark, continuous vertical kerb without an extra white painted edge or block gaps.
  const curbMaterial=new T.MeshStandardMaterial({color:'#777970',roughness:.96})
  for(const side of [-1,1]){const curb=new T.Mesh(new T.BoxGeometry(1200,.145,.16),curbMaterial);curb.name='Continuous unpainted kerb';curb.position.set(0,.0495,side*4.98);curb.receiveShadow=true;group.add(curb)}
  // No rear wall or desert terrain. Only a soft, untextured transition into the sky.
  const rearGround=new T.ShaderMaterial({depthWrite:true,toneMapped:false,uniforms:{horizon:{value:new T.Color('#b1d3e4')},nearColor:{value:new T.Color('#7d8587')}},vertexShader:`varying float rearZ;void main(){vec4 world=modelMatrix*vec4(position,1.);rearZ=abs(world.z);gl_Position=projectionMatrix*viewMatrix*world;}`,fragmentShader:`varying float rearZ;uniform vec3 nearColor;uniform vec3 horizon;void main(){gl_FragColor=vec4(mix(nearColor,horizon,smoothstep(24.5,38.,rearZ)),1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
  for(const side of [-1,1])pavingSurface(1200,575.5,side*312.25,-.025,rearGround)

 }
 if(!italian){const curbGeometry=new T.BoxGeometry(240,.12,.22);for(const side of [-1,1]){const curb=new T.Mesh(curbGeometry,metal);curb.position.set(0,.06,side*4.65);group.add(curb)}}
 const panels=new T.InstancedMesh(new T.BoxGeometry(1.8,.045,2.8),lightMaterial,20);panels.frustumCulled=false;group.add(panels)
 const poles=new T.InstancedMesh(new T.CylinderGeometry(.055,.09,4.65,8),metal,20),arms=new T.InstancedMesh(new T.BoxGeometry(.11,.11,6.4),metal,20)
 poles.name='Roadside lamp supports';arms.name='Cantilever lamp arms';group.add(poles,arms);poles.frustumCulled=arms.frustumCulled=false
 const contact=new T.Mesh(new T.PlaneGeometry(5.4,2.8),new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:`varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 p;void main(){float r=dot(p,p);gl_FragColor=vec4(0.,0.,0.,.55*exp(-r*3.)*(1.-smoothstep(.7,1.,r)));}`}));contact.rotation.x=-Math.PI/2;contact.position.y=.009;group.add(contact)
 panels.visible=poles.visible=arms.visible=!italian
 const lights=[new T.PointLight('#ffe2bd',58,15,2),new T.PointLight('#d6e5ff',48,15,2)];lights.forEach(l=>{l.visible=!italian;group.add(l)});const dummy=new T.Object3D()
 const studs=!italian?new T.InstancedMesh(new T.BoxGeometry(.14,.025,.18),new T.MeshStandardMaterial({color:'#bbb9a1',metalness:.5,roughness:.32}),40):undefined
 if(studs){studs.name='Night roadside reflective markers';studs.frustumCulled=false;group.add(studs)}
 function update(distance:number,_speed:number,_time:number){street?.update(distance);for(const texture of paving)texture.offset.x=-(distance/3.2)%1;uniforms.travel.value=((distance%360)+360)%360;for(const texture of [asphalt,normal,roughness])texture.offset.x=-((distance/surfaceScale)%1);for(let i=0;i<20;i++){const x=((i*12+distance)%240+240)%240-120,side=i%2?1:-1;dummy.position.set(x,4.45,0);dummy.updateMatrix();panels.setMatrixAt(i,dummy.matrix);dummy.position.set(x,2.325,side*6.3);dummy.updateMatrix();poles.setMatrixAt(i,dummy.matrix);dummy.position.set(x,4.5,side*3.15);dummy.updateMatrix();arms.setMatrixAt(i,dummy.matrix)}panels.instanceMatrix.needsUpdate=poles.instanceMatrix.needsUpdate=arms.instanceMatrix.needsUpdate=true;lights.forEach((l,i)=>l.position.set(((distance+i*12)%24+24)%24-12,4,0));if(studs){for(let i=0;i<40;i++){dummy.position.set(((Math.floor(i/2)*12+distance)%240+240)%240-120,.026,(i%2?1:-1)*4.02);dummy.updateMatrix();studs.setMatrixAt(i,dummy.matrix)}studs.instanceMatrix.needsUpdate=true}}
 update(0,0,0)
 return {ready:Promise.all([...textureReady,street?.ready??Promise.resolve()]),setVisible(visible:boolean){group.visible=visible},update,dispose(){street?.dispose();scene.remove(group);const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();group.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));if(o instanceof T.InstancedMesh)o.dispose()}});geometries.forEach(g=>{if(!assets.owns(g))g.dispose()});const textures=new Set<T.Texture>();materials.forEach(m=>{for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);if(!assets.owns(m))m.dispose()});textures.forEach(t=>{if(!assets.owns(t))t.dispose()});if(!sharedAssets)assets.dispose()}}
}


