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
 if(navigation){
  base(navigation);const {c,map}=navigation
  c.fillStyle='#edf2f4';c.font='34px Arial';c.fillText('Lamborghini',48,70)
  c.fillStyle='#82939e';c.font='22px Arial';c.fillText('VEHICLE  /  REVUELTO',48,111)
  const tiles=['VEHICLE','MEDIA','PHONE','SETTINGS']
  for(let i=0;i<4;i++){
   const x=40+(i%2)*354,y=160+Math.floor(i/2)*244
   c.fillStyle=i===0?'#28313a':'#141d25';c.fillRect(x,y,330,218)
   c.strokeStyle=i===0?'#ef9c27':'#445361';c.lineWidth=2;c.strokeRect(x,y,330,218)
   c.strokeStyle='#d7e0e5';c.lineWidth=5;c.beginPath()
   if(i===0){c.moveTo(x+72,y+96);c.lineTo(x+98,y+53);c.lineTo(x+228,y+53);c.lineTo(x+258,y+96);c.lineTo(x+258,y+129);c.lineTo(x+72,y+129);c.closePath();c.moveTo(x+101,y+96);c.lineTo(x+231,y+96)}
   if(i===1){c.moveTo(x+151,y+63);c.lineTo(x+215,y+50);c.lineTo(x+215,y+120);c.moveTo(x+151,y+63);c.lineTo(x+151,y+135);c.moveTo(x+215,y+112);c.ellipse(x+201,y+122,14,9,0,0,Math.PI*2);c.moveTo(x+151,y+127);c.ellipse(x+137,y+137,14,9,0,0,Math.PI*2)}
   if(i===2){c.rect(x+138,y+50,58,100);c.moveTo(x+153,y+130);c.lineTo(x+181,y+130)}
   if(i===3){c.arc(x+166,y+101,44,0,Math.PI*2);c.moveTo(x+184,y+101);c.arc(x+166,y+101,18,0,Math.PI*2)}
   c.stroke();c.fillStyle='#edf2f4';c.font='25px Arial';c.fillText(tiles[i]!,x+38,y+185)
  }
  c.fillStyle='#ef9c27';c.font='25px Arial';c.fillText('STRADA',48,718)
  c.fillStyle='#9bafbc';c.font='23px Arial';c.fillText('HYBRID  /  COMFORT',48,761)
  c.strokeStyle='#344752';c.beginPath();c.moveTo(42,816);c.lineTo(726,816);c.stroke()
  c.fillStyle='#a9b9c3';c.font='25px Arial';c.fillText('CLIMATE  /  AUTO',50,870)
  c.fillStyle='#edf2f4';c.font='58px Arial';c.fillText('22°',50,962);c.fillText('22°',575,962)
  c.fillStyle='#66bdd2';c.font='30px Arial';c.fillText('A/C',331,956);map.needsUpdate=true
 }
 let previous='',lastUpdate=0
 function updateInstruments(speed:number,rpm:number,gear:number){
  if(!cluster)return;const kph=Math.round(Math.abs(speed)*3.6),revs=Math.round(rpm/100)*100,key=`${kph}/${revs}/${gear}`,now=performance.now()
  if(key===previous||(previous&&now-lastUpdate<100))return;previous=key;lastUpdate=now
  base(cluster);const {c,map}=cluster
  // Angular central tachometer and gear, with speed left and hybrid data right.
  c.fillStyle='#aebdc6';c.font='24px Arial';c.fillText('REVUELTO',50,58)
  c.fillStyle='#efad35';c.font='30px Arial';c.fillText('STRADA',654,58)
  c.fillStyle='#14212b';c.beginPath();c.moveTo(616,95);c.lineTo(916,95);c.lineTo(1022,230);c.lineTo(924,424);c.lineTo(609,424);c.lineTo(511,230);c.closePath();c.fill()
  c.strokeStyle='#718594';c.lineWidth=4;c.stroke()
  for(let i=0;i<90;i++){
   const x=570+i*4.4,y=145-Math.sin(i/89*Math.PI)*38
   c.fillStyle=i<rpm/9000*90?(i>75?'#ec533d':'#efa92e'):'#33434f';c.fillRect(x,y,3,29)
  }
  c.font='22px Arial';c.fillStyle='#b4c1c9';for(let i=0;i<=9;i++)c.fillText(String(i),565+i*44,203)
  c.fillStyle='#f1f4f5';c.font='150px Arial';c.textAlign='center';c.fillText(String(gear||'N'),767,356)
  c.font='23px Arial';c.fillStyle='#9aafbd';c.fillText('RPM × 1000',767,397);c.textAlign='left'
  c.fillStyle='#f1f4f5';c.font='112px Arial';c.fillText(String(kph),80,320)
  c.fillStyle='#9aafbd';c.font='28px Arial';c.fillText('km/h',85,366)
  c.font='24px Arial';c.fillText('HYBRID',1120,151);c.fillText('BATTERY',1120,233)
  c.fillStyle='#eef3f5';c.font='56px Arial';c.fillText('96%',1120,304)
  c.fillStyle='#293f49';c.fillRect(1120,337,290,12);c.fillStyle='#78c9b1';c.fillRect(1120,337,278,12)
  c.fillStyle='#9aafbd';c.font='23px Arial';c.fillText('V12  /  '+revs+' rpm',1120,398)
  c.strokeStyle='#344752';c.lineWidth=2;c.beginPath();c.moveTo(55,448);c.lineTo(1481,448);c.stroke()
  c.font='24px Arial';c.fillStyle='#9cb0bc';c.fillText('OIL  92°C',65,496);c.fillText('WATER  88°C',400,496);c.fillText('RANGE  420 km',790,496)
  c.fillStyle='#8acfad';c.fillText('SYSTEM READY',1200,496);map.needsUpdate=true
 }
 updateInstruments(0,900,0)
 return {updateInstruments}
}
