import * as T from 'three'
import {createMotionRoad} from './motionRoad'
const cache=new Map<string,Promise<string>>()
let queue:Promise<unknown>=Promise.resolve()
/** Render the actual map, without the car or interface, once per session. */
export function renderRoadPreview(map:'italy'|'night'){
 if(cache.has(map))return cache.get(map)!
 const task=queue.then(async()=>{
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true})
  renderer.setSize(720,400);renderer.setPixelRatio(1);renderer.toneMapping=T.NeutralToneMapping
  const scene=new T.Scene();scene.background=new T.Color(map==='italy'?'#bedeea':'#05070a')
  if(map==='night')scene.fog=new T.Fog('#05070a',18,135)
  const camera=new T.PerspectiveCamera(52,1.8,.05,260);camera.position.set(16,2.1,2.6);camera.lookAt(-28,1.9,-1.5)
  const ambient=new T.HemisphereLight('#e1f0ff','#776c55',map==='italy'?.75:.35),sun=new T.DirectionalLight('#fff6e5',map==='italy'?2.4:.8);sun.position.set(-3,7,4);scene.add(ambient,sun)
  const road=createMotionRoad(scene,map==='italy')
  try{await road.ready;await renderer.compileAsync(scene,camera);renderer.render(scene,camera);return renderer.domElement.toDataURL('image/webp',.92)}
  finally{road.dispose();renderer.dispose()}
 })
 queue=task.catch(()=>{});cache.set(map,task);task.catch(()=>cache.delete(map));return task
}
