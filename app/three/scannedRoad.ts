import * as T from 'three'
import {createRoadAssets} from './roadAssets'
import wetland from './wetlandRoute.json'
import highway50 from './highway50Route.json'

/** Original textured scans follow a finite surveyed road; one map is resident at a time. */
export function createScannedRoad(scene:T.Scene,map:'wetland'|'highway50'){
 const assets=createRoadAssets(),group=new T.Group(),world=new T.Group();group.name=map==='wetland'?'Metazeon wetland road':'NDOT Highway 50';group.add(world);scene.add(group)
 const source=map==='wetland'?wetland:highway50,scale=map==='highway50'?.15:1,points=source.points.map(p=>new T.Vector3(...p as [number,number,number]).multiplyScalar(scale)),curve=new T.CatmullRomCurve3(points,false,'centripetal');curve.arcLengthDivisions=1000
 const length=Math.max(1,curve.getLength()-32),position=new T.Vector3(),tangent=new T.Vector3(),normal=new T.Vector3(0,1,0);let alive=true
 const sky=new T.Mesh(new T.SphereGeometry(2400,24,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 p;void main(){float h=max(0.,normalize(p).y);gl_FragColor=vec4(mix(vec3(.76,.84,.87),vec3(.24,.48,.72),pow(h,.55)),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`}));sky.frustumCulled=false;sky.renderOrder=-100;group.add(sky)
 function update(distance:number,_speed:number,_time:number){const u=T.MathUtils.clamp((distance+16)/(length+32),0,1);curve.getPointAt(u,position);curve.getTangentAt(u,tangent);const yaw=Math.atan2(tangent.z,tangent.x)-Math.PI;world.rotation.y=yaw;world.position.copy(position).applyAxisAngle(T.Object3D.DEFAULT_UP,yaw).negate();world.position.y+=.007;const index=Math.min(source.normals.length-1,Math.round(u*(source.normals.length-1)));normal.set(...source.normals[index] as [number,number,number]).applyAxisAngle(T.Object3D.DEFAULT_UP,yaw);world.updateMatrixWorld(true)}
 const ready=assets.model('/models/'+map+'-road.glb').then(asset=>{if(!alive)return;asset.scene.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=false;o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const v of Object.values(m))if(v instanceof T.Texture)v.anisotropy=12}}});asset.scene.scale.setScalar(scale);world.add(asset.scene);update(0,0,0)})
 update(0,0,0)
 return {length,ready,update,heightAt:(x:number,z:number,_distance:number)=>.007-(normal.x*x+normal.z*z)/Math.max(.5,normal.y),setContacts:(_points:T.Vector3[])=>{},setVisible:(value:boolean)=>{group.visible=value},dispose(){alive=false;scene.remove(group);assets.dispose();sky.geometry.dispose();sky.material.dispose()}}
}
