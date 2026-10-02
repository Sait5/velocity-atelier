import * as T from 'three'

/** Subtract an aperture from shared trim without tearing adjoining body panels. */
export function clearDoorApertures(root:T.Group){
 root.updateMatrixWorld(true)
 const apertures=[-1,1].map(side=>new T.Box3(new T.Vector3(-.72,.285,side<0?-1.01:.60),new T.Vector3(.46,.88,side<0?-.60:1.01)))
 const meshes:T.Mesh[]=[];root.traverse(o=>{if(o instanceof T.Mesh&&/^(interior_dark|carpet)$/.test(o.name))meshes.push(o)})
 for(const mesh of meshes){
  const g=mesh.geometry,attrs=Object.entries(g.attributes),position=g.getAttribute('position'),inverse=mesh.matrixWorld.clone().invert(),output:Record<string,number[]>={}
  attrs.forEach(([name])=>output[name]=[])
  type Vertex={world:T.Vector3,values:Record<string,number[]>}
  function vertex(id:number):Vertex{const values:Record<string,number[]>={};for(const [name,a] of attrs)values[name]=Array.from({length:a.itemSize},(_,c)=>a.getComponent(id,c));return {world:new T.Vector3().fromBufferAttribute(position,id).applyMatrix4(mesh.matrixWorld),values}}
  function mix(a:Vertex,b:Vertex,t:number):Vertex{const values:Record<string,number[]>={};for(const [name] of attrs)values[name]=a.values[name]!.map((v,i)=>T.MathUtils.lerp(v,b.values[name]![i]!,t));return {world:a.world.clone().lerp(b.world,t),values}}
  function split(poly:Vertex[],axis:'x'|'y'|'z',limit:number,sign:number){const inside:Vertex[]=[],outside:Vertex[]=[];for(let i=0;i<poly.length;i++){const a=poly[i]!,b=poly[(i+1)%poly.length]!,da=(a.world[axis]-limit)*sign,db=(b.world[axis]-limit)*sign;(da>=0?inside:outside).push(a);if((da>=0)!==(db>=0)){const cut=mix(a,b,da/(da-db));inside.push(cut);outside.push(cut)}}return {inside,outside}}
  function emit(poly:Vertex[]){for(let i=1;i<poly.length-1;i++)for(const v of [poly[0]!,poly[i]!,poly[i+1]!])for(const [name] of attrs){if(name==='position')output[name]!.push(...v.world.clone().applyMatrix4(inverse).toArray());else output[name]!.push(...v.values[name]!)}}
  for(let i=0;i<(g.index?.count||position.count);i+=3){let polygons:Vertex[][]=[[0,1,2].map(j=>vertex(g.index?g.index.getX(i+j):i+j))];for(const box of apertures){const remaining:Vertex[][]=[];for(const polygon of polygons){const bounds=new T.Box3().setFromPoints(polygon.map(v=>v.world));if(!box.intersectsBox(bounds)){remaining.push(polygon);continue}let candidate=polygon;for(const [axis,limit,sign] of [['x',box.min.x,1],['x',box.max.x,-1],['y',box.min.y,1],['y',box.max.y,-1],['z',box.min.z,1],['z',box.max.z,-1]] as ['x'|'y'|'z',number,number][]){const cut=split(candidate,axis,limit,sign);if(cut.outside.length>=3)remaining.push(cut.outside);candidate=cut.inside;if(candidate.length<3)break}}polygons=remaining}polygons.forEach(emit)}
  const replacement=new T.BufferGeometry();for(const [name,a] of attrs)replacement.setAttribute(name,new T.Float32BufferAttribute(output[name]!,a.itemSize));replacement.normalizeNormals();replacement.computeBoundingSphere();mesh.geometry=replacement;g.dispose()
 }
}
