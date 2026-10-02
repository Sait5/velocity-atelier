// The same edge coordinates are used for visible rails and Rapier colliders.
export const ROAD_BARRIER_Z=6.35
export function roadClearance(angle:number){
 return ROAD_BARRIER_Z-.12-Math.abs(Math.sin(angle))*2.3-Math.abs(Math.cos(angle))*.95-.06
}
export function constrainToRoad(x:number,z:number,angle:number,vx:number,vz:number){
 const limit=roadClearance(angle),bounded=Math.max(-limit,Math.min(limit,z)),hit=bounded!==z
 return {x,z:bounded,vx:hit?vx*.98:vx,vz:hit&&Math.sign(vz)===Math.sign(z)?0:vz,hit}
}
