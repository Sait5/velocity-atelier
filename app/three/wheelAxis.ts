import * as T from 'three'

/**
 * True every wheel to the axle it turns on (its group's z axis, rotation.z). The models put their wheels together in
 * different ways and each way wobbled once the wheels turned:
 *  - Porsche and Bugatti: one mesh (tyre, rim and disc) authored with camber (1.5° front, 2.0° rear; 1.5° and 1.0°) in a
 *    group square to the car, so the tread swung 8–18 mm sideways every revolution;
 *  - Ferrari front, AMG, McLaren, Valhalla: tyre, rim and disc are separate meshes whose centres lie 0.5–3.9 mm apart (the
 *    McLaren's rear disc also leans 0.8°), so the rim or the disc ran eccentric round a true tyre, or the other way round.
 * Every rigid piece's own axis is read the way the eye follows a turning wheel: the centre of its outermost edge (the
 * outermost point in each of 36 sectors, a circle) and its lean. No single lean reading suits every piece (spokes alias
 * into the sidewall band, some rim lips are not quite flat, thin rings and tread grooves mislead the face normals), so the
 * lean is the median of three: the planes through the side-face extremes over the outer 30 % and over the outer 7 %, and
 * the axis every face normal crosses (on a solid of revolution all normals meet the axis). Strays such as a valve or a
 * badge are rejected, and the reading is repeated in the piece's own frame until it vanishes. The group is re-based onto
 * the rim's axis (else the tyre's) and every other piece is moved the fraction of a millimetre to few millimetres that puts
 * its axis on the group's; small pieces that cannot be read alone (bolts, nuts) go with the piece they sit on. At rest
 * nothing moves by more than those few millimetres; turning, tyre, rim and disc roll as one true wheel.
 */
const SECTORS=36,ONE=new T.Vector3(1,1,1),Z=new T.Vector3(0,0,1)

type Body={meshes:T.Mesh[],points:Float64Array,faces:Float64Array,rmin:number,rmax:number,tyre:boolean,frame?:T.Matrix4}

const median=(values:number[])=>{const s=[...values].sort((a,b)=>a-b);return s[s.length>>1]??0}
/** linear least squares by the normal equations (rows: unknowns' coefficients then the right-hand side, with a weight) */
function solve(n:number,rows:number[][],weights?:number[]){
 const M=Array.from({length:n},()=>new Array(n+1).fill(0) as number[])
 rows.forEach((row,k)=>{const w=weights?.[k]??1;for(let i=0;i<n;i++)for(let j=0;j<=n;j++)M[i]![j]!+=w*row[i]!*row[j]!})
 for(let i=0;i<n;i++)M[i]![i]!+=1e-12
 for(let i=0;i<n;i++){let p=i;for(let k=i+1;k<n;k++)if(Math.abs(M[k]![i]!)>Math.abs(M[p]![i]!))p=k;[M[i],M[p]]=[M[p]!,M[i]!];if(Math.abs(M[i]![i]!)<1e-12)return null
  for(let k=0;k<n;k++)if(k!==i){const f=M[k]![i]!/M[i]![i]!;for(let j=i;j<=n;j++)M[k]![j]!-=f*M[i]![j]!}}
 return M.map((r,i)=>r[n]!/r[i]!)
}
/** least squares that drops strays (residual over four times the median, at least 0.4 mm) and fits again */
function robust(rows:number[][],columns:(row:number[])=>number[],residual:(row:number[],x:number[])=>number){
 let fit=solve(3,rows.map(columns))
 for(let pass=0;fit&&pass<2;pass++){const r=rows.map(row=>Math.abs(residual(row,fit!))),limit=Math.max(4e-4,4*median(r)),kept=rows.filter((_,i)=>r[i]!<=limit)
  if(kept.length===rows.length||kept.length<rows.length*.6)break;const next=solve(3,kept.map(columns));if(!next)break;fit=next;rows=kept}
 return fit
}
// circle: x²+y² = 2cx·x + 2cy·y + k; plane: z = a + gx·x + gy·y
const circle=(rows:number[][])=>{const f=robust(rows,([x,y])=>[x!,y!,1,x!*x!+y!*y!],([x,y],[p,q,k])=>{const cx=p!/2,cy=q!/2;return Math.hypot(x!-cx,y!-cy)-Math.sqrt(k!+cx*cx+cy*cy)});return f&&[f[0]!/2,f[1]!/2]}
const plane=(rows:number[][])=>robust(rows,([x,y,z])=>[1,x!,y!,z!],([x,y,z],[a,gx,gy])=>z!-a!-gx!*x!-gy!*y!)

/** lean of the side faces from their extremes in each sector over r > band·rmax, as the gradient of z */
function faceLean(p:Float64Array,rmax:number,band:number){
 const high:number[][]=[],low:number[][]=[]
 for(let i=0;i<p.length;i+=3){
  const x=p[i]!,y=p[i+1]!,z=p[i+2]!;if(Math.hypot(x,y)<=rmax*band)continue;const s=Math.floor((Math.atan2(y,x)/(Math.PI*2)+1)*SECTORS)%SECTORS
  if(!(high[s]&&high[s]![2]!>=z))high[s]=[x,y,z];if(!(low[s]&&low[s]![2]!<=z))low[s]=[x,y,z]
 }
 const out=high.filter(Boolean),inn=low.filter(Boolean);if(out.length<SECTORS*.4)return undefined
 const a=plane(out),b=plane(inn);return a&&b?[(a[1]!+b[1]!)/2,(a[2]!+b[2]!)/2]:undefined
}
/** lean of the axis all face normals cross: n·(d×(p−s)) = 0 for d = (tx,ty,1), s = (sx,sy,0), linearised, area-weighted
 *  and reweighted once against grooves and spoke sides; as a face gradient (−tx,−ty) */
function normalLean(f:Float64Array){
 const rows:number[][]=[],weights:number[]=[]
 for(let i=0;i<f.length;i+=7){const px=f[i]!,py=f[i+1]!,pz=f[i+2]!,nx=f[i+3]!,ny=f[i+4]!,nz=f[i+5]!;rows.push([-ny,nx,nz*py-ny*pz,nx*pz-nz*px,nx*py-ny*px]);weights.push(f[i+6]!)}
 if(rows.length<30)return undefined
 let x=solve(4,rows,weights);if(!x)return undefined
 const e=rows.map(r=>Math.abs(r[0]!*x![0]!+r[1]!*x![1]!+r[2]!*x![2]!+r[3]!*x![3]!-r[4]!)),scale=Math.max(1e-6,3*median(e))
 x=solve(4,rows,weights.map((w,k)=>w/(1+(e[k]!/scale)**2)))??x
 return [-x[2]!,-x[3]!]
}
/** In a candidate axle frame: the centre of the outermost edge (and its axial height) and the lean, as a face gradient. */
function reading(p:Float64Array,f:Float64Array){
 let rmax=0;for(let i=0;i<p.length;i+=3)rmax=Math.max(rmax,Math.hypot(p[i]!,p[i+1]!))
 const edge=rmax-Math.max(.002,rmax*.015),top:number[][]=[]
 for(let i=0;i<p.length;i+=3){const x=p[i]!,y=p[i+1]!,r=Math.hypot(x,y),s=Math.floor((Math.atan2(y,x)/(Math.PI*2)+1)*SECTORS)%SECTORS;if(r>edge&&!(top[s]&&top[s]![3]!>=r))top[s]=[x,y,p[i+2]!,r]}
 const rim=top.filter(Boolean);if(rim.length<SECTORS*.4)return undefined
 const c=circle(rim),leans=[faceLean(p,rmax,.7),faceLean(p,rmax,.93),normalLean(f)].filter(g=>g&&g.every(Number.isFinite)) as number[][]
 if(!c||!leans.length)return undefined
 // the median of three readings (the mean of two)
 const pick=(k:number)=>leans.length===2?(leans[0]![k]!+leans[1]![k]!)/2:median(leans.map(g=>g[k]!))
 return {cx:c[0]!,cy:c[1]!,height:rim.reduce((s,q)=>s+q[2]!,0)/rim.length,gx:pick(0),gy:pick(1)}
}
/** the piece's own axle frame (z along its axis, origin where the axis crosses z = 0), in the frame its points are in */
function fitAxle(b:Body){
 const frame=new T.Matrix4(),inverse=new T.Matrix4(),p=new Float64Array(b.points.length),f=new Float64Array(b.faces.length),step=new T.Matrix4(),d=new T.Vector3(),o=new T.Vector3(),q=new T.Quaternion()
 for(let k=0;k<12;k++){
  const e=inverse.copy(frame).invert().elements,src=b.points,fs=b.faces
  for(let i=0;i<src.length;i+=3){const x=src[i]!,y=src[i+1]!,z=src[i+2]!;p[i]=e[0]!*x+e[4]!*y+e[8]!*z+e[12]!;p[i+1]=e[1]!*x+e[5]!*y+e[9]!*z+e[13]!;p[i+2]=e[2]!*x+e[6]!*y+e[10]!*z+e[14]!}
  for(let i=0;i<fs.length;i+=7){const x=fs[i]!,y=fs[i+1]!,z=fs[i+2]!,u=fs[i+3]!,v=fs[i+4]!,w=fs[i+5]!
   f[i]=e[0]!*x+e[4]!*y+e[8]!*z+e[12]!;f[i+1]=e[1]!*x+e[5]!*y+e[9]!*z+e[13]!;f[i+2]=e[2]!*x+e[6]!*y+e[10]!*z+e[14]!;f[i+3]=e[0]!*u+e[4]!*v+e[8]!*w;f[i+4]=e[1]!*u+e[5]!*v+e[9]!*w;f[i+5]=e[2]!*u+e[6]!*v+e[10]!*w;f[i+6]=fs[i+6]!}
  const r=reading(p,f);if(!r)return undefined
  d.set(-r.gx,-r.gy,1).normalize();o.set(r.cx,r.cy,r.height).addScaledVector(d,-r.height/d.z)
  frame.multiply(step.compose(o,q.setFromUnitVectors(Z,d),ONE))
  if(Math.hypot(r.cx,r.cy)<1e-6&&Math.hypot(r.gx,r.gy)<1e-6)break
 }
 return frame
}
const lean=(m:T.Matrix4)=>Z.clone().transformDirection(m).angleTo(Z)*180/Math.PI,offset=(m:T.Matrix4)=>Math.hypot(m.elements[12]!,m.elements[13]!)
/** Plausible correction only: a fit that wants more than 4° or 15 mm read something other than a round piece. */
const plausible=(m:T.Matrix4)=>lean(m)<4&&offset(m)<.015

/** vertices and faces (centroid, unit normal, area) of meshes in the wheel's frame; a dense tyre is thinned to ~12k
 *  vertices and ~5k faces, plenty for 36 sectors and quick enough at load */
function body(meshes:T.Mesh[],toWheel:T.Matrix4,tyre=false):Body{
 const points:number[]=[],faces:number[]=[],a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),n=new T.Vector3()
 let rmin=Infinity,rmax=0
 for(const mesh of meshes){
  const p=mesh.geometry.getAttribute('position'),index=mesh.geometry.index,m=toWheel.clone().multiply(mesh.matrixWorld),base=points.length/3
  for(let i=0;i<p.count;i++){a.fromBufferAttribute(p,i).applyMatrix4(m);points.push(a.x,a.y,a.z);const r=Math.hypot(a.x,a.y);rmin=Math.min(rmin,r);rmax=Math.max(rmax,r)}
  const count=index?index.count:p.count,at=(i:number)=>(base+(index?index.getX(i):i))*3,stride=3*Math.max(1,Math.round(count/3/5000))
  for(let t=0;t+2<count;t+=stride){const i=at(t),j=at(t+1),k=at(t+2);a.fromArray(points,i);b.fromArray(points,j);c.fromArray(points,k);n.crossVectors(b.sub(a),c.sub(a));const area=n.length()/2;if(area<1e-12)continue
   n.normalize();faces.push((points[i]!+points[j]!+points[k]!)/3,(points[i+1]!+points[j+1]!+points[k+1]!)/3,(points[i+2]!+points[j+2]!+points[k+2]!)/3,n.x,n.y,n.z,area)}
 }
 const keep=Math.max(1,Math.round(points.length/3/12000)),thin=keep>1?Float64Array.from({length:Math.floor(points.length/3/keep)*3},(_,i)=>points[Math.floor(i/3)*keep*3+i%3]!):Float64Array.from(points)
 return {meshes,points:thin,faces:Float64Array.from(faces),rmin,rmax,tyre}
}

/** the fitted body a loose piece touches most (its vertices' nearest neighbours within 12 mm), else undefined */
function host(piece:Body,fitted:Body[]){
 const cell=.006,grid=new Map<string,[number,number,number,number][]>(),key=(x:number,y:number,z:number)=>Math.floor(x/cell)+','+Math.floor(y/cell)+','+Math.floor(z/cell)
 fitted.forEach((b,index)=>{for(let i=0;i<b.points.length;i+=3){const k=key(b.points[i]!,b.points[i+1]!,b.points[i+2]!);let l=grid.get(k);if(!l)grid.set(k,l=[]);if(l.length<24)l.push([b.points[i]!,b.points[i+1]!,b.points[i+2]!,index])}})
 const votes=new Map<number,number>(),stride=Math.max(1,Math.floor(piece.points.length/3/200))
 for(let i=0;i<piece.points.length;i+=3*stride){
  const x=piece.points[i]!,y=piece.points[i+1]!,z=piece.points[i+2]!;let best=.012**2,index=-1
  for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++)for(let c=-2;c<=2;c++)for(const q of grid.get(key(x+a*cell,y+b*cell,z+c*cell))??[]){const d=(q[0]-x)**2+(q[1]-y)**2+(q[2]-z)**2;if(d<best){best=d;index=q[3]}}
  if(index>=0)votes.set(index,(votes.get(index)??0)+1)
 }
 let top=-1,count=0;votes.forEach((n,i)=>{if(n>count){count=n;top=i}});return top>=0?fitted[top]:undefined
}

export function alignWheelAxes(wheels:T.Group[]){
 const report:{name:string,tilt:number,shift:number,moved:{name:string,mm:number,deg:number}[]}[]=[]
 for(const wheel of wheels){
  if(wheel.userData.trueAxle){report.push(wheel.userData.trueAxle);continue}
  wheel.updateWorldMatrix(true,true);const toWheel=wheel.matrixWorld.clone().invert()
  const meshes:T.Mesh[]=[];wheel.traverse(o=>{if(o instanceof T.Mesh&&!(o instanceof T.InstancedMesh))meshes.push(o)})
  const pieces=meshes.map(m=>body([m],toWheel));if(!pieces.length)continue
  const outer=Math.max(...pieces.map(p=>p.rmax)),tyres=pieces.filter(p=>p.rmin>outer*.55&&p.rmax>outer*.9)
  // the tyre's meshes (a lettering ring is a mesh of its own on some) are one rigid body
  const bodies=[...tyres.length?[body(tyres.flatMap(t=>t.meshes),toWheel,true)]:[],...pieces.filter(p=>!tyres.includes(p))]
  for(const b of bodies)if(b.points.length>=120)b.frame=fitAxle(b)
  const fitted=bodies.filter(b=>b.frame&&plausible(b.frame))
  const reference=fitted.filter(b=>!b.tyre&&b.rmax>outer*.6).sort((a,b)=>b.points.length-a.points.length)[0]??fitted.find(b=>b.tyre);if(!reference)continue
  const axle=reference.frame!,toAxle=axle.clone().invert()
  // each other body's correction in the axle frame: its own axle frame read there, undone
  const corrections=new Map<Body,T.Matrix4>()
  for(const b of fitted)if(b!==reference){const own=toAxle.clone().multiply(b.frame!);if(plausible(own))corrections.set(b,own.invert())}
  for(const b of bodies)if(!fitted.includes(b)){const h=host(b,fitted);if(h&&corrections.has(h))corrections.set(b,corrections.get(h)!)}
  // re-base the group onto the axle; every piece keeps its world pose except for its own correction
  const targets=new Map<T.Object3D,T.Matrix4>();wheel.traverse(o=>{if(o!==wheel)targets.set(o,o.matrixWorld.clone())})
  wheel.matrix.compose(wheel.position,wheel.quaternion,wheel.scale).multiply(axle).decompose(wheel.position,wheel.quaternion,wheel.scale);wheel.updateWorldMatrix(false,false)
  const frame=wheel.matrixWorld,unframe=frame.clone().invert(),moved:{name:string,mm:number,deg:number}[]=[]
  corrections.forEach((k,b)=>{const move=frame.clone().multiply(k).multiply(unframe);for(const m of b.meshes)targets.get(m)!.premultiply(move);moved.push({name:b.meshes[0]!.name.slice(0,32),mm:+(offset(k)*1000).toFixed(2),deg:+lean(k).toFixed(3)})})
  wheel.traverse(o=>{if(o===wheel)return;o.matrix.copy(o.parent!.matrixWorld).invert().multiply(targets.get(o)!).decompose(o.position,o.quaternion,o.scale);o.updateWorldMatrix(false,false)})
  const entry={name:wheel.name,tilt:+lean(axle).toFixed(3),shift:+(offset(axle)*1000).toFixed(2),moved}
  wheel.userData.trueAxle=entry;report.push(entry)
 }
 return report
}
