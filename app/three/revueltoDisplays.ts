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
  // Recreate the production HMI's staggered hexagonal launcher, rather than a map.
  c.fillStyle='#06090c';c.fillRect(0,0,768,1024)
  const hex=(x:number,y:number,r:number)=>{c.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r)}c.closePath()}
  c.strokeStyle='#17212a';c.lineWidth=1
  for(let y=0;y<1024;y+=42)for(let x=0;x<768;x+=48){hex(x+(Math.floor(y/42)%2)*24,y,27);c.stroke()}
  c.fillStyle='#eff3f4';c.font='26px Arial';c.fillText('AUTO   22°   A/C',35,50);c.textAlign='right';c.fillText('22°    ▰',730,50);c.textAlign='center'
  c.strokeStyle='#aab9c5';c.lineWidth=2;c.beginPath();c.moveTo(24,84);c.lineTo(744,84);c.stroke()
  const carPicture=new Image();carPicture.onload=()=>{c.drawImage(carPicture,144,105,480,227);map.needsUpdate=true};carPicture.src='/images/garage/revuelto.png'
  c.fillStyle='#eff3f4';c.font='25px Arial';c.fillText('VEHICLE',384,357)
  function tile(x:number,y:number,label:string,icon:string,active=false){
   hex(x,y,142);c.fillStyle=active?'#15222a':'#080e14';c.fill();c.strokeStyle=active?'#c3d3df':'#586b7c';c.lineWidth=2;c.stroke()
   hex(x,y,133);c.strokeStyle='#243746';c.lineWidth=1;c.stroke()
   c.save();c.translate(x,y-23);c.strokeStyle='#dce8f0';c.lineWidth=4;c.lineCap='round';c.beginPath()
   if(icon==='music'){c.moveTo(-15,-27);c.lineTo(33,-36);c.lineTo(33,24);c.moveTo(-15,-27);c.lineTo(-15,36);c.moveTo(-15,30);c.ellipse(-28,36,13,9,0,0,Math.PI*2);c.moveTo(33,18);c.ellipse(20,24,13,9,0,0,Math.PI*2)}
   if(icon==='phone'){c.roundRect(-24,-40,48,78,6);c.moveTo(-8,27);c.lineTo(8,27)}
   if(icon==='settings'){for(let i=0;i<8;i++){const a=i*Math.PI/4;c.moveTo(Math.cos(a)*30,Math.sin(a)*30);c.lineTo(Math.cos(a)*42,Math.sin(a)*42)}c.moveTo(31,0);c.arc(0,0,31,0,Math.PI*2);c.moveTo(12,0);c.arc(0,0,12,0,Math.PI*2)}
   if(icon==='connect'){c.arc(-13,0,22,-Math.PI*.8,Math.PI*.8);c.moveTo(29,-18);c.arc(13,0,22,Math.PI*.2,Math.PI*1.8);c.moveTo(-12,0);c.lineTo(12,0)}
   if(icon==='navigation'){c.moveTo(0,-42);c.lineTo(35,33);c.lineTo(0,18);c.lineTo(-35,33);c.closePath()}
   if(icon==='radio'){c.roundRect(-43,-24,86,55,5);c.moveTo(-32,-24);c.lineTo(23,-43);c.moveTo(-27,-8);c.lineTo(10,-8);c.moveTo(-27,5);c.lineTo(10,5);c.moveTo(33,8);c.arc(24,8,9,0,Math.PI*2)}
   c.stroke();c.restore();c.fillStyle='#edf3f6';c.font='23px Arial';c.fillText(label,x,y+71)
  }
  tile(384,529,'MEDIA','music',true);tile(167,403,'SETTINGS','settings');tile(601,403,'PHONE APP','phone');tile(167,655,'CONNECT','connect');tile(601,655,'NAVIGATION','navigation');tile(384,781,'RADIO','radio')
  c.strokeStyle='#3d5668';c.beginPath();c.moveTo(24,932);c.lineTo(744,932);c.stroke();c.font='25px Arial';c.fillStyle='#b8c9d4';c.fillText('⌂',80,988);c.fillText('STRADA',384,988);c.fillText('VOL  18',654,988);map.needsUpdate=true
 }
 let previous='',lastUpdate=0
 function updateInstruments(speed:number,rpm:number,gear:number){
  if(!cluster)return;const kph=Math.round(Math.abs(speed)*3.6),revs=Math.round(rpm/100)*100,key=`${kph}/${revs}/${gear}`,now=performance.now()
  if(key===previous||(previous&&now-lastUpdate<100))return;previous=key;lastUpdate=now
  base(cluster);const {c,map}=cluster
  // Circular production tachometer, angular Y braces and outlined central gear.
  const cx=768,cy=258,r=202
  c.textAlign='center';c.fillStyle='#c9d6df';c.font='22px Arial';c.fillText('24°C',cx-154,37);c.fillText('12:08',cx+154,37)
  c.strokeStyle='#4d6b83';c.lineWidth=3
  for(const side of [-1,1]){c.beginPath();c.moveTo(cx+side*165,36);c.lineTo(cx+side*282,150);c.lineTo(cx+side*282,346);c.lineTo(cx+side*165,474);c.stroke();c.beginPath();c.moveTo(cx+side*278,258);c.lineTo(cx+side*360,220);c.lineTo(cx+side*458,220);c.stroke()}
  const halo=c.createRadialGradient(cx,cy,60,cx,cy,r);halo.addColorStop(0,'#080d13');halo.addColorStop(.85,'#0a151f');halo.addColorStop(1,'#1b3042');c.fillStyle=halo;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill()
  const angle=(v:number)=>Math.PI/2+v/10*Math.PI*1.5
  c.strokeStyle='#6c879c';c.lineWidth=2;c.beginPath();c.arc(cx,cy,r-2,angle(0),angle(10));c.stroke()
  c.strokeStyle='#e9493b';c.lineWidth=8;c.beginPath();c.arc(cx,cy,r-8,angle(8.8),angle(10));c.stroke()
  for(let i=0;i<=100;i++){
   const a=angle(i/10),major=i%10===0,mid=i%5===0,inner=r-(major?28:mid?20:13)
   c.strokeStyle=i>=88?'#fb7066':major?'#eff6fa':'#7294ae';c.lineWidth=major?4:2;c.beginPath();c.moveTo(cx+Math.cos(a)*inner,cy+Math.sin(a)*inner);c.lineTo(cx+Math.cos(a)*(r-12),cy+Math.sin(a)*(r-12));c.stroke()
   if(major){c.fillStyle=i>=90?'#ed7067':'#ebf2f7';c.font='italic 27px Arial';c.textBaseline='middle';c.fillText(String(i/10),cx+Math.cos(a)*(r-48),cy+Math.sin(a)*(r-48))}
  }
  c.textBaseline='alphabetic';c.font='17px Arial';c.fillStyle='#8eaabc';c.fillText('RPM × 1000',cx,147)
  const needle=angle(Math.min(10,rpm/1000));c.strokeStyle='#ff5b45';c.lineWidth=4;c.beginPath();c.moveTo(cx+Math.cos(needle)*119,cy+Math.sin(needle)*119);c.lineTo(cx+Math.cos(needle)*(r-32),cy+Math.sin(needle)*(r-32));c.stroke()
  c.font='italic 112px Arial';c.strokeStyle='#f3f6fa';c.lineWidth=2;c.strokeText(speed<-.1?'R':kph===0?'P':String(gear||'N'),cx,287)
  c.fillStyle='#f4f7fa';c.font='54px Arial';c.fillText(String(kph),cx,350);c.font='17px Arial';c.fillStyle='#9cb1c2';c.fillText('km/h',cx,378)
  c.textAlign='left';c.fillStyle='#a6b6c4';c.font='22px Arial';c.fillText('MEDIA',180,113);c.font='19px Arial';c.fillText('Lamborghini',180,154);c.fillText('V12 · HYBRID',180,187)
  // Battery and fuel columns, with a top view chassis widget on the right.
  for(const [x,label,value,color] of [[72,'96%',.96,'#86cab0'],[1432,'F',.78,'#c9d9e6']] as const){c.fillStyle='#1a2a37';c.fillRect(x,166,12,235);c.fillStyle=color;c.fillRect(x,166+235*(1-value),12,235*value);c.font='18px Arial';c.fillText(label,x-7,140)}
  c.save();c.translate(1200,272);c.strokeStyle='#98afc0';c.lineWidth=3;c.beginPath();c.moveTo(-35,-82);c.lineTo(35,-82);c.lineTo(46,-42);c.lineTo(46,78);c.lineTo(31,98);c.lineTo(-31,98);c.lineTo(-46,78);c.lineTo(-46,-42);c.closePath();c.stroke();c.strokeStyle='#4d6b80';c.strokeRect(-28,-33,56,89);c.fillStyle='#e4d584';for(const x of [-58,48])for(const y of [-60,54])c.fillRect(x,y,10,31);c.restore()
  c.textAlign='center';c.fillStyle='#a7bac8';c.font='19px Arial';c.fillText('TYRE STATUS',1200,115);c.font='18px Arial';c.fillText('2.4 bar    2.4 bar',1200,421)
  c.strokeStyle='#294354';c.lineWidth=2;c.beginPath();c.moveTo(80,460);c.lineTo(540,460);c.moveTo(996,460);c.lineTo(1456,460);c.stroke()
  c.fillStyle='#adbfcc';c.font='21px Arial';c.fillText('420 km  RANGE',280,503);c.fillText('ODO  00458 km',1230,503)
  c.fillStyle='#edf3f6';c.font='24px Arial';c.fillText('STRADA',665,500);c.fillStyle='#96cdb2';c.fillText('HYBRID',884,500);c.textAlign='left';map.needsUpdate=true
 }
 updateInstruments(0,900,0)
 return {updateInstruments}
}
