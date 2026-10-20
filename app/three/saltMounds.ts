import * as T from 'three'

/**
 * Small salt mounds on the dry plain left of the road (+z), as on the Salar de Uyuni: a few single knee-high cones in
 * every 160 m section, well apart from each other. One instanced mesh per section; the layouts follow the
 * section variants of the scrolling road, so the piles carry on seamlessly when a section wraps around.
 */
export function createSaltMounds(variants:number,level:number,maps:{albedo:T.Texture,normal:T.Texture}){
 const geometry=moundGeometry()
 const material=new T.MeshStandardMaterial({color:new T.Color().setRGB(.9,.875,.83),map:maps.albedo,normalMap:maps.normal,normalScale:new T.Vector2(.7,.7),roughness:.92,metalness:0})
 const layouts=Array.from({length:variants},(_,v)=>layout(v,level)),capacity=Math.max(...layouts.map(l=>l.length))
 function section(){const mesh=new T.InstancedMesh(geometry,material,capacity);mesh.name='Salt piles';mesh.castShadow=true;mesh.receiveShadow=true;return mesh}
 function show(mesh:T.InstancedMesh,variant:number){const list=layouts[variant]!;list.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.count=list.length;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()}
 return {section,show,dispose(){geometry.dispose();material.dispose()}}
}

/** A rough cone of loose salt: a lathe profile with a soft crown, roughened by low-frequency bumps and a sunk foot. */
function moundGeometry(){
 const profile:T.Vector2[]=[]
 for(let k=0;k<=12;k++){const t=k/12,radius=1.02*Math.pow(1-t,.9)+.0001,height=.86*(1-Math.pow(1-t,1.7))*(1-.08*t*t);profile.push(new T.Vector2(radius,height-.05))}
 const geometry=new T.LatheGeometry(profile,30),position=geometry.getAttribute('position'),uv=geometry.getAttribute('uv'),v=new T.Vector3()
 for(let i=0;i<position.count;i++){
  v.fromBufferAttribute(position,i);const angle=Math.atan2(v.z,v.x),radial=Math.hypot(v.x,v.z)
  const bump=1+.07*Math.sin(angle*3+v.y*4)+.045*Math.sin(angle*7.3-v.y*6.1)+.03*Math.sin(angle*13.1+v.y*11)
  position.setXYZ(i,v.x*bump,v.y*(1+.05*Math.sin(angle*2.3))+(radial>.95?-.02:0),v.z*bump)
  // the salt scan covers about 2.4 m; repeat it around the pile at roughly that scale
  uv.setXY(i,uv.getX(i)*2.6,uv.getY(i)*.8)
 }
 geometry.computeVertexNormals();return geometry
}

function layout(variant:number,level:number){
 let seed=variant*7919+13
 const random=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646}
 const piles:T.Matrix4[]=[],placed:[number,number][]=[],place=(x:number,z:number,size:number)=>{
  const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),random()*Math.PI*2)
  piles.push(new T.Matrix4().compose(new T.Vector3(x,level-.02,z),q,new T.Vector3(size*(.9+.2*random()),size*(.8+.4*random()),size*(.9+.2*random()))))
 }
 // single small mounds, well apart: about one every 40 m of road, none closer than 25 m to another
 const count=3+Math.floor(random()*3)
 for(let tries=0;piles.length<count&&tries<60;tries++){
  const x=-76+random()*152,z=8+random()*70,size=.22+random()*.2
  if(placed.some(([px,pz])=>Math.hypot(px-x,pz-z)<25))continue
  placed.push([x,z]);place(x,z,size)
 }
 return piles
}
