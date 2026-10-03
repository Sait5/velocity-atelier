import { vehicles,previewVehicle } from '~/data/vehicles'
export function useAtelier() {
 const finishes=useState<Record<string,{paint:string,upholstery:string}>>('saved-finishes',()=>({}));
 const car = useState('car',()=>previewVehicle); const paint=useState('paint',()=>car.value.color)
 const wheels=useState('wheels',()=>0); const brakes=useState('brakes',()=> '#d9e678'); const doors=useState('doors',()=>false)
 const interior=useState('interior',()=>false); const lighting=useState('lighting',()=> 'Studio'); const quality=useState('quality',()=> 'Ultra')
 const sound=useState('sound',()=>false); const volume=useState('volume',()=>0.2); const engine=useState('engine',()=>false)
 const music=useState('music',()=>true); const motion=useState('motion',()=>true); const shadows=useState('shadows',()=>true)
 const language=useState<'ru'|'en'>('language',()=> 'ru');const upholstery=useState('upholstery',()=> '#242826');const background=useState('background',()=> '#030505')
 const environment=useState('environment',()=> 'studio');const detail=useState('detail',()=> '');const focus=useState('focus',()=> '');const headlights=useState('headlights',()=>true);const taillights=useState('taillights',()=>true)
 function select(id:string){const v=id==='458'?previewVehicle:vehicles.find(v=>v.id===id);if(v){finishes.value[car.value.id]={paint:paint.value,upholstery:upholstery.value};if(v.id!==car.value.id){car.value=v;paint.value=finishes.value[v.id]?.paint??v.color;upholstery.value=finishes.value[v.id]?.upholstery??'#242826'}doors.value=false;interior.value=false}}
 return {finishes,car,paint,wheels,brakes,doors,interior,lighting,quality,sound,music,volume,engine,motion,shadows,language,upholstery,background,environment,detail,focus,headlights,taillights,select}
}
