import * as T from 'three'

/**
 * Live Mercedes-AMG instrument cluster. The model's cluster screen ('AMG cluster screen', a flat quad, drawn by
 * scratchpad sc-screens3.mjs as tools/source-assets/cars/amg-cabin-cluster.png) carries painted needles at rest; on the
 * site its picture is swapped for the same layout without the needles and the dials' centre readouts
 * (/textures/amg-cluster-live.webp), and those are drawn live on top of the glass: two needles that turn with the
 * speed (0-320 km/h) and the revs (0-8000 rpm), the speed in km/h in the left dial's centre and the gear in the right's.
 * Layout in the picture's pixels (2048 x 663 logical): dials at 20 % and 80 % of the width, half height, radius 44.5 %
 * of the height, scales from 0.78 pi to 2.22 pi (canvas angles, y down).
 */
const W=2048,H=663,R=H*.445,CY=H*.5,A0=Math.PI*.78,A1=Math.PI*2.22
const DIALS=[{cx:W*.2,max:320},{cx:W*.8,max:8000}]
const FONT='"Segoe UI","Segoe UI Variable",Arial,sans-serif'

export function installAmgInstruments(root:T.Group){
 let screen:T.Mesh|undefined
 root.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)&&o.material.name==='AMG cluster screen')screen=o})
 if(!screen||typeof document==='undefined')return {updateInstruments(_speed:number,_rpm:number,_gear:number,_inView=true){},dispose(){}}
 const material=screen.material as T.MeshStandardMaterial
 // the picture without needles, once loaded (until then the painted one stays)
 const loader=new T.TextureLoader()
 loader.load('/textures/amg-cluster-live.webp?v=1',texture=>{
  texture.flipY=false;texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=16
  const old=material.emissiveMap;material.emissiveMap=texture;material.needsUpdate=true;old?.dispose()
 })
 // picture pixels -> the screen's local space: bilinear over the quad's corners, found by their texture coordinates
 // (glTF: u right, v down the picture)
 const pos=screen.geometry.getAttribute('position'),uv=screen.geometry.getAttribute('uv'),corner=(u:number,v:number)=>{
  let best=0,d=Infinity
  for(let i=0;i<uv.count;i++){const e=(uv.getX(i)-u)**2+(uv.getY(i)-v)**2;if(e<d){d=e;best=i}}
  return new T.Vector3().fromBufferAttribute(pos,best)
 }
 const c00=corner(0,0),c10=corner(1,0),c01=corner(0,1),c11=corner(1,1)
 const at=(x:number,y:number)=>{const u=x/W,v=y/H;return c00.clone().multiplyScalar((1-u)*(1-v)).addScaledVector(c10,u*(1-v)).addScaledVector(c01,(1-u)*v).addScaledVector(c11,u*v)}
 const perPixel=at(W,0).distanceTo(at(0,0))/W
 const disposables:{dispose():void}[]=[]
 // a frame at a picture point: x along the picture's right, y up the picture, z out of the glass (towards the driver)
 function frameAt(x:number,y:number){
  const o=at(x,y),ux=at(x+50,y).sub(o).normalize(),uy=at(x,y-50).sub(o).normalize(),uz=new T.Vector3().crossVectors(ux,uy).normalize()
  const g=new T.Group();g.matrixAutoUpdate=false;g.matrix.makeBasis(ux,uy,uz).setPosition(o.addScaledVector(uz,.0008));screen!.add(g);return g
 }
 // needle: tapered red blade with a glow and the dark hub, its pivot at the picture's dial centre
 const needleCanvas=document.createElement('canvas');needleCanvas.width=1024;needleCanvas.height=160
 {const g=needleCanvas.getContext('2d')!,len=R*1.02,sx=1024/len,mid=80,piv=R*.14*sx
  g.translate(piv,mid);g.shadowColor='rgba(255,40,30,.95)';g.shadowBlur=26
  const grad=g.createLinearGradient(-R*.12*sx,0,R*.87*sx,0);grad.addColorStop(0,'#7a0e0c');grad.addColorStop(.35,'#ff2b22');grad.addColorStop(1,'#ff7062');g.fillStyle=grad
  g.beginPath();g.moveTo(-R*.12*sx,-10*sx);g.lineTo(R*.87*sx,-3*sx);g.lineTo(R*.87*sx,3*sx);g.lineTo(-R*.12*sx,10*sx);g.closePath();g.fill()
  g.shadowBlur=0;const hub=g.createRadialGradient(-8*sx,-8*sx,2,0,0,R*.13*sx);hub.addColorStop(0,'#46505a');hub.addColorStop(1,'#0b0e11');g.fillStyle=hub
  g.beginPath();g.arc(0,0,R*.12*sx,0,Math.PI*2);g.fill();g.strokeStyle='#6a737d';g.lineWidth=2.5*sx;g.stroke()}
 const needleMap=new T.CanvasTexture(needleCanvas);needleMap.colorSpace=T.SRGBColorSpace;needleMap.anisotropy=16
 const needleMaterial=new T.MeshBasicMaterial({map:needleMap,color:new T.Color(.9,.9,.9),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})
 const needleLength=R*1.02*perPixel,needleWidth=needleLength*160/1024
 const needleGeometry=new T.PlaneGeometry(needleLength,needleWidth);needleGeometry.translate(needleLength/2-R*.14*perPixel,0,0)
 disposables.push(needleMap,needleMaterial,needleGeometry)
 const needles=DIALS.map(d=>{const frame=frameAt(d.cx,CY),pivot=new T.Group();frame.add(pivot);const mesh=new T.Mesh(needleGeometry,needleMaterial);mesh.name='AMG cluster needle';mesh.renderOrder=2;pivot.add(mesh);return {pivot,max:d.max}})
 // centre readouts: a small transparent canvas each, redrawn when the value changes
 const readouts=DIALS.map(d=>{
  const c=document.createElement('canvas');c.width=512;c.height=224;const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace
  const m=new T.MeshBasicMaterial({map,color:new T.Color(.9,.9,.9),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})
  const w=R*1.1*perPixel,h=w*224/512,geometry=new T.PlaneGeometry(w,h),mesh=new T.Mesh(geometry,m);mesh.renderOrder=2;mesh.name='AMG cluster readout'
  frameAt(d.cx,CY+R*.38).add(mesh);disposables.push(map,m,geometry)
  return {c:c.getContext('2d')!,map,text:''}
 })
 function write(i:number,text:string){
  const r=readouts[i]!;if(r.text===text)return;r.text=text
  r.c.clearRect(0,0,512,224);r.c.fillStyle='#ffffff';r.c.textAlign='center';r.c.textBaseline='middle';r.c.font=`300 ${Math.round(224*.82)}px ${FONT}`;r.c.fillText(text,256,118);r.map.needsUpdate=true
 }
 const angle=(value:number,max:number)=>{const a=A0+(A1-A0)*T.MathUtils.clamp(value/max,0,1);return -a}
 let lastText=0
 function updateInstruments(speed:number,rpm:number,gear:number,inView=true){
  const kmh=Math.abs(speed)*3.6
  needles[0]!.pivot.rotation.z=angle(kmh,320);needles[1]!.pivot.rotation.z=angle(rpm,8000)
  // the readouts' canvases are re-uploaded at most ten times a second, and only while the cabin is in view
  const now=performance.now();if(!inView||now-lastText<100)return;lastText=now
  write(0,String(Math.round(kmh)));write(1,gear>0?String(gear):gear<0?'R':'N')
 }
 updateInstruments(0,800,0)
 function dispose(){for(const d of disposables)d.dispose()}
 return {updateInstruments,dispose}
}
