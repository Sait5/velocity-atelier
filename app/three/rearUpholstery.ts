import * as T from 'three'
export function addRearUpholstery(cabin:T.Group,material:T.Material){
 const shape=new T.Shape();shape.moveTo(.38,-.91);shape.lineTo(.50,-.91);shape.quadraticCurveTo(.62,-.91,.62,-.77);shape.lineTo(.62,.77);shape.quadraticCurveTo(.62,.91,.50,.91);shape.lineTo(.38,.91);shape.lineTo(.38,.77);shape.lineTo(.435,.77);shape.quadraticCurveTo(.455,.77,.455,.65);shape.lineTo(.455,-.65);shape.quadraticCurveTo(.455,-.77,.435,-.77);shape.lineTo(.38,-.77);shape.closePath()
 const geometry=new T.ExtrudeGeometry(shape,{depth:.69,steps:1,bevelEnabled:true,bevelSegments:5,bevelSize:.012,bevelThickness:.012,curveSegments:32});geometry.rotateX(Math.PI/2);geometry.translate(0,.94,0)
 const wrap=new T.Mesh(geometry,material);wrap.name='rear_upholstery_wrap';wrap.castShadow=wrap.receiveShadow=true;cabin.add(wrap)
 const floor=new T.Mesh(new T.BoxGeometry(.50,.025,1.76),material);floor.position.set(.455,.219,0);floor.name='rear_floor_closure';floor.receiveShadow=true;cabin.add(floor)
 return wrap
}
