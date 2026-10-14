import * as T from 'three'
import {createRoadAssets} from './roadAssets'

/** Original ArtStation road and fence, retaining source UVs and full texture resolution. */
export function createWetRoad(scene:T.Scene){
 const assets=createRoadAssets(),group=new T.Group(),sea=new T.Group(),lights=Array.from({length:4},()=>new T.PointLight('#e0eaff',55,19,2))
 group.name='Dr dark mt — wet road';group.rotation.y=Math.PI;group.position.set(210,-.217265,2)
 sea.rotation.y=Math.PI;sea.position.copy(group.position);scene.add(group,sea);lights.forEach(l=>scene.add(l));let alive=true
 const ready=assets.model('/models/wet-road.glb').then(asset=>{
  if(!alive)return
  asset.scene.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=false;o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material]){
   for(const value of Object.values(m))if(value instanceof T.Texture)value.anisotropy=16
   if(m instanceof T.MeshStandardMaterial){
    if(m.name==='Material.001'){m.color.set('#65717e');m.envMapIntensity=1.3;m.normalScale.set(.4,.4)}
    if(m.name==='Ocean.001'){m.color.set('#243f50');m.roughness=.23;m.metalness=.35}
    if(m.name==='Material.003'){m.color.set('#dceaff');m.emissive.set('#c9dfff');m.emissiveIntensity=3}
   }
  }}})
  const ocean=asset.scene.getObjectByName('Ocean_Far001')??asset.scene.children.find(o=>/Ocean/.test(o.name))
  if(ocean){ocean.removeFromParent();sea.add(ocean)}
  for(const offset of [-420,0,420]){const copy=asset.scene.clone(true);copy.position.x=offset;group.add(copy)}
 })
 function update(distance:number,_speed:number,_time:number){group.position.x=((distance+210)%420+420)%420;const phase=((distance+4.35567)%22.05+22.05)%22.05;lights.forEach((l,i)=>l.position.set(phase-i*22.05,4.48,3.8))}
 update(0,0,0)
 return {ready,setContacts:(_points:T.Vector3[])=>{},heightAt:()=>.007,setVisible:(v:boolean)=>{group.visible=sea.visible=v;lights.forEach(l=>l.visible=v)},update,dispose(){alive=false;scene.remove(group,sea);lights.forEach(l=>{scene.remove(l);l.dispose()});assets.dispose()}}
}
