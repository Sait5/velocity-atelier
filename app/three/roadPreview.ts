import * as T from 'three'
import {createMotionRoad} from './motionRoad'
const cache=new Map<string,Promise<string>>()
let queue:Promise<unknown>=Promise.resolve()
/** Render the actual map, without the car or interface, once per session. */
export function renderRoadPreview(map:'italy'|'night'){
 if(cache.has(map))return cache.get(map)!
 const task=queue.then(async()=>{
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true})
  renderer.setSize(1600,900);renderer.setPixelRatio(1);renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=map==='italy'?1.65:2.0
  const scene=new T.Scene();scene.background=new T.Color(map==='italy'?'#bedeea':'#18222e')
  if(map==='night')scene.fog=new T.Fog('#18222e',18,135)
  const camera=new T.PerspectiveCamera(48,1600/900,.05,260);camera.position.set(12,2.8,3.1);camera.lookAt(-32,1.7,-1);if(map==='night'){camera.position.set(9,4.8,3.1);camera.lookAt(-15,.2,0)}
  const ambient=new T.HemisphereLight('#e1f0ff','#776c55',map==='italy'?2.3:2.4),sun=new T.DirectionalLight('#fff6e5',map==='italy'?3.0:2.4);sun.position.set(-3,7,4);scene.add(ambient,sun)
  const road=createMotionRoad(scene,map==='italy')
  try{await road.ready;await renderer.compileAsync(scene,camera);renderer.render(scene,camera);return renderer.domElement.toDataURL('image/webp',.96)}
  finally{road.dispose();renderer.dispose()}
 })
 queue=task.catch(()=>{});cache.set(map,task);task.catch(()=>cache.delete(map));return task
}
