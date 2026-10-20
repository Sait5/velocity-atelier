# Editable car sources

Uncompressed models the site's web versions are built from. They are not served by the site.

| Source | Site model (`public/models/`) | Built by |
| --- | --- | --- |
| `lamborghini-revuelto-user-edited.glb` | `lamborghini-revuelto-web.glb` | `node tools/bake-revuelto-web.mjs . tools/source-assets/cars/lamborghini-revuelto-user-edited.glb public/models/lamborghini-revuelto-web.glb` |
| `porsche-911-gt3-door-assembly.glb` | `porsche-911-gt3-web.glb` | `node tools/compress-glb.mjs . tools/source-assets/cars/porsche-911-gt3-door-assembly.glb public/models/porsche-911-gt3-web.glb` |
| `bugatti-tourbillon-door-fit-v4.glb` | `bugatti-tourbillon-web.glb` | `tools/blender-hinges/clean_bugatti_doors.py` (export), then `tools/compress-glb.mjs` |

The Blender scripts in `tools/blender-hinges/` find these files through `common.load()`.

Koenigsegg Jesko Attack: `koenigsegg-jesko-rigged.glb` is the output of `tools/prepare-jesko-model.py` (run on
`blender-cars/backups/jesko-original.blend`), compressed into `public/models/koenigsegg-jesko-web.glb` with
`node tools/compress-glb.mjs . tools/source-assets/cars/koenigsegg-jesko-rigged.glb public/models/koenigsegg-jesko-web.glb 92 --lossless=Dashboard`.
`jesko-textures/` holds the game's own textures as downloaded; `jesko-hd/` the high-resolution versions the prepare
script swaps in (`node tools/jesko-hd-textures.mjs`, then the screens and the tyre lettering drawn over them).
