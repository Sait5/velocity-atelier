// Pull named nodes' geometry (world positions + triangles) out of a COLLADA file without a full parser.
const fs=require('fs');const [file,out,...names]=process.argv.slice(2);const x=fs.readFileSync(file,'utf8')
function nodeBlock(name){const i=x.indexOf(`name="${name}"`);if(i<0)return null;const s=x.lastIndexOf('<node',i);return x.slice(s,x.indexOf('</node>',s))}
function geom(id){const s=x.indexOf(`<geometry id="${id}"`);return x.slice(s,x.indexOf('</geometry>',s))}
const res={}
for(const name of names){const b=nodeBlock(name);if(!b){console.log('missing',name);continue}
 const m=(b.match(/<matrix[^>]*>([^<]*)<\/matrix>/)||[])[1];const M=m?m.trim().split(/\s+/).map(Number):[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
 const urls=[...b.matchAll(/<instance_geometry url="#([^"]+)"/g)].map(r=>r[1]);const V=[],T=[]
 for(const id of urls){const g=geom(id);const vin=(g.match(/<vertices id="[^"]*">\s*<input semantic="POSITION" source="#([^"]+)"/)||[])[1]
  const si=g.indexOf(`<source id="${vin}"`);const fa=g.slice(si).match(/<float_array[^>]*>([^<]*)</);const p=fa[1].trim().split(/\s+/).map(Number);const base=V.length
  for(let i=0;i<p.length;i+=3){const a=p[i],b2=p[i+1],c=p[i+2];V.push([M[0]*a+M[1]*b2+M[2]*c+M[3],M[4]*a+M[5]*b2+M[6]*c+M[7],M[8]*a+M[9]*b2+M[10]*c+M[11]])}
  for(const tri of g.matchAll(/<(triangles|polylist)[^>]*>([\s\S]*?)<\/\1>/g)){const blk=tri[2];const inputs=[...blk.matchAll(/<input semantic="([A-Z]+)"[^>]*offset="(\d+)"/g)];const stride=Math.max(...inputs.map(r=>+r[2]))+1;const voff=+inputs.find(r=>r[1]==='VERTEX')[2]
   const idx=blk.match(/<p>([^<]*)<\/p>/)[1].trim().split(/\s+/).map(Number);const vc=(blk.match(/<vcount>([^<]*)<\/vcount>/)||[])[1];const counts=vc?vc.trim().split(/\s+/).map(Number):null
   let k=0;if(counts){for(const n of counts){const poly=[];for(let j=0;j<n;j++)poly.push(base+idx[(k+j)*stride+voff]);k+=n;for(let j=1;j<n-1;j++)T.push([poly[0],poly[j],poly[j+1]])}}else{for(let j=0;j<idx.length/stride;j+=3)T.push([0,1,2].map(q=>base+idx[(j+q)*stride+voff]))}}}
 let lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];for(const v of V)for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],v[i]);hi[i]=Math.max(hi[i],v[i])}
 console.log(name,'geoms',urls.length,'verts',V.length,'tris',T.length,'lo',lo.map(v=>v.toFixed(3)).join(','),'hi',hi.map(v=>v.toFixed(3)).join(','))
 res[name]={V,T}}
if(out!=='-')fs.writeFileSync(out,JSON.stringify(res))
