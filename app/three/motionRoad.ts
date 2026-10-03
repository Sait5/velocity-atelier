import * as T from 'three'

/** An endless studio road moves under the car; no landscape or driving physics. */
export function createMotionRoad(scene:T.Scene){
 const group=new T.Group();group.name='Motion studio';scene.add(group)
 const uniforms={travel:{value:0},pace:{value:0}}
 const road=new T.Mesh(new T.PlaneGeometry(220,9),new T.ShaderMaterial({uniforms,vertexShader:`varying vec3 world;void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`varying vec3 world;uniform float travel;uniform float pace;void main(){float edge=1.-smoothstep(3.5,4.5,abs(world.z));float dash=step(.66,fract((world.x-travel)/7.));float lane=1.-smoothstep(.025,.045,abs(abs(world.z)-1.6));float rail=1.-smoothstep(.018,.038,abs(abs(world.z)-3.5));float grain=fract(sin(dot(floor(world.xz*180.),vec2(12.98,78.23)))*43758.54);vec3 c=vec3(.013)+grain*.009;c+=vec3(.28,.32,.34)*lane*dash+vec3(.3,.37,.4)*rail;float fade=exp(-abs(world.x)*.027);gl_FragColor=vec4(c*fade,edge);}`,transparent:true,depthWrite:false}));road.rotation.x=-Math.PI/2;road.position.y=.006;group.add(road)
 const stripMaterial=new T.MeshBasicMaterial({color:new T.Color(2.2,2.5,2.7),transparent:true,opacity:.65})
 const strips=new T.InstancedMesh(new T.BoxGeometry(1,.025,.025),stripMaterial,120);strips.frustumCulled=false;group.add(strips)
 const dummy=new T.Object3D(),lights:T.PointLight[]=[]
 for(const side of [-1,1]){const light=new T.PointLight('#dceaf0',18,14,2);light.position.set(-2,2.2,side*3.7);group.add(light);lights.push(light)}
 function update(distance:number,speed:number,time:number){
  uniforms.travel.value=distance%140;uniforms.pace.value=Math.abs(speed)
  for(let i=0;i<120;i++){const side=i%2?1:-1,row=Math.floor(i/2)%5,column=Math.floor(i/10);const x=((column*13+distance)%156+156)%156-78;dummy.position.set(x,.5+row*.72,side*(3.75+row*.3));dummy.scale.set(1.5+Math.min(Math.abs(speed)*.085,7),1,1);dummy.updateMatrix();strips.setMatrixAt(i,dummy.matrix)}strips.instanceMatrix.needsUpdate=true
  lights.forEach((l,i)=>{l.position.x=Math.sin(time*.7+i*Math.PI)*4;l.intensity=18+Math.sin(time*1.2+i)*4})
 }
 update(0,0,0)
 return {update,dispose(){scene.remove(group);road.geometry.dispose();road.material.dispose();strips.geometry.dispose();stripMaterial.dispose();strips.dispose()}}
}
