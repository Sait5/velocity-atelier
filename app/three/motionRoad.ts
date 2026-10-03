import * as T from 'three'

/** Open road preserves unobstructed orbit views; overhead lights repeat with travel. */
export function createMotionRoad(scene:T.Scene){
 const group=new T.Group();group.name='Open night motion road';scene.add(group)
 const uniforms={travel:{value:0}}
 const road=new T.Mesh(new T.PlaneGeometry(240,10),new T.ShaderMaterial({uniforms,vertexShader:`varying vec3 world;void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`varying vec3 world;uniform float travel;void main(){vec2 p=vec2(world.x-travel,world.z);float grain=fract(sin(dot(floor(p*220.),vec2(12.98,78.23)))*43758.54);float dash=step(.5,fract(p.x/8.));float lane=1.-smoothstep(.035,.055,abs(abs(p.y)-1.75));float edge=1.-smoothstep(.035,.055,abs(abs(p.y)-4.));float pool=pow(.5+.5*cos(p.x*.5236),6.);vec3 c=vec3(.018,.022,.026)+grain*.009+pool*vec3(.012,.015,.018);c+=vec3(.28)*lane*dash+vec3(.24)*edge;float fade=exp(-abs(world.x)*.019);gl_FragColor=vec4(c*fade,1.);}`}));road.rotation.x=-Math.PI/2;road.position.y=.007;group.add(road)
 const metal=new T.MeshStandardMaterial({color:'#363c43',roughness:.42,metalness:.55}),lightMaterial=new T.MeshBasicMaterial({color:new T.Color(2.4,2.65,2.9),toneMapped:false})
 const curbGeometry=new T.BoxGeometry(240,.12,.22);for(const side of [-1,1]){const curb=new T.Mesh(curbGeometry,metal);curb.position.set(0,.06,side*4.65);group.add(curb)}
 const panels=new T.InstancedMesh(new T.BoxGeometry(1.8,.045,2.8),lightMaterial,20);panels.frustumCulled=false;group.add(panels)
 const contact=new T.Mesh(new T.PlaneGeometry(5.4,2.8),new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:`varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 p;void main(){float r=dot(p,p);gl_FragColor=vec4(0.,0.,0.,.55*exp(-r*3.)*(1.-smoothstep(.7,1.,r)));}`}));contact.rotation.x=-Math.PI/2;contact.position.y=.009;group.add(contact)
 const lights=[new T.PointLight('#d8e6ef',24,13,2),new T.PointLight('#d8e6ef',24,13,2)];lights.forEach(l=>group.add(l));const dummy=new T.Object3D()
 function update(distance:number,_speed:number,_time:number){uniforms.travel.value=distance%240;for(let i=0;i<20;i++){const x=((i*12+distance)%240+240)%240-120;dummy.position.set(x,4.45,0);dummy.updateMatrix();panels.setMatrixAt(i,dummy.matrix)}panels.instanceMatrix.needsUpdate=true;lights.forEach((l,i)=>l.position.set(((distance+i*12)%24+24)%24-12,4,0))}
 update(0,0,0)
 return {update,dispose(){scene.remove(group);const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();group.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));if(o instanceof T.InstancedMesh)o.dispose()}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}}
}

