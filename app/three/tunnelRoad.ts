import * as T from 'three'
import {createRoadAssets} from './roadAssets'
import meta from './tunnelMeta.json'

/** Repeated source tunnel sections share geometry and textures, with two smoothly overlapping light pairs. */
export function createTunnelRoad(scene:T.Scene){
 const assets=createRoadAssets(),group=new T.Group(),lights=Array.from({length:4},()=>new T.PointLight('#ffcd8e',65,15,2));group.name='judefelix Road Tunnel';group.rotation.y=-Math.PI/2;group.position.y=.007;scene.add(group);lights.forEach(light=>scene.add(light));let alive=true
 const ready=assets.model('/models/road-tunnel.glb').then(asset=>{if(!alive)return;asset.scene.traverse(o=>{if(o instanceof T.Mesh){o.receiveShadow=true;o.castShadow=false;for(const m of Array.isArray(o.material)?o.material:[o.material])for(const value of Object.values(m))if(value instanceof T.Texture)value.anisotropy=12}});for(const z of [-meta.period,0,meta.period]){const copy=asset.scene.clone(true);copy.position.z=z;group.add(copy)}})
 function update(distance:number,_speed:number,_time:number){group.position.x=((distance+35)%meta.period+meta.period)%meta.period;const spacing=8.92022;lights.forEach((l,i)=>{const travel=T.MathUtils.euclideanModulo(distance+Math.floor(i/2)*spacing,spacing*2)-spacing;l.position.set(travel,4.36,i%2?3.8:-3.8);l.intensity=65*(.5+.5*Math.cos(Math.PI*travel/spacing))})}
 // Upload even sections behind the camera before the loading curtain opens.
 function prepare(renderer:T.WebGLRenderer,camera:T.Camera){
  const meshes:T.Mesh[]=[],culled:boolean[]=[],textures=new Set<T.Texture>()
  group.traverse(o=>{if(o instanceof T.Mesh){meshes.push(o);culled.push(o.frustumCulled);o.frustumCulled=false;for(const m of Array.isArray(o.material)?o.material:[o.material])for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value)}})
  textures.forEach(texture=>renderer.initTexture(texture))
  const previous=renderer.getRenderTarget(),target=new T.WebGLRenderTarget(2,2)
  try{renderer.setRenderTarget(target);renderer.render(scene,camera)}finally{renderer.setRenderTarget(previous);meshes.forEach((mesh,i)=>{mesh.frustumCulled=culled[i]!});target.dispose()}
 }
 update(0,0,0)
 return {ready,prepare,setContacts:(_points:T.Vector3[])=>{},heightAt:(_x:number,_z:number,_distance:number)=>.007,setVisible:(visible:boolean)=>{group.visible=visible;lights.forEach(l=>l.visible=visible)},update,dispose(){alive=false;scene.remove(group);lights.forEach(l=>{scene.remove(l);l.dispose()});assets.dispose()}}
}


