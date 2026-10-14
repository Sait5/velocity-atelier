var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// app/three/innerDoorTrim.ts
var innerDoorTrim_exports = {};
__export(innerDoorTrim_exports, {
  installPorscheInnerTrim: () => installPorscheInnerTrim,
  installRevueltoInnerTrim: () => installRevueltoInnerTrim
});
import * as T from "three";
function blackUpholstery(material, cache) {
  let result = cache.get(material);
  if (!result) {
    const lining = material.clone();
    lining.name = "Black inner door upholstery";
    lining.color.set(1185046);
    lining.metalness = 0;
    lining.roughness = 0.86;
    lining.envMapIntensity = 0.3;
    lining.transparent = false;
    lining.opacity = 1;
    lining.depthWrite = true;
    result = lining;
    cache.set(material, result);
  }
  return result;
}
function installRevueltoInnerTrim(source) {
  const trim = makeTrim(), linings = /* @__PURE__ */ new Map();
  source.traverse((o) => {
    if (o instanceof T.Mesh && /^(DoorJamb[LR]F_CarPaint|DoorSill_CarPaint)$/.test(o.name)) o.material = trim;
    if (o instanceof T.Mesh && /^DoorCard[LR]F/.test(o.name)) {
      const apply = (m) => /^(M_Leather|M_Alcantara)$/.test(m.name) ? blackUpholstery(m, linings) : m;
      o.material = Array.isArray(o.material) ? o.material.map(apply) : apply(o.material);
    }
  });
}
function installPorscheInnerTrim(root2) {
  root2.updateWorldMatrix(true, true);
  const inverse = root2.matrixWorld.clone().invert(), trim = makeTrim(), linings = /* @__PURE__ */ new Map();
  root2.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    let door = false;
    for (let parent = o.parent; parent; parent = parent.parent) if (/^Porsche_door_[LR]$/.test(parent.name)) door = true;
    if (door) {
      const apply = (m) => /Porsche[ _]upholstery/.test(m.name) ? blackUpholstery(m, linings) : m;
      o.material = Array.isArray(o.material) ? o.material.map(apply) : apply(o.material);
    }
    if (Array.isArray(o.material) || o.material.name !== "Porsche paint") return;
    const source = o.geometry, p = source.getAttribute("position"), index = source.index;
    if (!index) return;
    const count = index.count / 3, parents = Array.from({ length: count }, (_, i) => i);
    const find = (i) => {
      while (parents[i] !== i) {
        parents[i] = parents[parents[i]];
        i = parents[i];
      }
      return i;
    };
    const join = (a2, b2) => {
      parents[find(b2)] = find(a2);
    };
    const vertices = /* @__PURE__ */ new Map(), edges = /* @__PURE__ */ new Map();
    const normals = [], a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
    const threshold = Math.cos(T.MathUtils.degToRad(20));
    for (let f = 0; f < count; f++) {
      const ids = [index.getX(f * 3), index.getX(f * 3 + 1), index.getX(f * 3 + 2)];
      a.fromBufferAttribute(p, ids[0]);
      b.fromBufferAttribute(p, ids[1]);
      c.fromBufferAttribute(p, ids[2]);
      normals.push(b.sub(a).cross(c.sub(a)).normalize().clone());
      for (let k = 0; k < 3; k++) {
        const v = ids[k];
        if (door) {
          const previous = vertices.get(v);
          if (previous !== void 0) join(f, previous);
          else vertices.set(v, f);
        } else {
          const w = ids[(k + 1) % 3], key = v < w ? `${v}:${w}` : `${w}:${v}`, previous = edges.get(key);
          if (previous !== void 0) {
            if (normals[f].dot(normals[previous]) > threshold) join(f, previous);
          } else edges.set(key, f);
        }
      }
    }
    const transform = inverse.clone().multiply(o.matrixWorld), parts = /* @__PURE__ */ new Map();
    for (let f = 0; f < count; f++) {
      const id = find(f);
      let part = parts.get(id);
      if (!part) {
        part = { box: new T.Box3(), faces: [] };
        parts.set(id, part);
      }
      part.faces.push(f);
      for (let k = 0; k < 3; k++) {
        a.fromBufferAttribute(p, index.getX(f * 3 + k)).applyMatrix4(transform);
        a.z = Math.abs(a.z);
        part.box.expandByPoint(a);
      }
    }
    const selected = /* @__PURE__ */ new Set();
    for (const { box: { min, max }, faces } of parts.values()) {
      const inside = door ? max.x - min.x > 1 && min.z < 0.72 && min.z > 0.65 && max.y < 0.92 : faces.length > 15 && min.x > -1 && max.x < 1.2 && min.y > 0.24 && max.y < 0.91 && min.z > 0.67;
      if (inside) for (const f of faces) selected.add(f);
    }
    if (!selected.size) return;
    const painted = [], lined = [];
    for (let f = 0; f < count; f++) (selected.has(f) ? lined : painted).push(index.getX(f * 3), index.getX(f * 3 + 1), index.getX(f * 3 + 2));
    const geometry = source.clone();
    geometry.setIndex([...painted, ...lined]);
    geometry.clearGroups();
    if (painted.length) geometry.addGroup(0, painted.length, 0);
    geometry.addGroup(painted.length, lined.length, 1);
    o.geometry = geometry;
    o.material = [o.material, trim];
  });
}
var makeTrim;
var init_innerDoorTrim = __esm({
  "app/three/innerDoorTrim.ts"() {
    "use strict";
    makeTrim = () => new T.MeshStandardMaterial({ name: "Black inner door trim", color: 1185046, metalness: 0, roughness: 0.86, envMapIntensity: 0.3 });
  }
});

// tools/check-other-trim.ts
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import * as T2 from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
async function load(path) {
  const file = await fs.readFile(path), length = file.readUInt32LE(12), doc = JSON.parse(file.subarray(20, 20 + length).toString()), binary = file.subarray(28 + length);
  delete doc.images;
  delete doc.textures;
  delete doc.samplers;
  for (const material of doc.materials ?? []) {
    delete material.normalTexture;
    delete material.occlusionTexture;
    delete material.emissiveTexture;
    if (material.pbrMetallicRoughness) {
      delete material.pbrMetallicRoughness.baseColorTexture;
      delete material.pbrMetallicRoughness.metallicRoughnessTexture;
    }
    delete material.extensions;
  }
  const json = Buffer.from(JSON.stringify(doc)), j = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]), header = Buffer.alloc(20), bh = Buffer.alloc(8);
  header.writeUInt32LE(1179937895);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + j.length + binary.length, 8);
  header.writeUInt32LE(j.length, 12);
  header.writeUInt32LE(1313821514, 16);
  bh.writeUInt32LE(binary.length);
  bh.writeUInt32LE(5130562, 4);
  const data = Buffer.concat([header, j, bh, binary]);
  return new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), "");
}
var { installPorscheInnerTrim: installPorscheInnerTrim2 } = await Promise.resolve().then(() => (init_innerDoorTrim(), innerDoorTrim_exports));
var { scene: root } = await load("public/models/porsche-911-gt3-door-assembly.glb");
var paint = new T2.MeshStandardMaterial({ name: "Porsche paint" });
var before = /* @__PURE__ */ new Map();
root.updateWorldMatrix(true, true);
root.traverse((o) => {
  if (o instanceof T2.Mesh) {
    before.set(o, { position: Array.from(o.geometry.getAttribute("position").array), matrix: o.matrixWorld.toArray(), indices: o.geometry.index ? Array.from(o.geometry.index.array) : [] });
    if (!Array.isArray(o.material) && /2025Paint_/.test(o.material.name)) o.material = paint;
  }
});
installPorscheInnerTrim2(root);
var changes = 0;
for (const [o, b] of before) {
  assert.deepEqual(Array.from(o.geometry.getAttribute("position").array), b.position);
  assert.deepEqual(o.matrixWorld.toArray(), b.matrix);
  assert.deepEqual(Array.from(o.geometry.index?.array ?? []).sort((a, b2) => a - b2), b.indices.sort((a, b2) => a - b2));
  if (Array.isArray(o.material) && o.material.some((m) => m.name === "Black inner door trim")) {
    changes++;
    console.log(o.parent?.name, o.geometry.groups);
    assert.equal(o.geometry.groups.find((g) => g.materialIndex === 1)?.count, o.parent?.name === "Porsche_GT3_9922" ? 6120 : 3447);
  }
}
assert.equal(changes, 3);
console.log("Porsche: only three paint meshes affected; all geometry and transforms preserved.");
var { installRevueltoInnerTrim: installRevueltoInnerTrim2 } = await Promise.resolve().then(() => (init_innerDoorTrim(), innerDoorTrim_exports));
var { scene: revuelto } = await load("public/models/lamborghini-revuelto-user-edited.glb");
var revBefore = /* @__PURE__ */ new Map();
revuelto.updateWorldMatrix(true, true);
revuelto.traverse((o) => {
  if (o instanceof T2.Mesh) revBefore.set(o, { geometry: o.geometry, material: o.material, matrix: o.matrixWorld.toArray() });
});
installRevueltoInnerTrim2(revuelto);
var revChanges = 0;
for (const [o, b] of revBefore) {
  assert.equal(o.geometry, b.geometry);
  assert.deepEqual(o.matrixWorld.toArray(), b.matrix);
  if (o.material !== b.material) {
    revChanges++;
    assert.match(o.name, /^(DoorCard[LR]F|DoorJamb[LR]F_CarPaint|DoorSill_CarPaint)/);
  }
}
assert.equal(revChanges, 11);
console.log("Revuelto: three inner shells and eight upholstery surfaces updated; exterior, seats and geometry preserved.");
