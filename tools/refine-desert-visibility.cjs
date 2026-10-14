const fs=require('fs');const p='app/three/desertRoad.ts';let s=fs.readFileSync(p,'utf8');
s=s.replace("const distantMaterial=new T.MeshStandardMaterial({color:'#9e8970',roughness:1})","sand.map.repeat.set(880,880)\n const distantMaterial=new T.MeshStandardMaterial({map:sand.map,color:'#c9c0ad',roughness:1})");
s=s.replace("const basis=new T.Matrix4()","const edgeGeometries:T.BufferGeometry[]=[]\n const basis=new T.Matrix4()");
s=s.replace('const terrain=await assets.model',`const terrain=await assets.model`);
s=s.replace("terrain.scene.updateMatrixWorld(true)",`terrain.scene.updateMatrixWorld(true)
  const edgeSamples=[new Float32Array(81),new Float32Array(81)],edgeDistances=[new Float32Array(81).fill(Infinity),new Float32Array(81).fill(Infinity)]
  let sandMaterial:T.Material|undefined`);
s=s.replace('v.y+=hillOffset(v.x,-v.z)-flattenOffset(v.x,-v.z);v.applyMatrix4(inverseWorld);',`v.y+=hillOffset(v.x,-v.z)-flattenOffset(v.x,-v.z);
    const row=T.MathUtils.clamp(Math.round((v.z+80)/2),0,80)
    for(let side=0;side<2;side++){const dx=Math.abs(v.x-(side?110:-50)),dz=Math.abs(v.z-(-80+row*2)),distance=dx*dx+dz*dz;if(distance<edgeDistances[side]![row]!){edgeDistances[side]![row]=distance;edgeSamples[side]![row]=v.y}}
    v.applyMatrix4(inverseWorld);`);
s=s.replace('o.receiveShadow=true;o.castShadow=false\n  }})',`o.receiveShadow=true;o.castShadow=false;sandMaterial=Array.isArray(o.material)?o.material[0]:o.material
  }})
  // Extend the cut source boundary into broad, textured sand slopes rather than exposed walls.
  const shoulders=new T.Group()
  if(sandMaterial)for(let side=0;side<2;side++){
   const positions:number[]=[],uvs:number[]=[],indices:number[]=[],edge=side?110:-50,direction=side?1:-1
   for(let row=0;row<=80;row++)for(let col=0;col<=24;col++){
    const t=col/24,x=edge+direction*(t*150-.6),z=-80+row*2,blend=t*t*(3-2*t),h=edgeSamples[side]![row]!
    const height=h*(1-blend)-7*blend+Math.sin(t*Math.PI)*1.8*Math.sin(z*.041+side*2.1)
    positions.push(x,height-.06,z);uvs.push(x/2.5,-z/2.5)
   }
   for(let row=0;row<80;row++)for(let col=0;col<24;col++){const a=row*25+col,b=a+1,c=a+25,d=c+1;indices.push(a,c,b,b,c,d)}
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();edgeGeometries.push(geometry)
   const material=sandMaterial.clone();material.side=T.DoubleSide;const shoulder=new T.Mesh(geometry,material);shoulders.add(shoulder)
  }`);
s=s.replace('land.add(copy)}','land.add(copy);const skirt=shoulders.clone();skirt.position.z=z;land.add(skirt)}');
s=s.replace('  for(const prototype of meta.prototypes){',`  const fillShrubs=new Set<number[]>(),occupied=new Set<string>(),candidates=new Map<string,number[]>()
  const cell=(r:number[][])=>Math.floor(r[0]![3]!/22)+':'+Math.floor(r[1]![3]!/25)
  for(const p of meta.prototypes)if(/Bush 4|Rhazya|creosote/.test(p.name))for(const [i,r] of p.matrices.entries()){
   if(Math.abs(r[0]![3]!)>50)continue
   if(((i*73+19)%101)<35)occupied.add(cell(r));else if(!candidates.has(cell(r)))candidates.set(cell(r),r.flat())
  }
  const extraCells=new Set([...candidates.keys()].filter(key=>!occupied.has(key)))
  for(const p of meta.prototypes)if(/Bush 4|Rhazya|creosote/.test(p.name))for(const r of p.matrices){const key=cell(r);if(extraCells.has(key)&&candidates.get(key)?.every((v,i)=>v===r.flat()[i])){fillShrubs.add(r as unknown as number[]);extraCells.delete(key)}}
  for(const prototype of meta.prototypes){`);
s=s.replace('   source.scene.traverse(o=>{if(o instanceof T.Mesh)for(const material',`   const adjusted=new Set<T.Material>()
   source.scene.traverse(o=>{if(o instanceof T.Mesh)for(const material`);
s=s.replace('if(material instanceof T.MeshStandardMaterial){\n     const stone',`if(material instanceof T.MeshStandardMaterial&&!adjusted.has(material)){adjusted.add(material)
     const stone`);
s=s.replace("stone?'#887963':'#758765'","stone?'#887963':'#c7c3aa'");s=s.replace('material.envMapIntensity=.25','material.envMapIntensity=.5');
s=s.replace('(isShrub&&((i*73+19)%101)>=35)?false','(isShrub&&((i*73+19)%101)>=35&&!fillShrubs.has(rows as unknown as number[]))?false');
s=s.replace('roadGeometry.dispose();','edgeGeometries.forEach(g=>g.dispose());shoulderMaterials.forEach(m=>m.dispose());roadGeometry.dispose();');
s=s.replace('const edgeGeometries:T.BufferGeometry[]=[]','const edgeGeometries:T.BufferGeometry[]=[],shoulderMaterials:T.Material[]=[]');s=s.replace('material.side=T.DoubleSide;const shoulder','material.side=T.DoubleSide;shoulderMaterials.push(material);const shoulder');
fs.writeFileSync(p,s);
const c='app/components/VehicleScene.client.vue';s=fs.readFileSync(c,'utf8').replace("new T.Fog('#c7d7df',110,235)","new T.Fog('#c7d7df',160,280)").replace("ambient.groundColor.set('#9d876b');ambient.intensity=.8","ambient.groundColor.set('#c6b89d');ambient.intensity=1.15");fs.writeFileSync(c,s);
