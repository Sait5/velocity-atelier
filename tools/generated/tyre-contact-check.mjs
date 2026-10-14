// app/three/tyreContact.ts
import * as T from "three";

// app/three/roadSurface.ts
var ROAD_LEVEL = 7e-3;
function roadHeight(x, z, distance, italian) {
  if (!italian) return ROAD_LEVEL;
  const t = x - distance;
  return ROAD_LEVEL + 4e-3 * Math.sin(t * Math.PI / 12) + 2e-3 * Math.sin(t * Math.PI / 4 + z * 0.6) + 1e-3 * Math.sin(t * Math.PI / 3 - z * 0.4);
}

// app/three/tyreContact.ts
function createTyreContact(root, wheels, surface, lateralLimit = () => 2.7, followGrade = () => false) {
  const heightAt = (x, z, distance, italian) => surface?.(x, z, distance) ?? roadHeight(x, z, distance, italian);
  root.updateMatrixWorld(true);
  const rest = wheels.map((w) => w.position.clone()), scratch = new T.Vector3(), inverse = new T.Matrix4(), radii = wheels.map((w) => {
    const bounds = new T.Box3();
    w.traverse((o) => {
      if (o instanceof T.Mesh) {
        const m = Array.isArray(o.material) ? o.material : [o.material];
        if (m.some((m2) => /^Wheel(?:\.|$)|tyre|tire/i.test(m2.name))) bounds.expandByObject(o, true);
      }
    });
    if (bounds.isEmpty()) bounds.setFromObject(w, true);
    return (bounds.max.y - bounds.min.y) / 2;
  });
  const restHeight = rest.reduce((sum, p, i) => sum + 7e-3 + radii[i] - p.y, 0) / rest.length;
  const assemblies = wheels.map((w, i) => {
    const g = new T.Group();
    g.name = "Suspension carrier " + i;
    root.add(g);
    g.position.copy(rest[i]);
    root.updateMatrixWorld(true);
    g.attach(w);
    return g;
  });
  const hardware = [];
  root.traverse((o) => {
    if (o.name.startsWith("Fixed wheel hardware")) hardware.push(o);
  });
  hardware.forEach((o) => {
    let nearest = 0, best = Infinity;
    rest.forEach((p, i) => {
      const d = o.position.distanceToSquared(p);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    assemblies[nearest].attach(o);
  });
  const mass = 1800, stiffness = 42e3, damping = 4300, travel = 0.045, cgHeight = 0.43, wheelbase = Math.max(...rest.map((p) => p.x)) - Math.min(...rest.map((p) => p.x)), track = Math.max(...rest.map((p) => p.z)) - Math.min(...rest.map((p) => p.z));
  let smoothAcceleration = 0;
  let lateralForceAcceleration = 0;
  let speedBefore = 0, height = restHeight, heaveVelocity = 0, pitch = 0, pitchVelocity = 0, roll = 0, rollVelocity = 0, lateral = 0, lateralSpeed = 0, heading = 0, steering = 0, previousDistance = 0;
  const contacts = rest.map(() => new T.Vector3()), suspension = rest.map(() => 0);
  let previousGroundTarget = restHeight, previousSlope = 0;
  function reset() {
    speedBefore = heaveVelocity = pitch = pitchVelocity = roll = rollVelocity = lateral = lateralSpeed = heading = steering = previousDistance = 0;
    lateralForceAcceleration = 0;
    smoothAcceleration = 0;
    height = restHeight;
    previousGroundTarget = restHeight;
    previousSlope = 0;
    root.position.set(0, height, 0);
    root.rotation.set(0, 0, 0);
    assemblies.forEach((g, i) => g.position.copy(rest[i]));
    update(0, 0, 1 / 120, false, 0);
  }
  function update(speed, distance, dt, italian, steer = 0) {
    const duration = Math.max(1e-3, Math.min(dt, 0.1)), rawAcceleration = T.MathUtils.clamp((speed - speedBefore) / duration, -12, 10);
    speedBefore = speed;
    smoothAcceleration = T.MathUtils.damp(smoothAcceleration, rawAcceleration, 4, duration);
    const acceleration = smoothAcceleration;
    steering = T.MathUtils.damp(steering, steer, 7, duration);
    const wantedLateral = Math.abs(speed) > 1 ? steering * Math.min(Math.abs(speed) * 0.04, 1.2) : 0;
    const limit = lateralLimit(), lateralBefore = lateralSpeed;
    lateralSpeed = T.MathUtils.damp(lateralSpeed, wantedLateral, 5, duration);
    lateral = T.MathUtils.clamp(lateral + lateralSpeed * duration, -limit, limit);
    if (Math.abs(lateral) >= limit) lateralSpeed = 0;
    const lateralAcceleration = T.MathUtils.clamp((lateralSpeed - lateralBefore) / duration, -3, 3);
    lateralForceAcceleration = lateralAcceleration;
    heading = T.MathUtils.damp(heading, -Math.atan2(lateralSpeed, Math.max(Math.abs(speed), 8)), 6, duration);
    let elapsed = 0;
    while (elapsed < duration) {
      const step = Math.min(1 / 120, duration - elapsed), d = T.MathUtils.lerp(previousDistance, distance, (elapsed + step) / duration);
      const ground = rest.map((p) => heightAt(p.x * Math.cos(heading) + p.z * Math.sin(heading), lateral - p.x * Math.sin(heading) + p.z * Math.cos(heading), d, italian));
      const targetHeight = restHeight + ground.reduce((a, h) => a + h - 7e-3, 0) / ground.length;
      const front = rest.map((p, i) => p.x < 0 ? ground[i] : NaN).filter(Number.isFinite), back = rest.map((p, i) => p.x >= 0 ? ground[i] : NaN).filter(Number.isFinite), left = rest.map((p, i) => p.z < 0 ? ground[i] : NaN).filter(Number.isFinite), right = rest.map((p, i) => p.z >= 0 ? ground[i] : NaN).filter(Number.isFinite), mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
      const slopePitch = (mean(back) - mean(front)) / Math.max(wheelbase, 1), slopeRoll = (mean(right) - mean(left)) / Math.max(track, 1);
      const gradePitch = Math.atan(slopePitch), targetPitch = followGrade() ? T.MathUtils.clamp(gradePitch - acceleration * cgHeight * 18e-4, -0.5, 0.5) : T.MathUtils.clamp(slopePitch - acceleration * cgHeight * 18e-4, -0.015, 0.015), targetRoll = T.MathUtils.clamp(slopeRoll - lateralAcceleration * cgHeight * 3e-3, -0.018, 0.018);
      if (followGrade()) {
        height += targetHeight - previousGroundTarget;
        pitch += gradePitch - previousSlope;
      }
      previousGroundTarget = targetHeight;
      previousSlope = gradePitch;
      heaveVelocity += (4 * stiffness / mass * (targetHeight - height) - 4 * damping / mass * heaveVelocity) * step;
      height += heaveVelocity * step;
      pitchVelocity += ((targetPitch - pitch) * 90 - pitchVelocity * 18) * step;
      pitch += pitchVelocity * step;
      rollVelocity += ((targetRoll - roll) * 90 - rollVelocity * 18) * step;
      roll += rollVelocity * step;
      elapsed += step;
    }
    previousDistance = distance;
    root.position.set(0, height, lateral);
    root.rotation.set(roll, heading, pitch, "YXZ");
    root.updateMatrixWorld(true);
    inverse.copy(root.matrixWorld).invert();
    assemblies.forEach((g, i) => {
      const p = rest[i];
      scratch.copy(p).applyMatrix4(root.matrixWorld);
      const ground = heightAt(scratch.x, scratch.z, distance, italian);
      contacts[i].set(scratch.x, ground, scratch.z);
      scratch.y = ground + radii[i];
      scratch.applyMatrix4(inverse);
      suspension[i] = T.MathUtils.damp(suspension[i], T.MathUtils.clamp(scratch.y - p.y, -travel, travel), 20, duration);
      g.position.copy(p);
      g.position.y += suspension[i];
      g.rotation.y = p.x < 0 ? steering * 0.045 / (1 + Math.abs(speed) * 0.035) : 0;
      wheels[i].scale.set(1, 1, 1);
    });
  }
  reset();
  return { update, reset, radii, contacts, suspension, assemblies, get heading() {
    return heading;
  }, get lateralAcceleration() {
    return lateralForceAcceleration;
  }, parameters: { mass, stiffness, damping, travel, cgHeight, grip: 1.05 } };
}
export {
  createTyreContact
};
