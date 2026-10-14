import * as T from 'three';
/** A single inclined hinge axis, mirrored across the car centreline. */
export function revueltoDoorPivot(side) { return new T.Vector3(-.80, .98, side * .86); }
export function revueltoDoorAxis(side) { return new T.Vector3(side * .035, -side * .55, 1).normalize(); }
export function setRevueltoDoorPose(door, side, progress) {
    const pivot = revueltoDoorPivot(side), rest = new T.Vector3(-1.10, .64, side * .86);
    door.quaternion.setFromAxisAngle(revueltoDoorAxis(side), 1.22 * T.MathUtils.clamp(progress, 0, 1));
    door.position.copy(rest).sub(pivot).applyQuaternion(door.quaternion).add(pivot);
}
