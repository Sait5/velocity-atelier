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

// app/three/tourbillon.ts
var tourbillon_exports = {};
__export(tourbillon_exports, {
  prepareTourbillon: () => prepareTourbillon
});
import * as T2 from "three";
function prepareTourbillon(root2) {
  const materials = /* @__PURE__ */ new Map();
  root2.traverse((o) => {
    if (o instanceof T2.Mesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.set(m.name, m);
  });
  const find = (part) => {
    const m = [...materials.values()].find((m2) => m2.name.includes(part));
    if (!m) throw Error("Tourbillon material missing: " + part);
    return m;
  };
  const body = find("2026Paint_"), rim = find("3DWheel1A_"), brake = find("CalliperA_Zone"), glass = find("2026Window_"), leather = find("InteriorColourZoneA_"), white = find("2026LightA_");
  const rearPaint = find("col_2");
  const paintTargets = [body, rearPaint];
  for (const m of paintTargets) {
    m.metalness = 0.18;
    m.roughness = 0.32;
    m.metalnessMap = null;
    m.roughnessMap = null;
  }
  const trimTargets = [...materials.values()].filter((m) => /Interior(ColourZone|TillingColourZone)A_|InteriorSeatColourZoneA/.test(m.name));
  for (const m of [...paintTargets, ...trimTargets]) {
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", T2.ShaderChunk.map_fragment.replace("diffuseColor *= sampledDiffuseColor;", "sampledDiffuseColor.rgb=vec3(.55+.45*dot(sampledDiffuseColor.rgb,vec3(.2126,.7152,.0722)));diffuseColor *= sampledDiffuseColor;"));
    };
    m.customProgramCacheKey = () => "tourbillon-neutral-tint-v1";
  }
  function setSecondaryPaint(color) {
    rearPaint.color.set(color);
  }
  for (const [x, y, z, power] of [[-0.45, 1.03, -0.38, 0.8], [0.2, 1.08, 0.3, 0.55], [0.05, 0.62, 0, 0.22]]) {
    const l = new T2.PointLight("#fff3e2", power, 1.65, 2);
    l.name = "Tourbillon cabin bounce";
    l.position.set(x, y, z);
    root2.add(l);
  }
  const head = { value: 0 }, tail = { value: 0 };
  root2.traverse((o) => {
    if (!(o instanceof T2.Mesh)) return;
    o.castShadow = true;
    o.receiveShadow = true;
    for (const raw of Array.isArray(o.material) ? o.material : [o.material]) {
      const m = raw;
      for (const v of Object.values(m)) if (v instanceof T2.Texture) v.anisotropy = 8;
      if (/Window_|sliding glass|red_glass/.test(m.name)) {
        m.transmission = 0;
        m.transparent = true;
        m.opacity = m.name === "red_glass" ? 0.75 : 0.23;
        m.depthWrite = false;
        m.side = T2.DoubleSide;
        m.roughness = 0.08;
        o.castShadow = false;
      }
      if (/Interior|Carbon/.test(m.name)) {
        m.metalness = 0;
        m.roughness = 0.72;
        if (/Interior/.test(m.name)) {
          m.transparent = false;
          m.opacity = 1;
          m.depthWrite = true;
          m.side = T2.DoubleSide;
        }
      }
      if (/GrilleAlpha/.test(m.name)) {
        m.alphaTest = 0.4;
        m.transparent = false;
        m.depthWrite = true;
      }
    }
  });
  white.emissive.set("#ffffff");
  white.emissiveIntensity = 1;
  white.onBeforeCompile = (shader) => {
    shader.uniforms.tourHead = head;
    shader.uniforms.tourTail = tail;
    shader.vertexShader = "varying vec3 lampPosition;\n" + shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nlampPosition=position;");
    shader.fragmentShader = "varying vec3 lampPosition;uniform float tourHead;uniform float tourTail;float bulb(vec3 p,vec3 c){return 1.-smoothstep(.8,1.,max(max(abs(p.x-c.x)/.031,abs(p.y-c.y)/.009),abs(p.z-c.z)/.038));}\n" + shader.fragmentShader.replace("#include <emissivemap_fragment>", `float brightness=smoothstep(.25,.65,max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b)));
vec3 p=vec3(lampPosition.xy,abs(lampPosition.z));float front=max(max(bulb(p,vec3(-1.876,.583,.6165)),bulb(p,vec3(-1.822,.593,.706))),max(bulb(p,vec3(-1.767,.603,.796)),bulb(p,vec3(-1.71,.6125,.886))));
float rear=step(1.6,lampPosition.x)*step(.55,lampPosition.y)*(1.-step(.92,lampPosition.y))*brightness;
totalEmissiveRadiance=vec3(1.,.96,.88)*front*tourHead*2.+vec3(1.,.015,.005)*rear*tourTail*1.5;`);
  };
  white.customProgramCacheKey = () => "tourbillon-light-atlas-v1";
  const rearLens = [...materials.values()].find((m) => m.name === "red_glass");
  if (rearLens) {
    rearLens.emissive.set("#ff1608");
    rearLens.emissiveIntensity = 0;
    rearLens.onBeforeCompile = (shader) => {
      shader.vertexShader = "varying vec3 tailPosition;\n" + shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ntailPosition=position;");
      shader.fragmentShader = "varying vec3 tailPosition;\n" + shader.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance*=step(1.5,tailPosition.x)*step(.6,tailPosition.y)*(1.-step(.95,tailPosition.y));");
    };
    rearLens.customProgramCacheKey = () => "tourbillon-rear-lens-v1";
  }
  const doors = [1, 0].map((i) => root2.getObjectByName("Tourbillon_door_" + i)), wheels = [0, 1, 2, 3].map((i) => root2.getObjectByName("Tourbillon_wheel_" + i));
  if ([...doors, ...wheels].some((o) => !o)) throw Error("Tourbillon assemblies missing");
  const spill = createHeadlightPool(-2.02, 0.75);
  root2.add(spill);
  const headlights = [-1, 1].map((side) => {
    const l = new T2.SpotLight("#f7f4ee", 0, 8, 0.42, 0.8, 2);
    l.position.set(-2.03, 0.6, side * 0.75);
    l.target.position.set(-5, 0.05, side * 0.8);
    root2.add(l, l.target);
    return l;
  });
  function setLights(front, rear, frontLevel = Number(front), rearLevel = Number(rear)) {
    head.value = frontLevel;
    tail.value = rearLevel;
    root2.userData.frontEnabled = front;
    root2.userData.tailEnabled = rear;
    spill.visible = front;
    headlights.forEach((l) => l.intensity = 85 * frontLevel);
    if (rearLens) rearLens.emissiveIntensity = rearLevel * 1.2;
  }
  function setDoors(left, right = left) {
    doors.forEach((d, i) => {
      const p = T2.MathUtils.clamp(i === 0 ? left : right, 0, 1);
      d.rotation.set(0, -Math.sign(d.position.z) * p * 0.25, p * 1.05);
    });
  }
  const panes2 = doors.flatMap((d) => d.children.filter((o) => o.name.includes("sliding_glass") || o.name.includes("sliding glass")).map((mesh) => ({ mesh, rest: mesh.position.clone() })));
  function setWindows(value) {
    for (const { mesh, rest } of panes2) {
      mesh.position.copy(rest);
      mesh.position.y -= T2.MathUtils.clamp(value, 0, 1) * 0.3;
      mesh.visible = value < 0.98;
    }
  }
  function setUpholstery(color) {
    trimTargets.forEach((m) => m.color.set(color));
  }
  function dispose() {
    const geometries = /* @__PURE__ */ new Set(), mats = /* @__PURE__ */ new Set(), textures = /* @__PURE__ */ new Set();
    root2.traverse((o) => {
      if (o instanceof T2.Mesh) {
        geometries.add(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) mats.add(m);
      }
    });
    geometries.forEach((g) => g.dispose());
    mats.forEach((m) => {
      for (const v of Object.values(m)) if (v instanceof T2.Texture) textures.add(v);
      m.dispose();
    });
    textures.forEach((t) => t.dispose());
  }
  setLights(false, false);
  return { root: root2, body, rim, brake, glass, leather, white, doors, wheels, spokes: [], setDoors, setWindows, setLights, setUpholstery, setSecondaryPaint, dispose };
}
var init_tourbillon = __esm({
  "app/three/tourbillon.ts"() {
    "use strict";
    init_lampPool();
  }
});

// tools/check-tourbillon.ts
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
var { prepareTourbillon: prepareTourbillon2 } = await Promise.resolve().then(() => (init_tourbillon(), tourbillon_exports));
var { scene: root } = await load("public/models/bugatti-tourbillon.glb");
var closed = new T3.Box3().setFromObject(root, true);
var vehicle = prepareTourbillon2(root);
assert.ok(closed.max.x - closed.min.x > 4.5 && closed.max.x - closed.min.x < 4.9);
assert.equal(vehicle.wheels.length, 4);
assert.equal(vehicle.doors.length, 2);
var fixed = /* @__PURE__ */ new Map();
root.updateMatrixWorld(true);
root.traverse((o) => {
  if (o.name.startsWith("body_")) fixed.set(o, o.matrixWorld.clone());
});
assert.ok(fixed.size > 0);
var starts = vehicle.doors.map((d) => new T3.Box3().setFromObject(d, true));
for (let i = 0; i <= 20; i++) {
  vehicle.setDoors(i / 20);
  root.updateMatrixWorld(true);
  fixed.forEach((matrix, o) => assert.ok(o.matrixWorld.equals(matrix)));
  assert.ok(vehicle.doors.every((d) => Number.isFinite(d.rotation.z)));
}
vehicle.doors.forEach((d, i) => assert.ok(new T3.Box3().setFromObject(d, true).max.y > starts[i].max.y + 0.3));
vehicle.setDoors(0);
root.updateMatrixWorld(true);
vehicle.doors.forEach((d, i) => assert.ok(new T3.Box3().setFromObject(d, true).min.distanceTo(starts[i].min) < 1e-5));
var panes = vehicle.doors.flatMap((d) => d.children.filter((o) => o.name.includes("sliding_glass") || o.name.includes("sliding glass")));
assert.equal(panes.length, 2);
vehicle.setWindows(1);
assert.ok(panes.every((p) => !p.visible));
vehicle.setWindows(0);
assert.ok(panes.every((p) => p.visible));
vehicle.setLights(true, false, 0.5, 0);
assert.equal(root.userData.frontEnabled, true);
assert.equal(root.userData.tailEnabled, false);
vehicle.setLights(false, true, 0, 1);
assert.equal(root.userData.frontEnabled, false);
assert.equal(root.userData.tailEnabled, true);
var paint = root.getObjectByProperty("type", "Mesh");
var colors = [];
root.traverse((o) => {
  if (o instanceof T3.Mesh) {
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m.name === "col_2") colors.push(m);
  }
});
vehicle.body.color.set("#eeeeee");
vehicle.setSecondaryPaint("#2266aa");
assert.ok(colors.length > 0);
assert.ok(colors.every((m) => m.color !== vehicle.body.color && m.color.getHexString() === "2266aa"));
assert.equal(vehicle.body.color.getHexString(), "eeeeee");
var seatFound = false;
vehicle.setUpholstery("#e0ddd5");
root.traverse((o) => {
  if (o instanceof T3.Mesh) {
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (/Interior(ColourZone|TillingColourZone)A_|InteriorSeatColourZoneA/.test(m.name)) {
      assert.equal(m.color.getHexString(), "e0ddd5");
      if (m.name.includes("InteriorSeat")) seatFound = true;
    }
  }
});
assert.ok(seatFound, "Seat surfaces must participate in upholstery selection");
var assignments = JSON.parse(await fs.readFile("tools/generated/tourbillon-assignments.json", "utf8"));
for (const a of assignments) {
  if (a.material === "col_2" || /Carbon1/.test(a.material) && [443, 1095, 849, 3312, 3313].includes(a.faces)) assert.equal(a.group, "body", "Roof and fixed aperture must not follow the door");
}
for (const [material, suffix, group] of [["Carbon1", "0.088", "door0"], ["Carbon1", "0.098", "door1"], ["InteriorA_", "0.921", "door0"], ["InteriorA_", "0.949", "door1"], ["InteriorA_", "0.1163", "door0"], ["InteriorA_", "0.1014", "door1"]]) {
  const part = assignments.find((a) => a.material.includes(material) && a.name.endsWith(suffix));
  assert.ok(part, "Missing door lining component " + suffix);
  assert.equal(part.group, group, "Window seal and inner panel must follow their door");
}
console.log("PASS: metre scale, four wheel pivots, two rising doors with stable closed pose, independent lamp controls");
vehicle.dispose();
