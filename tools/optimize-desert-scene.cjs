const fs=require('fs'),p='app/three/desertRoad.ts';let s=fs.readFileSync(p,'utf8');
s=s.replace(' const roadGeometry=',` function hillOffset(x:number,y:number){
  const shoulder=T.MathUtils.smoothstep(Math.abs(x),7,20),seam=Math.pow(Math.cos(Math.PI*y/meta.period),2)
  return shoulder*seam*(2.5*Math.sin(x*.085+y*.037+.8)+1.6*Math.cos(x*.053-y*.071+1.4))
 }
 const roadGeometry=`);
s=s.replace('v.y-=flattenOffset(v.x,-v.z)','v.y+=hillOffset(v.x,-v.z)-flattenOffset(v.x,-v.z)');
s=s.replace('const source=await assets.model(prototype.url);source.scene.updateMatrixWorld(true)',`const detailed=/plant-(0|2|6|7)\\.glb$/.test(prototype.url)
   const source=await assets.model(detailed?prototype.url.replace('.glb','-near.glb'):prototype.url);source.scene.updateMatrixWorld(true)
   const far=detailed?await assets.model(prototype.url.replace('.glb','-far.glb')):source;far.scene.updateMatrixWorld(true)`);
s=s.replace("const selected=prototype.matrices.filter((rows,i)=>isStone?i%2===0:",`const isShrub=/Bush 4|Rhazya|creosote/.test(prototype.name)
   const selected=prototype.matrices.filter((rows,i)=>isStone?i%2===0:(isShrub&&((i*73+19)%101)>=35)?false:`);
s=s.replace('e[14]!-=flattenOffset(e[12]!,e[13]!)','e[14]!+=hillOffset(e[12]!,e[13]!)-flattenOffset(e[12]!,e[13]!)');
let start=s.indexOf('   source.scene.traverse(o=>{\n    if(!(o instanceof T.Mesh)||!alive)return');let end=s.indexOf('   await new Promise<void>',start);
s=s.slice(0,start)+`   const finishes=new Map<string,T.Material>()
   source.scene.traverse(o=>{if(o instanceof T.Mesh)for(const mat of Array.isArray(o.material)?o.material:[o.material])finishes.set(mat.name,mat)})
   if(far!==source)far.scene.traverse(o=>{if(o instanceof T.Mesh)o.material=Array.isArray(o.material)?o.material.map(m=>finishes.get(m.name)??m):finishes.get(o.material.name)??o.material})
   const clusters=new Map<string,T.Matrix4[]>()
   for(const m of transforms){const x=m.elements[12]!,z=m.elements[14]!,key=Math.floor((z+80)/40)+':'+Math.floor((x+50)/40);const list=clusters.get(key)??[];list.push(m);clusters.set(key,list)}
   for(const offset of [-meta.period,0,meta.period])for(const list of clusters.values()){
    const center=new T.Vector3();for(const m of list)center.add(new T.Vector3().setFromMatrixPosition(m));center.multiplyScalar(1/list.length);center.z+=offset
    const lod=new T.LOD();lod.position.copy(center)
    for(const [asset,distance] of [[source,0],[far,38]] as const){
     if(distance&&far===source)continue
     const group=new T.Group(),shift=new T.Matrix4().makeTranslation(-center.x,-center.y,offset-center.z)
     asset.scene.traverse(o=>{if(!(o instanceof T.Mesh)||!alive)return
      const mesh=new T.InstancedMesh(o.geometry,o.material,list.length)
      list.forEach((m,i)=>mesh.setMatrixAt(i,shift.clone().multiply(m).multiply(o.matrixWorld)))
      mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=false;mesh.receiveShadow=false;group.add(mesh);instances.push(mesh)
     })
     lod.addLevel(group,distance,.15)
    }
    lod.addLevel(new T.Group(),115,.12);land.add(lod)
   }
`+s.slice(end);
fs.writeFileSync(p,s);
