import * as T from 'three'

/** Crisp, animated instruments fitted to the native Italia binnacle. */
export function installInstruments(root:T.Group){
 if(typeof document==='undefined')return {updateInstruments(_speed:number,_rpm:number,_gear:number){}}
 root.traverse(o=>{if(/interior_digital_gauge|interior_gauge_emissive|tach_(min|mid|max)_gauge/.test(o.name))o.visible=false})
 const group=new T.Group();group.name='Italia live instruments';group.position.set(-.659,.7887,.346);group.rotation.y=Math.PI/2;group.rotateOnWorldAxis(new T.Vector3(0,0,1),.18);root.add(group)
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const c=canvas.getContext('2d')!
 c.fillStyle='#edb722';c.beginPath();c.arc(512,512,510,0,Math.PI*2);c.fill()
 const point=(a:number,r:number)=>[512+Math.cos(a)*r,512+Math.sin(a)*r]
 for(let i=0;i<=100;i++){const a=Math.PI*.75+i/100*Math.PI*1.5,p=point(a,i%10===0?385:420),q=point(a,465);c.strokeStyle=i>=85?'#c62824':'#181917';c.lineWidth=i%10===0?10:4;c.beginPath();c.moveTo(p[0]!,p[1]!);c.lineTo(q[0]!,q[1]!);c.stroke();if(i%10===0){const t=point(a,330);c.font='600 66px Arial';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#181917';c.fillText(String(i/10),t[0]!,t[1]!)}}
 c.textAlign='center';c.fillStyle='#181917';c.font='italic 42px Georgia';c.fillText('Ferrari',512,360);c.font='26px Arial';c.fillText('RPM × 1000',512,650)
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8
 group.add(new T.Mesh(new T.CircleGeometry(.059,96),new T.MeshBasicMaterial({map:texture,toneMapped:false})))
 const rim=new T.Mesh(new T.TorusGeometry(.0605,.0015,12,96),new T.MeshStandardMaterial({color:'#6b6b67',metalness:.8,roughness:.25}));rim.position.z=.0004;group.add(rim)
 const pivot=new T.Group();pivot.position.z=.0015;group.add(pivot)
 const needle=new T.Mesh(new T.BoxGeometry(.0018,.047,.0006),new T.MeshBasicMaterial({color:'#d52e20',toneMapped:false}));needle.position.y=.020;pivot.add(needle)
 const hub=new T.Mesh(new T.CircleGeometry(.005,32),new T.MeshBasicMaterial({color:'#202320'}));hub.position.z=.002;group.add(hub)
 const screens=[-.112,.112].map(x=>{const el=document.createElement('canvas');el.width=el.height=512;const map=new T.CanvasTexture(el);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;const mesh=new T.Mesh(new T.PlaneGeometry(.085,.083),new T.MeshBasicMaterial({map,toneMapped:false}));mesh.position.set(x,-.010,-.001);group.add(mesh);return {c:el.getContext('2d')!,map}})
 let previous=''
 function updateInstruments(speed:number,rpm:number,gear:number){
  pivot.rotation.z=-(Math.PI*.75+Math.min(10000,Math.max(0,rpm))/10000*Math.PI*1.5)-Math.PI/2
  const kph=Math.round(Math.abs(speed)*3.6),rev=Math.round(rpm/100)*100,key=`${kph}/${rev}/${gear}`;if(key===previous)return;previous=key
  screens.forEach(({c,map},i)=>{c.fillStyle='#101b22';c.fillRect(0,0,512,512);c.strokeStyle='#405967';c.lineWidth=3;c.strokeRect(20,20,472,472);c.textAlign='center';c.fillStyle='#a9c5cd';c.font='32px Arial';c.fillText(i?'SPEED':'ENGINE',256,85);c.fillStyle='#e7f4f4';c.font='600 116px Arial';c.fillText(i?String(kph).padStart(3,'0'):String(rev),256,235);c.font='28px Arial';c.fillStyle='#a9c5cd';c.fillText(i?'km/h':'rpm',256,285);c.fillStyle='#e7f4f4';c.font='48px Arial';c.fillText(i?`GEAR  ${gear||'N'}`:'458 ITALIA',256,400);map.needsUpdate=true})
 }
 updateInstruments(0,900,0)
 return {updateInstruments}
}
