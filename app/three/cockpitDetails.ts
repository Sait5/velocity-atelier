import * as T from 'three'
export function addCockpitDetails(root:T.Group){
 function texture(draw:(ctx:CanvasRenderingContext2D)=>void){const c=document.createElement('canvas');c.width=c.height=512;draw(c.getContext('2d')!);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t}
 const gauge=texture(ctx=>{ctx.fillStyle='#dbb942';ctx.fillRect(0,0,512,512);ctx.translate(256,256);ctx.textAlign='center';ctx.textBaseline='middle';for(let i=0;i<=40;i++){const a=(-225+i*6.75)*Math.PI/180;ctx.strokeStyle=i>33?'#b72f20':'#252a22';ctx.lineWidth=i%5?3:6;ctx.beginPath();ctx.moveTo(Math.cos(a)*205,Math.sin(a)*205);ctx.lineTo(Math.cos(a)*(i%5?188:174),Math.sin(a)*(i%5?188:174));ctx.stroke();if(i%5===0){ctx.fillStyle='#222';ctx.font='bold 33px Arial';ctx.fillText(String(i/5),Math.cos(a)*148,Math.sin(a)*148)}}ctx.fillStyle='#252a22';ctx.font='20px Arial';ctx.fillText('RPM × 1000',0,60);ctx.font='bold 26px Arial';ctx.fillText('458 ITALIA',0,98);ctx.strokeStyle='#bf3623';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-128,123);ctx.stroke();ctx.fillStyle='#34382b';ctx.beginPath();ctx.arc(0,0,17,0,7);ctx.fill()})
 function face(map:T.Texture,w:number,h:number,x:number,y:number,z:number,circle=false){const m=new T.MeshBasicMaterial({map,toneMapped:false});const mesh=new T.Mesh(circle?new T.CircleGeometry(w/2,64):new T.PlaneGeometry(w,h),m);mesh.rotation.y=Math.PI/2;mesh.position.set(x,y,z);mesh.name='cockpit_detail';root.add(mesh)}
 face(gauge,.112,.112,-.664,.822,.346,true)
 for(const [z,right] of [[.195,false],[.5,true]] as const){const screen=texture(ctx=>{ctx.fillStyle='#101b1c';ctx.fillRect(0,0,512,512);ctx.fillStyle='#bbc8c2';ctx.font='24px Arial';ctx.fillText(right?'VELOCITY 3':'VEHICLE STATUS',35,58);ctx.strokeStyle='#576864';ctx.beginPath();ctx.moveTo(35,80);ctx.lineTo(477,80);ctx.stroke();if(right){ctx.fillStyle='#d8edac';ctx.font='bold 105px Arial';ctx.fillText('0',70,230);ctx.font='28px Arial';ctx.fillText('km/h',195,230);ctx.fillStyle='#b4c6bc';ctx.font='28px Arial';ctx.fillText('AUTO  ·  P',38,370)}else{for(let i=0;i<3;i++){ctx.fillStyle='#b8c7bf';ctx.font='26px Arial';ctx.fillText(['OIL    90°C','WATER  85°C','FUEL   68%'][i]!,38,150+i*100);ctx.fillStyle='#718f66';ctx.fillRect(38,170+i*100,300-i*38,9)}}});face(screen,.10,.093,-.662,.815,z)}
 const thread=new T.MeshStandardMaterial({color:'#827768',roughness:.95}),trim=new T.MeshStandardMaterial({color:'#191e1c',roughness:.65,metalness:.1})
 root.updateMatrixWorld(true);const dashboard:T.Mesh[]=[];root.traverse(o=>{if(o instanceof T.Mesh&&o.name==='leather')dashboard.push(o)});const ray=new T.Raycaster(),samples:T.Vector3[]=[];for(let i=0;i<90;i++){ray.set(new T.Vector3(-.83,1.35,-.57+i*1.14/89),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(dashboard,false).find(h=>h.point.y>.70&&h.point.y<1.1);if(hit)samples.push(hit.point.clone().addScaledVector((hit.face?.normal.clone()||new T.Vector3(0,1,0)).applyMatrix3(new T.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize(),.0008))}for(let i=0;i<samples.length-1;i+=2){const a=samples[i]!,b=samples[i+1]!;if(a.distanceTo(b)>.03)continue;const seam=new T.Mesh(new T.TubeGeometry(new T.LineCurve3(a,b),1,.00055,5,false),thread);seam.name='dashboard_stitch';root.add(seam)}
 const carbonCanvas=document.createElement('canvas');carbonCanvas.width=carbonCanvas.height=64;const ctx=carbonCanvas.getContext('2d')!;for(let y=0;y<8;y++)for(let x=0;x<8;x++){ctx.fillStyle=(x+y)%2?'#202823':'#384039';ctx.fillRect(x*8,y*8,8,8);ctx.strokeStyle='#111814';ctx.strokeRect(x*8,y*8,8,8)}const carbonTexture=new T.CanvasTexture(carbonCanvas);carbonTexture.wrapS=carbonTexture.wrapT=T.RepeatWrapping;carbonTexture.repeat.set(18,18)
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;const m=o.material as T.MeshStandardMaterial;if(/carbon/i.test(o.name)){m.map=carbonTexture;m.roughness=.5;m.needsUpdate=true}if(o.name==='interior_dark'||o.name==='plastic_gray'){o.material=trim}})
 const floorMat=new T.MeshStandardMaterial({color:'#1e2420',roughness:1});for(const z of [-.34,.35]){const mat=new T.Mesh(new T.BoxGeometry(.52,.008,.4),floorMat);mat.position.set(-.45,.20,z);root.add(mat)}
 // Bound carpet edges and console stitching are fitted to visible source surfaces.
 for(const z of [-.34,.35]){
  const corners=[[-.69,z-.18],[-.21,z-.18],[-.21,z+.18],[-.69,z+.18],[-.69,z-.18]].map(([x,dz])=>new T.Vector3(x!,.205,dz!))
  const binding=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(corners,false,'centripetal'),96,.0015,6,false),trim);binding.name='fitted_carpet_binding';root.add(binding)
 }
 const consoleMeshes:T.Mesh[]=[];root.traverse(o=>{if(o instanceof T.Mesh&&['carbon fibre','carbon_fibre_trim','leather','interior_dark','trim'].includes(o.name))consoleMeshes.push(o)})
 for(const side of [-1,1]){
  const points:T.Vector3[]=[]
  for(let i=0;i<65;i++){
   ray.set(new T.Vector3(-.36+i*.49/64,1.20,side*.066),new T.Vector3(0,-1,0))
   const hit=ray.intersectObjects(consoleMeshes,false).find(h=>h.point.y>.32&&h.point.y<.70)
   if(hit)points.push(hit.point.clone().add(new T.Vector3(0,.0007,0)))
  }
  for(let i=0;i<points.length-1;i+=2){const a=points[i]!,b=points[i+1]!;if(a.distanceTo(b)>.025)continue;const seam=new T.Mesh(new T.TubeGeometry(new T.LineCurve3(a,b),1,.00045,5,false),thread);seam.name='console_fitted_stitch';root.add(seam)}
 }
}
