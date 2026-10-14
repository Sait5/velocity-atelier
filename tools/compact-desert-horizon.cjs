const fs=require('fs'),p='app/three/desertRoad.ts';let s=fs.readFileSync(p,'utf8').replace('distantGeometry=new T.PlaneGeometry(1100,1100)','distantGeometry=new T.PlaneGeometry(1100,1100,96,96)');s=s.replace('const edgeGeometries:T.BufferGeometry[]=',`// A cheap, low-detail dune silhouette fills the horizon without adding props.
 const backdropPositions=distantGeometry.attributes.position!
 for(let i=0;i<backdropPositions.count;i++){
  const x=backdropPositions.getX(i),y=backdropPositions.getY(i),edge=T.MathUtils.smoothstep(Math.abs(x),60,110)
  backdropPositions.setZ(i,edge*(8+4*Math.sin(x*.033+y*.014)+3*Math.cos(y*.029-x*.017)))
 }
 distantGeometry.computeVertexNormals();distantGeometry.computeBoundingSphere()
 const edgeGeometries:T.BufferGeometry[]=`);fs.writeFileSync(p,s);
