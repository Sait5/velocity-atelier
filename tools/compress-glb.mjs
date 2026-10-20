// Compress a GLB for the web: Draco geometry, WebP textures. Materials are never merged (the runtime finds them by name).
// Usage (from the checkout): node tools/compress-glb.mjs . <input.glb> <output.glb> [webp quality, default 92] [--detail] [--lossless=<regex>]
// --detail: sharper cabin textures for the CSR2-based cars (see upgrade-car-textures.mjs).
// --lossless=<regex>: textures whose name matches are stored as lossless WebP (screens and symbol atlases: lossy WebP
// rings round thin bright lines and letters).
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
const args = process.argv.slice(2).filter(a => a !== '--detail' && !a.startsWith('--lossless=')), detail = process.argv.includes('--detail')
const losslessArg = process.argv.find(a => a.startsWith('--lossless=')), lossless = losslessArg ? new RegExp(losslessArg.slice(11)) : null
const [rootArg, input, output, quality = '92'] = args, root = path.resolve(rootArg)
const req = createRequire(path.join(root, 'package.json'))
const imp = n => import(pathToFileURL(req.resolve(n)).href)
const { NodeIO, PropertyType } = await imp('@gltf-transform/core')
const { ALL_EXTENSIONS } = await imp('@gltf-transform/extensions')
const { dedup, prune, draco, textureCompress } = await imp('@gltf-transform/functions')
const sharp = (await imp('sharp')).default
const draco3d = (await imp('draco3dgltf')).default
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.encoder': await draco3d.createEncoderModule(), 'draco3d.decoder': await draco3d.createDecoderModule() })
const doc = await io.read(input)
const names = doc.getRoot().listMaterials().map(m => m.getName()).sort()
if (detail) { const { upgradeCarTextures } = await import('./upgrade-car-textures.mjs'); for (const line of await upgradeCarTextures(doc, sharp)) console.log(line) }
await doc.transform(dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH, PropertyType.TEXTURE] }), prune(),
  ...(lossless ? [textureCompress({ encoder: sharp, targetFormat: 'webp', lossless: true, pattern: lossless })] : []),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: Number(quality), ...(lossless ? { pattern: new RegExp('^(?!.*(' + lossless.source + '))') } : {}) }),
  draco({ quantizePosition: 16, quantizeNormal: 12, quantizeTexcoord: 14, compressionLevel: 7 }))
const after = doc.getRoot().listMaterials().map(m => m.getName()).sort()
if (after.join('|') !== names.join('|')) console.warn('materials changed:', names.length, '->', after.length)
await io.write(output, doc)
console.log('size', fs.statSync(input).size, '->', fs.statSync(output).size, 'materials', after.length)
