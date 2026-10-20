import * as T from 'three'

/**
 * Rear plates, drawn on a canvas: an Italian EU plate on the Ferrari (blue bands, "I", white field, the model as the
 * registration) and US-size show plates (maker above, model in large condensed type, home town below) on the others.
 * The Porsche and Bugatti carry their own plate meshes with plate UVs, the Revuelto's plate base gets planar UVs, and the
 * Ferrari, which has none, gets a plate on the flat of its rear bumper, found by probing the body from behind.
 */
type Plate={kind:'eu'|'show',country?:'I'|'D',top?:string,main:string,bottom?:string}
const plates:Record<number,Plate>={6:{kind:'eu',country:'D',main:'S·GT 63'},8:{kind:'eu',country:'I',main:'458 ITALIA'},1:{kind:'eu',country:'D',main:'S·GT 911'},3:{kind:'show',top:'BUGATTI',main:'TOURBILLON',bottom:'MOLSHEIM'},0:{kind:'show',top:'LAMBORGHINI',main:'REVUELTO',bottom:"SANT'AGATA"}}

function plateTexture(plate:Plate){
 const canvas=document.createElement('canvas'),eu=plate.kind==='eu'
 canvas.width=eu?1560:1024;canvas.height=eu?330:512
 const c=canvas.getContext('2d')!,w=canvas.width,h=canvas.height
 const font='"Barlow Condensed","Arial Narrow",Arial,sans-serif'
 const draw=()=>{
  c.clearRect(0,0,w,h)
  const round=(x:number,y:number,rw:number,rh:number,r:number)=>{c.beginPath();c.moveTo(x+r,y);c.arcTo(x+rw,y,x+rw,y+rh,r);c.arcTo(x+rw,y+rh,x,y+rh,r);c.arcTo(x,y+rh,x,y,r);c.arcTo(x,y,x+rw,y,r);c.closePath()}
  round(4,4,w-8,h-8,eu?26:40);c.fillStyle='#f7f7f2';c.fill();c.lineWidth=eu?10:14;c.strokeStyle='#111';c.stroke()
  if(eu){
   // EU plate: blue band with the stars and the country letter on the left; Italian plates also carry a band on the right
   const band=150,italian=plate.country!=='D'
   c.save();round(12,12,band,h-24,18);c.clip();c.fillStyle='#1d3f9a';c.fillRect(12,12,band,h-24);c.restore()
   if(italian){c.save();round(w-12-band,12,band,h-24,18);c.clip();c.fillStyle='#1d3f9a';c.fillRect(w-12-band,12,band,h-24);c.restore()}
   c.fillStyle='#f4d33a';for(let k=0;k<12;k++){const a=k/12*Math.PI*2;c.beginPath();c.arc(12+band/2+Math.cos(a)*44,98+Math.sin(a)*44,8,0,Math.PI*2);c.fill()}
   c.fillStyle='#fff';c.font=`600 92px ${font}`;c.textAlign='center';c.textBaseline='middle';c.fillText(plate.country??'I',12+band/2,232)
   c.fillStyle='#111';c.font=`600 250px ${font}`;c.textAlign='center';c.textBaseline='middle'
   const text=plate.main,room=w-(italian?2*band:band)-90,scale=Math.min(1,room/c.measureText(text).width)
   c.save();c.translate(italian?w/2:(band+12+w)/2,h/2+8);c.scale(scale,1);c.fillText(text,0,0);c.restore()
  }else{
   c.fillStyle='#111';c.textAlign='center';c.textBaseline='middle'
   c.font=`600 64px ${font}`;c.fillText(plate.top??'',w/2,86)
   c.font=`700 236px ${font}`;const scale=Math.min(1,(w-110)/c.measureText(plate.main).width)
   c.save();c.translate(w/2,h/2+14);c.scale(scale,1);c.fillText(plate.main,0,0);c.restore()
   c.font=`500 48px ${font}`;c.fillStyle='#333';c.fillText(plate.bottom??'',w/2,h-70)
  }
  texture.needsUpdate=true
 }
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8
 draw();document.fonts?.load(`700 100px "Barlow Condensed"`).then(draw).catch(()=>{})
 return texture
}

export function installPlates(root:T.Object3D,shape:number){
 const plate=plates[shape];if(!plate||typeof document==='undefined')return
 const texture=plateTexture(plate)
 const material=new T.MeshStandardMaterial({name:'Velocity plate',map:texture,roughness:.36,metalness:0,envMapIntensity:.5,transparent:plate.kind==='eu',alphaTest:.5})
 root.updateMatrixWorld(true)
 // the Bugatti's plate UVs run right to left: mirror the texture there
 if(shape===3){if(shape===3){texture.wrapS=T.RepeatWrapping;texture.repeat.x=-1;texture.offset.x=1}root.traverse(o=>{if(o instanceof T.Mesh&&/ManufacturerPlate/.test(o.name)){o.material=material}});return}
 // the AMG's own plates (front and rear) are plain white panels: planar UVs across each, reading left to right from
 // the side it faces (the front one from ahead, -x; the rear one from behind, +x)
 if(shape===6){
  root.traverse(o=>{
   if(!(o instanceof T.Mesh)||(o.material as T.Material).name!=='white.007')return
   const g=o.geometry,p=g.getAttribute('position'),v=new T.Vector3(),local=new T.Matrix4().copy(root.matrixWorld).invert().multiply(o.matrixWorld)
   const points=Array.from({length:p.count},(_,i)=>v.fromBufferAttribute(p,i).applyMatrix4(local).clone()),box=new T.Box3().setFromPoints(points),front=box.max.x<0
   const uv=new Float32Array(p.count*2);points.forEach((q,i)=>{const u=(q.z-box.min.z)/(box.max.z-box.min.z);uv[i*2]=front?u:1-u;uv[i*2+1]=(q.y-box.min.y)/(box.max.y-box.min.y)})
   g.setAttribute('uv',new T.BufferAttribute(uv,2));o.material=material
  })
  return
 }
 if(shape===0){
  root.traverse(o=>{
   if(!(o instanceof T.Mesh)||o.name!=='PlateUS_PlateBase')return
   // planar UVs across the plate face, seen from behind (+x): u runs toward -z, v up
   const g=o.geometry,p=g.getAttribute('position'),v=new T.Vector3(),local=new T.Matrix4().copy(root.matrixWorld).invert().multiply(o.matrixWorld)
   const points=Array.from({length:p.count},(_,i)=>v.fromBufferAttribute(p,i).applyMatrix4(local).clone()),box=new T.Box3().setFromPoints(points)
   const uv=new Float32Array(p.count*2);points.forEach((q,i)=>{uv[i*2]=(box.max.z-q.z)/(box.max.z-box.min.z);uv[i*2+1]=(q.y-box.min.y)/(box.max.y-box.min.y)})
   g.setAttribute('uv',new T.BufferAttribute(uv,2));o.material=material
  })
  return
 }
 // Ferrari and Porsche: a 520 × 110 mm EU plate on the rear bumper (the Porsche's own plate mesh sits hidden inside its
 // recess); the bumper surface is found by probing from behind
 const raycaster=new T.Raycaster(),meshes:T.Mesh[]=[],surface=shape===8?/bumperRa_body/:/_Paint_Geo_lodA/;root.traverse(o=>{if(o instanceof T.Mesh&&surface.test(o.name))meshes.push(o)})
 const [lowY,highY]=shape===8?[.51,.61]:[.46,.56]
 const hitAt=(y:number)=>{const origin=root.localToWorld(new T.Vector3(6,y,0)),direction=new T.Vector3(-1,0,0).transformDirection(root.matrixWorld);raycaster.set(origin,direction);const hit=raycaster.intersectObjects(meshes,false)[0];return hit?root.worldToLocal(hit.point.clone()):undefined}
 const low=hitAt(lowY),high=hitAt(highY);if(!low||!high)return
 const centre=low.clone().add(high).multiplyScalar(.5),up=high.clone().sub(low).normalize(),normal=new T.Vector3(up.y,-up.x,0).normalize()
 if(normal.x<0)normal.negate()
 const mesh=new T.Mesh(new T.PlaneGeometry(.52,.11),material);mesh.name='Rear plate'
 mesh.position.copy(centre).addScaledVector(normal,.006)
 // the plane faces +z by default: turn it to face the bumper's normal, keeping its top edge along the bumper's slope
 mesh.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0,0,-1),up,normal))
 mesh.castShadow=false;mesh.receiveShadow=true;root.add(mesh)
}
