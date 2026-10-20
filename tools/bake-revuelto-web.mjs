// Bake the Revuelto legacy-hook face masks into the GLB, then compress it (Draco geometry, WebP textures).
// Usage (from the checkout): node tools/bake-revuelto-web.mjs . tools/source-assets/cars/lamborghini-revuelto-user-edited.glb public/models/lamborghini-revuelto-web.glb
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
const [rootArg, input, output] = process.argv.slice(2), root = path.resolve(rootArg)
const req = createRequire(path.join(root, 'package.json'))
const imp = n => import(pathToFileURL(req.resolve(n)).href)
const { NodeIO } = await imp('@gltf-transform/core')
const { ALL_EXTENSIONS } = await imp('@gltf-transform/extensions')
const { dedup, prune, draco, textureCompress } = await imp('@gltf-transform/functions')
const sharp = (await imp('sharp')).default
const draco3d = (await imp('draco3dgltf')).default
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.encoder': await draco3d.createEncoderModule(), 'draco3d.decoder': await draco3d.createDecoderModule() })
const doc = await io.read(input)
const masks = JSON.parse(fs.readFileSync(path.join(root, 'tools/revuelto-legacy-hook-faces.json'), 'utf8'))
const key = (pos, i) => [0, 1, 2].map(k => Math.round(pos.getElement(i, [])[k] * 100000)).join(',')
for (const node of doc.getRoot().listNodes()) {
  const name = node.getName(); if (!masks[name]) continue
  const mesh = node.getMesh(); const prims = mesh.listPrimitives()
  if (prims.length !== 1) throw new Error('expected one primitive: ' + name)
  const prim = prims[0], pos = prim.getAttribute('POSITION'), idx = prim.getIndices().getArray()
  const mask = new Set(masks[name]), kept = [], bracket = []
  for (let t = 0; t < idx.length; t += 3) {
    const ids = [idx[t], idx[t + 1], idx[t + 2]], k = ids.map(i => key(pos, i)).sort().join(';')
    ;(mask.has(k) ? bracket : kept).push(...ids)
  }
  if (bracket.length / 3 !== mask.size) throw new Error(`mask mismatch ${name}: ${bracket.length / 3}/${mask.size}`)
  const Ctor = idx.constructor
  prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Ctor(kept)).setBuffer(prim.getIndices().getBuffer()))
  if (/^DoorJamb[LR]F_CarPaint$/.test(name)) {
    // the original orange hook is a rigid part of the moving door: its own node, same material and vertices
    const hookPrim = prim.clone().setIndices(doc.createAccessor().setType('SCALAR').setArray(new Ctor(bracket)).setBuffer(prim.getIndices().getBuffer()))
    const hookName = name.replace('_CarPaint', '_OriginalOrangeBracket')
    const hook = doc.createNode(hookName).setMesh(doc.createMesh(hookName).addPrimitive(hookPrim))
      .setTranslation(node.getTranslation()).setRotation(node.getRotation()).setScale(node.getScale())
    const parent = node.getParentNode(); if (parent) parent.addChild(hook); else doc.getRoot().getDefaultScene().addChild(hook)
  }
  console.log(name, 'kept', kept.length / 3, 'moved/hidden', bracket.length / 3)
}
await doc.transform(dedup(), prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 92 }),
  draco({ quantizePosition: 16, quantizeNormal: 12, quantizeTexcoord: 14, compressionLevel: 7 }))
await io.write(output, doc)
console.log('size', fs.statSync(input).size, '->', fs.statSync(output).size)
