const fs=require('fs');const path='app/three/desertRoad.ts';let s=fs.readFileSync(path,'utf8');
s=s.replace(' const roadGeometry=new T.PlaneGeometry(8.6,800,1,1280)',` const roadLevel=meta.heightProfile.reduce((sum,h)=>sum+h,0)/meta.heightProfile.length
 function flattenOffset(x:number,y:number){const t=T.MathUtils.clamp((Math.abs(x)-4.4)/8,0,1),fade=t*t*(3-2*t);return (grade(y)-roadLevel)*(1-fade)}
 const roadGeometry=new T.PlaneGeometry(8.6,800)`);
s=s.replace('road.position.y=.007','road.position.y=roadLevel+.007');
s=s.replace("terrain.scene.traverse(o=>{if(o instanceof T.Mesh){o.receiveShadow=true;o.castShadow=false}})",`terrain.scene.updateMatrixWorld(true)
  terrain.scene.traverse(o=>{if(o instanceof T.Mesh){
   const positions=o.geometry.attributes.position,inverseWorld=o.matrixWorld.clone().invert(),v=new T.Vector3()
   for(let i=0;i<positions.count;i++){v.fromBufferAttribute(positions,i).applyMatrix4(o.matrixWorld);v.y-=flattenOffset(v.x,-v.z);v.applyMatrix4(inverseWorld);positions.setXYZ(i,v.x,v.y,v.z)}
   positions.needsUpdate=true;o.geometry.computeVertexNormals();o.geometry.computeBoundingSphere();o.geometry.computeBoundingBox();o.receiveShadow=true;o.castShadow=false
  }})
  // Replace a few roadside shrubs with the source Opuntia; keep sparse, irregular placement.
  const cactusExtra:T.Matrix4[]=[],cactus=meta.prototypes.find(p=>p.name.includes('Opuntia'))
  const cactusBase=cactus?.matrices[0]
  if(cactusBase)for(const [index,rows] of meta.prototypes[0]!.matrices.entries()){
   const x=rows[0]![3]!,y=rows[1]![3]!
   if(index%3===0&&Math.abs(x)>7&&Math.abs(x)<27){
    const m=new T.Matrix4().set(...cactusBase.flat() as [number,number,number,number,number,number,number,number,number,number,number,number,number,number,number,number]);m.setPosition(x,y,rows[2]![3]!);cactusExtra.push(m)
   }
  }`);
s=s.replace('if(material instanceof T.MeshStandardMaterial){material.side',`if(material instanceof T.MeshStandardMaterial){
     const stone=prototype.name.includes('stone');material.color.multiply(new T.Color(stone?'#887963':'#758765'));material.roughness=Math.max(material.roughness,.85);material.envMapIntensity=.25;
     material.side`);
s=s.replace('const transforms=prototype.matrices.map(rows=>',`const isStone=prototype.name.includes('stone')
   const selected=prototype.matrices.filter((rows,i)=>isStone?i%2===0:!(prototype===meta.prototypes[0]&&i%3===0&&Math.abs(rows[0]![3]!)>7&&Math.abs(rows[0]![3]!)<27))
   const placement=selected.map(rows=>`);
s=s.replace(')).map(m=>basis.clone().multiply(m).multiply(inverse))',`))
   if(prototype===cactus)placement.push(...cactusExtra)
   const transforms=placement.map(m=>{const e=m.elements;e[14]!-=flattenOffset(e[12]!,e[13]!);return basis.clone().multiply(m).multiply(inverse)})`);
s=s.replace('mesh.receiveShadow=true;land.add(mesh)','mesh.receiveShadow=false;land.add(mesh)');
const start=s.indexOf('  const positions=roadGeometry.attributes.position!,normals=roadGeometry.attributes.normal!');const end=s.indexOf('\n }',start);s=s.slice(0,start)+s.slice(end);
s=s.replace('heightAt:(x:number,_z:number,distance:number)=>.007+grade(x-distance)','heightAt:(_x:number,_z:number,_distance:number)=>roadLevel+.007');
fs.writeFileSync(path,s);
