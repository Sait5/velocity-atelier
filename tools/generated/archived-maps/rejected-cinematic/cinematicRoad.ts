import * as T from 'three'
import {createRoadAssets} from './roadAssets'
import meta from './cinematicMeta.json'

/** Original straight road, repeated with shared source geometry and full resolution textures. */
export function createCinematicRoad(scene:T.Scene){
 const assets=createRoadAssets(),group=new T.Group();group.name='arsen-iy Cinematic straight road';group.rotation.y=-Math.PI/2;group.position.set(0,.007,3.1);scene.add(group);let alive=true
 const ready=assets.model('/models/cinematic-road.glb').then(asset=>{
  if(!alive)return
  asset.scene.traverse(o=>{if(o instanceof T.Mesh){o.receiveShadow=true;o.castShadow=false;for(const m of Array.isArray(o.material)?o.material:[o.material])for(const value of Object.values(m))if(value instanceof T.Texture)value.anisotropy=16}})
  for(const z of [-2*meta.period,-meta.period,0,meta.period,2*meta.period]){const copy=asset.scene.clone(true);copy.position.z=z;group.add(copy)}
 })
 function update(distance:number,_speed:number,_time:number){group.position.x=((distance%meta.period)+meta.period)%meta.period}
 return {ready,setContacts:(_points:T.Vector3[])=>{},heightAt:(_x:number,_z:number,_distance:number)=>.007,setVisible:(visible:boolean)=>{group.visible=visible},update,dispose(){alive=false;scene.remove(group);assets.dispose()}}
}
