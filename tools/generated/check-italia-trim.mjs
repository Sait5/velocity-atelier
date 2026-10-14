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

// app/three/italiaJambTrim.ts
var italiaJambTrim_exports = {};
__export(italiaJambTrim_exports, {
  installItaliaJambTrim: () => installItaliaJambTrim
});
import * as T2 from "three";
function installItaliaJambTrim(root2) {
  root2.updateWorldMatrix(true, true);
  const inverse = root2.matrixWorld.clone().invert();
  const trim = new T2.MeshStandardMaterial({ name: "Italia inner hinge recess trim", color: 1185046, metalness: 0, roughness: 0.86, envMapIntensity: 0.3 });
  const point = new T2.Vector3();
  root2.traverse((o) => {
    if (!(o instanceof T2.Mesh) || Array.isArray(o.material) || o.material.name !== "Italia paint") return;
    const body = o.name === "fer_f142_10_s_lod0_body_body__carpaint_0";
    const door = /^fer_f142_10_s_lod0_door[LR]F_body_2__carpaint_0$/.test(o.name);
    if (!body && !door) return;
    const source = o.geometry, p = source.getAttribute("position"), ids = source.index, count = ids?.count ?? p.count;
    const parents = Array.from({ length: p.count }, (_, i) => i);
    const find = (i) => {
      while (parents[i] !== i) {
        parents[i] = parents[parents[i]];
        i = parents[i];
      }
      return i;
    };
    const vertex = (i) => ids ? ids.getX(i) : i;
    for (let k = 0; k < count; k += 3) {
      const a = find(vertex(k));
      parents[find(vertex(k + 1))] = a;
      parents[find(vertex(k + 2))] = a;
    }
    const transform = inverse.clone().multiply(o.matrixWorld);
    const bounds = /* @__PURE__ */ new Map();
    for (let k = 0; k < count; k++) {
      const i = vertex(k), component = find(i);
      let box = bounds.get(component);
      if (!box) {
        box = new T2.Box3();
        bounds.set(component, box);
      }
      point.fromBufferAttribute(p, i).applyMatrix4(transform);
      point.z = Math.abs(point.z);
      box.expandByPoint(point);
    }
    const selected = /* @__PURE__ */ new Set();
    for (const [component, { min, max }] of bounds) {
      const aperture = body && min.x > -0.78 && max.x < 0.57 && min.y > 0.19 && max.y < 0.9 && min.z > 0.74 && max.z < 0.96;
      const outerDoorSkin = min.z > 0.84 && max.z > 0.95 && max.x - min.x > 1;
      const innerDoor = door && !outerDoorSkin;
      if (aperture || innerDoor) selected.add(component);
    }
    const painted = [], upholstered = [];
    for (let k = 0; k < count; k += 3) {
      const target = selected.has(find(vertex(k))) ? upholstered : painted;
      target.push(vertex(k), vertex(k + 1), vertex(k + 2));
    }
    if (!upholstered.length) return;
    const geometry = source.clone();
    geometry.setIndex([...painted, ...upholstered]);
    geometry.clearGroups();
    if (painted.length) geometry.addGroup(0, painted.length, 0);
    geometry.addGroup(painted.length, upholstered.length, 1);
    o.geometry = geometry;
    o.material = [o.material, trim];
  });
}
var init_italiaJambTrim = __esm({
  "app/three/italiaJambTrim.ts"() {
    "use strict";
  }
});

// app/three/sideDoorConnections.ts
import * as T from "three";
var retiredItaliaHardware = [
  { name: "fer_f142_10_s_lod0_body_body__carpaint_0", bounds: [-0.721, -0.682, 0.251, 0.305, 0.86, 0.94] },
  { name: "fer_f142_10_s_lod0_body_body__carpaint_0", bounds: [-0.721, -0.682, 0.6, 0.65, 0.86, 0.94] },
  { name: "fer_f142_10_s_lod0_body_body__carpaint_0", bounds: [-0.614, -0.587, 0.503, 0.533, 0.88, 0.906] },
  { name: "fer_f142_10_s_lod0_body_metal__emblem_0", bounds: [-0.665, -0.587, 0.52, 0.535, 0.807, 0.905] },
  { name: "fer_f142_10_s_lod0_body_rubber_trim__rubber_0", bounds: [-0.623, -0.598, 0.504, 0.526, 0.865, 0.892] }
];
function removeRetiredItaliaHinges(root2) {
  root2.updateWorldMatrix(true, true);
  for (const name of new Set(retiredItaliaHardware.map((row) => row.name))) {
    const source = root2.getObjectByName(name);
    if (!(source instanceof T.Mesh) || source.userData.retiredHingesRemoved) continue;
    const regions = retiredItaliaHardware.filter((row) => row.name === name);
    const transform = root2.matrixWorld.clone().invert().multiply(source.matrixWorld), position = source.geometry.getAttribute("position"), index = source.geometry.index;
    const count = index?.count ?? position.count, kept = [], point = new T.Vector3();
    const inside = (id) => {
      point.fromBufferAttribute(position, id).applyMatrix4(transform);
      return regions.some(({ bounds: r }) => point.x > r[0] && point.x < r[1] && point.y > r[2] && point.y < r[3] && Math.abs(point.z) > r[4] && Math.abs(point.z) < r[5]);
    };
    for (let i = 0; i < count; i += 3) {
      const a = index ? index.getX(i) : i, b = index ? index.getX(i + 1) : i + 1, c = index ? index.getX(i + 2) : i + 2;
      if (!(inside(a) && inside(b) && inside(c))) kept.push(a, b, c);
    }
    const geometry = source.geometry.clone();
    geometry.setIndex(kept);
    geometry.clearGroups();
    source.geometry = geometry;
    source.userData.retiredHingesRemoved = (count - kept.length) / 3;
  }
}

// tools/check-italia-trim.ts
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import * as T3 from "three";
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
var { installItaliaJambTrim: installItaliaJambTrim2 } = await Promise.resolve().then(() => (init_italiaJambTrim(), italiaJambTrim_exports));
var { scene: root } = await load("tools/generated/ferrari-side-door-test.glb");
removeRetiredItaliaHinges(root);
var paint = new T3.MeshStandardMaterial({ name: "Italia paint", color: "red" });
var original = /* @__PURE__ */ new Map();
root.updateWorldMatrix(true, true);
root.traverse((o) => {
  if (o instanceof T3.Mesh) {
    original.set(o, { geometry: o.geometry, position: Array.from(o.geometry.getAttribute("position").array), matrix: o.matrixWorld.toArray() });
    if (!Array.isArray(o.material) && o.material.name === "carpaint") o.material = paint;
  }
});
installItaliaJambTrim2(root);
for (const [o, before] of original) {
  assert.deepEqual(Array.from(o.geometry.getAttribute("position").array), before.position);
  assert.deepEqual(o.matrixWorld.toArray(), before.matrix);
  if (o.geometry !== before.geometry) {
    console.log("TRIM", o.name, o.geometry.groups);
    assert.ok(/lod0_body_body__carpaint|door[LR]F_body_2__carpaint/.test(o.name));
  }
  if (/mirror|hood|skirt|bumper/.test(o.name)) assert.equal(o.geometry, before.geometry);
}
console.log("Positions, transforms and exterior parts preserved");
