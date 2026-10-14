const fs=require('fs'),p='app/three/desertRoad.ts';let s=fs.readFileSync(p,'utf8');
const a=s.indexOf(' // Ground beyond the source terrain'),b=s.indexOf(' const edgeGeometries',a);s=s.slice(0,a)+s.slice(b);
s=s.replace('const original=o.geometry.attributes.position!,positions=', 'const original=o.geometry.attributes.position!,inside=new Uint8Array(original.count),positions=');
s=s.replace('const row=T.MathUtils.clamp', 'inside[i]=Math.abs(v.x)<=35?1:0;\n    const row=T.MathUtils.clamp');
s=s.replace('(side?110:-50)','(side?35:-35)').replace('edge=side?110:-50','edge=side?35:-35');
s=s.replace('positions.needsUpdate=true;o.geometry.computeVertexNormals()',`const oldIndex=o.geometry.index!,trimmed:number[]=[]
   for(let i=0;i<oldIndex.count;i+=3){const a=oldIndex.getX(i),b=oldIndex.getX(i+1),c=oldIndex.getX(i+2);if(inside[a]&&inside[b]&&inside[c])trimmed.push(a,b,c)}
   o.geometry.setIndex(trimmed)
   positions.needsUpdate=true;o.geometry.computeVertexNormals()`);
s=s.replace('x=edge+direction*(t*150-.6)','x=edge+direction*(t*64-.6)');
s=s.replace('const height=h*(1-blend)-7*blend+Math.sin(t*Math.PI)*1.8*Math.sin(z*.041+side*2.1)', 'const crest=roadLevel+9+2*Math.sin(z*.041+side*2.1);const height=h*(1-blend)+crest*blend+Math.sin(t*Math.PI)*1.8*Math.sin(z*.053+side*1.3)');
s=s.replace('const selected=prototype.matrices.filter((rows,i)=>isStone?', 'const selected=prototype.matrices.filter((rows,i)=>Math.abs(rows[0]![3]!)>34?false:isStone?');
s=s.replace('distantGeometry.dispose();distantMaterial.dispose();','');
s=s.replace("roughness:.94,metalness:0","roughness:.84,metalness:0,color:'#b8b7b0'").replace('new T.Vector2(.22,.22)','new T.Vector2(.42,.42)');
s=s.replace("normal=assets.texture('/textures/asphalt_01_nor_gl_2k.jpg'),sand=", "normal=assets.texture('/textures/asphalt_01_nor_gl_2k.jpg'),rough=assets.texture('/textures/asphalt_01_rough_2k.jpg'),sand=");
s=s.replace('normal.map.repeat.copy(asphalt.map.repeat)','normal.map.repeat.copy(asphalt.map.repeat);rough.map.repeat.copy(asphalt.map.repeat)').replace('normalMap:normal.map,','normalMap:normal.map,roughnessMap:rough.map,');s=s.replace('[asphalt.ready,normal.ready,sand.ready]','[asphalt.ready,normal.ready,rough.ready,sand.ready]');s=s.replace('normal.map.offset.y=-distance/3','normal.map.offset.y=rough.map.offset.y=-distance/3');
fs.writeFileSync(p,s);
const c='app/components/VehicleScene.client.vue';s=fs.readFileSync(c,'utf8').replace("props.roadMap==='desert'?'#c7d7df'","props.roadMap==='desert'?'#cbd3d6'").replace("new T.Fog('#c7d7df',95,150)","new T.Fog('#cbd3d6',65,112)").replace("key.position.set(-40,55,-25);key.intensity=3.1;key.color.set('#fff4df');fill.intensity=4","key.position.set(-22,45,18);key.intensity=2.6;key.color.set('#fff5e5');fill.position.set(12,20,-22);fill.intensity=8").replace("ambient.groundColor.set('#c6b89d');ambient.intensity=1.25","ambient.groundColor.set('#c7bda9');ambient.intensity=1.1").replace('const visualRate=Math.min(18,.3/Math.max(dt,.001))','const visualRate=12');fs.writeFileSync(c,s);
const t='app/three/tyreContact.ts';s=fs.readFileSync(t,'utf8').replace('let lateralForceAcceleration=0','let smoothAcceleration=0;let lateralForceAcceleration=0').replace('lateralForceAcceleration=0;height=restHeight','lateralForceAcceleration=0;smoothAcceleration=0;height=restHeight').replace('const duration=Math.max(.001,Math.min(dt,.1)),acceleration=T.MathUtils.clamp((speed-speedBefore)/duration,-12,10);speedBefore=speed',`const duration=Math.max(.001,Math.min(dt,.1)),rawAcceleration=T.MathUtils.clamp((speed-speedBefore)/duration,-12,10);speedBefore=speed
  smoothAcceleration=T.MathUtils.damp(smoothAcceleration,rawAcceleration,4,duration);const acceleration=smoothAcceleration`).replace('suspension[i]=T.MathUtils.clamp(scratch.y-p.y,-travel,travel)', 'suspension[i]=T.MathUtils.damp(suspension[i]!,T.MathUtils.clamp(scratch.y-p.y,-travel,travel),20,duration)');fs.writeFileSync(t,s);
