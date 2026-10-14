import {vehicles,previewVehicle} from '~/data/vehicles'
import {paints,upholsteryColors} from '~/data/finishes'
export default defineNuxtPlugin(()=>{
 const s=useAtelier(),key='velocity-finishes-v1'
 try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&typeof saved==='object'){
  for(const [id,entry] of Object.entries(saved.finishes??{})){const e=entry as {paint:string,upholstery:string,secondaryPaint?:string};if([previewVehicle,...vehicles].some(v=>v.id===id)&&paints.some(p=>p.hex===e?.paint)&&upholsteryColors.some(p=>p.hex===e?.upholstery))s.finishes.value[id]={paint:e.paint,upholstery:e.upholstery,secondaryPaint:paints.some(p=>p.hex===e.secondaryPaint)?e.secondaryPaint:'#121a20'}}
  const car=[previewVehicle,...vehicles].find(v=>v.id===saved.car);if(car)s.car.value=car
  const finish=s.finishes.value[s.car.value.id];s.paint.value=finish?.paint??s.car.value.color;s.upholstery.value=finish?.upholstery??'#242826';s.secondaryPaint.value=finish?.secondaryPaint??'#121a20'
  s.background.value='#030505';s.environment.value='studio';s.lighting.value='Studio'
 }}catch{}
 watch([()=>s.car.value.id,()=>s.paint.value,()=>s.secondaryPaint.value,()=>s.upholstery.value,()=>s.background.value,()=>s.lighting.value],()=>{
  s.finishes.value[s.car.value.id]={paint:s.paint.value,upholstery:s.upholstery.value,secondaryPaint:s.secondaryPaint.value}
  try{localStorage.setItem(key,JSON.stringify({car:s.car.value.id,finishes:s.finishes.value,background:s.background.value,lighting:s.lighting.value}))}catch{}
 },{flush:'post'})
})
