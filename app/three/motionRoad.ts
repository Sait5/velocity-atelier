import * as T from 'three'

/** Open road preserves unobstructed orbit views; overhead lights repeat with travel. */
export function createMotionRoad(scene:T.Scene){
 const group=new T.Group();group.name='Open night motion road';scene.add(group)
 const loader=new T.TextureLoader()
 const roadMap=(url:string,color=false)=>{const map=loader.load(url);map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=16;map.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;return map}
 const asphalt=roadMap('/textures/asphalt_01_diff_4k.jpg',true),normal=roadMap('/textures/asphalt_01_nor_gl_2k.jpg'),roughness=roadMap('/textures/asphalt_01_rough_2k.jpg')
 const uniforms={travel:{value:0},asphalt:{value:asphalt},surfaceNormal:{value:normal},surfaceRoughness:{value:roughness}}
 const road=new T.Mesh(new T.PlaneGeometry(240,10),new T.ShaderMaterial({uniforms,vertexShader:`varying vec3 world;void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`
 varying vec3 world;uniform float travel;uniform sampler2D asphalt;uniform sampler2D surfaceNormal;uniform sampler2D surfaceRoughness;
 void main(){
  vec2 p=vec2(world.x-travel,world.z);
  vec3 aggregate=texture2D(asphalt,p/2.08).rgb;
  vec3 n=normalize(mix(vec3(0.,0.,1.),texture2D(surfaceNormal,p/2.08).xyz*2.-1.,.65));
  float rough=texture2D(surfaceRoughness,p/2.08).r;
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
  vec3 c=vec3(.012,.015,.019)+aggregate*(.17+.15*diffuse)+pool*vec3(.018,.022,.028)+sheen*vec3(.7,.8,1.);
  c=mix(c,vec3(.38,.40,.41),clamp(lane*dash+edge,0.,1.));
  float fade=exp(-abs(world.x)*.022);
  gl_FragColor=vec4(c*fade,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`}));road.name='Scanned asphalt motion surface';road.rotation.x=-Math.PI/2;road.position.y=.007;group.add(road)
 const metal=new T.MeshStandardMaterial({color:'#363c43',roughness:.42,metalness:.55}),lightMaterial=new T.MeshBasicMaterial({color:new T.Color(2.4,2.65,2.9),toneMapped:false})
 const curbGeometry=new T.BoxGeometry(240,.12,.22);for(const side of [-1,1]){const curb=new T.Mesh(curbGeometry,metal);curb.position.set(0,.06,side*4.65);group.add(curb)}
 const panels=new T.InstancedMesh(new T.BoxGeometry(1.8,.045,2.8),lightMaterial,20);panels.frustumCulled=false;group.add(panels)
 const poles=new T.InstancedMesh(new T.CylinderGeometry(.055,.09,4.65,8),metal,20),arms=new T.InstancedMesh(new T.BoxGeometry(.11,.11,6.4),metal,20)
 poles.name='Roadside lamp supports';arms.name='Cantilever lamp arms';group.add(poles,arms);poles.frustumCulled=arms.frustumCulled=false
 const contact=new T.Mesh(new T.PlaneGeometry(5.4,2.8),new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:`varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 p;void main(){float r=dot(p,p);gl_FragColor=vec4(0.,0.,0.,.55*exp(-r*3.)*(1.-smoothstep(.7,1.,r)));}`}));contact.rotation.x=-Math.PI/2;contact.position.y=.009;group.add(contact)
 const lights=[new T.PointLight('#d8e6ef',24,13,2),new T.PointLight('#d8e6ef',24,13,2)];lights.forEach(l=>group.add(l));const dummy=new T.Object3D()
 function update(distance:number,_speed:number,_time:number){uniforms.travel.value=distance%624;for(let i=0;i<20;i++){const x=((i*12+distance)%240+240)%240-120,side=i%2?1:-1;dummy.position.set(x,4.45,0);dummy.updateMatrix();panels.setMatrixAt(i,dummy.matrix);dummy.position.set(x,2.325,side*6.3);dummy.updateMatrix();poles.setMatrixAt(i,dummy.matrix);dummy.position.set(x,4.5,side*3.15);dummy.updateMatrix();arms.setMatrixAt(i,dummy.matrix)}panels.instanceMatrix.needsUpdate=poles.instanceMatrix.needsUpdate=arms.instanceMatrix.needsUpdate=true;lights.forEach((l,i)=>l.position.set(((distance+i*12)%24+24)%24-12,4,0))}
 update(0,0,0)
 return {update,dispose(){scene.remove(group);[asphalt,normal,roughness].forEach(t=>t.dispose());const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();group.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));if(o instanceof T.InstancedMesh)o.dispose()}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}}
}


