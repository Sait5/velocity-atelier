import * as T from 'three'

/** Two restrained architectural settings around the existing vehicle stage. */
export function createStudioBackdrop(){
 const group=new T.Group();group.name='Architectural studio backdrop'
 const wallMaterial=new T.MeshStandardMaterial({color:'#202c37',roughness:.94,side:T.BackSide})
 const wall=new T.Mesh(new T.CylinderGeometry(16,16,7,48,1,true),wallMaterial);wall.position.y=3.5;group.add(wall)
 const ribs=new T.InstancedMesh(new T.BoxGeometry(.055,6,.09),new T.MeshStandardMaterial({color:'#43505b',roughness:.7,metalness:.35}),24)
 const lights=new T.InstancedMesh(new T.BoxGeometry(.035,4.3,.035),new T.MeshBasicMaterial({color:'#a6bfd0',toneMapped:false}),12)
 const dummy=new T.Object3D()
 for(let i=0;i<24;i++){const a=i*Math.PI/12;dummy.position.set(Math.cos(a)*15.9,3,Math.sin(a)*15.9);dummy.rotation.y=-a;dummy.updateMatrix();ribs.setMatrixAt(i,dummy.matrix);if(i%2===0){dummy.position.y=2.7;dummy.updateMatrix();lights.setMatrixAt(i/2,dummy.matrix)}}
 ribs.computeBoundingSphere();lights.computeBoundingSphere();group.add(ribs,lights)
 function set(background:string,visible:boolean){group.visible=visible&&['#171e29','#292219'].includes(background);const warm=background==='#292219';wallMaterial.color.set(warm?'#393027':'#202c37');(lights.material as T.MeshBasicMaterial).color.set(warm?'#d3b592':'#a6bfd0')}
 return {group,set}
}
