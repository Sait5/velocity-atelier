import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
//#region app/three/roadAssets.ts
/** One source copy per driving scene; map instances are released on every switch. */
function createRoadAssets() {
	const textures = /* @__PURE__ */ new Map(), models = /* @__PURE__ */ new Map();
	const owned = /* @__PURE__ */ new Set(), loader = new T.TextureLoader(), gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
	let disposed = false;
	const release = (value) => value.dispose();
	function texture(url, color = false) {
		let entry = textures.get(url);
		if (!entry) {
			let yes, no;
			const ready = new Promise((resolve, reject) => {
				yes = resolve;
				no = reject;
			});
			const map = loader.load(url, () => {
				if (disposed) map.dispose();
				yes();
			}, void 0, (e) => no(e));
			map.wrapS = map.wrapT = T.RepeatWrapping;
			map.anisotropy = 12;
			map.colorSpace = color ? T.SRGBColorSpace : T.NoColorSpace;
			owned.add(map);
			entry = {
				map,
				ready
			};
			textures.set(url, entry);
		}
		return entry;
	}
	function model(url) {
		let task = models.get(url);
		if (!task) {
			task = (async () => {
				const full = url.endsWith("-lod.glb") ? await model(url.replace("-lod.glb", ".glb")) : void 0;
				const asset = await gltfLoader.loadAsync(url), finishes = /* @__PURE__ */ new Map();
				full?.scene.traverse((o) => {
					if (o instanceof T.Mesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) finishes.set(m.name, m);
				});
				for (const scene of asset.scenes) scene.traverse((o) => {
					if (o instanceof T.Mesh) {
						owned.add(o.geometry);
						for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
							const original = finishes.get(m.name);
							for (const [key, value] of Object.entries(m)) if (value instanceof T.Texture) {
								const same = original && original[key];
								if (same instanceof T.Texture && same !== value) {
									m[key] = same;
									value.dispose();
								}
							}
							owned.add(m);
							for (const v of Object.values(m)) if (v instanceof T.Texture) owned.add(v);
						}
					}
				});
				if (disposed) owned.forEach(release);
				return asset;
			})();
			models.set(url, task);
		}
		return task;
	}
	async function preloadItalian() {
		for (const url of [
			"/models/italian-roadside-tree.glb",
			"/models/italian-canopy-tree.glb",
			"/models/roman-pine_tree_01.glb",
			"/models/roman-shrub_01.glb",
			"/models/roman-grass_medium_01.glb",
			"/models/italian-roadside-tree-lod.glb",
			"/models/italian-canopy-tree-lod.glb",
			"/models/roman-pine_tree_01-lod.glb"
		]) {
			if (disposed) return;
			await new Promise((r) => setTimeout(r, 50));
			await model(url);
		}
		for (const url of [
			"/textures/asphalt_01_diff_4k.jpg",
			"/textures/asphalt_01_nor_gl_2k.jpg",
			"/textures/asphalt_01_rough_2k.jpg",
			"/textures/roman-cobbles-diff.webp",
			"/textures/roman-cobbles-normal.webp"
		]) {
			if (disposed) return;
			await texture(url, /diff/.test(url)).ready;
		}
	}
	return {
		texture,
		model,
		owns: (value) => owned.has(value),
		preloadItalian,
		dispose() {
			disposed = true;
			owned.forEach(release);
			owned.clear();
			models.clear();
			textures.clear();
		}
	};
}
//#endregion
//#region app/three/coastalLandscape.ts
const coastalLength = 3e3;
const coastalCentre = (d) => 18 * Math.sin(d / 290) + 7 * Math.sin(d / 113);
const coastalTangent = (d) => 18 / 290 * Math.cos(d / 290) + 7 / 113 * Math.cos(d / 113);
const roadAltitude = 24;
const fract = (v) => v - Math.floor(v);
const random = (n) => fract(Math.sin(n * 127.1 + 41.7) * 43758.5453);
const noise = (x, z) => Math.sin(x * .043 + z * .12) * 1.1 + Math.sin(x * .117 - z * .31) * .45 + Math.sin(x * .31 + z * .71) * .2;
/** Metres above sea level, relative to the road's centre line. */
function coastalHeight(d, s) {
	if (Math.abs(s) <= 6) return roadAltitude;
	if (s < 0) {
		const f = -s - 6, foot = Math.min(f, 12) * .12, run = Math.max(0, f - 12), base = 105 * (1 - Math.exp(-run / 90)), ridge = 14 * Math.sin(d * .011) + 10 * Math.sin(d * .025 + f * .032) + 6 * Math.sin(d * .061 + f * .17) + 3 * Math.sin(d * .12 - f * .31);
		return roadAltitude + foot + base + (ridge + noise(d, s) * 2) * Math.min(1, run / 24);
	}
	const edge = 8.5 + Math.sin(d * .021) + Math.sin(d * .047) * .6, drop = Math.max(0, s - edge);
	return roadAltitude - Math.min(34, drop * 1.45) + (noise(d, s) * 2.8 + Math.sin(d * .013) * 2) * Math.min(1, drop / 8);
}
/** A new continuous landscape, unrelated to the discarded coastal photogrammetry scan. */
function createCoastalLandscape(scene) {
	const assets = createRoadAssets(), group = new T.Group(), world = new T.Group(), owned = /* @__PURE__ */ new Set(), tasks = [];
	group.name = "Velocity coastal landscape — new 3 km route";
	group.add(world);
	scene.add(group);
	let alive = true;
	const texture = (url, color = false) => {
		const asset = assets.texture(url, color);
		tasks.push(asset.ready);
		return asset.map;
	};
	const asphalt = texture("/textures/asphalt_01_diff_4k.jpg", true), asphaltNormal = texture("/textures/asphalt_01_nor_gl_2k.jpg"), asphaltRough = texture("/textures/asphalt_01_rough_2k.jpg");
	const rockMap = texture("/textures/rock_face_03_diff_4k.jpg", true), rockNormal = texture("/textures/rock_face_03_nor_gl_2k.jpg"), rockRough = texture("/textures/rock_face_03_rough_2k.jpg"), moss = texture("/textures/rock_3_diff_4k.jpg", true);
	const meadow = texture("/textures/roman-meadow-diff.webp", true);
	const roadMaterial = new T.MeshStandardMaterial({
		map: asphalt,
		normalMap: asphaltNormal,
		normalScale: new T.Vector2(.45, .45),
		roughnessMap: asphaltRough,
		roughness: .82,
		color: "#aaa9a6"
	});
	const rockMaterial = new T.MeshStandardMaterial({
		map: rockMap,
		normalMap: rockNormal,
		normalScale: new T.Vector2(.25, .25),
		roughnessMap: rockRough,
		roughness: .95,
		vertexColors: true
	});
	rockMaterial.onBeforeCompile = (shader) => {
		shader.uniforms.coastalMeadow = { value: meadow };
		shader.vertexShader = "varying vec3 coastalPosition;varying vec3 coastalNormal;\n" + shader.vertexShader;
		shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ncoastalPosition=position;coastalNormal=normal;\n#ifdef USE_INSTANCING\ncoastalPosition=(instanceMatrix*vec4(position,1.)).xyz;coastalNormal=mat3(instanceMatrix)*normal;\n#endif");
		shader.fragmentShader = "uniform sampler2D coastalMeadow;varying vec3 coastalPosition;varying vec3 coastalNormal;\n" + shader.fragmentShader;
		shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `vec3 projectionWeight=pow(abs(normalize(coastalNormal)),vec3(4.));projectionWeight/=max(.001,projectionWeight.x+projectionWeight.y+projectionWeight.z);vec4 stoneColor=texture2D(map,coastalPosition.yz*.16)*projectionWeight.x+texture2D(map,coastalPosition.xz*.16)*projectionWeight.y+texture2D(map,coastalPosition.xy*.16)*projectionWeight.z;stoneColor.rgb=mix(vec3(dot(stoneColor.rgb,vec3(.299,.587,.114))),stoneColor.rgb,.48)*vec3(.94,.98,1.);float cover=smoothstep(.65,.94,normalize(coastalNormal).y)*smoothstep(24.05,24.5,coastalPosition.y)*(1.-smoothstep(26.,32.,coastalPosition.y));vec4 meadowColor=texture2D(coastalMeadow,coastalPosition.xz*.35);stoneColor=mix(stoneColor,meadowColor*vec4(.7,.8,.63,1.),cover*.85);diffuseColor*=stoneColor;`);
	};
	rockMaterial.customProgramCacheKey = () => "coastal-triplanar-rock-v1";
	const mossMaterial = new T.MeshStandardMaterial({
		map: moss,
		normalMap: rockNormal,
		roughness: .96,
		color: "#b9b9a8"
	});
	const markingMaterial = new T.MeshStandardMaterial({
		color: "#d9d6c7",
		roughness: .92
	}), metal = new T.MeshStandardMaterial({
		color: "#a3a6a0",
		metalness: .55,
		roughness: .55
	});
	for (const material of [
		roadMaterial,
		rockMaterial,
		mossMaterial,
		markingMaterial,
		metal
	]) owned.add(material);
	function mesh(geometry, material) {
		owned.add(geometry);
		const object = new T.Mesh(geometry, material);
		object.receiveShadow = true;
		world.add(object);
		return object;
	}
	function ribbon(min, max, height, material, step = 3) {
		const positions = [], uv = [], indices = [];
		const count = Math.ceil(4e3 / step);
		for (let i = 0; i <= count; i++) {
			const d = -850 + i * step;
			for (const side of [min, max]) {
				positions.push(-d, height, coastalCentre(d) + side);
				uv.push(d / 9, side / 9);
			}
			if (i < count) {
				const k = i * 2;
				indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
			}
		}
		const g = new T.BufferGeometry();
		g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
		g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
		g.setIndex(indices);
		g.computeVertexNormals();
		return mesh(g, material);
	}
	ribbon(-4.6, 4.6, 24.014, roadMaterial);
	ribbon(-4.28, -4.15, 24.023, markingMaterial);
	ribbon(4.15, 4.28, 24.023, markingMaterial);
	const dashPositions = [], dashIndices = [];
	for (let d = -850; d < 3150; d += 14) {
		const k = dashPositions.length / 3;
		for (const [x, s] of [
			[d, -.065],
			[d, .065],
			[d + 6, -.065],
			[d + 6, .065]
		]) dashPositions.push(-x, 24.025, coastalCentre(x) + s);
		dashIndices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
	}
	const dashGeometry = new T.BufferGeometry();
	dashGeometry.setAttribute("position", new T.Float32BufferAttribute(dashPositions, 3));
	dashGeometry.setIndex(dashIndices);
	dashGeometry.computeVertexNormals();
	mesh(dashGeometry, markingMaterial);
	for (const samples of [[
		-6,
		-7,
		-9,
		-12,
		-16,
		-21,
		-28,
		-38,
		-52,
		-72,
		-100,
		-145,
		-210,
		-300,
		-460
	], [
		6,
		7,
		9,
		11,
		14,
		18,
		23,
		29,
		38,
		50,
		68,
		95,
		140,
		220
	]]) {
		const positions = [], uv = [], colors = [], indices = [], rows = 1050, n = samples.length;
		for (let i = 0; i <= rows; i++) {
			const d = -850 + i * 4e3 / rows;
			for (const s of samples) {
				const h = coastalHeight(d, s);
				positions.push(-d, h, coastalCentre(d) + s);
				uv.push(d / 6, h / 5);
				const wet = h < 3 ? .42 : 1, green = s < 0 && h > 35 && Math.sin(d * .037 + s * .081) > .6 ? .84 : 1;
				colors.push(.84 * wet * green, .85 * wet, .82 * wet * green);
			}
			if (i < rows) for (let j = 0; j < n - 1; j++) {
				const k = i * n + j;
				indices.push(k, k + n, k + 1, k + 1, k + n, k + n + 1);
			}
		}
		if (samples[0] < 0) for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
		const g = new T.BufferGeometry();
		g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
		g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
		g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
		g.setIndex(indices);
		g.computeVertexNormals();
		mesh(g, rockMaterial);
	}
	for (const [min, max] of [[-6, -4.6], [4.6, 6]]) ribbon(min, max, 24.003, mossMaterial);
	ribbon(5.2, 5.35, 24.82, metal);
	const posts = new T.InstancedMesh(new T.BoxGeometry(.09, .83, .09), metal, Math.ceil(coastalLength / 8));
	owned.add(posts.geometry);
	owned.add(posts);
	world.add(posts);
	const dummy = new T.Object3D();
	for (let i = 0; i < posts.count; i++) {
		const d = i * 8;
		dummy.position.set(-d, 24.41, coastalCentre(d) + 5.25);
		dummy.rotation.y = -Math.atan(coastalTangent(d));
		dummy.scale.setScalar(1);
		dummy.updateMatrix();
		posts.setMatrixAt(i, dummy.matrix);
	}
	posts.computeBoundingSphere();
	const boulderGeometry = new T.IcosahedronGeometry(1, 4), p = boulderGeometry.attributes.position;
	for (let i = 0; i < p.count; i++) {
		const x = p.getX(i), y = p.getY(i), z = p.getZ(i), scale = 1 + .1 * Math.sin(x * 3 + y * 2) + .07 * Math.sin(z * 4 - x * 2);
		p.setXYZ(i, x * scale, y * scale, z * scale);
	}
	const boulderMaterial = rockMaterial.clone();
	boulderMaterial.vertexColors = false;
	boulderMaterial.color.set("#b0b5ae");
	boulderMaterial.onBeforeCompile = rockMaterial.onBeforeCompile;
	boulderMaterial.customProgramCacheKey = () => "coastal-triplanar-boulders-v2";
	owned.add(boulderMaterial);
	owned.add(boulderGeometry);
	const boulders = new T.InstancedMesh(boulderGeometry, boulderMaterial, 600);
	owned.add(boulders);
	world.add(boulders);
	for (let i = 0; i < 600; i++) {
		const d = random(i + 400) * coastalLength, s = i % 5 === 0 ? -(20 + random(i + 41) * 65) : 12 + random(i + 41) * 28, size = 1.4 + random(i + 98) * 4.8;
		dummy.position.set(-d, coastalHeight(d, s) - size * .32, coastalCentre(d) + s);
		dummy.rotation.set(random(i) * .8, random(i + 5) * 6, random(i + 8) * .6);
		dummy.scale.set(size * (.9 + random(i + 10)), size * (.65 + random(i + 13) * .65), size * (.7 + random(i + 21)));
		dummy.updateMatrix();
		boulders.setMatrixAt(i, dummy.matrix);
	}
	boulders.computeBoundingSphere();
	const waterMaterial = new T.ShaderMaterial({
		uniforms: { time: { value: 0 } },
		vertexShader: `varying vec3 worldPoint;varying vec3 localPoint;void main(){localPoint=position;worldPoint=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
		fragmentShader: `
 uniform float time;varying vec3 worldPoint;varying vec3 localPoint;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
 float waves(vec2 p){float v=0.,a=.55;mat2 r=mat2(.8,-.6,.6,.8);for(int i=0;i<4;i++){v+=a*noise2(p);p=r*p*2.12+vec2(13.7,7.1);a*=.48;}return v;}
 float height(vec2 p){return waves(p*.24+vec2(time*.025,-time*.018))*.48+waves(p*1.7-vec2(time*.04,time*.025))*.065;}
 void main(){vec2 q=localPoint.xy;float h=height(q);float dx=(height(q+vec2(.12,0.))-h)/.12,dz=(height(q+vec2(0.,.12))-h)/.12;float damping=1./(1.+length(cameraPosition-worldPoint)*.025);vec3 n=normalize(vec3(-dx*damping,1.,dz*damping));vec3 view=normalize(cameraPosition-worldPoint);float fresnel=.035+.965*pow(1.-max(0.,dot(view,n)),5.);vec3 reflected=reflect(-view,n);vec3 sky=mix(vec3(.55,.7,.76),vec3(.17,.39,.58),sqrt(max(0.,reflected.y)));float sun=pow(max(0.,dot(reflect(-normalize(vec3(-.3,.75,.4)),n),view)),240.);vec3 water=mix(vec3(.018,.14,.19),vec3(.045,.28,.29),clamp(h*1.8,0.,1.));water=mix(water,sky,fresnel);water+=vec3(1.,.93,.78)*sun*.8;gl_FragColor=vec4(water,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`
	});
	owned.add(waterMaterial);
	const sea = mesh(new T.PlaneGeometry(7e3, 7e3), waterMaterial);
	sea.rotation.x = -Math.PI / 2;
	sea.position.set(-1500, .2, 1800);
	sea.receiveShadow = false;
	const foamPositions = [], foamUV = [], foamIndices = [];
	for (let i = 0; i <= 800; i++) {
		const d = -850 + i * 4e3 / 800;
		let a = 20, b = 65;
		for (let j = 0; j < 12; j++) {
			const s = (a + b) / 2;
			if (coastalHeight(d, s) > .2) a = s;
			else b = s;
		}
		for (const s of [b - .25, b + 1.8]) {
			foamPositions.push(-d, .23, coastalCentre(d) + s);
			foamUV.push(d, (s - b + .25) / 2.05);
		}
		if (i < 800) {
			const k = i * 2;
			foamIndices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
		}
	}
	const foamMaterial = new T.ShaderMaterial({
		transparent: true,
		depthWrite: false,
		uniforms: waterMaterial.uniforms,
		vertexShader: "varying vec2 foamUV;void main(){foamUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
		fragmentShader: "uniform float time;varying vec2 foamUV;void main(){float wave=.5+.5*sin(foamUV.x*.8-time*.8);float edge=sin(clamp(foamUV.y,0.,1.)*3.14159);gl_FragColor=vec4(.78,.88,.85,edge*wave*.3);}"
	});
	owned.add(foamMaterial);
	const foamGeometry = new T.BufferGeometry();
	foamGeometry.setAttribute("position", new T.Float32BufferAttribute(foamPositions, 3));
	foamGeometry.setAttribute("uv", new T.Float32BufferAttribute(foamUV, 2));
	foamGeometry.setIndex(foamIndices);
	mesh(foamGeometry, foamMaterial);
	const skyMaterial = new T.ShaderMaterial({
		side: T.BackSide,
		depthWrite: false,
		vertexShader: "varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
		fragmentShader: `varying vec3 p;void main(){float h=max(0.,normalize(p).y);vec3 color=mix(vec3(.70,.82,.85),vec3(.25,.48,.67),pow(h,.5));gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`
	});
	owned.add(skyMaterial);
	const sky = new T.Mesh(new T.SphereGeometry(1700, 24, 12), skyMaterial);
	owned.add(sky.geometry);
	sky.frustumCulled = false;
	group.add(sky);
	for (const [url, count, height] of [[
		"/models/italian-roadside-tree.glb",
		60,
		7
	], [
		"/models/italian-canopy-tree.glb",
		85,
		1.15
	]]) tasks.push(assets.model(url).then((asset) => {
		if (!alive) return;
		asset.scene.updateMatrixWorld(true);
		const bounds = new T.Box3().setFromObject(asset.scene), baseScale = height / Math.max(.1, bounds.max.y - bounds.min.y), poses = [];
		for (let i = 0; i < count; i++) {
			const d = height > 3 && i < 6 ? 40 + i * 32 : random(i + count * 2) * coastalLength, s = -(height > 3 ? 8 + random(i + 88) * 8 : 7 + random(i + 66) * 9), scale = baseScale * (.7 + random(i + 17) * .65);
			const step = 4e3 / 1050, d0 = Math.floor((d + 850) / step) * step - 850, d1 = d0 + step, t = (d - d0) / step;
			const sides = [
				6,
				7,
				9,
				12,
				16,
				21,
				28,
				38,
				52,
				72,
				100,
				145,
				210,
				300,
				460
			], j = Math.max(0, sides.findIndex((v, k) => k < sides.length - 1 && -s >= v && -s <= sides[k + 1])), a = -sides[j], b = -sides[j + 1], u = (s - a) / (b - a);
			const h00 = coastalHeight(d0, a), h10 = coastalHeight(d1, a), h01 = coastalHeight(d0, b), h11 = coastalHeight(d1, b), h = t + u <= 1 ? h00 + (h10 - h00) * t + (h01 - h00) * u : h11 + (h01 - h11) * (1 - t) + (h10 - h11) * (1 - u);
			dummy.position.set(-d, h - .25 - bounds.min.y * scale, coastalCentre(d) + s);
			dummy.rotation.set(0, random(i + 320) * 6.28, 0);
			dummy.scale.setScalar(scale);
			dummy.updateMatrix();
			poses.push(dummy.matrix.clone());
		}
		asset.scene.traverse((o) => {
			if (o instanceof T.Mesh) {
				for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
					if (m instanceof T.MeshStandardMaterial) {
						m.transparent = false;
						if (m.alphaTest > 0) m.alphaTest = Math.min(m.alphaTest, .38);
						m.side = T.DoubleSide;
						m.roughness = .94;
					}
					for (const value of Object.values(m)) if (value instanceof T.Texture) value.anisotropy = 8;
				}
				const instances = new T.InstancedMesh(o.geometry, o.material, count);
				instances.castShadow = false;
				instances.receiveShadow = false;
				poses.forEach((pose, i) => instances.setMatrixAt(i, pose.clone().multiply(o.matrixWorld)));
				instances.computeBoundingSphere();
				owned.add(instances);
				world.add(instances);
			}
		});
	}));
	const ready = Promise.all(tasks);
	function update(distance, _speed, time) {
		const d = T.MathUtils.clamp(distance, 0, 2975), z = coastalCentre(d) - 2;
		world.rotation.y = Math.atan2(coastalTangent(d), -1) - Math.PI;
		world.position.set(-d, roadAltitude, z).applyAxisAngle(T.Object3D.DEFAULT_UP, world.rotation.y).negate();
		world.position.y += .007;
		world.updateMatrixWorld(true);
		waterMaterial.uniforms.time.value = time;
	}
	let extra = 0;
	const local = new T.Vector3();
	function adjustCamera(camera, carPosition) {
		world.worldToLocal(local.copy(camera.position));
		const d = -local.x, minimum = coastalHeight(d, local.z - coastalCentre(d)) + world.position.y + 1.3;
		extra = T.MathUtils.lerp(extra, Math.max(0, minimum - camera.position.y), .12);
		camera.position.y += extra;
		camera.lookAt(carPosition.x, carPosition.y + .65, carPosition.z);
	}
	update(0, 0, 0);
	return {
		length: 2975,
		ready,
		adjustCamera,
		heightAt: (_x, _z, _d) => .007,
		setContacts: (_points) => {},
		setVisible: (visible) => {
			group.visible = visible;
		},
		update,
		dispose() {
			alive = false;
			scene.remove(group);
			assets.dispose();
			owned.forEach((o) => o.dispose());
		}
	};
}
//#endregion
export { coastalCentre, coastalHeight, coastalLength, coastalTangent, createCoastalLandscape };
