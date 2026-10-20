// Publish rendered studio work to the site: <id>-<shot>.png photos -> public/garage/<id>-<shot>.webp (2560 px, WebP q88),
// <id>.webm films (+ poster .webp) -> public/video/garage/studio-<id>.webm/.webp. Prints sizes.
//   node tools/blender-studio/publish.mjs <renderDir>
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const dir = process.argv[2]
if (!dir) { console.error('usage: publish.mjs <renderDir>'); process.exit(1) }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const photos = path.join(root, 'public/garage'), films = path.join(root, 'public/video/garage')
fs.mkdirSync(photos, { recursive: true }); fs.mkdirSync(films, { recursive: true })
for (const f of fs.readdirSync(dir)) {
  const src = path.join(dir, f)
  if (/^[\w]+-(front|side|rear|interior)\.png$/.test(f)) {
    const out = path.join(photos, f.replace(/\.png$/, '.webp'))
    await sharp(src).webp({ quality: 88, smartSubsample: true, effort: 6 }).toFile(out)
    console.log('photo', path.basename(out), (fs.statSync(out).size / 1024).toFixed(0), 'KB')
  } else if (/^\w+\.webm$/.test(f)) {
    const id = f.replace(/\.webm$/, '')
    fs.copyFileSync(src, path.join(films, `studio-${id}.webm`))
    if (fs.existsSync(path.join(dir, id + '.webp'))) fs.copyFileSync(path.join(dir, id + '.webp'), path.join(films, `studio-${id}.webp`))
    console.log('film', `studio-${id}.webm`, (fs.statSync(src).size / 1e6).toFixed(1), 'MB')
  }
}
