import * as T from 'three'

/**
 * Live GT3 instrument cluster. The binnacle display is the model's own `dash` texture: the painted needles of the central
 * rev counter and the left speedometer and the digital speed are wiped once (needle pixels refilled from the same dial
 * a few degrees round, the speed digits from the neighbouring speaker-grille pattern), then the needles and speed are
 * drawn live into a canvas copy that replaces the dash map and emissive map.
 *
 * Measurements are in "mirror" coordinates of the 1024 px atlas: the image flipped left-right (x' = 1023 - x, y as is).
 * In that frame the dials read upside down, angles are clockwise from +x, and the cluster on the model is that image
 * turned half a revolution.
 */
const tach={x:299.5,y:772,zero:-29.5,perThousand:24,inner:122,outer:224,needle:[[410,710],[492,657]] as const}
// speedometer pivot = centre of its hub; zero and scale fitted to the 50 … 350 numerals
const speedo={x:664,y:759.5,zero:-91.5,perKph:.605,length:156,needle:[[663.6,748],[661.9,597]] as const}
const digits={x0:266,x1:329,y0:740,y1:813,centreX:297,centreY:776}

export function installPorscheInstruments(root:T.Group){
 const idle={updateInstruments(_speed:number,_rpm:number,_gear:number){}}
 if(typeof document==='undefined')return idle
 let dash:T.MeshStandardMaterial|undefined
 root.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name==='dash')dash=m as T.MeshStandardMaterial})
 const source=dash?.map?.image as CanvasImageSource&{width:number,height:number}|undefined
 if(!dash||!source?.width)return idle
 const size=source.width,k=size/1024
 const base=document.createElement('canvas');base.width=base.height=size
 const b=base.getContext('2d',{willReadFrequently:true})!;b.drawImage(source,0,0,size,size)
 const original=b.getImageData(0,0,size,size),pixels=new ImageData(new Uint8ClampedArray(original.data),size,size)
 // mirror-frame point -> pixel index helpers
 const sample=(xf:number,yf:number,channel:number)=>{const x=T.MathUtils.clamp((1023-xf)*k,0,size-1.001),y=T.MathUtils.clamp(yf*k,0,size-1.001),x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0,at=(xx:number,yy:number)=>original.data[(yy*size+xx)*4+channel]!
  return at(x0,y0)*(1-fx)*(1-fy)+at(x0+1,y0)*fx*(1-fy)+at(x0,y0+1)*(1-fx)*fy+at(x0+1,y0+1)*fx*fy}
 type Segment=readonly [readonly [number,number],readonly [number,number]]
 const distanceToSegment=(px:number,py:number,[[ax,ay],[bx,by]]:Segment)=>{const dx=bx-ax,dy=by-ay,t=T.MathUtils.clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy),0,1);return Math.hypot(px-ax-t*dx,py-ay-t*dy)}
 // Refill a painted needle with the dial turned by `turn` degrees about its centre (rings, scale ticks and the face are
 // round, so the dial a few degrees on is what lies under the needle). Near the pivot the turn grows so the sample still
 // lands clear of the needle.
 function wipeNeedle(segment:Segment,cx:number,cy:number,turn:number,halfWidth:number){
  const xs=segment.map(p=>p[0]),ys=segment.map(p=>p[1]),clear=halfWidth*2+3
  for(let yf=Math.floor(Math.min(...ys)-halfWidth-2);yf<=Math.max(...ys)+halfWidth+2;yf+=1/k)for(let xf=Math.floor(Math.min(...xs)-halfWidth-2);xf<=Math.max(...xs)+halfWidth+2;xf+=1/k){
   const d=distanceToSegment(xf,yf,segment);if(d>halfWidth+1.5)continue
   const a=Math.max(turn*Math.PI/180,clear/Math.max(1,Math.hypot(xf-cx,yf-cy))),c=Math.cos(a),s=Math.sin(a)
   const blend=T.MathUtils.clamp(halfWidth+1.5-d,0,1.5)/1.5,rx=cx+(xf-cx)*c-(yf-cy)*s,ry=cy+(xf-cx)*s+(yf-cy)*c
   const i=(Math.round(yf*k)*size+Math.round((1023-xf)*k))*4;for(let ch=0;ch<3;ch++)pixels.data[i+ch]=pixels.data[i+ch]!*(1-blend)+sample(rx,ry,ch)*blend
  }
 }
 wipeNeedle(tach.needle,tach.x,tach.y,8,5.5)
 wipeNeedle(speedo.needle,speedo.x,speedo.y,12,7)
 // Digital speed: copy the grille from beside the digits, shifted by whole grille periods (best match found by trial).
 let shift=70,best=Infinity
 for(let dx=56;dx<=84;dx++){let error=0;for(let yf=digits.y0;yf<=digits.y1;yf+=2)for(let xf=digits.x0-26;xf<digits.x0-4;xf+=2)for(let ch=0;ch<3;ch++){const e=sample(xf,yf,ch)-sample(xf+dx,yf,ch);error+=e*e}if(error<best){best=error;shift=dx}}
 for(let yf=digits.y0;yf<=digits.y1;yf+=1/k)for(let xf=digits.x0;xf<=digits.x1;xf+=1/k){
  const edge=Math.min(xf-digits.x0,digits.x1-xf,yf-digits.y0,digits.y1-yf),blend=T.MathUtils.clamp(edge/3,0,1),i=(Math.round(yf*k)*size+Math.round((1023-xf)*k))*4
  for(let ch=0;ch<3;ch++)pixels.data[i+ch]=pixels.data[i+ch]!*(1-blend)+sample(xf+shift,yf,ch)*blend
 }
 b.putImageData(pixels,0,0)
 const mirror=(c:CanvasRenderingContext2D)=>c.setTransform(-k,0,0,k,1023*k,0)
 // The zero label and major tick sat under the rev needle.
 mirror(b);{const a=(tach.zero-1)*Math.PI/180;b.save();b.translate(tach.x+Math.cos(a)*172,tach.y+Math.sin(a)*172);b.rotate(Math.PI);b.fillStyle='#f2f2ee';b.font='bold 37px Arial, Helvetica, sans-serif';b.textAlign='center';b.textBaseline='middle';b.fillText('0',0,0);b.restore()
  const z=tach.zero*Math.PI/180;b.strokeStyle='#ececea';b.lineWidth=5;b.beginPath();b.moveTo(tach.x+Math.cos(z)*206,tach.y+Math.sin(z)*206);b.lineTo(tach.x+Math.cos(z)*223,tach.y+Math.sin(z)*223);b.stroke()}
 b.setTransform(1,0,0,1,0,0)
 // keep the wiped dial on a plain (GPU) canvas: it is copied into the live canvas on every redraw
 const clean=document.createElement('canvas');clean.width=clean.height=size;clean.getContext('2d')!.drawImage(base,0,0)

 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const c=canvas.getContext('2d')!
 const texture=new T.CanvasTexture(canvas),previous=dash.map!
 texture.flipY=previous.flipY;texture.wrapS=previous.wrapS;texture.wrapT=previous.wrapT;texture.channel=previous.channel;texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=16
 const oldEmissive=dash.emissiveMap;dash.map=texture;dash.emissiveMap=texture;dash.needsUpdate=true;previous.dispose();if(oldEmissive&&oldEmissive!==previous)oldEmissive.dispose()
 function needle(cx:number,cy:number,degrees:number,from:number,to:number,width:number,colour:string){
  const a=degrees*Math.PI/180,ux=Math.cos(a),uy=Math.sin(a),nx=-uy,ny=ux
  c.beginPath();c.moveTo(cx+ux*from+nx*width/2,cy+uy*from+ny*width/2);c.lineTo(cx+ux*to+nx*width*.18,cy+uy*to+ny*width*.18);c.lineTo(cx+ux*to-nx*width*.18,cy+uy*to-ny*width*.18);c.lineTo(cx+ux*from-nx*width/2,cy+uy*from-ny*width/2);c.closePath()
  c.lineWidth=1.6;c.strokeStyle='#1d1e14';c.fillStyle=colour;c.fill();c.stroke()
 }
 let shown='',lastDraw=-1
 function updateInstruments(speed:number,rpm:number,_gear:number,inView=true){
  // the cluster texture is only redrawn and re-uploaded while the cabin is in view (from outside it is a few pixels)
  if(!inView){shown='';return}
  const kph=Math.round(Math.abs(speed)*3.6),revAngle=Math.round((tach.zero+T.MathUtils.clamp(rpm,0,10000)/1000*tach.perThousand)*4)/4,speedAngle=Math.round((speedo.zero+Math.min(350,kph)*speedo.perKph)*4)/4
  const key=kph+'/'+revAngle+'/'+speedAngle,now=performance.now();if(key===shown||(lastDraw>=0&&now-lastDraw<33))return;shown=key;lastDraw=now
  c.setTransform(1,0,0,1,0,0);c.drawImage(clean,0,0);mirror(c)
  c.shadowColor='#e9e2a066';c.shadowBlur=6*k
  needle(tach.x,tach.y,revAngle,tach.inner,tach.outer,7,'#e4dd8c')
  needle(speedo.x,speedo.y,speedAngle,-12,speedo.length,8,'#ecd457')
  c.shadowBlur=0
  const hub=c.createRadialGradient(speedo.x-4,speedo.y-4,1,speedo.x,speedo.y,16);hub.addColorStop(0,'#7b8aa0');hub.addColorStop(1,'#283040');c.fillStyle=hub;c.beginPath();c.arc(speedo.x,speedo.y,15.5,0,Math.PI*2);c.fill()
  c.save();c.translate(digits.centreX,digits.centreY);c.rotate(Math.PI);c.fillStyle='#f6f6f2';c.font='bold 84px Arial, Helvetica, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(kph),0,2);c.restore()
  c.setTransform(1,0,0,1,0,0);texture.needsUpdate=true
 }
 updateInstruments(0,0,0)
 return {updateInstruments}
}
