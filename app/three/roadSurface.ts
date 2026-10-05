/** Same height field is used by the rendered road and the wheel ground queries. */
export const ROAD_LEVEL=.007
export function roadHeight(x:number,z:number,distance:number,italian:boolean){
 if(!italian)return ROAD_LEVEL
 const t=x-distance
 return ROAD_LEVEL+.004*Math.sin(t*Math.PI/12)+.002*Math.sin(t*Math.PI/4+z*.6)+.001*Math.sin(t*Math.PI/3-z*.4)
}
export const roadHeightGLSL=`float surfaceHeight(float x,float z,float travel){float t=x-travel;return .004*sin(t*3.14159265359/12.)+.002*sin(t*3.14159265359/4.+z*.6)+.001*sin(t*3.14159265359/3.-z*.4);}`
