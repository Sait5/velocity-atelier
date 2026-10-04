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
 const uniforms={...T.UniformsUtils.clone(T.UniformsLib.fog),italian:{value:italian?1:0},travel:{value:0},asphalt:{value:asphalt},surfaceNormal:{value:normal},surfaceRoughness:{value:roughness}}
 const road=new T.Mesh(new T.PlaneGeometry(240,10),new T.ShaderMaterial({uniforms,fog:true,vertexShader:`varying vec3 world;
 #include <fog_pars_vertex>
 void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;vec4 mvPosition=viewMatrix*p;gl_Position=projectionMatrix*mvPosition;
 #include <fog_vertex>
 }`,fragmentShader:`
 #include <fog_pars_fragment>
 varying vec3 world;uniform float travel;uniform float italian;uniform sampler2D asphalt;uniform sampler2D surfaceNormal;uniform sampler2D surfaceRoughness;
 void main(){
  vec2 p=vec2(world.x-travel,world.z);
  vec2 surfaceUV=p/mix(2.08,3.8,italian);
  vec3 aggregate=texture2D(asphalt,surfaceUV).rgb;
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
  vec3 c=vec3(.012,.015,.019)+aggregate*(.17+.15*diffuse+italian*.30)+pool*(1.-italian)*vec3(.018,.022,.028)+sheen*vec3(.7,.8,1.);
  c=mix(c,vec3(.38,.40,.41),clamp(lane*dash+edge,0.,1.));
  float fade=exp(-abs(world.x)*mix(.022,.007,italian));
  gl_FragColor=vec4(c*fade,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
 }`}));road.name='Scanned asphalt motion surface';road.rotation.x=-Math.PI/2;road.position.y=.007;group.add(road)
 const metal=new T.MeshStandardMaterial({color:'#363c43',roughness:.42,metalness:.55}),lightMaterial=new T.MeshBasicMaterial({color:new T.Color(2.4,2.65,2.9),toneMapped:false})
 if(italian){
  const [map,normalMap,roughnessMap]=['diff-4k','normal','rough'].map((name,i)=>{const texture=roadMap('/textures/italian-pavement-'+name+'.webp',i===0);paving.push(texture);return texture})
  const pavementMaterial=new T.MeshStandardMaterial({color:'#c0c3bf',map,normalMap,roughnessMap,normalScale:new T.Vector2(.6,.6),roughness:1})
  // World-sized UVs preserve square pavers on the top face and through courtyards.
  const pavingSurface=(length:number,depth:number,z:number,y:number,material:T.Material)=>{const geometry=new T.PlaneGeometry(length,depth);geometry.rotateX(-Math.PI/2);const positions=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,positions.getX(i)/3.2,(positions.getZ(i)+z)/3.2);const mesh=new T.Mesh(geometry,material);mesh.position.set(0,y,z);mesh.receiveShadow=true;group.add(mesh);return mesh}
  const slabMaterial=new T.MeshStandardMaterial({color:'#b9b7ad',roughness:.95})
  for(const side of [-1,1]){const slab=new T.Mesh(new T.BoxGeometry(240,.14,10),slabMaterial);slab.position.set(0,.045,side*10);slab.receiveShadow=true;group.add(slab);pavingSurface(240,10,side*10,.116,pavementMaterial)}
  // The kerb meets the raised pavement directly. Individual stone blocks make
  // the vertical face read as concrete rather than a dark gap or metal rail.
  const curbMaterial=new T.MeshStandardMaterial({color:'#c6c2b6',roughness:.93})
  const curbGeometry=new T.BoxGeometry(1.995,.145,.24)
  for(const side of [-1,1]){const curb=new T.InstancedMesh(curbGeometry,curbMaterial,120);curb.name='Jointed concrete pavement kerb';curb.userData.side=side;curb.receiveShadow=true;curb.frustumCulled=false;group.add(curb);concreteCurbs.push(curb)}
  const courtyardMaterial=pavementMaterial.clone()
  courtyardMaterial.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float courtyardZ;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\ncourtyardZ=(modelMatrix*vec4(transformed,1.)).z;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float courtyardZ;').replace('#include <fog_fragment>','#include <fog_fragment>\n#ifdef USE_FOG\ngl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,smoothstep(18.,30.,abs(courtyardZ)));\n#endif')}
  courtyardMaterial.customProgramCacheKey=()=> 'courtyard-rear-haze-v1'
  pavingSurface(1200,1200,0,-.025,courtyardMaterial)
  for(const side of [-1,1]){const geometry=new T.BoxGeometry(240,1.1,.24),position=geometry.getAttribute('position'),normals=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,position.getX(i)/3.2,(Math.abs(normals.getY(i))>.5?position.getZ(i)+side*24:position.getY(i)+.525)/3.2);const wall=new T.Mesh(geometry,courtyardMaterial);wall.name='Textured rear courtyard boundary fading into mist';wall.position.set(0,.525,side*24);wall.receiveShadow=true;group.add(wall)}
 }
 if(!italian){const curbGeometry=new T.BoxGeometry(240,.12,.22);for(const side of [-1,1]){const curb=new T.Mesh(curbGeometry,metal);curb.position.set(0,.06,side*4.65);group.add(curb)}}
 const panels=new T.InstancedMesh(new T.BoxGeometry(1.8,.045,2.8),lightMaterial,20);panels.frustumCulled=false;group.add(panels)
 const poles=new T.InstancedMesh(new T.CylinderGeometry(.055,.09,4.65,8),metal,20),arms=new T.InstancedMesh(new T.BoxGeometry(.11,.11,6.4),metal,20)
 poles.name='Roadside lamp supports';arms.name='Cantilever lamp arms';group.add(poles,arms);poles.frustumCulled=arms.frustumCulled=false
 const contact=new T.Mesh(new T.PlaneGeometry(5.4,2.8),new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:`varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 p;void main(){float r=dot(p,p);gl_FragColor=vec4(0.,0.,0.,.55*exp(-r*3.)*(1.-smoothstep(.7,1.,r)));}`}));contact.rotation.x=-Math.PI/2;contact.position.y=.009;group.add(contact)
 panels.visible=poles.visible=arms.visible=!italian
 const lights=[new T.PointLight('#d8e6ef',24,13,2),new T.PointLight('#d8e6ef',24,13,2)];lights.forEach(l=>{l.visible=!italian;group.add(l)});const dummy=new T.Object3D()
 function update(distance:number,_speed:number,_time:number){street?.update(distance);for(const texture of paving)texture.offset.x=-(distance/3.2)%1;uniforms.travel.value=distance%624;for(const curb of concreteCurbs){for(let i=0;i<120;i++){dummy.position.set(i*2-119+((distance%2)+2)%2,.045,curb.userData.side*4.91);dummy.updateMatrix();curb.setMatrixAt(i,dummy.matrix)}curb.instanceMatrix.needsUpdate=true}for(let i=0;i<20;i++){const x=((i*12+distance)%240+240)%240-120,side=i%2?1:-1;dummy.position.set(x,4.45,0);dummy.updateMatrix();panels.setMatrixAt(i,dummy.matrix);dummy.position.set(x,2.325,side*6.3);dummy.updateMatrix();poles.setMatrixAt(i,dummy.matrix);dummy.position.set(x,4.5,side*3.15);dummy.updateMatrix();arms.setMatrixAt(i,dummy.matrix)}panels.instanceMatrix.needsUpdate=poles.instanceMatrix.needsUpdate=arms.instanceMatrix.needsUpdate=true;lights.forEach((l,i)=>l.position.set(((distance+i*12)%24+24)%24-12,4,0))}
 update(0,0,0)
 return {ready:Promise.all([...textureReady,street?.ready??Promise.resolve()]),setVisible(visible:boolean){group.visible=visible},update,dispose(){street?.dispose();scene.remove(group);[asphalt,normal,roughness,...paving].forEach(t=>t.dispose());const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();group.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));if(o instanceof T.InstancedMesh)o.dispose()}});geometries.forEach(g=>g.dispose());const textures=new Set<T.Texture>();materials.forEach(m=>{for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);m.dispose()});textures.forEach(t=>t.dispose())}}
}


