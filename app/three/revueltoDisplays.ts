import * as T from 'three'

/** Draw on the original display surfaces, retaining their fit and bezels. */
export function installRevueltoDisplays(source:T.Group){
 if(typeof document==='undefined')return {updateInstruments(_speed:number,_rpm:number,_gear:number){}}
 function display(name:string,width:number,height:number){
  const mesh=source.getObjectByName(name) as T.Mesh|undefined
  if(!mesh)return
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
  const context=canvas.getContext('2d')!;const texture=new T.CanvasTexture(canvas)
  texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;texture.generateMipmaps=false;texture.minFilter=T.LinearFilter
  const geometry=mesh.geometry.clone();geometry.computeBoundingBox();const bounds=geometry.boundingBox!,positions=geometry.getAttribute('position'),uv=new Float32Array(positions.count*2)
  for(let i=0;i<positions.count;i++){uv[i*2]=(bounds.max.x-positions.getX(i))/(bounds.max.x-bounds.min.x);uv[i*2+1]=(positions.getY(i)-bounds.min.y)/(bounds.max.y-bounds.min.y)}
  geometry.setAttribute('uv',new T.BufferAttribute(uv,2));mesh.geometry=geometry
  mesh.material=new T.MeshBasicMaterial({name:'Revuelto live display '+name,map:texture,toneMapped:false,side:T.DoubleSide});mesh.castShadow=false;mesh.receiveShadow=false
  return {c:context,map:texture,width,height}
 }
 const cluster=display('GaugeCluster_Screen',1536,540),passenger=display('DashPad_Screen',1536,368),navigation=display('Nav_label_Screen',768,1024)
 function base(d:NonNullable<typeof cluster>){const {c,width:w,height:h}=d;const background=c.createLinearGradient(0,0,0,h);background.addColorStop(0,'#162029');background.addColorStop(1,'#060b10');c.fillStyle=background;c.fillRect(0,0,w,h);c.strokeStyle='#4e5e68';c.lineWidth=2;c.strokeRect(10,10,w-20,h-20);c.textAlign='left';c.textBaseline='alphabetic'}
 if(passenger){base(passenger);const {c,map}=passenger;c.fillStyle='#edf2f4';c.font='italic 72px Georgia';c.fillText('Lamborghini',70,130);c.fillStyle='#ff9a32';c.font='500 29px Arial';c.fillText('REVUELTO  /  V12 HYBRID',74,192);c.fillStyle='#899ca7';c.font='24px Arial';c.fillText('POWER',840,84);c.fillText('BATTERY',1160,84);c.fillStyle='#edf2f4';c.font='62px Arial';c.fillText('1,015',840,167);c.fillText('96%',1160,167);c.fillStyle='#899ca7';c.font='22px Arial';c.fillText('CV / COMBINED',840,207);c.fillText('HYBRID SYSTEM',1160,207);c.fillStyle='#ff9a32';c.fillRect(74,278,1388,3);map.needsUpdate=true}
 if(navigation){base(navigation);const {c,map}=navigation;c.fillStyle='#edf2f4';c.font='38px Arial';c.fillText('NAVIGATION',48,82);c.fillStyle='#263940';c.fillRect(30,123,708,545);c.strokeStyle='#68818a';c.lineWidth=9;for(let i=0;i<8;i++){c.beginPath();c.moveTo(i*150-220,650);c.lineTo(i*150+70,130);c.stroke();c.beginPath();c.moveTo(32,i*80+150);c.lineTo(736,i*80+65);c.stroke()}c.strokeStyle='#ff9a32';c.lineWidth=18;c.beginPath();c.moveTo(380,568);c.lineTo(380,400);c.lineTo(495,340);c.lineTo(495,190);c.stroke();c.fillStyle='#edf2f4';c.beginPath();c.moveTo(380,530);c.lineTo(351,582);c.lineTo(409,582);c.closePath();c.fill();c.fillStyle='#ff9a32';c.font='29px Arial';c.fillText('↑  250 m',50,723);c.fillStyle='#edf2f4';c.font='32px Arial';c.fillText('Continue straight',50,774);c.strokeStyle='#344752';c.lineWidth=2;c.beginPath();c.moveTo(42,827);c.lineTo(726,827);c.stroke();c.fillStyle='#a9b9c3';c.font='25px Arial';c.fillText('CLIMATE  /  AUTO',50,881);c.fillStyle='#edf2f4';c.font='58px Arial';c.fillText('22°',50,962);c.fillText('22°',575,962);c.fillStyle='#66bdd2';c.font='30px Arial';c.fillText('A/C',331,956);map.needsUpdate=true}
 let previous='',lastUpdate=0
 function updateInstruments(speed:number,rpm:number,gear:number){
  if(!cluster)return;const kph=Math.round(Math.abs(speed)*3.6),revs=Math.round(rpm/100)*100,key=`${kph}/${revs}/${gear}`,now=performance.now()
  if(key===previous||(previous&&now-lastUpdate<100))return;previous=key;lastUpdate=now
  base(cluster);const {c,map}=cluster
  c.fillStyle='#95a7b3';c.font='24px Arial';c.fillText('REVUELTO',50,58);c.fillText('V12 HYBRID',1190,58);c.fillStyle='#ff9a32';c.font='28px Arial';c.fillText('STRADA',650,58)
  for(let i=0;i<90;i++){c.fillStyle=i<rpm/9000*90?(i>75?'#ed5a3c':'#ff9a32'):'#293640';c.fillRect(70+i*15.6,98,11,i%10===0?47:34)}
  c.font='23px Arial';c.fillStyle='#a5b7c3';for(let i=0;i<=9;i++)c.fillText(String(i),65+i*156,178)
  c.fillStyle='#edf3f6';c.font='200px Arial';c.fillText(String(kph).padStart(3,'0'),380,395);c.font='31px Arial';c.fillStyle='#a5b7c3';c.fillText('km/h',785,390)
  c.fillStyle='#293a43';c.fillRect(1020,208,175,198);c.fillStyle='#ff9a32';c.font='125px Arial';c.fillText(String(gear||'N'),1067,345);c.font='23px Arial';c.fillStyle='#a5b7c3';c.fillText('GEAR',1070,386)
  c.font='23px Arial';c.fillText('RPM',70,266);c.fillText('BATTERY',1280,266);c.fillStyle='#edf3f6';c.font='52px Arial';c.fillText(String(revs),70,327);c.fillText('96%',1280,327)
  c.strokeStyle='#344752';c.lineWidth=2;c.beginPath();c.moveTo(55,448);c.lineTo(1481,448);c.stroke();c.font='24px Arial';c.fillStyle='#9cb0bc';c.fillText('OIL  92°C',65,496);c.fillText('WATER  88°C',400,496);c.fillText('RANGE  420 km',790,496);c.fillStyle='#8acfad';c.fillText('SYSTEM READY',1200,496);map.needsUpdate=true
 }
 updateInstruments(0,900,0)
 return {updateInstruments}
}
