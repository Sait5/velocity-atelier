import * as T from 'three'
import fit from './data/revueltoFoldingBracket.json'

/** A simple rectangular metal connector with constant-size nested sections. */
export function createRevueltoBracketConnection(root:T.Group,door:T.Group,side:number){
 const group=new T.Group();group.name=`Revuelto original bracket connection ${side>0?'L':'R'}`;root.add(group)
 const originalHook=door.getObjectByName(`DoorJamb${side>0?'L':'R'}F_OriginalOrangeBracket`)
 if(!originalHook)throw new Error('Original Revuelto hook missing')
 const hook=originalHook
 root.updateWorldMatrix(true,true)
 const hookBinding=door.matrixWorld.clone().invert().multiply(hook.matrixWorld)
  // Keep the original door-side flange in place; replace only the projecting hook.
 if(hook instanceof T.Mesh){
  const index=hook.geometry.index!,positions=hook.geometry.getAttribute('position'),kept:number[]=[]
  const worldToRoot=root.matrixWorld.clone().invert(),point=new T.Vector3()
  for(let i=0;i<index.count;i+=3){
   point.set(0,0,0)
   for(let k=0;k<3;k++)point.add(new T.Vector3().fromBufferAttribute(positions,index.getX(i+k)))
   point.multiplyScalar(1/3).applyMatrix4(hook.matrixWorld).applyMatrix4(worldToRoot)
   if(point.x>-.85&&point.y<.585)kept.push(index.getX(i),index.getX(i+1),index.getX(i+2))
  }
  hook.geometry=hook.geometry.clone();hook.geometry.setIndex(kept)
 }
 group.attach(hook);hook.matrixAutoUpdate=false;hook.visible=false
 const material=new T.MeshStandardMaterial({color:0x34383c,metalness:.65,roughness:.4})
 const length=.09
 const links=[.028,.022,.016].map((width,i)=>{const mesh=new T.Mesh(new T.BoxGeometry(width,length,.016-i*.004),material);mesh.name=['Body metal bar','Middle metal bar','Door metal bar'][i]!;group.add(mesh);return mesh})
 const pins=['Pillar connection pin','Original hook connection pin'].map(name=>{const mesh=new T.Mesh(new T.BoxGeometry(.032,.012,.018),material);mesh.name=name;group.add(mesh);return mesh})
  const bodyPoint=new T.Vector3(fit.bodyPoint[0],fit.bodyPoint[1],side*fit.bodyPoint[2]!)
 const plate=new T.Mesh(new T.BoxGeometry(.034,.048,.008),material)
 plate.name='Body mount plate on marked inner panel'
 plate.position.set(fit.surfacePoint[0]!,fit.surfacePoint[1]!,side*fit.surfacePoint[2]!)
 plate.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(fit.surfaceNormal[0],fit.surfaceNormal[1],side*fit.surfaceNormal[2]!).normalize())
 group.add(plate)
 const standOff=new T.Mesh(new T.CylinderGeometry(.007,.007,.018,12),material)
 standOff.name='Body mount pivot standoff';standOff.position.copy(plate.position).add(bodyPoint).multiplyScalar(.5)
 standOff.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(1,0,0));group.add(standOff)
 const closedHookPoint=new T.Vector3(fit.doorMountPoint[0],fit.doorMountPoint[1],side*fit.doorMountPoint[2]!)
 const hookPoint=door.worldToLocal(root.localToWorld(closedHookPoint.clone()))
 // One solid flange replaces the overlapping, cut orange hook surface.
 const doorPad=new T.Mesh(new T.BoxGeometry(.045,.026,.04),material)
 doorPad.name='Solid door connector flange';doorPad.matrixAutoUpdate=false;group.add(doorPad)
 const padBinding=door.matrixWorld.clone().invert().multiply(root.matrixWorld).multiply(new T.Matrix4().makeTranslation(closedHookPoint.x,closedHookPoint.y,closedHookPoint.z))
 const axis=new T.Vector3(0,1,0),direction=new T.Vector3(),moving=new T.Vector3()
 function update(){
  moving.copy(hookPoint);door.localToWorld(moving);root.worldToLocal(moving)
  const distance=bodyPoint.distanceTo(moving)
  if(distance>length*3||distance<length)throw new Error('Revuelto metal connector exceeds its sliding range')
  direction.subVectors(moving,bodyPoint).normalize()
  const centers=[length/2,distance/2,distance-length/2]
  links.forEach((link,i)=>{link.position.copy(bodyPoint).addScaledVector(direction,centers[i]!);link.quaternion.setFromUnitVectors(axis,direction)})
  pins[0]!.position.copy(bodyPoint);pins[1]!.position.copy(moving)
  pins.forEach(pin=>pin.quaternion.copy(links[0]!.quaternion))
  hook.matrix.copy(root.matrixWorld).invert().multiply(door.matrixWorld).multiply(hookBinding)
  doorPad.matrix.copy(root.matrixWorld).invert().multiply(door.matrixWorld).multiply(padBinding)
  group.updateWorldMatrix(true,true)
  group.userData.anchorDistance=distance;group.userData.reachMargin=length*3-distance;group.userData.sectionOverlap=length*1.5-distance/2
 }
 update()
 return {update,group,hookPoint,bodyPoint}
}





