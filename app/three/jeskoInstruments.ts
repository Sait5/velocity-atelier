import * as T from 'three'

/**
 * Live Koenigsegg cluster: the screen on the steering wheel. Its picture (the screen atlas AttackMI_Dashboard1, drawn
 * for the project at 4096 px in the game atlas's layout: tools/source-assets/cars/jesko-hd) carries the static scales —
 * power and engine temperature on the left, boost and fuel on the right — and leaves the round dial in the middle dark.
 * The dial is drawn live on top of the glass: the revs as a ring that grows round its rim (0-8500 rpm), the speed in
 * km/h in large figures and the gear above it.
 * Atlas layout (512-px units, y down the stored picture, which the screen shows upside down): the cluster spans
 * x 108-403, y 336-500; the dial's centre is at (255.5, 418.5), radius 79.
 */
const CLUSTER={x0:108,x1:403,y0:336,y1:500},CENTRE=[255.5,418.5] as const,DIAL=79,MAX_RPM=8500
const FONT='Bahnschrift,"Segoe UI",Arial,sans-serif'

export function installJeskoInstruments(root:T.Group){
 const idle={updateInstruments(_speed:number,_rpm:number,_gear:number,_inView=true){},dispose(){}}
 if(typeof document==='undefined')return idle
 // the screen: the mesh of the screen material with texture coordinates inside the cluster's rectangle
 let screen:T.Mesh|undefined;const inside:number[]=[]
 root.traverse(o=>{
  if(screen||!(o instanceof T.Mesh)||Array.isArray(o.material)||o.material.name!=='AttackMI_Dashboard1')return
  const uv=o.geometry.getAttribute('uv');if(!uv)return
  const hits:number[]=[]
  for(let i=0;i<uv.count;i++){const x=uv.getX(i)*512,y=uv.getY(i)*512;if(x>CLUSTER.x0-2&&x<CLUSTER.x1+2&&y>CLUSTER.y0-2&&y<CLUSTER.y1+2)hits.push(i)}
  if(hits.length>=3){screen=o;inside.push(...hits)}
 })
 if(!screen)return idle
 // atlas pixels -> the screen's local space: an affine fit over the cluster's vertices (position = O + U*x + V*y)
 const pos=screen.geometry.getAttribute('position'),uv=screen.geometry.getAttribute('uv')
 const A=new T.Matrix3(),bx=new T.Vector3(),by=new T.Vector3(),bz=new T.Vector3()
 {const s=[0,0,0,0,0,0,0,0,0]
  for(const i of inside){const r=[uv.getX(i)*512,uv.getY(i)*512,1];for(let a=0;a<3;a++)for(let b=0;b<3;b++)s[a*3+b]!+=r[a]!*r[b]!
   bx.x+=r[0]!*pos.getX(i);bx.y+=r[1]!*pos.getX(i);bx.z+=r[2]!*pos.getX(i)
   by.x+=r[0]!*pos.getY(i);by.y+=r[1]!*pos.getY(i);by.z+=r[2]!*pos.getY(i)
   bz.x+=r[0]!*pos.getZ(i);bz.y+=r[1]!*pos.getZ(i);bz.z+=r[2]!*pos.getZ(i)}
  A.set(s[0]!,s[1]!,s[2]!,s[3]!,s[4]!,s[5]!,s[6]!,s[7]!,s[8]!).invert()}
 const cx=bx.clone().applyMatrix3(A),cy=by.clone().applyMatrix3(A),cz=bz.clone().applyMatrix3(A)
 const U=new T.Vector3(cx.x,cy.x,cz.x),V=new T.Vector3(cx.y,cy.y,cz.y),O=new T.Vector3(cx.z,cy.z,cz.z)
 const at=(x:number,y:number)=>O.clone().addScaledVector(U,x).addScaledVector(V,y),perPixel=U.length()
 // the dial's frame: x along the picture's right, y up the screen (the stored picture is upside down: +V), z off the glass
 const ux=U.clone().normalize(),uy=V.clone().normalize(),uz=new T.Vector3().crossVectors(ux,uy).normalize()
 const frame=new T.Group();frame.matrixAutoUpdate=false;frame.matrix.makeBasis(ux,uy,uz).setPosition(at(CENTRE[0],CENTRE[1]).addScaledVector(uz,.0006));screen.add(frame)
 const disposables:{dispose():void}[]=[]
 const overlay=(material:T.Material)=>{material.transparent=true;material.depthWrite=false;material.side=T.DoubleSide;material.polygonOffset=true;material.polygonOffsetFactor=-2;material.polygonOffsetUnits=-2;disposables.push(material);return material}
 // revs: a ring just inside the dial's rim, built as 120 segments and shown up to the current revs (draw range: no
 // texture uploads), from the 7 o'clock position clockwise to 5 o'clock
 const SEG=120,A0=Math.PI*1.25,SPAN=Math.PI*1.5,r0=DIAL*.86*perPixel,r1=DIAL*.95*perPixel
 const ring=new T.RingGeometry(r0,r1,SEG,1,A0-SPAN,SPAN);disposables.push(ring)
 // (RingGeometry runs anticlockwise from thetaStart: reorder the triangles so the draw range grows clockwise from A0)
 {const index=ring.getIndex()!,src=Array.from(index.array),out:number[]=[];for(let k=SEG-1;k>=0;k--)out.push(...src.slice(k*6,k*6+6));ring.setIndex(out)}
 const ringColours=new Float32Array(ring.getAttribute('position').count*3)
 {const p=ring.getAttribute('position'),c=new T.Color();for(let i=0;i<p.count;i++){const a=Math.atan2(p.getY(i),p.getX(i)),d=(((A0-a)%(Math.PI*2))+Math.PI*2)%(Math.PI*2),f=d/SPAN;c.setRGB(.33,.43,.95).lerp(new T.Color(1,.18,.12),T.MathUtils.smoothstep(f,.78,.9));ringColours.set([c.r,c.g,c.b],i*3)}}
 ring.setAttribute('color',new T.BufferAttribute(ringColours,3))
 const revs=new T.Mesh(ring,overlay(new T.MeshBasicMaterial({vertexColors:true,toneMapped:false})));revs.name='Jesko cluster revs';revs.renderOrder=2;frame.add(revs)
 const track=new T.Mesh(new T.RingGeometry(r0,r1,SEG,1,A0-SPAN,SPAN),overlay(new T.MeshBasicMaterial({color:'#1a2450',opacity:.55})));track.name='Jesko cluster revs track';track.renderOrder=1;track.position.z=-.0002;frame.add(track);disposables.push(track.geometry)
 // speed and gear: one small canvas, redrawn when either changes
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const g=canvas.getContext('2d')!
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;disposables.push(map)
 const size=DIAL*1.5*perPixel,plane=new T.PlaneGeometry(size,size);disposables.push(plane)
 const readout=new T.Mesh(plane,overlay(new T.MeshBasicMaterial({map,toneMapped:false})));readout.name='Jesko cluster readout';readout.renderOrder=3;readout.position.z=.0002;frame.add(readout)
 let shown=''
 function draw(kmh:number,gear:string){
  const key=kmh+'|'+gear;if(key===shown)return;shown=key
  g.clearRect(0,0,512,512);g.textAlign='center';g.textBaseline='middle'
  g.fillStyle='#ffffff';g.font=`600 ${kmh>=100?172:186}px ${FONT}`;g.fillText(String(kmh),256,262)
  g.fillStyle='rgba(205,215,255,.85)';g.font=`500 46px ${FONT}`;g.fillText('км/ч',256,372)
  g.fillStyle=gear==='R'?'#ff5a4a':'#9fb2ff';g.font=`600 70px ${FONT}`;g.fillText(gear,256,128)
  map.needsUpdate=true
 }
 let lastText=0
 function updateInstruments(speed:number,rpm:number,gear:number,inView=true){
  const f=T.MathUtils.clamp(rpm/MAX_RPM,0,1);ring.setDrawRange(0,Math.round(f*SEG)*6)
  const now=performance.now();if(!inView||now-lastText<100)return;lastText=now
  draw(Math.round(Math.abs(speed)*3.6),gear>0?String(gear):gear<0?'R':'N')
 }
 updateInstruments(0,900,0)
 return {updateInstruments,dispose(){for(const d of disposables)d.dispose()}}
}
