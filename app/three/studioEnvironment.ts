import * as T from 'three'

/** Broad white light cards make continuous reflections without tinting paint. */
export function createStudioEnvironment(){
 const scene=new T.Scene();scene.background=new T.Color('#101319')
 const room=new T.Mesh(new T.BoxGeometry(24,14,24),new T.MeshBasicMaterial({color:'#15191f',side:T.BackSide}));room.position.y=4;scene.add(room)
 const panel=(width:number,height:number,position:T.Vector3,brightness:number)=>{
  const material=new T.MeshBasicMaterial({color:new T.Color(brightness,brightness,brightness),side:T.DoubleSide})
  const mesh=new T.Mesh(new T.PlaneGeometry(width,height),material);mesh.position.copy(position);mesh.lookAt(0,.65,0);scene.add(mesh)
 }
 panel(9,1.7,new T.Vector3(0,5,0),6)
 panel(8,1.25,new T.Vector3(-.4,2.7,4.8),5)
 panel(7,1.1,new T.Vector3(.4,3.5,-4.5),4)
 panel(3,4,new T.Vector3(-5,2.5,-1),3)
 panel(2.5,3.5,new T.Vector3(5,2.3,1),3)
 return {scene,dispose(){scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose()}})}}
}
