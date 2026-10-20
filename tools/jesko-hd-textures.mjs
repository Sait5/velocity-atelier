// High-resolution textures for the Koenigsegg Jesko Attack (a game model: its atlases are 128-512 px, which read as
// pixels in the site's close and cockpit views).
// Usage (from the checkout): node tools/jesko-hd-textures.mjs
// Reads the game's own textures (tools/source-assets/cars/jesko-textures, as downloaded) and writes
// tools/source-assets/cars/jesko-hd/<the same file name>, which tools/prepare-jesko-model.py swaps in by image name:
//  * the carbon (a 128 px colour and 256 px normal tile of 2x2 twill, used on the body, the cabin and the wheels) is
//    redrawn at 2048 px with the same weave (16 tows a tile): each tow a rounded bundle of fibres, the colour almost
//    black with the faint light-dark checker of real twill, and a matching normal map;
//  * the cabin, label, badge, stitch, lamp, tyre and brake atlases are upscaled 4x: outlines and lettering blurred past
//    the source's pixel steps and steepened back (smooth curves, not stairs), cut-out alpha the same way, the rest a
//    Lanczos upscale with an unsharp pass; normal maps a soft Lanczos upscale.
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
const root = process.cwd(), req = createRequire(path.join(root, 'package.json')), imp = n => import(pathToFileURL(req.resolve(n)).href)
const sharp = (await imp('sharp')).default
const SRC = path.join(root, 'tools/source-assets/cars/jesko-textures'), HD = path.join(root, 'tools/source-assets/cars/jesko-hd')
fs.mkdirSync(HD, { recursive: true })

// ---------- carbon twill ----------
{
  const S = 2048, N = 16, C = S / N
  const hash = (i, j, k) => { const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s) }
  const h = new Float32Array(S * S), shade = new Float32Array(S * S)
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = Math.floor(x / C), j = Math.floor(y / C), u = (x % C + .5) / C, v = (y % C + .5) / C
    // 2x2 twill: the warp (fibres along y) floats over two weft tows, then under two, shifted one tow per row
    const warp = ((i + j) % 4 + 4) % 4 < 2
    const across = warp ? u : v, along = warp ? v : u
    // the warp float's length runs over two cells: where it dives under, its ends sink
    const k = warp ? (((i + j) % 4) + 4) % 4 : (((i + j) % 4) + 4) % 4 - 2, pos = (k + along) / 2
    const bundle = Math.sin(Math.PI * Math.min(1, Math.max(0, (across - .04) / .92))) ** .45
    const ends = Math.sin(Math.PI * Math.min(1, Math.max(0, pos))) ** .35
    const fibres = (hash(warp ? x : y, 0, warp ? 1 : 2) - .5) * .05 + (hash(Math.floor((warp ? x : y) / 3), 0, 3) - .5) * .07
    h[y * S + x] = bundle * (.55 + .45 * ends) + fibres
    shade[y * S + x] = (warp ? 1 : .74) * (.78 + .22 * bundle) * (1 + fibres * 1.2)
  }
  const col = Buffer.alloc(S * S * 3), nor = Buffer.alloc(S * S * 3); let sum = 0
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const k = y * S + x, g = Math.round(14 + 22 * shade[k]); sum += g
    col[k * 3] = g; col[k * 3 + 1] = g; col[k * 3 + 2] = Math.min(255, g + 2)
    const s = 5.5, dx = (h[y * S + (x + 1) % S] - h[y * S + (x + S - 1) % S]) * s, dy = (h[((y + 1) % S) * S + x] - h[((y + S - 1) % S) * S + x]) * s
    const nx = -dx, ny = dy, l = Math.hypot(nx, ny, 1)
    nor[k * 3] = Math.round((nx / l * .5 + .5) * 255); nor[k * 3 + 1] = Math.round((ny / l * .5 + .5) * 255); nor[k * 3 + 2] = Math.round((1 / l * .5 + .5) * 255)
  }
  const raw = { raw: { width: S, height: S, channels: 3 } }
  await sharp(col, raw).png({ compressionLevel: 9 }).toFile(path.join(HD, 'AttackMI_Carbon_A1_baseColor.png'))
  await sharp(nor, raw).png({ compressionLevel: 9 }).toFile(path.join(HD, 'AttackMI_Carbon_A1_normal.png'))
  console.log('carbon twill', S + 'px', N, 'tows a tile, mean', (sum / S / S).toFixed(1))
}

// ---------- the game's atlases, upscaled 4x ----------
// [file, kind]: 'labels' = colour with cut-out alpha, 'glyphs' = lettering and symbols, 'normal' = a normal map,
// 'atlas' = everything else
const JOBS = [
  ['AttackMI_Cabin1_baseColor.png', 'glyphs'], ['AttackMI_Cabin1_normal.png', 'normal'], ['AttackMI_Cabin_A1_baseColor.png', 'labels'],
  ['AttackMI_Cabin_Leather_A1_normal.png', 'normal'], ['AttackMI_Cabin_Grid_A1_baseColor.png', 'atlas'], ['AttackMI_Cabin_Grid_A1_normal.png', 'normal'],
  ['AttackMI_Logo1_baseColor.png', 'labels'], ['AttackMI_Logo1_normal.png', 'normal'], ['AttackStitch_baseColor.png', 'labels'], ['AttackStitch_normal.png', 'normal'],
  ['AttackMI_Light1_baseColor.png', 'atlas'], ['AttackMI_Light1_emissive.png', 'atlas'], ['AttackMI_Light1_normal.png', 'normal'],
  ['AttackMI_ChangeA_Tyre1_baseColor.png', 'glyphs'], ['AttackMI_ChangeA_Tyre1_normal.png', 'normal'], ['AttackMI_ChangeA_Tyre1_metallicRoughness.png', 'atlas'],
  ['AttackMI_Change_Brake1_baseColor.png', 'glyphs'], ['AttackMI_Change_Brake1_normal.png', 'normal'], ['AttackMI_Change_Brake1_metallicRoughness.png', 'atlas'],
  ['AttackMI_Engine1_baseColor.png', 'atlas'], ['AttackMI_Engine1_normal.png', 'normal'], ['AttackMI_Engine_A1_baseColor.png', 'labels'],
]
const K = 4
for (const [file, kind] of JOBS) {
  const src = path.join(SRC, file); if (!fs.existsSync(src)) { console.log('missing', file); continue }
  const m = await sharp(src).metadata(), W = m.width * K, H = m.height * K
  let out
  if (kind === 'labels') {
    const rgb = await sharp(src).removeAlpha().resize(W, H, { kernel: 'lanczos3' }).sharpen({ sigma: 1 }).raw().toBuffer()
    const a = await sharp(src).ensureAlpha().extractChannel(3).resize(W, H, { kernel: 'lanczos3' }).blur(K * .55).linear(4, -384).raw().toBuffer()
    const px = Buffer.alloc(W * H * 4); for (let i = 0; i < W * H; i++) { px[i * 4] = rgb[i * 3]; px[i * 4 + 1] = rgb[i * 3 + 1]; px[i * 4 + 2] = rgb[i * 3 + 2]; px[i * 4 + 3] = a[i] }
    out = sharp(px, { raw: { width: W, height: H, channels: 4 } })
  } else if (kind === 'glyphs') {
    // the lettering's pixel steps blurred away, then sharpened back (gently: harder sharpening rang round the letters)
    out = sharp(src).removeAlpha().resize(W, H, { kernel: 'lanczos3' }).blur(K * .4).sharpen({ sigma: K * .6, m1: .8, m2: 2.5 })
  } else if (kind === 'normal') {
    out = sharp(src).removeAlpha().resize(W, H, { kernel: 'lanczos3' }).blur(K * .35)
  } else {
    out = sharp(src).removeAlpha().resize(W, H, { kernel: 'lanczos3' }).blur(K * .35).sharpen({ sigma: K * .8, m1: 1, m2: 4 })
  }
  await out.png({ compressionLevel: 9 }).toFile(path.join(HD, file))
  console.log(file, m.width + 'px ->', W + 'px', kind)
}
