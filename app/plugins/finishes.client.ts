import {vehicles,previewVehicle} from '~/data/vehicles'
import {paints,upholsteryColors,backgrounds,lightPresets} from '~/data/finishes'
export default defineNuxtPlugin(()=>{
 const s=useAtelier(),key='velocity-finishes-v1'
 try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&typeof saved==='object'){
  for(const [id,entry] of Object.entries(saved.finishes??{})){const e=entry as {paint:string,upholstery:string};if([previewVehicle,...vehicles].some(v=>v.id===id)&&paints.some(p=>p.hex===e?.paint)&&upholsteryColors.some(p=>p.hex===e?.upholstery))s.finishes.value[id]={paint:e.paint,upholstery:e.upholstery}}
  const car=[previewVehicle,...vehicles].find(v=>v.id===saved.car);if(car)s.car.value=car
  const finish=s.finishes.value[s.car.value.id];if(finish){s.paint.value=finish.paint;s.upholstery.value=finish.upholstery}
  if(backgrounds.some(p=>p.hex===saved.background))s.background.value=saved.background
  if(lightPresets.some(p=>p.id===saved.lighting))s.lighting.value=saved.lighting
 }}catch{}
 watch([()=>s.car.value.id,()=>s.paint.value,()=>s.upholstery.value,()=>s.background.value,()=>s.lighting.value],()=>{
  s.finishes.value[s.car.value.id]={paint:s.paint.value,upholstery:s.upholstery.value}
  try{localStorage.setItem(key,JSON.stringify({car:s.car.value.id,finishes:s.finishes.value,background:s.background.value,lighting:s.lighting.value}))}catch{}
 },{flush:'post'})
})
