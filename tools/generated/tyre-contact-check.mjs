// app/three/tyreContact.ts
import * as T2 from "three";

// app/three/wheelAxis.ts
import * as T from "three";
var SECTORS = 36;
var ONE = new T.Vector3(1, 1, 1);
var Z = new T.Vector3(0, 0, 1);
var median = (values) => {
  const s = [...values].sort((a, b) => a - b);
  return s[s.length >> 1] ?? 0;
};
function solve(n, rows, weights) {
  const M = Array.from({ length: n }, () => new Array(n + 1).fill(0));
  rows.forEach((row, k) => {
    const w = weights?.[k] ?? 1;
    for (let i = 0; i < n; i++) for (let j = 0; j <= n; j++) M[i][j] += w * row[i] * row[j];
  });
  for (let i = 0; i < n; i++) M[i][i] += 1e-12;
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
    [M[i], M[p]] = [M[p], M[i]];
    if (Math.abs(M[i][i]) < 1e-12) return null;
    for (let k = 0; k < n; k++) if (k !== i) {
      const f = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}
function robust(rows, columns, residual) {
  let fit = solve(3, rows.map(columns));
  for (let pass = 0; fit && pass < 2; pass++) {
    const r = rows.map((row) => Math.abs(residual(row, fit))), limit = Math.max(4e-4, 4 * median(r)), kept = rows.filter((_, i) => r[i] <= limit);
    if (kept.length === rows.length || kept.length < rows.length * 0.6) break;
    const next = solve(3, kept.map(columns));
    if (!next) break;
    fit = next;
    rows = kept;
  }
  return fit;
}
var circle = (rows) => {
  const f = robust(rows, ([x, y]) => [x, y, 1, x * x + y * y], ([x, y], [p, q, k]) => {
    const cx = p / 2, cy = q / 2;
    return Math.hypot(x - cx, y - cy) - Math.sqrt(k + cx * cx + cy * cy);
  });
  return f && [f[0] / 2, f[1] / 2];
};
var plane = (rows) => robust(rows, ([x, y, z]) => [1, x, y, z], ([x, y, z], [a, gx, gy]) => z - a - gx * x - gy * y);
function faceLean(p, rmax, band) {
  const high = [], low = [];
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = p[i + 1], z = p[i + 2];
    if (Math.hypot(x, y) <= rmax * band) continue;
    const s = Math.floor((Math.atan2(y, x) / (Math.PI * 2) + 1) * SECTORS) % SECTORS;
    if (!(high[s] && high[s][2] >= z)) high[s] = [x, y, z];
    if (!(low[s] && low[s][2] <= z)) low[s] = [x, y, z];
  }
  const out = high.filter(Boolean), inn = low.filter(Boolean);
  if (out.length < SECTORS * 0.4) return void 0;
  const a = plane(out), b = plane(inn);
  return a && b ? [(a[1] + b[1]) / 2, (a[2] + b[2]) / 2] : void 0;
}
function normalLean(f) {
  const rows = [], weights = [];
  for (let i = 0; i < f.length; i += 7) {
    const px = f[i], py = f[i + 1], pz = f[i + 2], nx = f[i + 3], ny = f[i + 4], nz = f[i + 5];
    rows.push([-ny, nx, nz * py - ny * pz, nx * pz - nz * px, nx * py - ny * px]);
    weights.push(f[i + 6]);
  }
  if (rows.length < 30) return void 0;
  let x = solve(4, rows, weights);
  if (!x) return void 0;
  const e = rows.map((r) => Math.abs(r[0] * x[0] + r[1] * x[1] + r[2] * x[2] + r[3] * x[3] - r[4])), scale = Math.max(1e-6, 3 * median(e));
  x = solve(4, rows, weights.map((w, k) => w / (1 + (e[k] / scale) ** 2))) ?? x;
  return [-x[2], -x[3]];
}
function reading(p, f) {
  let rmax = 0;
  for (let i = 0; i < p.length; i += 3) rmax = Math.max(rmax, Math.hypot(p[i], p[i + 1]));
  const edge = rmax - Math.max(2e-3, rmax * 0.015), top = [];
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = p[i + 1], r = Math.hypot(x, y), s = Math.floor((Math.atan2(y, x) / (Math.PI * 2) + 1) * SECTORS) % SECTORS;
    if (r > edge && !(top[s] && top[s][3] >= r)) top[s] = [x, y, p[i + 2], r];
  }
  const rim = top.filter(Boolean);
  if (rim.length < SECTORS * 0.4) return void 0;
  const c = circle(rim), leans = [faceLean(p, rmax, 0.7), faceLean(p, rmax, 0.93), normalLean(f)].filter((g) => g && g.every(Number.isFinite));
  if (!c || !leans.length) return void 0;
  const pick = (k) => leans.length === 2 ? (leans[0][k] + leans[1][k]) / 2 : median(leans.map((g) => g[k]));
  return { cx: c[0], cy: c[1], height: rim.reduce((s, q) => s + q[2], 0) / rim.length, gx: pick(0), gy: pick(1) };
}
function fitAxle(b) {
  const frame = new T.Matrix4(), inverse = new T.Matrix4(), p = new Float64Array(b.points.length), f = new Float64Array(b.faces.length), step = new T.Matrix4(), d = new T.Vector3(), o = new T.Vector3(), q = new T.Quaternion();
  for (let k = 0; k < 12; k++) {
    const e = inverse.copy(frame).invert().elements, src = b.points, fs = b.faces;
    for (let i = 0; i < src.length; i += 3) {
      const x = src[i], y = src[i + 1], z = src[i + 2];
      p[i] = e[0] * x + e[4] * y + e[8] * z + e[12];
      p[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
      p[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
    }
    for (let i = 0; i < fs.length; i += 7) {
      const x = fs[i], y = fs[i + 1], z = fs[i + 2], u = fs[i + 3], v = fs[i + 4], w = fs[i + 5];
      f[i] = e[0] * x + e[4] * y + e[8] * z + e[12];
      f[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
      f[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
      f[i + 3] = e[0] * u + e[4] * v + e[8] * w;
      f[i + 4] = e[1] * u + e[5] * v + e[9] * w;
      f[i + 5] = e[2] * u + e[6] * v + e[10] * w;
      f[i + 6] = fs[i + 6];
    }
    const r = reading(p, f);
    if (!r) return void 0;
    d.set(-r.gx, -r.gy, 1).normalize();
    o.set(r.cx, r.cy, r.height).addScaledVector(d, -r.height / d.z);
    frame.multiply(step.compose(o, q.setFromUnitVectors(Z, d), ONE));
    if (Math.hypot(r.cx, r.cy) < 1e-6 && Math.hypot(r.gx, r.gy) < 1e-6) break;
  }
  return frame;
}
var lean = (m) => Z.clone().transformDirection(m).angleTo(Z) * 180 / Math.PI;
var offset = (m) => Math.hypot(m.elements[12], m.elements[13]);
var plausible = (m) => lean(m) < 4 && offset(m) < 0.015;
function body(meshes, toWheel, tyre = false) {
  const points = [], faces = [], a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), n = new T.Vector3();
  let rmin = Infinity, rmax = 0;
  for (const mesh of meshes) {
    const p = mesh.geometry.getAttribute("position"), index = mesh.geometry.index, m = toWheel.clone().multiply(mesh.matrixWorld), base = points.length / 3;
    for (let i = 0; i < p.count; i++) {
      a.fromBufferAttribute(p, i).applyMatrix4(m);
      points.push(a.x, a.y, a.z);
      const r = Math.hypot(a.x, a.y);
      rmin = Math.min(rmin, r);
      rmax = Math.max(rmax, r);
    }
    const count = index ? index.count : p.count, at = (i) => (base + (index ? index.getX(i) : i)) * 3, stride = 3 * Math.max(1, Math.round(count / 3 / 5e3));
    for (let t = 0; t + 2 < count; t += stride) {
      const i = at(t), j = at(t + 1), k = at(t + 2);
      a.fromArray(points, i);
      b.fromArray(points, j);
      c.fromArray(points, k);
      n.crossVectors(b.sub(a), c.sub(a));
      const area = n.length() / 2;
      if (area < 1e-12) continue;
      n.normalize();
      faces.push((points[i] + points[j] + points[k]) / 3, (points[i + 1] + points[j + 1] + points[k + 1]) / 3, (points[i + 2] + points[j + 2] + points[k + 2]) / 3, n.x, n.y, n.z, area);
    }
  }
  const keep = Math.max(1, Math.round(points.length / 3 / 12e3)), thin = keep > 1 ? Float64Array.from({ length: Math.floor(points.length / 3 / keep) * 3 }, (_, i) => points[Math.floor(i / 3) * keep * 3 + i % 3]) : Float64Array.from(points);
  return { meshes, points: thin, faces: Float64Array.from(faces), rmin, rmax, tyre };
}
function host(piece, fitted) {
  const cell = 6e-3, grid = /* @__PURE__ */ new Map(), key = (x, y, z) => Math.floor(x / cell) + "," + Math.floor(y / cell) + "," + Math.floor(z / cell);
  fitted.forEach((b, index) => {
    for (let i = 0; i < b.points.length; i += 3) {
      const k = key(b.points[i], b.points[i + 1], b.points[i + 2]);
      let l = grid.get(k);
      if (!l) grid.set(k, l = []);
      if (l.length < 24) l.push([b.points[i], b.points[i + 1], b.points[i + 2], index]);
    }
  });
  const votes = /* @__PURE__ */ new Map(), stride = Math.max(1, Math.floor(piece.points.length / 3 / 200));
  for (let i = 0; i < piece.points.length; i += 3 * stride) {
    const x = piece.points[i], y = piece.points[i + 1], z = piece.points[i + 2];
    let best = 0.012 ** 2, index = -1;
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) for (let c = -2; c <= 2; c++) for (const q of grid.get(key(x + a * cell, y + b * cell, z + c * cell)) ?? []) {
      const d = (q[0] - x) ** 2 + (q[1] - y) ** 2 + (q[2] - z) ** 2;
      if (d < best) {
        best = d;
        index = q[3];
      }
    }
    if (index >= 0) votes.set(index, (votes.get(index) ?? 0) + 1);
  }
  let top = -1, count = 0;
  votes.forEach((n, i) => {
    if (n > count) {
      count = n;
      top = i;
    }
  });
  return top >= 0 ? fitted[top] : void 0;
}
function alignWheelAxes(wheels) {
  const report = [];
  for (const wheel of wheels) {
    if (wheel.userData.trueAxle) {
      report.push(wheel.userData.trueAxle);
      continue;
    }
    wheel.updateWorldMatrix(true, true);
    const toWheel = wheel.matrixWorld.clone().invert();
    const meshes = [];
    wheel.traverse((o) => {
      if (o instanceof T.Mesh && !(o instanceof T.InstancedMesh)) meshes.push(o);
    });
    const pieces = meshes.map((m) => body([m], toWheel));
    if (!pieces.length) continue;
    const outer = Math.max(...pieces.map((p) => p.rmax)), tyres = pieces.filter((p) => p.rmin > outer * 0.55 && p.rmax > outer * 0.9);
    const bodies = [...tyres.length ? [body(tyres.flatMap((t) => t.meshes), toWheel, true)] : [], ...pieces.filter((p) => !tyres.includes(p))];
    for (const b of bodies) if (b.points.length >= 120) b.frame = fitAxle(b);
    const fitted = bodies.filter((b) => b.frame && plausible(b.frame));
    const reference = fitted.filter((b) => !b.tyre && b.rmax > outer * 0.6).sort((a, b) => b.points.length - a.points.length)[0] ?? fitted.find((b) => b.tyre);
    if (!reference) continue;
    const axle = reference.frame, toAxle = axle.clone().invert();
    const corrections = /* @__PURE__ */ new Map();
    for (const b of fitted) if (b !== reference) {
      const own = toAxle.clone().multiply(b.frame);
      if (plausible(own)) corrections.set(b, own.invert());
    }
    for (const b of bodies) if (!fitted.includes(b)) {
      const h = host(b, fitted);
      if (h && corrections.has(h)) corrections.set(b, corrections.get(h));
    }
    const targets = /* @__PURE__ */ new Map();
    wheel.traverse((o) => {
      if (o !== wheel) targets.set(o, o.matrixWorld.clone());
    });
    wheel.matrix.compose(wheel.position, wheel.quaternion, wheel.scale).multiply(axle).decompose(wheel.position, wheel.quaternion, wheel.scale);
    wheel.updateWorldMatrix(false, false);
    const frame = wheel.matrixWorld, unframe = frame.clone().invert(), moved = [];
    corrections.forEach((k, b) => {
      const move = frame.clone().multiply(k).multiply(unframe);
      for (const m of b.meshes) targets.get(m).premultiply(move);
      moved.push({ name: b.meshes[0].name.slice(0, 32), mm: +(offset(k) * 1e3).toFixed(2), deg: +lean(k).toFixed(3) });
    });
    wheel.traverse((o) => {
      if (o === wheel) return;
      o.matrix.copy(o.parent.matrixWorld).invert().multiply(targets.get(o)).decompose(o.position, o.quaternion, o.scale);
      o.updateWorldMatrix(false, false);
    });
    const entry = { name: wheel.name, tilt: +lean(axle).toFixed(3), shift: +(offset(axle) * 1e3).toFixed(2), moved };
    wheel.userData.trueAxle = entry;
    report.push(entry);
  }
  return report;
}

// app/three/tyreContact.ts
function createTyreContact(root, wheels, surface, lateralLimit = () => 2.7) {
  if (!(import.meta.dev && typeof location !== "undefined" && location.search.includes("noalign"))) alignWheelAxes(wheels);
  root.updateMatrixWorld(true);
  const rest = wheels.map((w) => root.worldToLocal(w.getWorldPosition(new T2.Vector3()))), point = new T2.Vector3();
  const radii = wheels.map((w) => {
    const bounds = new T2.Box3();
    w.traverse((o) => {
      if (o instanceof T2.Mesh) {
        const m = Array.isArray(o.material) ? o.material : [o.material];
        if (m.some((m2) => /^Wheel(?:\.|$)|tyre|tire/i.test(m2.name))) bounds.expandByObject(o, true);
      }
    });
    if (w.name.startsWith("Revuelto wheel ")) {
      const tyrePrefix = "Fixed wheel hardware " + w.name.split(" ").at(-1) + " tyre ";
      root.traverse((o) => {
        if (o instanceof T2.Mesh && o.name.startsWith(tyrePrefix)) bounds.expandByObject(o, true);
      });
    }
    if (bounds.isEmpty()) bounds.setFromObject(w, true);
    return (bounds.max.y - bounds.min.y) / 2;
  });
  const offset2 = rest.reduce((sum, p, i) => sum + radii[i] - p.y, 0) / rest.length;
  const carriers = wheels.map((w, i) => {
    const g = new T2.Group();
    g.name = "Wheel carrier " + i;
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
    const at = root.worldToLocal(o.getWorldPosition(new T2.Vector3()));
    let nearest = 0, best = Infinity;
    rest.forEach((p, i) => {
      const d = at.distanceToSquared(p);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    carriers[nearest].attach(o);
  });
  const pick = (test) => rest.map((p, i) => test(p) ? i : -1).filter((i) => i >= 0);
  const front = pick((p) => p.x < 0), rear = pick((p) => p.x >= 0), left = pick((p) => p.z < 0), right = pick((p) => p.z >= 0), all = rest.map((_, i) => i);
  const wheelbase = Math.max(...rest.map((p) => p.x)) - Math.min(...rest.map((p) => p.x)), track = Math.max(...rest.map((p) => p.z)) - Math.min(...rest.map((p) => p.z));
  const contacts = rest.map(() => new T2.Vector3()), ground = rest.map(() => 0);
  let lateral = 0, lateralSpeed = 0, lateralAcceleration = 0, heading = 0, height = offset2, pitch = 0, roll = 0, steering = 0;
  const mean = (indices) => indices.reduce((s, i) => s + ground[i], 0) / indices.length;
  function probe(distance) {
    rest.forEach((p, i) => {
      ground[i] = surface(p.x * Math.cos(heading) + p.z * Math.sin(heading), lateral - p.x * Math.sin(heading) + p.z * Math.cos(heading), distance);
    });
  }
  function update(speed, distance, dt, steer = 0) {
    dt = T2.MathUtils.clamp(dt, 0, 0.1);
    steering = T2.MathUtils.damp(steering, steer, 7, dt);
    const before = lateralSpeed, limit = lateralLimit();
    lateralSpeed = T2.MathUtils.damp(lateralSpeed, Math.abs(speed) > 1 ? steering * Math.min(Math.abs(speed) * 0.04, 1.2) : 0, 5, dt);
    lateral = T2.MathUtils.clamp(lateral + lateralSpeed * dt, -limit, limit);
    if (Math.abs(lateral) >= limit) lateralSpeed = 0;
    lateralAcceleration = dt > 0 ? T2.MathUtils.clamp((lateralSpeed - before) / dt, -3, 3) : 0;
    heading = T2.MathUtils.damp(heading, -Math.atan2(lateralSpeed, Math.max(Math.abs(speed), 8)), 6, dt);
    probe(distance);
    height = T2.MathUtils.damp(height, offset2 + mean(all), 18, dt);
    pitch = T2.MathUtils.damp(pitch, Math.atan2(mean(rear) - mean(front), wheelbase), 10, dt);
    roll = T2.MathUtils.damp(roll, Math.atan2(mean(right) - mean(left), track), 10, dt);
    root.position.set(0, height, lateral);
    root.rotation.set(roll, heading, pitch, "YXZ");
    root.updateMatrixWorld(true);
    carriers.forEach((g, i) => {
      g.rotation.y = rest[i].x < 0 ? steering * 0.045 / (1 + Math.abs(speed) * 0.035) : 0;
      point.copy(rest[i]).applyMatrix4(root.matrixWorld);
      contacts[i].set(point.x, surface(point.x, point.z, distance), point.z);
    });
  }
  function reset() {
    lateral = lateralSpeed = lateralAcceleration = heading = steering = 0;
    probe(0);
    height = offset2 + mean(all);
    pitch = Math.atan2(mean(rear) - mean(front), wheelbase);
    roll = Math.atan2(mean(right) - mean(left), track);
    update(0, 0, 0);
  }
  reset();
  return { update, reset, radii, contacts, get heading() {
    return heading;
  }, get lateralAcceleration() {
    return lateralAcceleration;
  } };
}
export {
  createTyreContact
};
