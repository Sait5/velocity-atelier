import * as T from 'three'

/**
 * Scissor hinge: the tip of the door's own gooseneck arm turns in the body bracket at the base of the A-pillar.
 * Axis mostly across the car, tilted so the door also swings slightly outward; mirrored across the centreline.
 * Fitted in Blender: no door/body collisions while opening, front edge stays at the pillar.
 */
export function revueltoDoorPivot(side:number){return new T.Vector3(-.955,.67,side*.89)}
export function revueltoDoorAxis(side:number){return new T.Vector3(0,-side*.55,1).normalize()}
export const revueltoDoorOpening=1.22
export function setRevueltoDoorPose(door:T.Object3D,side:number,progress:number){
 const pivot=revueltoDoorPivot(side),rest=new T.Vector3(-1.10,.64,side*.86)
 door.quaternion.setFromAxisAngle(revueltoDoorAxis(side),revueltoDoorOpening*T.MathUtils.clamp(progress,0,1))
 door.position.copy(rest).sub(pivot).applyQuaternion(door.quaternion).add(pivot)
}
/** Native gas strut ends (car coordinates, +z side): body end low in the jamb, door end at the base of the hinge arm. */
export const revueltoStrut={body:new T.Vector3(-.795,.267,.877),door:new T.Vector3(-.856,.545,.924)}
