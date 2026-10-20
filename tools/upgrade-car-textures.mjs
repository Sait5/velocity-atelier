// Sharper cabins for the CSR2-based cars (Porsche, Bugatti): their interiors use a 512 px label atlas and a 128 px
// carbon tile, which read as pixels in the cockpit camera. Used by compress-glb.mjs --detail:
//  * Carbon1: the 8x8 twill tile is redrawn at 1024 px (same weave count, so the tiling on the car is unchanged)
//    with fibre streaks, plus a matching normal map.
//  * Label/badge atlases (InteriorA, TexturedA, dash, BadgeA): 2x Lanczos upscale with light sharpening.
const WEAVE = 8, SIZE = 1024

function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

/** RGB carbon twill and its tangent-space normal map, SIZE x SIZE, raw 3-channel buffers. */
export function carbonTwill(dark = 16, light = 46) {
  const color = Buffer.alloc(SIZE * SIZE * 3), normal = Buffer.alloc(SIZE * SIZE * 3), cell = SIZE / WEAVE
  const height = (x, y) => {
    const i = Math.floor(x / cell), j = Math.floor(y / cell), u = (x % cell) / cell, v = (y % cell) / cell
    const along = Math.floor((i + j) / 2) % 2 === 0, across = along ? v : u     // 2x2 twill: tows step diagonally
    const gap = Math.min(u, 1 - u, v, 1 - v) < .018 ? .25 : 1
    return { h: Math.sin(Math.PI * across) * gap, along, across, fibre: along ? y : x }
  }
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const { h, along, fibre } = height(x, y)
    const streak = .75 + .25 * hash(fibre * 3.1 + (along ? 1 : 7)), sheen = along ? 1 : .78
    const c = Math.round(dark + (light - dark) * h * streak * sheen), k = (y * SIZE + x) * 3
    color[k] = c; color[k + 1] = c; color[k + 2] = Math.min(255, c + 2)
    const dx = height((x + 1) % SIZE, y).h - height((x + SIZE - 1) % SIZE, y).h, dy = height(x, (y + 1) % SIZE).h - height(x, (y + SIZE - 1) % SIZE).h
    const nx = -dx * 1.6, ny = dy * 1.6, len = Math.hypot(nx, ny, 1)
    normal[k] = Math.round((nx / len * .5 + .5) * 255); normal[k + 1] = Math.round((ny / len * .5 + .5) * 255); normal[k + 2] = Math.round((1 / len * .5 + .5) * 255)
  }
  return { color, normal, size: SIZE }
}

/** Replace/upscale textures in a gltf-transform document in place. */
export async function upgradeCarTextures(doc, sharp) {
  const done = new Set(), report = []
  let carbon
  for (const material of doc.getRoot().listMaterials()) {
    const name = material.getName()
    if (/Carbon1_Material1$/.test(name)) {
      carbon ??= carbonTwill()
      const raw = { raw: { width: carbon.size, height: carbon.size, channels: 3 } }
      for (const [texture, data, mime] of [[material.getBaseColorTexture(), carbon.color], [material.getNormalTexture(), carbon.normal]]) {
        if (!texture || done.has(texture)) continue
        texture.setImage(await sharp(data, raw).png().toBuffer()).setMimeType('image/png'); done.add(texture)
        report.push(`${name}: carbon ${carbon.size}px`)
      }
    } else if (/(InteriorA_Material1|TexturedA_Material1|BadgeA_Material1|^dash)$/.test(name)) {
      const texture = material.getBaseColorTexture()
      if (!texture || done.has(texture)) continue
      const image = sharp(Buffer.from(texture.getImage())), meta = await image.metadata()
      if (meta.width >= 2048) continue
      const buffer = await image.resize({ width: meta.width * 2, height: meta.height * 2, kernel: 'lanczos3' }).sharpen({ sigma: .6 }).png().toBuffer()
      texture.setImage(buffer).setMimeType('image/png'); done.add(texture)
      report.push(`${name}: ${meta.width} -> ${meta.width * 2}px`)
    }
  }
  return report
}
