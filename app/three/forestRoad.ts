import * as T from 'three'
import {createRoadAssets} from './roadAssets'
import route from './forestRoute.json'
import normals from './forestNormals.json'

/** The approved Blender scene, including its original photographic foliage. */
export function createForestRoad(scene:T.Scene){
 const assets=createRoadAssets(),group=new T.Group();group.name='Toby Noby Forest Road';scene.add(group)
 const curve=new T.CatmullRomCurve3(route.map(p=>new T.Vector3(...p as [number,number,number])),false,'centripetal');curve.arcLengthDivisions=600
 const length=curve.getLength()-12,point=new T.Vector3(),tangent=new T.Vector3(),normal=new T.Vector3(0,1,0),sample=new T.Vector3();let alive=true
 function update(distance:number,_speed:number,_time:number){const u=T.MathUtils.clamp((distance+6)/curve.getLength(),6/curve.getLength(),1-6/curve.getLength());curve.getPointAt(u,point);curve.getTangentAt(u,tangent);group.rotation.y=Math.atan2(tangent.z,tangent.x)-Math.PI;group.position.copy(point).applyAxisAngle(T.Object3D.DEFAULT_UP,group.rotation.y).negate();group.position.y+=.007;normal.set(0,0,0);const index=Math.round(u*(normals.length-1));for(let i=Math.max(0,index-3);i<=Math.min(normals.length-1,index+3);i++)normal.add(sample.fromArray(normals[i]!));normal.normalize().applyAxisAngle(T.Object3D.DEFAULT_UP,group.rotation.y)}
 const ready=assets.model('/models/forest-road.glb').then(asset=>{if(!alive)return;asset.scene.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=false;o.receiveShadow=!o.name.startsWith('FTD');for(const material of Array.isArray(o.material)?o.material:[o.material]){if(material instanceof T.MeshStandardMaterial){material.roughness=.95;material.envMapIntensity=.2;if(material.name.includes('foliage')){material.side=T.DoubleSide;material.alphaTest=.4;material.transparent=false;material.depthWrite=true}}for(const v of Object.values(material))if(v instanceof T.Texture)v.anisotropy=12}}});group.add(asset.scene);update(0,0,0)})
 update(0,0,0)
 function adjustCamera(camera:T.PerspectiveCamera,carPosition:T.Vector3){const z=T.MathUtils.clamp(camera.position.z,-1.7,1.7);if(z!==camera.position.z){camera.position.z=z;camera.lookAt(carPosition.x,carPosition.y+.65,carPosition.z)}}
 return {length,ready,adjustCamera,setContacts:(_points:T.Vector3[])=>{},heightAt:(x:number,z:number,_distance:number)=>.007-(normal.x*x+normal.z*z)/Math.max(.5,normal.y),setVisible:(visible:boolean)=>{group.visible=visible},update,dispose(){alive=false;scene.remove(group);assets.dispose()}}
}
