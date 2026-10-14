/** A closed height field prevents holes left by cropping arbitrary source triangles. */
export function createDesertSurface(){
 const width=24,depth=80,step=.5,columns=97,rows=321,count=columns*rows
 const height=new Float32Array(count),u=new Float32Array(count),v=new Float32Array(count),distance=new Float32Array(count).fill(Infinity)
 function sample(x:number,z:number,y:number,tu:number,tv:number){
  if(Math.abs(x)>width+.5||Math.abs(z)>depth+.5)return
  const col=Math.max(0,Math.min(columns-1,Math.round((x+width)/step))),row=Math.max(0,Math.min(rows-1,Math.round((z+depth)/step))),i=row*columns+col
  const d=(x-(-width+col*step))**2+(z-(-depth+row*step))**2
  if(d<distance[i]!){distance[i]=d;height[i]=y;u[i]=tu;v[i]=tv}
 }
 function finish(){
  // Fill only missing sampling cells; every cell is then triangulated, including boundaries.
  for(let pass=0;pass<16&&distance.some(d=>!Number.isFinite(d));pass++){
   const pending:number[]=[]
   for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
    const i=row*columns+col;if(Number.isFinite(distance[i]!))continue
    const neighbors=[col?i-1:-1,col<columns-1?i+1:-1,row?i-columns:-1,row<rows-1?i+columns:-1].filter(n=>n>=0&&Number.isFinite(distance[n]!))
    if(!neighbors.length)continue
    for(const n of neighbors){height[i]!+=height[n]!/neighbors.length;u[i]!+=u[n]!/neighbors.length;v[i]!+=v[n]!/neighbors.length}pending.push(i)
   }
   for(const i of pending)distance[i]=0
  }
  if(distance.some(d=>!Number.isFinite(d)))throw new Error('Incomplete desert terrain sampling')
  // Match repeated segment borders while preserving the nearby relief.
  for(let col=0;col<columns;col++){
   const seam=(height[col]!+height[(rows-1)*columns+col]!)/2
   for(let offset=0;offset<=16;offset++){
    const t=offset/16,weight=1-t*t*(3-2*t)
    for(const row of [offset,rows-1-offset]){const i=row*columns+col;height[i]=height[i]!*(1-weight)+seam*weight}
   }
  }
  return {width,depth,step,columns,rows,height,u,v}
 }
 return {sample,finish}
}
