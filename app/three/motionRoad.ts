import * as T from 'three'
import {createItalianStreet} from './italianStreet'

/** Open road preserves unobstructed orbit views; overhead lights repeat with travel. */
export function createMotionRoad(scene:T.Scene,italian=false){
 const group=new T.Group();group.name='Open night motion road';scene.add(group)
 const loader=new T.TextureLoader()
 const textureReady:Promise<void>[]=[]
 const roadMap=(url:string,color=false)=>{let resolve:()=>void,reject:(e:unknown)=>void;textureReady.push(new Promise<void>((yes,no)=>{resolve=yes;reject=no}));const map=loader.load(url,()=>resolve(),undefined,e=>reject(e));map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=16;map.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;return map}
 const asphalt=roadMap('/textures/asphalt_01_diff_4k.jpg',true),normal=roadMap('/textures/asphalt_01_nor_gl_2k.jpg'),roughness=roadMap('/textures/asphalt_01_rough_2k.jpg')
 const paving:T.Texture[]=[]
 const concreteCurbs:T.InstancedMesh[]=[]
 const street=italian?createItalianStreet(group):undefined
 const uniforms={...T.UniformsUtils.clone(T.UniformsLib.fog),italian:{value:italian?1:0},travel:{value:0},surfaceTravel:{value:0},asphalt:{value:asphalt},surfaceNormal:{value:normal},surfaceRoughness:{value:roughness}}
 const road=new T.Mesh(new T.PlaneGeometry(italian?1200:240,10),new T.ShaderMaterial({uniforms,fog:true,vertexShader:`varying vec3 world;
 #include <fog_pars_vertex>
 void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;vec4 mvPosition=viewMatrix*p;gl_Position=projectionMatrix*mvPosition;
 #include <fog_vertex>
 }`,fragmentShader:`
 #include <fog_pars_fragment>
 varying vec3 world;uniform float travel;uniform float surfaceTravel;uniform float italian;uniform sampler2D asphalt;uniform sampler2D surfaceNormal;uniform sampler2D surfaceRoughness;
 void main(){
  vec2 p=vec2(world.x-travel,world.z);
  vec2 surfaceUV=world.xz/mix(2.08,3.8,italian)-vec2(surfaceTravel,0.);
  vec3 aggregate=texture2D(asphalt,surfaceUV).rgb;
  aggregate=mix(aggregate,vec3(dot(aggregate,vec3(.2126,.7152,.0722))),italian*.65);
  aggregate=mix(aggregate,clamp((aggregate-.10)*1.45+.10,0.,1.),italian);
  vec3 n=normalize(mix(vec3(0.,0.,1.),texture2D(surfaceNormal,surfaceUV).xyz*2.-1.,.65));
  float rough=texture2D(surfaceRoughness,surfaceUV).r;
  vec3 light=normalize(vec3(-(mod(p.x+6.,12.)-6.),-p.y,4.45));
  vec3 view=normalize(vec3(cameraPosition.x-world.x,cameraPosition.z-world.z,cameraPosition.y-world.y));
  float diffuse=max(dot(n,light),0.);
  float sheen=pow(max(dot(n,normalize(light+view)),0.),mix(60.,12.,rough))*(1.-rough)*.08;
  float pixel=max(fwidth(p.y),.002);
  float lane=1.-smoothstep(.045-pixel,.045+pixel,abs(abs(p.y)-1.75));
  float edge=1.-smoothstep(.045-pixel,.045+pixel,abs(abs(p.y)-4.));
  float dashDistance=abs(mod(p.x,8.)-4.);
  float dashPixel=max(fwidth(p.x),.005);
  float dash=1.-smoothstep(2.-dashPixel,2.+dashPixel,dashDistance);
  float pool=pow(.5+.5*cos(p.x*.5236),6.);
  vec3 c=vec3(.012,.015,.019)+aggregate*(.17+.15*diffuse+italian*.38)+pool*(1.-italian)*vec3(.018,.022,.028)+sheen*vec3(.7,.8,1.);
  c=mix(c,vec3(.38,.40,.41),clamp(lane*dash+edge,0.,1.));
  // Recessed service covers and cast-iron drainage are part of the road
  // shader, so they cannot fight with the asphalt depth or add draw calls.
  vec2 cover=vec2(mod(p.x+20.,40.)-20.,p.y+2.75);
  float radius=length(cover);
  float rim=(1.-smoothstep(.39,.41,radius))*smoothstep(.34,.36,radius);
  float lid=1.-smoothstep(.34,.36,radius);
  float grip=step(.5,fract((cover.x+cover.y)*15.));
  c=mix(c,vec3(.13,.14,.145)+grip*.015,lid*italian*.7);
  c=mix(c,vec3(.08,.085,.09),rim*italian);
  vec2 drain=vec2(mod(p.x+9.,18.)-9.,abs(p.y)-3.7);
  float grate=(1.-smoothstep(.4,.43,abs(drain.x)))*(1.-smoothstep(.16,.18,abs(drain.y)));
  c=mix(c,vec3(.055)+step(.35,fract(drain.x*15.))*.035,grate*italian);
  float fade=exp(-abs(world.x)*mix(.022,0.,italian));
  gl_FragColor=vec4(c*fade,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
 }`}));road.name='Scanned asphalt motion surface';road.rotation.x=-Math.PI/2;road.position.y=.007;group.add(road)
 const metal=new T.MeshStandardMaterial({color:'#363c43',roughness:.42,metalness:.55}),lightMaterial=new T.MeshBasicMaterial({color:new T.Color(2.4,2.65,2.9),toneMapped:false})
 if(italian){
  const skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,depthTest:false,toneMapped:false,uniforms:{horizon:{value:new T.Color('#b1d3e4')},zenith:{value:new T.Color('#669fc4')}},vertexShader:`varying vec3 skyDirection;void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 skyDirection;uniform vec3 horizon;uniform vec3 zenith;void main(){float elevation=max(0.,normalize(skyDirection).y);gl_FragColor=vec4(mix(horizon,zenith,pow(elevation,.65)),1.);
  #include <colorspace_fragment>
  }`})
  const sky=new T.Mesh(new T.SphereGeometry(240,24,12),skyMaterial);sky.name='Clear Italian daylight sky';sky.renderOrder=-100;sky.frustumCulled=false;group.add(sky)
  const [map,normalMap,roughnessMap]=['diff-4k','normal','rough'].map((name,i)=>{const texture=roadMap('/textures/italian-pavement-'+name+'.webp',i===0);paving.push(texture);return texture})
  const pavementMaterial=new T.MeshStandardMaterial({color:'#c0c3bf',map,normalMap,roughnessMap,normalScale:new T.Vector2(.6,.6),roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})
  // World-sized UVs preserve square pavers on the top face and through courtyards.
  const pavingSurface=(length:number,depth:number,z:number,y:number,material:T.Material)=>{const geometry=new T.PlaneGeometry(length,depth);geometry.rotateX(-Math.PI/2);const positions=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,positions.getX(i)/3.2,(positions.getZ(i)+z)/3.2);const mesh=new T.Mesh(geometry,material);mesh.position.set(0,y,z);mesh.receiveShadow=true;group.add(mesh);return mesh}
  const slabMaterial=new T.MeshStandardMaterial({color:'#b9b7ad',roughness:.95})
  for(const side of [-1,1]){const slab=new T.Mesh(new T.BoxGeometry(1200,.10,10),slabMaterial);slab.position.set(0,.045,side*10);slab.receiveShadow=true;group.add(slab);pavingSurface(1200,10,side*10,.116,pavementMaterial)}
  // The kerb meets the raised pavement directly. Individual stone blocks make
  // the vertical face read as concrete rather than a dark gap or metal rail.
  const curbMaterial=new T.MeshStandardMaterial({color:'#b5b1a6',roughness:.93})
  const curbGeometry=new T.BoxGeometry(1.995,.145,.24)
  for(const side of [-1,1]){const curb=new T.InstancedMesh(curbGeometry,curbMaterial,400);curb.name='Jointed concrete pavement kerb';curb.userData.side=side;curb.receiveShadow=true;curb.frustumCulled=false;const block=new T.Object3D();for(let i=0;i<400;i++){block.position.set(i*2-399,.045,side*4.91);block.updateMatrix();curb.setMatrixAt(i,block.matrix)}group.add(curb);concreteCurbs.push(curb)}
  // No rear wall or desert terrain. Only a soft, untextured transition into the sky.
  const rearGround=new T.ShaderMaterial({depthWrite:true,toneMapped:false,uniforms:{horizon:{value:new T.Color('#b1d3e4')},nearColor:{value:new T.Color('#7d8587')}},vertexShader:`varying float rearZ;void main(){vec4 world=modelMatrix*vec4(position,1.);rearZ=abs(world.z);gl_Position=projectionMatrix*viewMatrix*world;}`,fragmentShader:`varying float rearZ;uniform vec3 nearColor;uniform vec3 horizon;void main(){gl_FragColor=vec4(mix(nearColor,horizon,smoothstep(15.,32.,rearZ)),1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
  for(const side of [-1,1])pavingSurface(1200,585,side*307.5,-.025,rearGround)

 }
 if(!italian){const curbGeometry=new T.BoxGeometry(240,.12,.22);for(const side of [-1,1]){const curb=new T.Mesh(curbGeometry,metal);curb.position.set(0,.06,side*4.65);group.add(curb)}}
 const panels=new T.InstancedMesh(new T.BoxGeometry(1.8,.045,2.8),lightMaterial,20);panels.frustumCulled=false;group.add(panels)
 const poles=new T.InstancedMesh(new T.CylinderGeometry(.055,.09,4.65,8),metal,20),arms=new T.InstancedMesh(new T.BoxGeometry(.11,.11,6.4),metal,20)
 poles.name='Roadside lamp supports';arms.name='Cantilever lamp arms';group.add(poles,arms);poles.frustumCulled=arms.frustumCulled=false
 const contact=new T.Mesh(new T.PlaneGeometry(5.4,2.8),new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:`varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 p;void main(){float r=dot(p,p);gl_FragColor=vec4(0.,0.,0.,.55*exp(-r*3.)*(1.-smoothstep(.7,1.,r)));}`}));contact.rotation.x=-Math.PI/2;contact.position.y=.009;group.add(contact)
 panels.visible=poles.visible=arms.visible=!italian
 const lights=[new T.PointLight('#d8e6ef',24,13,2),new T.PointLight('#d8e6ef',24,13,2)];lights.forEach(l=>{l.visible=!italian;group.add(l)});const dummy=new T.Object3D()
 function update(distance:number,_speed:number,_time:number){street?.update(distance);for(const texture of paving)texture.offset.x=-(distance/3.2)%1;uniforms.travel.value=((distance%360)+360)%360;uniforms.surfaceTravel.value=((distance/(italian?3.8:2.08))%1+1)%1;for(const curb of concreteCurbs)curb.position.x=((distance%2)+2)%2;for(let i=0;i<20;i++){const x=((i*12+distance)%240+240)%240-120,side=i%2?1:-1;dummy.position.set(x,4.45,0);dummy.updateMatrix();panels.setMatrixAt(i,dummy.matrix);dummy.position.set(x,2.325,side*6.3);dummy.updateMatrix();poles.setMatrixAt(i,dummy.matrix);dummy.position.set(x,4.5,side*3.15);dummy.updateMatrix();arms.setMatrixAt(i,dummy.matrix)}panels.instanceMatrix.needsUpdate=poles.instanceMatrix.needsUpdate=arms.instanceMatrix.needsUpdate=true;lights.forEach((l,i)=>l.position.set(((distance+i*12)%24+24)%24-12,4,0))}
 update(0,0,0)
 return {ready:Promise.all([...textureReady,street?.ready??Promise.resolve()]),setVisible(visible:boolean){group.visible=visible},update,dispose(){street?.dispose();scene.remove(group);[asphalt,normal,roughness,...paving].forEach(t=>t.dispose());const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();group.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));if(o instanceof T.InstancedMesh)o.dispose()}});geometries.forEach(g=>g.dispose());const textures=new Set<T.Texture>();materials.forEach(m=>{for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);m.dispose()});textures.forEach(t=>t.dispose())}}
}


