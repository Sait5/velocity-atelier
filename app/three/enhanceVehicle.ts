import * as T from 'three'
import {addCockpitDetails} from './cockpitDetails'
export function enhanceVehicle(root:T.Group,wheels:T.Group[],rim:T.MeshStandardMaterial,leather:T.MeshStandardMaterial){
 const grainCanvas=document.createElement('canvas');grainCanvas.width=grainCanvas.height=128;const ctx=grainCanvas.getContext('2d')!;const pixels=ctx.createImageData(128,128);for(let i=0;i<pixels.data.length;i+=4){const g=115+Math.round(Math.sin(i*12.9898)*18);pixels.data.set([g,g,g,255],i)}ctx.putImageData(pixels,0,0);const grain=new T.CanvasTexture(grainCanvas);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(10,10);leather.bumpMap=grain;leather.bumpScale=.0018
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
 const holeMaterial=new T.MeshStandardMaterial({color:'#080a09',roughness:1,metalness:0}),holeGeometry=new T.CircleGeometry(.006,8),boltGeometry=new T.CylinderGeometry(.009,.009,.015,12),lipGeometry=new T.RingGeometry(.293,.299,72)
 for(const wheel of wheels){const side=wheel.position.x<0?-1:1
  const lip=new T.Mesh(lipGeometry,rim);lip.rotation.y=Math.PI/2;lip.position.x=side*.13;wheel.add(lip)
  const holes=new T.InstancedMesh(holeGeometry,holeMaterial,32),bolts=new T.InstancedMesh(boltGeometry,alloy,5);const rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),side*Math.PI/2)
  for(let i=0;i<32;i++){const angle=i*Math.PI/16;holes.setMatrixAt(i,new T.Matrix4().compose(new T.Vector3(side*.082,Math.cos(angle)*.217,Math.sin(angle)*.217),rotation,new T.Vector3(1,1,1)))}
  const boltRotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),Math.PI/2)
  for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;bolts.setMatrixAt(i,new T.Matrix4().compose(new T.Vector3(side*.135,Math.cos(angle)*.052,Math.sin(angle)*.052),boltRotation,new T.Vector3(1,1,1)))}
  const sidewallCanvas=document.createElement('canvas');sidewallCanvas.width=sidewallCanvas.height=256;const sw=sidewallCanvas.getContext('2d')!;sw.translate(128,128);sw.fillStyle='#555e56';sw.font='bold 11px Arial';sw.textAlign='center';for(const [text,start] of [['PERFORMANCE',-.8],['VELOCITY 3',2.25]] as [string,number][]){[...text].forEach((letter,i)=>{sw.save();sw.rotate(start+i*.085);sw.fillText(letter,0,-119);sw.restore()})}const sidewallTexture=new T.CanvasTexture(sidewallCanvas);sidewallTexture.colorSpace=T.SRGBColorSpace;const sidewall=new T.Mesh(new T.RingGeometry(.307,.347,96),new T.MeshStandardMaterial({map:sidewallTexture,transparent:true,roughness:.95,depthWrite:false}));sidewall.rotation.y=side*Math.PI/2;sidewall.position.x=side*.146;wheel.add(holes,bolts,sidewall)
 }
 const pedalMaterial=new T.MeshStandardMaterial({color:'#7e8680',metalness:.85,roughness:.4}),gripMaterial=new T.MeshStandardMaterial({color:'#090c0a',roughness:.9})
 for(const [z,height,width] of [[.22,.14,.045],[.33,.09,.08],[.46,.16,.075]] as [number,number,number][]){const pedal=new T.Mesh(new T.BoxGeometry(.022,height,width),pedalMaterial);pedal.position.set(-.59,.22,z);pedal.rotation.z=.18;pedal.name='pedal';root.add(pedal);for(let i=0;i<4;i++){const grip=new T.Mesh(new T.BoxGeometry(.008,.006,width*.7),gripMaterial);grip.position.set(-.014,-height/2+.025+i*height/5,0);pedal.add(grip)}}
 addCockpitDetails(root)
 // Preserve and refine the model's actual cockpit; do not add fake dashboard screens.
 const displayLight=new T.PointLight('#d9dfbf',.16,1.6);displayLight.position.set(-.45,.92,.32);root.add(displayLight)
 const used=new Set<T.Material>();root.traverse(o=>{if(o instanceof T.Mesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>used.add(m))});materials.forEach(m=>{if(!used.has(m))m.dispose()})
}
