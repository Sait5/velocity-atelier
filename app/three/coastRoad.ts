import * as T from 'three'
import {createRoadAssets} from './roadAssets'
import route from './coastRoute.json'
import normals from './coastNormals.json'
import terrain from './coastTerrain.json'

/** A finite photogrammetry route. Transform the environment, not the wheel pivots. */
export function createCoastRoad(scene:T.Scene){
 const assets=createRoadAssets(),group=new T.Group(),world=new T.Group();group.name='Metazeon coastal scan and sea';group.add(world);scene.add(group)
 const curve=new T.CatmullRomCurve3(route.map(p=>new T.Vector3(...p as [number,number,number])),false,'centripetal');curve.arcLengthDivisions=600
 const length=curve.getLength()-24,position=new T.Vector3(),tangent=new T.Vector3(),groundNormal=new T.Vector3(0,1,0),sampleNormal=new T.Vector3(),cameraLocal=new T.Vector3();let alive=true
 const seaMaterial=new T.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:`varying vec3 p;varying vec3 worldP;void main(){p=position;worldP=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 p;varying vec3 worldP;uniform float time;void main(){float wave=sin(p.x*.7+p.y*.24-time*.65)*sin(p.y*.41-time*.38);float small=sin(p.x*3.+p.y*1.8+time)*.12;vec3 water=mix(vec3(.025,.13,.19),vec3(.065,.25,.31),wave*.5+.5);water+=pow(clamp(wave+small,0.,1.),16.)*.035;float fresnel=pow(1.-max(0.,normalize(cameraPosition-worldP).y),4.);water=mix(water,vec3(.68,.83,.89),fresnel*.85);gl_FragColor=vec4(water,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`})
 const sea=new T.Mesh(new T.PlaneGeometry(3000,3000),seaMaterial);sea.rotation.x=-Math.PI/2;sea.position.y=-1.05;sea.name='Animated coastal water';world.add(sea)
 const sky=new T.Mesh(new T.SphereGeometry(1400,24,12),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,vertexShader:`varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 p;void main(){float h=max(0.,normalize(p).y);gl_FragColor=vec4(mix(vec3(.68,.83,.89),vec3(.25,.52,.73),pow(h,.55)),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`}));sky.frustumCulled=false;sky.renderOrder=-100;group.add(sky)
 function update(distance:number,_speed:number,time:number){const u=T.MathUtils.clamp((distance+12)/curve.getLength(),12/curve.getLength(),1-12/curve.getLength());curve.getPointAt(u,position);curve.getTangentAt(u,tangent);world.rotation.y=Math.atan2(tangent.z,tangent.x)-Math.PI;world.position.copy(position).applyAxisAngle(T.Object3D.DEFAULT_UP,world.rotation.y).negate();world.position.y+=.007;groundNormal.set(0,0,0);const index=Math.round(u*(normals.length-1));for(let i=Math.max(0,index-3);i<=Math.min(normals.length-1,index+3);i++)groundNormal.add(sampleNormal.fromArray(normals[i]!));groundNormal.normalize().applyAxisAngle(T.Object3D.DEFAULT_UP,world.rotation.y);seaMaterial.uniforms.time!.value=time;world.updateMatrixWorld(true)}
 const ready=assets.model('/models/coast-road-rocks.glb').then(asset=>{if(!alive)return;asset.scene.traverse(o=>{if(o instanceof T.Mesh){o.receiveShadow=true;o.castShadow=false;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m instanceof T.MeshStandardMaterial){m.roughness=.95;m.metalness=0;m.envMapIntensity=.15}for(const v of Object.values(m))if(v instanceof T.Texture)v.anisotropy=12}}});world.add(asset.scene);update(0,0,0)})
 update(0,0,0)
 function adjustCamera(camera:T.PerspectiveCamera,carPosition:T.Vector3){
  world.worldToLocal(cameraLocal.copy(camera.position))
  const ix=Math.round((cameraLocal.x-terrain.minX)/(terrain.maxX-terrain.minX)*(terrain.size-1)),iz=Math.round((cameraLocal.z-terrain.minZ)/(terrain.maxZ-terrain.minZ)*(terrain.size-1))
  if(ix<0||iz<0||ix>=terrain.size||iz>=terrain.size)return
  let height=-1.05
  for(let z=Math.max(0,iz-1);z<=Math.min(terrain.size-1,iz+1);z++)for(let x=Math.max(0,ix-1);x<=Math.min(terrain.size-1,ix+1);x++)height=Math.max(height,terrain.heights[z*terrain.size+x]!)
  const minimum=height+world.position.y+1.6
  if(camera.position.y<minimum){camera.position.y=minimum;camera.lookAt(carPosition.x,carPosition.y+.65,carPosition.z)}
 }
 return {length,ready,adjustCamera,setContacts:(_points:T.Vector3[])=>{},heightAt:(x:number,z:number,_distance:number)=>.007-(groundNormal.x*x+groundNormal.z*z)/Math.max(.5,groundNormal.y),setVisible:(visible:boolean)=>{group.visible=visible},update,dispose(){alive=false;scene.remove(group);assets.dispose();for(const mesh of [sea,sky]){mesh.geometry.dispose();(mesh.material as T.Material).dispose()}}}
}
