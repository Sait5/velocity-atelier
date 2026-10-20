// node replace-texture.mjs <project> <in.glb> <out.glb> <imageName> <png> [<imageName> <png> ...]
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
const [rootArg, input, output, ...pairs] = process.argv.slice(2), root = path.resolve(rootArg)
const req = createRequire(path.join(root, 'package.json'))
const imp = n => import(pathToFileURL(req.resolve(n)).href)
const { NodeIO } = await imp('@gltf-transform/core')
const { ALL_EXTENSIONS } = await imp('@gltf-transform/extensions')
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc = await io.read(input)
const summary = d => ({ nodes: d.getRoot().listNodes().length, meshes: d.getRoot().listMeshes().length, materials: d.getRoot().listMaterials().length, textures: d.getRoot().listTextures().length, extras: d.getRoot().listNodes().filter(n => Object.keys(n.getExtras()).length).length })
const before = summary(doc)
for (let i = 0; i < pairs.length; i += 2) {
  const tex = doc.getRoot().listTextures().find(t => t.getName() === pairs[i])
  if (!tex) throw new Error('texture not found: ' + pairs[i])
  tex.setImage(new Uint8Array(fs.readFileSync(pairs[i + 1]))).setMimeType('image/png')
  console.log('replaced', pairs[i], tex.getSize())
}
await io.write(output, doc)
const after = summary(await io.read(output))
console.log('before', JSON.stringify(before), '\nafter ', JSON.stringify(after), '\nsize', fs.statSync(input).size, '->', fs.statSync(output).size)
