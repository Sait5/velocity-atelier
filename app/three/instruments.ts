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
 const rim=new T.Mesh(new T.TorusGeometry(.061,.0025,16,128),new T.MeshStandardMaterial({color:'#151817',metalness:.35,roughness:.3}));rim.position.z=.001;group.add(rim)
 const lip=new T.Mesh(new T.TorusGeometry(.0585,.0006,8,128),new T.MeshStandardMaterial({color:'#a2a6a1',metalness:.85,roughness:.22}));lip.position.z=.002;group.add(lip)
 const cover=new T.Mesh(new T.CircleGeometry(.058,96),new T.MeshPhysicalMaterial({color:'#d5e2dc',metalness:.08,roughness:.12,transparent:true,opacity:.045,depthWrite:false,clearcoat:1}));cover.position.z=.004;group.add(cover)
 const indexGeometry=new T.BoxGeometry(.0008,.003,.0006),indexMaterial=new T.MeshStandardMaterial({color:'#242820',roughness:.4,metalness:.15})
 for(let i=0;i<=50;i++){const a=Math.PI*.75+i/50*Math.PI*1.5,index=new T.Mesh(indexGeometry,indexMaterial);index.position.set(Math.cos(a)*.053,-Math.sin(a)*.053,.0008);index.rotation.z=-a-Math.PI/2;if(i%5===0)index.scale.set(1.4,1.4,1);group.add(index)}
 const pivot=new T.Group();pivot.position.z=.0015;group.add(pivot)
 const pointerShape=new T.Shape();pointerShape.moveTo(-.0011,-.008);pointerShape.lineTo(.0011,-.008);pointerShape.lineTo(.00045,.047);pointerShape.lineTo(-.00045,.047);pointerShape.closePath()
 const needle=new T.Mesh(new T.ExtrudeGeometry(pointerShape,{depth:.0007,bevelEnabled:false}),new T.MeshBasicMaterial({color:'#e22c1a',toneMapped:false}));pivot.add(needle)
 const hub=new T.Mesh(new T.CircleGeometry(.005,32),new T.MeshBasicMaterial({color:'#202320'}));hub.position.z=.002;group.add(hub)
 const rounded=(w:number,h:number,r:number)=>{const shape=new T.Shape(),x=-w/2,y=-h/2;shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);return shape};const shell=rounded(.092,.091,.004);shell.holes.push(new T.Path(rounded(.085,.083,.002).getPoints()));const bezelGeometry=new T.ExtrudeGeometry(shell,{depth:.003,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.0005,bevelThickness:.0005}),bezelMaterial=new T.MeshStandardMaterial({color:'#282e30',roughness:.28,metalness:.65});
 const screens=[-.112,.112].map(x=>{const bezel=new T.Mesh(bezelGeometry,bezelMaterial);bezel.position.set(x,-.010,-.003);group.add(bezel);const el=document.createElement('canvas');el.width=el.height=1024;const map=new T.CanvasTexture(el);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;const mesh=new T.Mesh(new T.PlaneGeometry(.085,.083),new T.MeshBasicMaterial({map,toneMapped:false}));mesh.position.set(x,-.010,-.001);group.add(mesh);return {c:el.getContext('2d')!,map}})
 let previous='',lastDisplay=0
 function updateInstruments(speed:number,rpm:number,gear:number){
  pivot.rotation.z=-(Math.PI*.75+Math.min(10000,Math.max(0,rpm))/10000*Math.PI*1.5)-Math.PI/2
  const kph=Math.round(Math.abs(speed)*3.6),rev=Math.round(rpm/100)*100,key=`${kph}/${rev}/${gear}`,now=performance.now();if(key===previous||(previous&&now-lastDisplay<100))return;previous=key;lastDisplay=now
  screens.forEach(({c,map},i)=>{
   const bg=c.createLinearGradient(0,0,0,1024);bg.addColorStop(0,'#141a1d');bg.addColorStop(1,'#040809');c.fillStyle=bg;c.fillRect(0,0,1024,1024)
   c.fillStyle='#202b2e';c.fillRect(34,34,956,108);c.fillStyle='#cdd5d2';c.textAlign='left';c.font='500 44px Arial';c.fillText(i?'DRIVING / F1':'ENGINE / V8',66,105)
   if(i){
    c.fillStyle='#eef2e9';c.textAlign='center';c.font='300 298px Arial';c.fillText(String(gear||'N'),512,436);c.font='36px Arial';c.fillStyle='#8d9c99';c.fillText('GEAR',512,498)
    c.strokeStyle='#33413f';c.lineWidth=2;c.beginPath();c.moveTo(66,550);c.lineTo(958,550);c.stroke()
    c.textAlign='left';c.font='300 154px Arial';c.fillStyle='#f0f3e9';c.fillText(String(kph),88,737);c.textAlign='right';c.font='42px Arial';c.fillStyle='#a7b3af';c.fillText('km/h',929,737)
    for(let n=0;n<7;n++){c.fillStyle=gear===n+1?'#d9ba5c':'#28332f';c.fillRect(88+n*124,834,98,54);c.fillStyle=gear===n+1?'#131714':'#879890';c.textAlign='center';c.font='34px Arial';c.fillText(String(n+1),137+n*124,874)}
   }else{
    // A fine radial load scale complements the physical central tachometer.
    const a0=Math.PI*.8,span=Math.PI*1.4;c.lineWidth=12
    for(let n=0;n<45;n++){const a=a0+n/45*span;c.strokeStyle=n<rpm/200?(n>=40?'#d74b38':'#c2ad65'):'#26332e';c.beginPath();c.arc(512,437,236,a,a+.021);c.stroke()}
    c.textAlign='center';c.fillStyle='#eef2e9';c.font='400 128px Arial';c.fillText(String(rev),512,460);c.fillStyle='#94a69c';c.font='38px Arial';c.fillText('rpm',512,523)
    c.textAlign='left';c.fillStyle='#869b91';c.font='36px Arial';c.fillText('ENGINE SPEED',80,720)
    for(let n=0;n<24;n++){c.fillStyle=n<Math.round(rpm/9000*24)?(n>20?'#d75441':'#b9c9b7'):'#26332e';c.fillRect(82+n*36,773,24,60)}
    c.textAlign='left';c.fillStyle='#84978e';c.font='30px Arial';c.fillText('0',82,881);c.textAlign='right';c.fillText('9000',925,881)
   }
   c.fillStyle='#5e746a';c.textAlign='center';c.font='29px Arial';c.fillText('FERRARI  /  458 ITALIA',512,974);map.needsUpdate=true
  })
 }
 updateInstruments(0,900,0)
 return {updateInstruments}
}
