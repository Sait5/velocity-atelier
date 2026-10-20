# Drive-map texture sources

Full-quality JPEGs the site's WebP textures are built from. They are not served by the site.

Rebuild every runtime copy with `node tools/compress-textures.mjs` (resolution and WebP quality per map are listed in the script).

| Source | Site texture (`public/`) |
| --- | --- |
| `asphalt_01_*` | `textures/asphalt_01_*_2k.webp` — salt flat, mountain and winter road |
| `rock_face_03_*` | `textures/rock_face_03_*_2k.webp` — mountain slopes |
| `snow_02_diff_4k.jpg`, `snow_02_rough_2k.jpg` | `textures/snow_02_*_2k.webp` — winter (the snow normal map is still served as the original JPEG) |
| `sand_01_diff_4k.jpg` | `textures/sand_01_diff_2k.webp` — salt-flat road banks |
| `saltflat-scan-*.jpg` | `textures/saltflat-scan-*-2k.webp` — salt crust |
| `winter-terrain-colour.jpg` | `models/winter-road/terrain-colour.webp` (8192 px, unchanged size) |
| `mountain-terrain-colour.jpg` | `models/mountain-road/terrain-colour.webp` |

`tools/prepare-mountain-textures.mjs` still writes `terrain-colour.jpg` into `public/models/*-road/`. After re-running it,
move those files here under the names above and run the WebP script again.

Credits and licences: `public/textures/CREDITS.md`.
