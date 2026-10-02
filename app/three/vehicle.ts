import * as T from 'three'
export function createVehicle(shape=0) {
 const root=new T.Group(), body=new T.MeshPhysicalMaterial({color:'#b4ca54',metalness:0.68,roughness:0.26,clearcoat:1,clearcoatRoughness:0.12})
 const black=new T.MeshStandardMaterial({color:'#111619',metalness:0.65,roughness:0.35}),glass=new T.MeshPhysicalMaterial({color:'#071015',metalness:0.55,roughness:0.08,clearcoat:1}),rim=new T.MeshStandardMaterial({color:'#a8acad',metalness:0.94,roughness:0.22}),brake=new T.MeshStandardMaterial({color:'#d9e678'})
 const white=new T.MeshStandardMaterial({color:'#efffff',emissive:'#d5f4ff',emissiveIntensity:4}),red=new T.MeshStandardMaterial({color:'#ff2a18',emissive:'#ff1e10',emissiveIntensity:3})
 function mesh(g:T.BufferGeometry,m:T.Material,p:number[],parent=root){const o=new T.Mesh(g,m);o.position.set(p[0]!,p[1]!,p[2]!);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
 function box(s:number[],p:number[],m:T.Material=body,parent=root){return mesh(new T.BoxGeometry(s[0],s[1],s[2]),m,p,parent)}
 function loft(rows:number[][],mat:T.Material,parent=root){const vertices:number[]=[],indices:number[]=[];rows.forEach(([x,w,lo,hi])=>vertices.push(x! ,lo!,-w!,x!,lo!,w!,x!,hi!,w!*.84,x!,hi!,-w!*.84));for(let j=0;j<rows.length-1;j++)for(let k=0;k<4;k++){let a=j*4+k,b=j*4+(k+1)%4,c=b+4,d=a+4;indices.push(a,d,b,b,d,c)}indices.push(0,3,1,1,3,2);const a=(rows.length-1)*4;indices.push(a,a+1,a+3,a+1,a+2,a+3);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return mesh(g,mat,[0,0,0],parent)}
 const rounded=shape===1||shape===2||shape===6
 loft([[-2.4,.76,.35,.53],[-1.92,1.01,.32,.72],[-1.38,1.02,.35,.86],[-.9,.95,.4,.82],[.65,.96,.4,.83],[1.5,1.06,.35,.88],[2.2,1,.35,.7],[2.35,.85,.42,.64]],body)
 loft([[-1.16,.7,.78,.8],[-.48,.68,.85,rounded?1.41:1.29],[.37,.68,.85,1.4],[1.05,.73,.81,.95]],glass)
 loft([[-.48,.69,1.25,1.3],[.38,.7,1.35,1.4],[.72,.68,1.2,1.25]],body)
 loft([[-2.45,.82,.29,.34],[-1.7,1.03,.28,.32],[1.7,1.07,.28,.32],[2.38,.9,.3,.35]],black)
 for(const side of [-1,1]){
  box([1.4,.11,.12],[.1,.39,side*1.02],black);box([.5,.17,.04],[-1.96,.49,side*.67],black)
  const strip=box([.5,.027,.05],[-2.27,.63,side*.62],white);strip.rotation.y=side*.19
  const fork=box([.25,.025,.04],[-2.17,.59,side*.77],white);fork.rotation.z=-.3
  box([.055,.03,.69],[2.37,.65,side*.48],red)
  const vent=box([.55,.25,.05],[.88,.63,side*1.015],black);vent.rotation.z=.18
  const mirror=box([.24,.08,.16],[-.5,1.06,side*.89],black);mirror.rotation.y=side*.2
 }
 for(let i=0;i<8;i++)box([.72,.016,.038],[1.42,.91,-.36+i*.103],black)
 const doors:T.Group[]=[]
 for(const side of [-1,1]){const pivot=new T.Group();pivot.position.set(-.83,.75,side*.88);root.add(pivot);const panel=box([1.45,.26,.1],[.72,-.035,side*.07],body,pivot);panel.rotation.z=.04;box([1.35,.035,.05],[.72,.14,side*.05],black,pivot);doors.push(pivot)}
 const wheels:T.Group[]=[],spokes:T.Group[]=[]
 for(const x of [-1.5,1.5])for(const z of [-1,1]){
  const w=new T.Group();w.position.set(x,.48,z);root.add(w);wheels.push(w)
  const tyre=mesh(new T.TorusGeometry(.355,.115,12,40),new T.MeshStandardMaterial({color:'#101112',roughness:.89}),[0,0,0],w)
  const disc=mesh(new T.CylinderGeometry(.29,.29,.16,32),black,[0,0,0],w);disc.rotation.x=Math.PI/2
  const rotor=mesh(new T.CylinderGeometry(.235,.235,.015,32),rim,[0,0,z>0?.1:-.1],w);rotor.rotation.x=Math.PI/2
  const sg=new T.Group();sg.position.z=z>0?.13:-.13;w.add(sg);spokes.push(sg)
  for(let j=0;j<10;j++){const a=j*Math.PI/5;const s=box([.034,.28,.027],[Math.sin(a)*.14,Math.cos(a)*.14,0],rim,sg);s.rotation.z=-a}
  const hub=mesh(new T.CylinderGeometry(.065,.065,.04,16),black,[0,0,z>0?.16:-.16],w);hub.rotation.x=Math.PI/2
  box([.085,.18,.08],[.18,.04,z>0?.095:-.095],brake,w)
 }
 if(shape===1||shape===7){box([.38,.055,2.15],[2.02,1.16,0],black);for(const z of [-.65,.65])box([.08,.38,.06],[2.02,.96,z],black)}
 const leather=new T.MeshStandardMaterial({color:'#252b26',roughness:.85})
 for(const z of [-.36,.36]){box([.56,.18,.46],[.33,.7,z],leather);const seat=box([.17,.5,.46],[.55,.94,z],leather);seat.rotation.z=.15}
 box([.24,.16,1.3],[-.62,.94,0],black);box([.55,.04,.13],[.02,.76,0],black)
 const steer=mesh(new T.TorusGeometry(.17,.023,8,24),black,[-.42,1.04,.38]);steer.rotation.y=Math.PI/2
 box([.025,.1,.24],[-.48,1.0,.04],new T.MeshStandardMaterial({color:'#80c8af',emissive:'#6eb796',emissiveIntensity:1}))
 root.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=true})
 return {root,body,rim,brake,doors,wheels,spokes,glass,white,leather,dispose(){const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();root.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m))}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose())}}
}
