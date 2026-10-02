import { vehicles,previewVehicle } from '~/data/vehicles'
export function useAtelier() {
 const car = useState('car',()=>previewVehicle); const paint=useState('paint',()=>car.value.color)
 const wheels=useState('wheels',()=>0); const brakes=useState('brakes',()=> '#d9e678'); const doors=useState('doors',()=>false)
 const interior=useState('interior',()=>false); const lighting=useState('lighting',()=> 'Studio'); const quality=useState('quality',()=> 'High')
 const sound=useState('sound',()=>false); const volume=useState('volume',()=>0.2); const engine=useState('engine',()=>false)
 const motion=useState('motion',()=>true); const shadows=useState('shadows',()=>true)
 function select(id:string){const v=id==='458'?previewVehicle:vehicles.find(v=>v.id===id);if(v){car.value=v;paint.value=v.color;doors.value=false;interior.value=false}}
 return {car,paint,wheels,brakes,doors,interior,lighting,quality,sound,volume,engine,motion,shadows,select}
}
