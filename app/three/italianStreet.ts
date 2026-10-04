import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'

/** Original scenery inspired by Emilia-Romagna; not a surveyed reproduction. */
export function createItalianStreet(parent:T.Group){
 const palette=['#cdb58e','#d5c7ac','#c58d70','#bdaf8d','#a75d40','#293b30','#34464a','#d4a56e']
 const materials=palette.map((color,i)=>new T.MeshStandardMaterial({color,roughness:i===6?.34:.92,metalness:i===6?.2:0,emissive:i===7?'#eab26b':'#000000',emissiveIntensity:i===7?.35:0}))
 const chunks:T.Group[]=[]
 const box=new T.BoxGeometry(1,1,1),cone=new T.ConeGeometry(1,1,8),sphere=new T.SphereGeometry(1,8,6),dummy=new T.Object3D()
 const roofShape=new T.Shape();roofShape.moveTo(-.5,0);roofShape.lineTo(0,1);roofShape.lineTo(.5,0);roofShape.closePath()
 const roof=new T.ExtrudeGeometry(roofShape,{depth:1,bevelEnabled:false});roof.translate(0,0,-.5)
 for(let c=0;c<3;c++){
  const chunk=new T.Group();chunk.name='Emilian street block '+c;parent.add(chunk);chunks.push(chunk)
  const batches=materials.map(()=>[] as T.BufferGeometry[])
  function part(geometry:T.BufferGeometry,mat:number,x:number,y:number,z:number,sx:number,sy:number,sz:number,rotation=0){dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,rotation,0);dummy.updateMatrix();batches[mat]!.push(geometry.clone().applyMatrix4(dummy.matrix))}
  // Pavements and planted verges leave the entire camera orbit around the car open.
  for(const side of [-1,1]){
   part(box,3,0,.07,side*9,80,.14,7)
   for(let i=0;i<9;i++){
    const seed=(i*37+c*23+(side+1)*17)%19,x=-36+i*9,h=4.2+(seed%4)*1.25,w=6.5+(seed%3)*.4,z=side*(16+(seed%2)*2),depth=7
    part(box,seed%4,x,h/2,z,w,h,depth)
    part(box,3,x,.28,z,w+.12,.5,depth+.1)
    part(roof,4,x,h,z,w+.8,1.35,depth+.8)
    // Eaves, floor courses, recessed glazing and paired dark shutters.
    part(box,3,x,h-.12,z,w+.35,.16,depth+.35)
    for(let floor=0;floor<Math.floor(h/2.4);floor++){
     const y=1.5+floor*2.35,front=z-side*(depth/2+.035)
     part(box,3,x,y+1.0,front,w,.07,.1)
     for(const dx of [-2,0,2]){
      part(box,3,x+dx,y,front,.94,1.4,.12)
      part(box,(seed+floor)%3===0?7:6,x+dx,y,front-side*.07,.68,1.13,.06)
      part(box,5,x+dx-.53,y,front-side*.1,.27,1.3,.07)
      part(box,5,x+dx+.53,y,front-side*.1,.27,1.3,.07)
      part(box,3,x+dx,y-.72,front-side*.14,1.08,.1,.28)
     }
    }
    const front=z-side*(depth/2+.13)
    part(box,5,x,.9,front,1.15,1.8,.16)
    part(box,3,x,1.94,front,1.4,.13,.24)
    if(i%3===0){part(box,4,x-2,2,front-side*.7,2,.1,1.35);part(box,7,x-2,2.2,front-side*.07,1.8,.26,.08)}
    // Cypress silhouettes, compact street trees and visible trunks.
    const treeX=x+3.8,treeZ=side*10.8
    part(box,4,treeX,1,treeZ,.14,2,.14)
    if(i%2)part(cone,5,treeX,2.8,treeZ,.65,4.3,.65)
    else part(sphere,5,treeX,2.7,treeZ,1.05,1.45,1.05)
   }
  }
  batches.forEach((parts,index)=>{if(!parts.length)return;const geometry=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());if(!geometry)return;const mesh=new T.Mesh(geometry,materials[index]);mesh.receiveShadow=true;chunk.add(mesh)})
 }
 box.dispose();cone.dispose();sphere.dispose();roof.dispose()
 return {update(distance:number){chunks.forEach((chunk,i)=>{chunk.position.x=((i*80+distance)%240+240)%240-120})}}
}
