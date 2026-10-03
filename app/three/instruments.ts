import * as T from 'three'

/** Crisp, animated instruments fitted to the native Italia binnacle. */
export function installInstruments(root:T.Group){
 if(typeof document==='undefined')return {updateInstruments(_speed:number,_rpm:number,_gear:number){}}
 root.traverse(o=>{if(/interior_digital_gauge|interior_gauge_emissive|tach_(min|mid|max)_gauge/.test(o.name))o.visible=false})
 const group=new T.Group();group.name='Italia live instruments';group.position.set(-.659,.7887,.346);group.rotation.y=Math.PI/2;group.rotateOnWorldAxis(new T.Vector3(0,0,1),.18);root.add(group)
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const c=canvas.getContext('2d')!
 const face=c.createRadialGradient(470,430,80,512,512,510);face.addColorStop(0,'#ffdc51');face.addColorStop(.82,'#edbc29');face.addColorStop(1,'#b77d0c');c.fillStyle=face;c.beginPath();c.arc(512,512,510,0,Math.PI*2);c.fill()
 const point=(a:number,r:number)=>[512+Math.cos(a)*r,512+Math.sin(a)*r]
 for(let i=0;i<=100;i++){const a=Math.PI*.75+i/100*Math.PI*1.5,p=point(a,i%10===0?385:420),q=point(a,465);c.strokeStyle=i>=85?'#c62824':'#181917';c.lineWidth=i%10===0?10:4;c.beginPath();c.moveTo(p[0]!,p[1]!);c.lineTo(q[0]!,q[1]!);c.stroke();if(i%10===0){const t=point(a,330);c.font='600 66px Arial';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#181917';c.fillText(String(i/10),t[0]!,t[1]!)}}
 c.textAlign='center';c.fillStyle='#181917';c.font='italic 42px Georgia';c.fillText('Ferrari',512,360);c.font='26px Arial';c.fillText('RPM × 1000',512,650)
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8
 group.add(new T.Mesh(new T.CircleGeometry(.059,96),new T.MeshBasicMaterial({map:texture,toneMapped:false})))
 const rim=new T.Mesh(new T.TorusGeometry(.0605,.0015,12,96),new T.MeshStandardMaterial({color:'#6b6b67',metalness:.8,roughness:.25}));rim.position.z=.0004;group.add(rim)
 const indexGeometry=new T.BoxGeometry(.0008,.003,.0006),indexMaterial=new T.MeshStandardMaterial({color:'#242820',roughness:.4,metalness:.15})
 for(let i=0;i<=50;i++){const a=Math.PI*.75+i/50*Math.PI*1.5,index=new T.Mesh(indexGeometry,indexMaterial);index.position.set(Math.cos(a)*.053,-Math.sin(a)*.053,.0008);index.rotation.z=-a-Math.PI/2;if(i%5===0)index.scale.set(1.4,1.4,1);group.add(index)}
 const pivot=new T.Group();pivot.position.z=.0015;group.add(pivot)
 const needle=new T.Mesh(new T.BoxGeometry(.0018,.047,.0006),new T.MeshBasicMaterial({color:'#d52e20',toneMapped:false}));needle.position.y=.020;pivot.add(needle)
 const hub=new T.Mesh(new T.CircleGeometry(.005,32),new T.MeshBasicMaterial({color:'#202320'}));hub.position.z=.002;group.add(hub)
 const rounded=(w:number,h:number,r:number)=>{const shape=new T.Shape(),x=-w/2,y=-h/2;shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);return shape};const shell=rounded(.092,.091,.004);shell.holes.push(new T.Path(rounded(.085,.083,.002).getPoints()));const bezelGeometry=new T.ExtrudeGeometry(shell,{depth:.003,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.0005,bevelThickness:.0005}),bezelMaterial=new T.MeshStandardMaterial({color:'#282e30',roughness:.28,metalness:.65});
 const screens=[-.112,.112].map(x=>{const bezel=new T.Mesh(bezelGeometry,bezelMaterial);bezel.position.set(x,-.010,-.003);group.add(bezel);const el=document.createElement('canvas');el.width=el.height=1024;const map=new T.CanvasTexture(el);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;const mesh=new T.Mesh(new T.PlaneGeometry(.085,.083),new T.MeshBasicMaterial({map,toneMapped:false}));mesh.position.set(x,-.010,-.001);group.add(mesh);return {c:el.getContext('2d')!,map}})
 let previous=''
 function updateInstruments(speed:number,rpm:number,gear:number){
  pivot.rotation.z=-(Math.PI*.75+Math.min(10000,Math.max(0,rpm))/10000*Math.PI*1.5)-Math.PI/2
  const kph=Math.round(Math.abs(speed)*3.6),rev=Math.round(rpm/100)*100,key=`${kph}/${rev}/${gear}`;if(key===previous)return;previous=key
  screens.forEach(({c,map},i)=>{
   const bg=c.createLinearGradient(0,0,0,1024);bg.addColorStop(0,'#17282f');bg.addColorStop(1,'#03090d');c.fillStyle=bg;c.fillRect(0,0,1024,1024)
   c.strokeStyle='#314752';c.lineWidth=3;c.strokeRect(24,24,976,976);c.fillStyle='#aec1ca';c.textAlign='left';c.font='500 50px Arial';c.fillText(i?'VELOCITY':'ENGINE RPM',64,108)
   c.strokeStyle='#58717c';c.beginPath();c.moveTo(64,144);c.lineTo(960,144);c.stroke()
   for(let n=0;n<12;n++){c.fillStyle=n<rpm/750?(n>9?'#ff4b32':n>7?'#ffcb55':'#dbefdb'):'#22323a';c.fillRect(66+n*75,181,52,22)}
   c.textAlign='center';c.fillStyle='#f0f5ee';c.font=i?'600 235px Arial':'500 192px Arial';c.fillText(i?String(kph).padStart(3,'0'):String(rev),512,515)
   c.fillStyle='#a8bcc3';c.font='50px Arial';c.fillText(i?'km/h':'rpm',512,599)
   c.strokeStyle='#253943';c.beginPath();c.moveTo(64,656);c.lineTo(960,656);c.stroke()
   if(i){c.textAlign='left';c.fillStyle='#a8bcc3';c.font='48px Arial';c.fillText('GEAR',72,810);c.textAlign='right';c.fillStyle='#f6ce45';c.font='600 130px Arial';c.fillText(String(gear||'N'),925,853)}else{c.fillStyle='#4a5e66';for(let n=0;n<24;n++)c.fillRect(70+n*37,745,24,92);c.fillStyle='#dabd5e';for(let n=0;n<Math.min(24,Math.round(rpm/9000*24));n++)c.fillRect(70+n*37,745,24,92)}
   c.fillStyle='#71888f';c.textAlign='center';c.font='32px Arial';c.fillText('458  /  ITALIA',512,941);map.needsUpdate=true
  })
 }
 updateInstruments(0,900,0)
 return {updateInstruments}
}
