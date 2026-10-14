import * as T from 'three'
import legacyFaces from './data/revueltoLegacyHingeFaces.json'

/** Hide only the disconnected original hook identified in the user's photo. */
export function hideRevueltoLegacyHooks(root:T.Object3D){
 const masks=legacyFaces as Record<string,string[]>
 root.traverse(o=>{
  if(!(o instanceof T.Mesh)||!masks[o.name])return
  const geometry=o.geometry,index=geometry.index,positions=geometry.getAttribute('position')
  if(!index)throw new Error('Revuelto legacy hook requires indexed geometry')
  const mask=new Set(masks[o.name]),kept:number[]=[],bracket:number[]=[];let removed=0
  const point=(i:number)=>[positions.getX(i),positions.getY(i),positions.getZ(i)].map(n=>Math.round(n*100000)).join(',')
  for(let i=0;i<index.count;i+=3){const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)],key=ids.map(point).sort().join(';');if(mask.has(key)){removed++;bracket.push(...ids)}else kept.push(...ids)}
  if(removed!==mask.size)throw new Error(`Revuelto legacy hook mismatch: ${o.name}, ${removed}/${mask.size}`)
  o.geometry=geometry.clone();o.geometry.setIndex(kept);o.userData.hiddenLegacyHookFaces=removed
  if(/^DoorJamb[LR]F_CarPaint$/.test(o.name)){
   // The original orange hook is a rigid part of the moving door.
   const part=new T.Mesh(geometry.clone(),o.material);part.geometry.setIndex(bracket)
   part.name=o.name.replace('_CarPaint','_OriginalOrangeBracket')
   part.position.copy(o.position);part.quaternion.copy(o.quaternion);part.scale.copy(o.scale)
   part.visible=true;part.userData.originalOrangeBracket=true;o.parent!.add(part)
  }
 })
}
