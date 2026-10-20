// High-resolution cabin textures for the Mercedes-AMG GT 63 (its cabin is a game rip: 512 px JPEG leather, 512 px label
// atlases, 1024 px door inserts, all of which read as pixels in the site's cockpit and door views).
// Usage (from the checkout): node tools/amg-hd-textures.mjs
// Reads tools/source-assets/cars/amg-interior.glb (tools/extract-amg-interior.py) and writes into tools/source-assets/cars:
//  * amg-cabin-leather.png / -normal.png: a 2048 px tileable pebble leather drawn for the project (Voronoi cells with
//    creased borders and fine wrinkles, about 40 cells a tile like the game's), light (mean ~0.8) because the site tints
//    it with the upholstery colour, and its tangent-space normal map;
//  * amg-cabin-grain.png / -normal.png: the door cards' dark leatherette grain, 2048 px per 25 cm tile;
//  * amg-cabin-fabric.png / -normal.png: the microfibre (dash top, floor, pillars, wheel grips, carpet strips), 2048 px of
//    soft multi-scale fibre noise instead of pixel noise;
//  * amg-hd/<image name>.png: the game's label atlases and door inserts upscaled (Lanczos) 2-4x with sharpening, the
//    labels' cut-out alpha and the tweeter grille's dots re-thresholded so their edges stay crisp.
// tools/prepare-amg-model.py swaps these in by image name.
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
const root = process.cwd(), req = createRequire(path.join(root, 'package.json')), imp = n => import(pathToFileURL(req.resolve(n)).href)
const { NodeIO } = await imp('@gltf-transform/core'); const { ALL_EXTENSIONS } = await imp('@gltf-transform/extensions')
const sharp = (await imp('sharp')).default
const ASSETS = path.join(root, 'tools/source-assets/cars'), HD = path.join(ASSETS, 'amg-hd')
fs.mkdirSync(HD, { recursive: true })

// ---------- procedural, tileable ----------
const S = 2048
function hash2(i, j, k = 0) { const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s) }
/** tileable value noise, period p lattice cells over the tile */
function valueNoise(p, seed) {
  const g = new Float32Array(p * p); for (let j = 0; j < p; j++) for (let i = 0; i < p; i++) g[j * p + i] = hash2(i, j, seed)
  return (x, y) => { const fx = x / S * p, fy = y / S * p, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j
    const a = g[(j % p) * p + i % p], b = g[(j % p) * p + (i + 1) % p], c = g[((j + 1) % p) * p + i % p], d = g[((j + 1) % p) * p + (i + 1) % p]
    const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v); return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv }
}
/** tileable Voronoi: n x n jittered points; returns F1 and F2 distances in pixels */
function voronoi(n, seed) {
  const pts = new Float32Array(n * n * 2), cell = S / n
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { pts[(j * n + i) * 2] = (i + .15 + .7 * hash2(i, j, seed)) * cell; pts[(j * n + i) * 2 + 1] = (j + .15 + .7 * hash2(i, j, seed + 1)) * cell }
  return (x, y) => { const ci = Math.floor(x / cell), cj = Math.floor(y / cell); let f1 = 1e9, f2 = 1e9
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const i = ci + di, j = cj + dj, wi = ((i % n) + n) % n, wj = ((j % n) + n) % n
      const px = pts[(wj * n + wi) * 2] + (i - wi) * cell, py = pts[(wj * n + wi) * 2 + 1] + (j - wj) * cell, d = Math.hypot(x - px, y - py)
      if (d < f1) { f2 = f1; f1 = d } else if (d < f2) f2 = d }
    return [f1, f2] }
}
/** height field -> albedo (via shade(h, x, y) -> 0..255 grey) and an OpenGL tangent-space normal map */
async function writeSurface(name, height, shade, strength) {
  const h = new Float32Array(S * S); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) h[y * S + x] = height(x + .5, y + .5)
  const col = Buffer.alloc(S * S * 3), nor = Buffer.alloc(S * S * 3); let sum = 0
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const k = y * S + x, v = Math.max(0, Math.min(255, Math.round(shade(h[k], x, y)))); sum += v
    col[k * 3] = v; col[k * 3 + 1] = v; col[k * 3 + 2] = Math.min(255, v + 1)
    const dx = (h[y * S + (x + 1) % S] - h[y * S + (x + S - 1) % S]) * strength, dy = (h[((y + 1) % S) * S + x] - h[((y + S - 1) % S) * S + x]) * strength
    const nx = -dx, ny = dy, l = Math.hypot(nx, ny, 1)
    nor[k * 3] = Math.round((nx / l * .5 + .5) * 255); nor[k * 3 + 1] = Math.round((ny / l * .5 + .5) * 255); nor[k * 3 + 2] = Math.round((1 / l * .5 + .5) * 255)
  }
  const raw = { raw: { width: S, height: S, channels: 3 } }
  await sharp(col, raw).png({ compressionLevel: 9 }).toFile(path.join(ASSETS, name + '.png'))
  await sharp(nor, raw).png({ compressionLevel: 9 }).toFile(path.join(ASSETS, name + '-normal.png'))
  console.log(name, S + 'px', 'mean', (sum / S / S).toFixed(1))
}
const smooth = (e0, e1, v) => { const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t) }
// leather: small rounded pebbles (domed cells, soft shallow creases) broken by fine wrinkles (ridged noise), the colour
// almost even (the grain shows in the light, through the normal map)
const ridged = (n, x, y) => 1 - Math.abs(2 * n(x, y) - 1)
{ // upholstery leather, ~72 pebbles a tile
  const vor = voronoi(72, 3), w1 = valueNoise(18, 5), w2 = valueNoise(40, 7), n3 = valueNoise(300, 8)
  const height = (x, y) => { const [f1, f2] = vor(x, y), dome = smooth(0, 9, f2 - f1) * (1 - .35 * smooth(4, 16, f1))
    return dome * .62 + Math.pow(ridged(w1, x, y), 6) * -.22 + Math.pow(ridged(w2, x, y), 8) * -.12 + n3(x, y) * .06 }
  await writeSurface('amg-cabin-leather', height, h => 196 + 18 * h, 2.6)
}
{ // door leatherette: finer pebbles, dark
  const vor = voronoi(150, 13), w1 = valueNoise(30, 15), n2 = valueNoise(600, 17)
  const height = (x, y) => { const [f1, f2] = vor(x, y); return smooth(0, 4, f2 - f1) * (1 - .3 * smooth(2, 8, f1)) * .7 + Math.pow(ridged(w1, x, y), 6) * -.2 + n2(x, y) * .08 }
  await writeSurface('amg-cabin-grain', height, h => 56 + 11 * h, 2.2)
}
{ // microfibre: soft fibres at several scales, a faint nap direction
  const a = valueNoise(512, 21), b = valueNoise(256, 23), c = valueNoise(96, 25), d = valueNoise(1024, 27)
  const height = (x, y) => a(x, y * .55) * .4 + b(x, y) * .3 + c(x, y) * .2 + d(x, y) * .1
  await writeSurface('amg-cabin-fabric', height, h => 30 + 34 * h, 1.2)
}

// ---------- the game's atlases, upscaled ----------
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(path.join(ASSETS, 'amg-interior.glb'))
const byName = new Map(doc.getRoot().listTextures().map(t => [t.getName(), t]))
// [image, scale, kind]: 'labels' = cut-out alpha atlas, 'glyphs' = white symbols on black, 'dots' = black-and-white
// perforation, 'atlas' = everything else
const JOBS = [['Meshessalon0111_diff_baseColor', 4, 'labels'], ['Meshestr0021_diff_baseColor', 4, 'labels'], ['Meshessalon1_diff_baseColor', 4, 'glyphs'],
  ['Mesheschassis0141_diff_baseColor', 4, 'atlas'], ['Meshesdoorrfok0101_diff_baseColor', 2, 'atlas'], ['Meshesdoorrfok0231_diff_baseColor', 2, 'atlas'],
  ['Meshesdoorrfok0361_diff_baseColor', 2, 'atlas'], ['Meshesdoorrfok0491_diff_baseColor', 2, 'atlas'], ['Meshesdoorrfok0111_diff_baseColor', 2, 'dots'],
  ['Meshesdoorrfok0381_diff_baseColor', 2, 'dots']]
for (const [name, k, kind] of JOBS) {
  const t = byName.get(name); if (!t) { console.log('missing', name); continue }
  const src = sharp(Buffer.from(t.getImage())), m = await src.metadata(), W = m.width * k, H = m.height * k
  let out
  if (kind === 'labels') {
    // colour and alpha upscaled separately; the alpha's soft ramp steepened so the cut stays a clean line
    const rgb = await sharp(Buffer.from(t.getImage())).removeAlpha().resize(W, H, { kernel: 'lanczos3' }).sharpen({ sigma: 1 }).raw().toBuffer()
    // (blurred well past the source's pixel steps, then steepened back: the outlines come out as smooth curves)
    const a = await sharp(Buffer.from(t.getImage())).extractChannel(3).resize(W, H, { kernel: 'lanczos3' }).blur(k * .55).linear(4, -384).raw().toBuffer()
    const px = Buffer.alloc(W * H * 4); for (let i = 0; i < W * H; i++) { px[i * 4] = rgb[i * 3]; px[i * 4 + 1] = rgb[i * 3 + 1]; px[i * 4 + 2] = rgb[i * 3 + 2]; px[i * 4 + 3] = a[i] }
    out = sharp(px, { raw: { width: W, height: H, channels: 4 } })
  } else if (kind === 'glyphs') {
    // the symbols' pixel steps blurred away, then each channel steepened back round its mid-tone: smooth outlines
    out = sharp(Buffer.from(t.getImage())).resize(W, H, { kernel: 'lanczos3' }).blur(k * .55).linear(3.5, -257)
  } else if (kind === 'dots') {
    out = sharp(Buffer.from(t.getImage())).resize(W, H, { kernel: 'lanczos3' }).blur(1.1).linear(5, -512)
  } else {
    // the JPEG blocks softened first, then a 2-4x Lanczos upscale and an unsharp pass
    out = sharp(Buffer.from(t.getImage())).median(3).resize(W, H, { kernel: 'lanczos3' }).blur(k * .4).sharpen({ sigma: k * .9, m1: 1, m2: 4 })
  }
  await out.png({ compressionLevel: 9 }).toFile(path.join(HD, name + '.png'))
  console.log(name, m.width + 'px ->', W + 'px', kind)
}
