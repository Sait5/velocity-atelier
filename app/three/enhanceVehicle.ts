import * as T from 'three'
import {rebuildCabin} from './cabin'
import {rebuildWheels} from './wheels'
import {addCockpitDetails} from './cockpitDetails'
import {addPedalBox} from './pedals'
import {leatherGrain} from './upholsteryDetail'
export function enhanceVehicle(root:T.Group,wheels:T.Group[],rim:T.MeshStandardMaterial,leather:T.MeshStandardMaterial){
 leather.bumpMap=leatherGrain();leather.bumpScale=.00065
 const rubber=new T.MeshStandardMaterial({color:'#090b0a',roughness:.96,metalness:0,envMapIntensity:.04})
 const treadCanvas=document.createElement('canvas');treadCanvas.width=256;treadCanvas.height=128;const tread=treadCanvas.getContext('2d')!;tread.fillStyle='#888';tread.fillRect(0,0,256,128);tread.strokeStyle='#303030';tread.lineWidth=4;for(let i=-2;i<18;i++){tread.beginPath();tread.moveTo(i*20,0);tread.lineTo(i*20+36,64);tread.lineTo(i*20,128);tread.stroke()}for(const y of [25,48,80,103]){tread.fillStyle='#484848';tread.fillRect(0,y,256,3)}const treadTexture=new T.CanvasTexture(treadCanvas);treadTexture.wrapS=treadTexture.wrapT=T.RepeatWrapping;treadTexture.repeat.set(4,1);rubber.bumpMap=treadTexture;rubber.bumpScale=.006
 const carbon=new T.MeshStandardMaterial({color:'#151a17',roughness:.65,metalness:.12,envMapIntensity:.25})
 const alloy=new T.MeshStandardMaterial({color:'#646d6b',metalness:.95,roughness:.36,envMapIntensity:.5})
 const rotor=new T.MeshStandardMaterial({color:'#555957',metalness:.88,roughness:.55,envMapIntensity:.35})
 const tail=new T.MeshPhysicalMaterial({color:'#a51413',emissive:'#ef281d',emissiveIntensity:1.5,roughness:.3,metalness:.05,clearcoat:1,transparent:false})
 const materials=new Set<T.Material>()
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;const original=Array.isArray(o.material)?o.material[0]!:o.material;materials.add(original)
  if(original.name==='Taillight_Glass')o.material=tail
  else if(o.name.startsWith('tire')||original.name==='Tires')o.material=rubber
  else if(o.name.startsWith('rim_'))o.material=rim
  else if(o.name.startsWith('brake'))o.material=rotor
  else if(o.name.startsWith('nuts')||o.name.startsWith('centre')||o.name==='chrome')o.material=alloy
  else if(original.name==='Leather'||original.name==='Leather_red'||o.name==='leather')o.material=leather
  else if(['Carbon_Fiber','Carpet','Interior_dark'].includes(original.name)&&!o.name.startsWith('steering_red'))o.material=carbon
 })
 const precision=rebuildWheels(root,wheels,rim);wheels.splice(0,wheels.length,...precision.wheels);rebuildCabin(root,leather)
 addPedalBox(root)
 addCockpitDetails(root)
 // Preserve and refine the model's actual cockpit; do not add fake dashboard screens.
 const displayLight=new T.PointLight('#d9dfbf',.16,1.6);displayLight.position.set(-.45,.92,.32);root.add(displayLight)
 const used=new Set<T.Material>();root.traverse(o=>{if(o instanceof T.Mesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>used.add(m))});materials.forEach(m=>{if(!used.has(m))m.dispose()})
}

