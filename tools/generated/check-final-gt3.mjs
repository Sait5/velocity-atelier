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

// app/three/lampPool.ts
import * as T from "three";
function createLampPool(x, rear = false) {
  const material = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    uniforms: { lampPositions: { value: [new T.Vector3(), new T.Vector3()] }, lampDirections: { value: [new T.Vector3(), new T.Vector3()] }, lampPowers: { value: [0, 0] }, lampCos: { value: rear ? -1 : Math.cos(0.42) }, lampTint: { value: new T.Color(rear ? "#ff2010" : "#dceaff") }, poolRoughness: { value: rear ? 0.42 : 0.32 } },
    vertexShader: `varying vec3 surface;varying vec2 footprint;void main(){surface=(modelMatrix*vec4(position,1.)).xyz;footprint=uv*2.-1.;gl_Position=projectionMatrix*viewMatrix*vec4(surface,1.);}`,
    fragmentShader: `varying vec3 surface;varying vec2 footprint;
  uniform vec3 lampPositions[2];uniform vec3 lampDirections[2];uniform float lampPowers[2];uniform float lampCos;uniform vec3 lampTint;uniform float poolRoughness;
  void main(){
   vec3 N=vec3(0.,1.,0.),V=normalize(cameraPosition-surface);float nv=max(dot(N,V),.03);float radiance=0.;
   float a=poolRoughness*poolRoughness,a2=a*a;
   for(int i=0;i<2;i++){
    vec3 delta=lampPositions[i]-surface;float distance2=max(dot(delta,delta),.12);vec3 L=normalize(delta);float nl=max(dot(N,L),0.);
    float cone=lampCos<0.?1.:smoothstep(lampCos,min(.999,lampCos+.07),dot(-L,lampDirections[i]));
    vec3 H=normalize(L+V);float nh=max(dot(N,H),0.),vh=max(dot(V,H),0.);
    float denom=nh*nh*(a2-1.)+1.;float D=a2/(3.14159*denom*denom);
    float k=pow(poolRoughness+1.,2.)/8.;float G=(nv/(nv*(1.-k)+k))*(nl/(nl*(1.-k)+k));
    float F=.04+.96*pow(1.-vh,5.);float specular=D*G*F/max(4.*nv*nl,.01);
    float attenuation=1./distance2;float rangeFade=1.-smoothstep(3.,5.5,sqrt(distance2));
    radiance+=lampPowers[i]*attenuation*nl*cone*rangeFade*(.008/3.14159+specular*.07);
   }
   float boundary=(1.-smoothstep(.55,1.,abs(footprint.x)))*(1.-smoothstep(.55,1.,abs(footprint.y)));
   gl_FragColor=vec4(lampTint*min(radiance,1.2),boundary);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`
  });
  const mesh = new T.Mesh(new T.PlaneGeometry(rear ? 5 : 7, 6), material);
  mesh.name = rear ? "Rear lamp ground reflection" : "Headlight physical floor spill";
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x + (rear ? 1.1 : -2), 0.012, 0);
  return mesh;
}
function createHeadlightPool(frontX, _halfWidth) {
  return createLampPool(frontX);
}
var init_lampPool = __esm({
  "app/three/lampPool.ts"() {
    "use strict";
  }
});

// app/three/innerDoorTrim.ts
import * as T2 from "three";
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
function installPorscheInnerTrim(root2) {
  root2.updateWorldMatrix(true, true);
  const inverse = root2.matrixWorld.clone().invert(), trim = makeTrim(), linings = /* @__PURE__ */ new Map();
  root2.traverse((o) => {
    if (!(o instanceof T2.Mesh)) return;
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
    const normals = [], a = new T2.Vector3(), b = new T2.Vector3(), c = new T2.Vector3();
    const threshold = Math.cos(T2.MathUtils.degToRad(20));
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
        part = { box: new T2.Box3(), faces: [] };
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
    makeTrim = () => new T2.MeshStandardMaterial({ name: "Black inner door trim", color: 1185046, metalness: 0, roughness: 0.86, envMapIntensity: 0.3 });
  }
});

// app/three/porscheRimFinish.ts
import * as T3 from "three";
function installPorscheRimFinish(root2) {
  const rim = new T3.MeshPhysicalMaterial({ name: "Porsche alloy finish", color: "#151719", metalness: 0.65, roughness: 0.28, clearcoat: 0.35, clearcoatRoughness: 0.22 });
  root2.traverse((o) => {
    if (!(o instanceof T3.Mesh) || Array.isArray(o.material) || !/3DWheel1C_/.test(o.material.name)) return;
    const source = o.geometry, uv = source.getAttribute("uv"), index = source.index;
    if (!uv || !index) return;
    const original = [], alloy = [];
    for (let i = 0; i < index.count; i += 3) {
      const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      const selected = ids.every((v) => uv.getX(v) > 0.07 && uv.getX(v) < 0.105 && uv.getY(v) > 0.258 && uv.getY(v) < 0.29);
      (selected ? alloy : original).push(...ids);
    }
    if (!alloy.length) return;
    const geometry = source.clone();
    geometry.setIndex([...original, ...alloy]);
    geometry.clearGroups();
    geometry.addGroup(0, original.length, 0);
    geometry.addGroup(original.length, alloy.length, 1);
    o.geometry = geometry;
    o.material = [o.material, rim];
  });
  return rim;
}
var init_porscheRimFinish = __esm({
  "app/three/porscheRimFinish.ts"() {
    "use strict";
  }
});

// app/three/porsche.ts
var porsche_exports = {};
__export(porsche_exports, {
  preparePorsche: () => preparePorsche
});
import * as T4 from "three";
function preparePorsche(root2) {
  const body = new T4.MeshPhysicalMaterial({ name: "Porsche paint", color: "#c0c3c1", metalness: 0.25, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
  const materials = /* @__PURE__ */ new Map();
  root2.traverse((o) => {
    if (o instanceof T4.Mesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.set(m.name, m);
  });
  const glass = [...materials.values()].find((m) => /2025Window_/.test(m.name));
  const leather = [...materials.values()].find((m) => /Porsche[ _]upholstery/.test(m.name));
  const rim = installPorscheRimFinish(root2);
  const brake = [...materials.values()].find((m) => /CalliperA_Zone/.test(m.name));
  const white = new T4.MeshStandardMaterial({ color: "#edf5ff", emissive: "#cbdfff", emissiveIntensity: 0 });
  const retired = /* @__PURE__ */ new Set(), lamps = [];
  root2.traverse((o) => {
    if (!(o instanceof T4.Mesh)) return;
    if (!Array.isArray(o.material) && /2025ManufacturerPlateA_/.test(o.material.name)) o.visible = false;
    o.receiveShadow = true;
    o.castShadow = true;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) {
      const mat = m;
      for (const v of Object.values(mat)) if (v instanceof T4.Texture) v.anisotropy = 8;
      if (/2025Paint_/.test(mat.name)) {
        retired.add(mat);
        o.material = body;
      }
      if (/Window_|red_glass/.test(mat.name)) {
        mat.transparent = true;
        mat.opacity = /red_glass/.test(mat.name) ? 0.85 : 0.22;
        mat.depthWrite = false;
        mat.roughness = 0.07;
        mat.metalness = 0.1;
        o.castShadow = false;
        mat.side = T4.DoubleSide;
      }
      if (/Interior|dash|Carbon/.test(mat.name)) {
        mat.metalness = 0;
        mat.roughness = 0.7;
      }
      if (/Interior|dash/.test(mat.name)) {
        mat.transparent = false;
        mat.opacity = 1;
        mat.alphaTest = 0.35;
        mat.depthWrite = true;
        mat.side = T4.FrontSide;
      }
      if (/BadgeA_/.test(mat.name)) {
        mat.transparent = false;
        mat.opacity = 1;
        mat.alphaTest = 0.45;
        mat.depthWrite = true;
        mat.roughness = 0.85;
        mat.metalness = 0;
      }
      if (/GrilleAlpha/.test(mat.name)) {
        mat.alphaTest = 0.4;
        mat.transparent = false;
        mat.depthWrite = true;
      }
      if (/LightA_/.test(mat.name)) {
        lamps.push(mat);
        mat.emissive.set("#cbdfff");
        mat.emissiveIntensity = 0;
      }
    }
  });
  retired.forEach((m) => m.dispose());
  installPorscheInnerTrim(root2);
  leather.metalness = 0;
  leather.roughness = 0.78;
  leather.transparent = false;
  leather.opacity = 1;
  leather.side = T4.FrontSide;
  for (const [x, y, z, power] of [[0.05, 1.12, 0, 0.65], [0.5, 0.74, 0, 0.3], [-0.4, 0.72, 0.32, 0.25]]) {
    const bounce = new T4.PointLight("#f4f6f5", power, 1.45, 2);
    bounce.name = "Porsche cabin bounce";
    bounce.position.set(x, y, z);
    root2.add(bounce);
  }
  const doors = ["Porsche door L", "Porsche door R"].map((name) => root2.getObjectByName(name.replaceAll(" ", "_")));
  const wheels = [0, 1, 2, 3].map((i) => root2.getObjectByName("Porsche_wheel_" + i));
  if (doors.some((d) => !d) || wheels.some((w) => !w)) throw Error("Porsche rig unavailable");
  const panes = doors.flatMap((d) => d.children.filter((o) => o.name.startsWith("Porsche_door_glass")).map((mesh) => ({ mesh, rest: mesh.position.clone() })));
  function setWindows(value) {
    for (const { mesh, rest: rest2 } of panes) {
      mesh.position.copy(rest2);
      mesh.position.y -= value * 0.3;
      mesh.visible = value < 0.99;
    }
  }
  const doorRest = doors.map((d) => d.position.clone());
  const hingeAxis = new T4.Vector3(0, 1, 0);
  function setDoors(left, right = left) {
    doors.forEach((door, i) => {
      const p = T4.MathUtils.clamp(i === 0 ? left : right, 0, 1), side = Math.sign(doorRest[i].z), pivot = new T4.Vector3(-0.77, 0.7, side * 0.84), angle = -side * p * 1.12;
      door.position.copy(doorRest[i]).sub(pivot).applyAxisAngle(hingeAxis, angle).add(pivot);
      door.rotation.y = angle;
    });
  }
  const headlights = [], taillights = [];
  const spill = createHeadlightPool(-1.94, 0.63);
  root2.add(spill);
  for (const side of [-1, 1]) {
    const lamp = new T4.SpotLight("#dceaff", 0, 8, 0.42, 0.8, 2);
    lamp.position.set(-1.95, 0.66, side * 0.65);
    lamp.target.position.set(-5, 0.05, side * 0.75);
    root2.add(lamp, lamp.target);
    headlights.push(lamp);
    const rear = new T4.PointLight("#ff2315", 0, 1.5, 2);
    rear.position.set(2.2, 0.71, side * 0.65);
    root2.add(rear);
    taillights.push(rear);
  }
  function setLights(head, tail) {
    root2.userData.frontEnabled = head;
    root2.userData.tailEnabled = tail;
    spill.visible = head;
    lamps.forEach((m) => m.emissiveIntensity = head ? 0.55 : 0);
    headlights.forEach((l) => l.intensity = head ? 65 : 0);
    taillights.forEach((l) => l.intensity = tail ? 0.8 : 0);
  }
  function setUpholstery(color) {
    leather.color.set(color);
  }
  function dispose() {
    const geo = /* @__PURE__ */ new Set(), mats = /* @__PURE__ */ new Set([body, white]), tex = /* @__PURE__ */ new Set();
    root2.traverse((o) => {
      if (o instanceof T4.Mesh) {
        geo.add(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) mats.add(m);
      }
    });
    geo.forEach((g) => g.dispose());
    mats.forEach((m) => {
      for (const v of Object.values(m)) if (v instanceof T4.Texture) tex.add(v);
      m.dispose();
    });
    tex.forEach((t) => t.dispose());
  }
  return { root: root2, body, rim, brake, glass, leather, white, doors, wheels, spokes: [], setDoors, setWindows, setLights, setUpholstery, dispose };
}
var init_porsche = __esm({
  "app/three/porsche.ts"() {
    "use strict";
    init_lampPool();
    init_innerDoorTrim();
    init_porscheRimFinish();
  }
});

// app/three/stableDriveContact.ts
var stableDriveContact_exports = {};
__export(stableDriveContact_exports, {
  createStableDriveContact: () => createStableDriveContact
});
import * as T5 from "three";
function createStableDriveContact(root2, wheels, surface, lateralLimit = () => 2.7) {
  root2.updateMatrixWorld(true);
  const rest2 = wheels.map((w) => w.position.clone()), radii = wheels.map((w) => {
    const box = new T5.Box3().setFromObject(w, true);
    return (box.max.y - box.min.y) / 2;
  });
  const offset = rest2.reduce((sum, p, i) => sum + radii[i] - p.y, 0) / rest2.length;
  const contacts = rest2.map(() => new T5.Vector3()), suspension = rest2.map(() => 0), point = new T5.Vector3();
  let lateral = 0, lateralSpeed = 0, heading = 0, height2 = 0, pitch = 0, roll = 0, steering = 0;
  function update(speed, distance, dt, _italian, steer = 0) {
    dt = T5.MathUtils.clamp(dt, 0, 0.1);
    steering = T5.MathUtils.damp(steering, steer, 7, dt);
    lateralSpeed = T5.MathUtils.damp(lateralSpeed, Math.abs(speed) > 1 ? steering * Math.min(Math.abs(speed) * 0.04, 1.2) : 0, 5, dt);
    lateral = T5.MathUtils.clamp(lateral + lateralSpeed * dt, -lateralLimit(), lateralLimit());
    if (Math.abs(lateral) >= lateralLimit()) lateralSpeed = 0;
    heading = T5.MathUtils.damp(heading, -Math.atan2(lateralSpeed, Math.max(Math.abs(speed), 8)), 6, dt);
    const ground = rest2.map((p) => surface(p.x * Math.cos(heading) + p.z * Math.sin(heading), lateral - p.x * Math.sin(heading) + p.z * Math.cos(heading), distance));
    const mean = (indices) => indices.reduce((s, i) => s + ground[i], 0) / indices.length;
    const front = rest2.map((p, i) => p.x < 0 ? i : -1).filter((i) => i >= 0), rear = rest2.map((p, i) => p.x >= 0 ? i : -1).filter((i) => i >= 0);
    const left = rest2.map((p, i) => p.z < 0 ? i : -1).filter((i) => i >= 0), right = rest2.map((p, i) => p.z >= 0 ? i : -1).filter((i) => i >= 0);
    const wheelbase = Math.max(...rest2.map((p) => p.x)) - Math.min(...rest2.map((p) => p.x)), track = Math.max(...rest2.map((p) => p.z)) - Math.min(...rest2.map((p) => p.z));
    height2 = T5.MathUtils.damp(height2, offset + mean(rest2.map((_, i) => i)), 18, dt);
    pitch = T5.MathUtils.damp(pitch, Math.atan2(mean(rear) - mean(front), wheelbase), 10, dt);
    roll = T5.MathUtils.damp(roll, Math.atan2(mean(right) - mean(left), track), 10, dt);
    root2.position.set(0, height2, lateral);
    root2.rotation.set(roll, heading, pitch, "YXZ");
    root2.updateMatrixWorld(true);
    wheels.forEach((w, i) => {
      w.position.copy(rest2[i]);
      w.rotation.y = rest2[i].x < 0 ? steering * 0.045 / (1 + Math.abs(speed) * 0.035) : 0;
      point.copy(rest2[i]).applyMatrix4(root2.matrixWorld);
      contacts[i].set(point.x, surface(point.x, point.z, distance), point.z);
    });
  }
  function reset() {
    lateral = lateralSpeed = heading = pitch = roll = steering = 0;
    height2 = offset + surface(0, 0, 0);
    update(0, 0, 0, false);
  }
  reset();
  return { update, reset, radii, contacts, suspension, assemblies: wheels, get heading() {
    return heading;
  }, get lateralAcceleration() {
    return 0;
  } };
}
var init_stableDriveContact = __esm({
  "app/three/stableDriveContact.ts"() {
    "use strict";
  }
});

// tools/check-final-gt3.ts
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import * as T6 from "three";
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
var { preparePorsche: preparePorsche2 } = await Promise.resolve().then(() => (init_porsche(), porsche_exports));
var { createStableDriveContact: createStableDriveContact2 } = await Promise.resolve().then(() => (init_stableDriveContact(), stableDriveContact_exports));
var { scene: root } = await load("public/models/porsche-911-gt3-door-assembly.glb");
var before = /* @__PURE__ */ new Map();
root.traverse((o) => {
  if (o instanceof T6.Mesh) before.set(o, Array.from(o.geometry.getAttribute("position").array));
});
var vehicle = preparePorsche2(root);
var alloyMeshes = [];
root.traverse((o) => {
  if (o instanceof T6.Mesh && Array.isArray(o.material) && o.material.includes(vehicle.rim)) alloyMeshes.push(o);
});
assert.equal(alloyMeshes.length, 4);
for (const mesh of alloyMeshes) {
  const uv = mesh.geometry.getAttribute("uv"), index = mesh.geometry.index, groups = mesh.geometry.groups;
  assert.ok(groups[1].count > 1e3);
  for (let i = groups[0].start; i < groups[0].count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    assert.ok(!ids.every((v) => uv.getX(v) > 0.07 && uv.getX(v) < 0.105 && uv.getY(v) > 0.258 && uv.getY(v) < 0.29));
  }
}
vehicle.rim.color.set("#f2f2ee");
alloyMeshes.forEach((m) => assert.equal(m.material[1], vehicle.rim));
console.log("PASS: four alloy finishes share a dedicated material; tyre, badge and brake atlas faces retain their original material.");
var plates = [];
root.traverse((o) => {
  if (o instanceof T6.Mesh && !Array.isArray(o.material) && /ManufacturerPlateA/.test(o.material.name)) plates.push(o);
});
assert.equal(plates.length, 1);
assert.equal(plates[0].visible, false);
for (const [o, p] of before) assert.deepEqual(Array.from(o.geometry.getAttribute("position").array), p);
var rig = createStableDriveContact2(root, vehicle.wheels, () => 8.287);
var height = root.position.y;
var rest = vehicle.wheels.map((w) => w.position.clone());
for (let frame = 0; frame < 3600; frame++) {
  const speed = frame < 1800 ? frame / 30 : (3600 - frame) / 30;
  rig.update(speed, frame / 2, 1 / 60, false, frame > 400 && frame < 600 ? 1 : 0);
  assert.ok(Math.abs(root.position.y - height) < 1e-10);
  assert.equal(root.rotation.x, 0);
  assert.equal(root.rotation.z, 0);
  vehicle.wheels.forEach((w, i) => assert.ok(w.position.equals(rest[i])));
}
assert.ok(root.position.z > 0);
assert.ok(root.position.z <= 2.7);
console.log("PASS: plate hidden; all mesh vertices unchanged; flat-road chassis and wheels stable during acceleration, braking and steering.");
var { scene: terrain } = await load("public/models/saltflat/road-banks-near.glb");
terrain.updateWorldMatrix(true, true);
terrain.traverse((o) => {
  if (o instanceof T6.Mesh && o.name === "Terrain_0_near") {
    const p = o.geometry.getAttribute("position"), uv = o.geometry.getAttribute("uv"), v = new T6.Vector3();
    for (const i of [0, Math.floor(p.count / 2), p.count - 1]) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      console.log("Terrain", v.toArray(), "metres", [uv.getX(i) * 1.25, (1 - uv.getY(i)) * 1.25]);
    }
  }
});
