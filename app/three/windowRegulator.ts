import * as T from 'three'
import {fitWindowGlass} from './carGlass'

/**
 * Door glass that lowers like a real regulator's, kept simple: each pane moves as one rigid piece (it is never bent or
 * stretched) straight along its own slope, from its top edge towards its bottom edge, into the door; whatever passes
 * the pane's own lowest edge is clipped away by a plane that rides with the door, so the glass disappears into the slot
 * between the skin and the card and nothing of it ever shows below where the shut glass stood. (Dropped straight down,
 * a pane that leans in towards the roof came out through the outer skin; bent along fitted curves, the Bugatti's and the
 * Porsche's glass flew apart.) Small parts in the glass material that are not the pane stay where they are (keepPanes).
 * The glass is driven like a motor: a target from setWindows and a ramped speed, about 1.5 s for the full travel.
 */
const SPEED=.8,ACCEL=4

/**
 * Keeps only the pane in the moving glass. The window meshes also carry small parts in the glass material that are not the
 * pane (on the Bugatti a lens on the door skin, one low inside the door and the fixed front quarter light; on the
 * Valhalla a lens by the handle): dropped with the pane they slid down through the door. The meshes are split into
 * connected pieces (vertices welded at 0.1 mm); a piece moves when it is at least 1 % of the glass and lies along the
 * largest piece (60 % of its length within the largest one's); the others stay where they are, in a mesh of their own.
 */
function keepPanes(meshes:T.Mesh[],car:T.Object3D){
 car.updateMatrixWorld(true)
 const toCar=car.matrixWorld.clone().invert(),pieces:{mesh:T.Mesh,tris:number[],area:number,x0:number,x1:number}[]=[]
 for(const mesh of meshes){
  const g=mesh.geometry,pos=g.getAttribute('position'),index=g.index?Array.from(g.index.array as ArrayLike<number>):[...Array(pos.count).keys()]
  const m=toCar.clone().multiply(mesh.matrixWorld),weld=new Map<string,number>(),root:number[]=[],v=new T.Vector3()
  const id=(i:number)=>{const k=`${Math.round(pos.getX(i)*1e4)},${Math.round(pos.getY(i)*1e4)},${Math.round(pos.getZ(i)*1e4)}`;let n=weld.get(k);if(n===undefined){n=weld.size;weld.set(k,n);root.push(n)}return n}
  const find=(x:number):number=>{while(root[x]!==x){root[x]=root[root[x]!]!;x=root[x]!}return x}
  const ids=index.map(id)
  for(let t=0;t<ids.length;t+=3){const a=find(ids[t]!);root[find(ids[t+1]!)]=a;root[find(ids[t+2]!)]=a}
  const byRoot=new Map<number,{mesh:T.Mesh,tris:number[],area:number,x0:number,x1:number}>()
  const A=new T.Vector3(),B=new T.Vector3(),C=new T.Vector3()
  for(let t=0;t<ids.length;t+=3){
   const r=find(ids[t]!),piece=byRoot.get(r)??{mesh,tris:[],area:0,x0:Infinity,x1:-Infinity};byRoot.set(r,piece)
   A.fromBufferAttribute(pos,index[t]!).applyMatrix4(m);B.fromBufferAttribute(pos,index[t+1]!).applyMatrix4(m);C.fromBufferAttribute(pos,index[t+2]!).applyMatrix4(m)
   piece.tris.push(index[t]!,index[t+1]!,index[t+2]!);piece.area+=v.subVectors(B,A).cross(C.clone().sub(A)).length()/2
   piece.x0=Math.min(piece.x0,A.x,B.x,C.x);piece.x1=Math.max(piece.x1,A.x,B.x,C.x)
  }
  pieces.push(...byRoot.values())
 }
 const total=pieces.reduce((s,p)=>s+p.area,0),largest=pieces.reduce((a,p)=>p.area>a.area?p:a,pieces[0]!)
 const moves=(p:typeof largest)=>p.area>=.01*total&&(Math.min(p.x1,largest.x1)-Math.max(p.x0,largest.x0))>=.6*(p.x1-p.x0)
 const panes:T.Mesh[]=[]
 for(const mesh of meshes){
  const own=pieces.filter(p=>p.mesh===mesh),stay=own.filter(p=>!moves(p))
  if(stay.length===own.length)continue
  panes.push(mesh)
  if(!stay.length)continue
  // the parts that stay: the same geometry under the rest of the index, in the glass's own (unclipped) material
  const fixed=new T.Mesh(mesh.geometry.clone(),mesh.material);fixed.geometry.setIndex(stay.flatMap(p=>p.tris));fixed.name=mesh.name+' (fixed)'
  fixed.position.copy(mesh.position);fixed.quaternion.copy(mesh.quaternion);fixed.scale.copy(mesh.scale);fixed.castShadow=false;fixed.receiveShadow=mesh.receiveShadow;fixed.renderOrder=mesh.renderOrder
  mesh.parent!.add(fixed)
  mesh.geometry=mesh.geometry.clone();mesh.geometry.setIndex(own.filter(moves).flatMap(p=>p.tris))
 }
 return panes
}

export function createWindowRegulator(meshes:T.Mesh[]){
 // one window per door: its meshes (outer and inner faces) move together
 const byDoor=new Map<T.Object3D,T.Mesh[]>()
 for(const m of meshes){if(!m.parent)continue;const list=byDoor.get(m.parent)??[];list.push(m);byDoor.set(m.parent,list)}
 const windows=[...byDoor].map(([door,all])=>{
  let car:T.Object3D=door;while(car.parent)car=car.parent
  const panes=keepPanes(all,car)
  // the pane's vertices in the door's frame (the meshes are the door's children): its top and bottom edges are the
  // highest and lowest eighth of it, and it slides along the line between them
  const pts:T.Vector3[]=[],v=new T.Vector3()
  for(const mesh of panes){
   mesh.updateMatrix()
   const pos=mesh.geometry.getAttribute('position'),index=mesh.geometry.index
   const used=index?new Set(Array.from(index.array as ArrayLike<number>)):null
   for(let i=0;i<pos.count;i++){if(used&&!used.has(i))continue;pts.push(v.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrix).clone())}
  }
  if(!pts.length)return {apply(_v:number){},dispose(){}}
  let ymin=Infinity,ymax=-Infinity;for(const p of pts){ymin=Math.min(ymin,p.y);ymax=Math.max(ymax,p.y)}
  const band=(ymax-ymin)*.12,top=new T.Vector3(),low=new T.Vector3();let nt=0,nl=0
  for(const p of pts){if(p.y>ymax-band){top.add(p);nt++}if(p.y<ymin+band){low.add(p);nl++}}
  top.divideScalar(nt);low.divideScalar(nl)
  // (only across the car: a trapezoid pane's top edge sits further back than its bottom edge's middle, and following
  // that would slide the glass forwards along the car; a shut door's frame has x along the car)
  const down=low.clone().sub(top).setX(0).normalize()
  // the cut: square to the slide, through the pane's furthest point along it, so nothing of the shut glass is cut
  let deepest=-Infinity,highest=Infinity;for(const p of pts){const d=p.dot(down);deepest=Math.max(deepest,d);highest=Math.min(highest,d)}
  const local=new T.Plane(down.clone().negate(),deepest+.0005)
  // the travel: the whole pane past the cut
  const travel=deepest-highest+.004
  const glassState=panes.map(mesh=>{
   const shared=mesh.material as T.MeshStandardMaterial,material=shared.clone()
   fitWindowGlass(material,shared);material.clippingPlanes=[new T.Plane()];mesh.material=material
   mesh.onBeforeRender=()=>{material.clippingPlanes![0]!.copy(local).applyMatrix4(door.matrixWorld);material.color.copy(shared.color);material.opacity=shared.opacity}
   return {mesh,material,rest:mesh.position.clone()}
  })
  return {
   apply(value:number){for(const g of glassState){g.mesh.position.copy(g.rest).addScaledVector(down,value*travel);g.mesh.visible=value<.995}},
   dispose(){glassState.forEach(g=>g.material.dispose())}
  }
 })
 // the motor: setWindows gives the target; the glass ramps up to speed, runs steadily and eases into its stop
 let current=0,target=0,speed=0,last=0,frame=0,first=true
 const apply=(value:number)=>windows.forEach(w=>w.apply(value))
 const still=()=>typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches
 function tick(now:number){
  const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now
  const gap=target-current,dir=Math.sign(gap),want=dir*Math.min(SPEED,Math.sqrt(2*ACCEL*Math.abs(gap)))
  speed+=T.MathUtils.clamp(want-speed,-ACCEL*dt,ACCEL*dt);current+=speed*dt
  if(dir===0||Math.sign(target-current)!==dir){current=target;speed=0;apply(current);frame=0;return}
  apply(current);frame=requestAnimationFrame(tick)
 }
 function setWindows(value:number){
  target=T.MathUtils.clamp(value,0,1)
  // the car's first state (and reduced motion) is set at once
  if(first||still()||typeof requestAnimationFrame==='undefined'){first=false;current=target;speed=0;if(frame)cancelAnimationFrame(frame);frame=0;apply(current);return}
  if(!frame){last=performance.now();frame=requestAnimationFrame(tick)}
 }
 apply(0)
 // dev-only handle for headless checks: set a position at once
 if(import.meta.dev)(globalThis as any).__velocityWindows={set(value:number){if(frame)cancelAnimationFrame(frame);frame=0;first=false;current=target=value;speed=0;apply(value)},get state(){return {current,target,speed}}}
 function dispose(){if(frame)cancelAnimationFrame(frame);frame=0;windows.forEach(w=>w.dispose())}
 return {setWindows,dispose}
}
