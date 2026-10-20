// Re-encode the drive-map textures as WebP. Originals stay in tools/source-assets/textures and are not served.
// Tiling maps are resized with wrapped padding so tile edges stay seamless; terrain colour maps keep their size.
// Usage (from the checkout): node tools/compress-textures.mjs [part of a source name, to redo only those]
import sharp from 'sharp'
import fs from 'node:fs'

const src = 'tools/source-assets/textures/'
// [source, output under public/, width, WebP quality]. Normal maps get a higher quality than colour and roughness.
const jobs = [
  ['asphalt_01_diff_4k.jpg', 'textures/asphalt_01_diff_4k.webp', 4096, 90],
  ['asphalt_01_nor_gl_2k.jpg', 'textures/asphalt_01_nor_gl_2k.webp', 2048, 95],
  ['asphalt_01_rough_2k.jpg', 'textures/asphalt_01_rough_2k.webp', 2048, 90],
  ['rock_face_03_diff_4k.jpg', 'textures/rock_face_03_diff_4k.webp', 4096, 90],
  ['rock_face_03_nor_gl_2k.jpg', 'textures/rock_face_03_nor_gl_2k.webp', 2048, 95],
  ['rock_face_03_rough_2k.jpg', 'textures/rock_face_03_rough_2k.webp', 2048, 90],
  ['snow_02_diff_4k.jpg', 'textures/snow_02_diff_4k.webp', 4096, 90],
  ['snow_02_rough_2k.jpg', 'textures/snow_02_rough_2k.webp', 2048, 90],
  ['sand_01_diff_4k.jpg', 'textures/sand_01_diff_2k.webp', 2048, 90],
  // the salt crust keeps the scan's full 3072 px: it fills most of the salt flat's near ground
  ['saltflat-scan-albedo.jpg', 'textures/saltflat-scan-albedo-3k.webp', 3072, 92],
  ['saltflat-scan-normal.jpg', 'textures/saltflat-scan-normal-3k.webp', 3072, 95],
  ['saltflat-scan-roughness.jpg', 'textures/saltflat-scan-roughness-2k.webp', 2048, 90],
  // The winter photograph keeps all 8192 px: it carries real detail on the slopes 65–450 m from the road.
  ['winter-terrain-colour.jpg', 'models/winter-road/terrain-colour.webp', 8192, 85],
  ['mountain-terrain-colour.jpg', 'models/mountain-road/terrain-colour.webp', 2048, 92]
]

// Pixel values are used as stored: WebGL ignores the embedded ICC profiles of the data maps, so must we.
const raw = { ignoreIcc: true }
async function pixels(file, width) {
  const meta = await sharp(file).metadata()
  if (meta.width === width) return sharp(file, raw).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const height = Math.round(width * meta.height / meta.width), pad = 32, padIn = Math.round(pad * meta.width / width)
  const wrapped = await sharp(file, raw).removeAlpha().extend({ top: padIn, bottom: padIn, left: padIn, right: padIn, extendWith: 'repeat' }).raw().toBuffer({ resolveWithObject: true })
  return sharp(wrapped.data, { raw: wrapped.info }).resize(width + 2 * pad, height + 2 * pad, { kernel: 'lanczos3' })
    .extract({ left: pad, top: pad, width, height }).raw().toBuffer({ resolveWithObject: true })
}

let before = 0, after = 0
for (const [name, output, width, quality] of jobs.filter(([name]) => !process.argv[2] || name.includes(process.argv[2]))) {
  const image = await pixels(src + name, width)
  await sharp(image.data, { raw: image.info }).webp({ quality, effort: 6, smartSubsample: true }).toFile('public/' + output)
  const a = fs.statSync(src + name).size, b = fs.statSync('public/' + output).size
  before += a; after += b
  console.log(`${name.padEnd(30)} ${(a / 1048576).toFixed(2).padStart(6)} MB -> ${output} ${(b / 1048576).toFixed(2)} MB`)
}
console.log(`total ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB`)
