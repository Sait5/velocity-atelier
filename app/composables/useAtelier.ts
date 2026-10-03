import { vehicles,previewVehicle } from '~/data/vehicles'
export function useAtelier() {
 const car = useState('car',()=>previewVehicle); const paint=useState('paint',()=>car.value.color)
 const wheels=useState('wheels',()=>0); const brakes=useState('brakes',()=> '#d9e678'); const doors=useState('doors',()=>false)
 const interior=useState('interior',()=>false); const lighting=useState('lighting',()=> 'Studio'); const quality=useState('quality',()=> 'High')
 const sound=useState('sound',()=>false); const volume=useState('volume',()=>0.2); const engine=useState('engine',()=>false)
 const motion=useState('motion',()=>true); const shadows=useState('shadows',()=>true)
 const language=useState<'ru'|'en'>('language',()=> 'ru');const upholstery=useState('upholstery',()=> '#242826');const background=useState('background',()=> '#030505')
 const environment=useState('environment',()=> 'studio');const detail=useState('detail',()=> '');const focus=useState('focus',()=> '');const headlights=useState('headlights',()=>true);const taillights=useState('taillights',()=>true)
 function select(id:string){const v=id==='458'?previewVehicle:vehicles.find(v=>v.id===id);if(v){car.value=v;paint.value=v.color;doors.value=false;interior.value=false}}
 return {car,paint,wheels,brakes,doors,interior,lighting,quality,sound,volume,engine,motion,shadows,language,upholstery,background,environment,detail,focus,headlights,taillights,select}
}
