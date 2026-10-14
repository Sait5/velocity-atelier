# Blender salt-flat speed test

Editable source: tools/generated/saltflat/saltflat-speed-test.blend.
Current refinement: Blender 5.2 --background --python tools/refine-saltflat-environment.py. This opens and edits the existing source.
Runtime: app/three/saltFlatEnvironment.ts. Near and far geometry share PBR texture maps. Water approximates sky reflections with animated normal maps and Fresnel; it has no offscreen scene reflection pass. Road tiles have matching positions and integer UV periods. The horizon massif stays ahead while terrain tiles scroll.

Photographic textures:
- Asphalt 01: https://polyhaven.com/a/asphalt_01 — CC0.
- Mud Cracked Dry 03: https://polyhaven.com/a/mud_cracked_dry_03 — CC0. Blender-baked pale mineral albedo derived from cracked dry soil, not a salt-field scan.
- Sand 01: https://polyhaven.com/a/sand_01 — CC0.
- Rock Face 03: https://polyhaven.com/a/rock_face_03 — CC0.
- Water normal: Three.js examples/textures/waternormals.jpg — MIT, Three.js contributors, https://github.com/mrdoob/three.js/blob/dev/LICENSE.

Geometry was created for Velocity Atelier in Blender. No purchased map assets. The browser uses animated normal waves and lightweight sky reflections; it does not run path tracing or a fluid simulation.

2026-10-07: lake banks moved closer to the highway (9–14 m from centre); mountain backdrop moved 1.8 km farther ahead and stays stationary during driving. Water uses three wave scales, near-shore depth colour and animated sun highlights.

2026-10-07: shoulder narrowed to 0.45 m and replaced with pale mineral clay sharing the photographic salt-ground maps. Shoreline is 6.45–8.35 m from centre. Road and lake tiles remain separate from the stationary mountain backdrop.

2026-10-07 optimization: lake strips are approximately 35 m wide per side, with a periodic irregular outer mineral shore and a continuous low-detail plain beyond. The stationary massif is 1.7 times wider and decimated to 9,503 triangles. Road albedo is 4K with 2K normal/roughness, 1.25 m texture repeats and distance-faded secondary normal detail. Mineral banks include 9 mm periodic relief. Driving shadows use a 1024 map refreshed at most 20 times per second. Distant terrain omits normal/roughness textures; water uses no reflection target and no extra full-scene render. Full rebuilds use build-saltflat-blender.py; optimize-saltflat-blender.py records the one-time migration of the prior source.

Current reference revision (supersedes the continuous lake strips): right-side shallows with irregular salt islands, and an entirely dry left side, surrounded by continuous white-grey salt crust. The same salt material forms the submerged floor. Basin outlines have low-amplitude irregular lobes, a gently lowered floor and alpha-faded water contact. The browser approximates refraction using an offset sample of the salt texture; sky/Fresnel reflections and calm animated normals need no extra scene render. This is a visual approximation, not physically traced refraction. Water geometry is 160 triangles per 160 m section. The mountain silhouette is four times its original width and 65% its original height, stays stationary more than 2.5 km ahead and never joins scrolling terrain. Near salt terrain uses normal/roughness maps; the distant plain uses shared albedo only. There are no plants, buildings, brown soil materials or extra purchased assets.

After the Blender build, compress the newly baked salt-crust-albedo-4k.png to salt-crust-albedo-4k.webp with sharp at quality 94 before running npm run build. Blender stores the original PNG material; the browser uses its WebP equivalent.

Daylight revision: no mountain object in the Blender source or runtime loading. The highway is 7.4 m wide, with centimetre-scale periodic edge variation. Organic right-side basins use irregular salt shelves and a shared shoreline equation for the Blender floor, wet fringe and browser water. Salt UV repeats are 1.6 m; normal and roughness detail fade into the distant albedo-only plain. The sun is lower and directional, ambient fill is reduced and daylight bloom is limited to 0.07. Blender uses its Multiple Scattering sky model (Blender 5.2); the browser uses a matching inexpensive sky gradient. Water refraction remains a lightweight visual approximation using the actual salt-colour texture, not a scene capture.

Compact salt-flat revision: surrounding half-width reduced from 1600 m to 220 m. The 14 cm asphalt/mineral feather is welded into each salt-bank mesh; there is no standalone shoulder object or draw call. The grade difference at the asphalt boundary is reduced to 15 mm. Salt texture scale is 0.8 m with lighter, less contrasted fissures and distance-faded detail; the outer plain uses no texture or normal samples and fades into analytic ground/sky. Larger right-side shallows share the same organic coverage equation in Blender and the browser, with white mineral islands and a salt floor. Blender contains a baked coverage mask and linked preview sections; only reusable near/far geometry is exported. The browser captures its daylight sky once into PMREM, shared by vehicle and environment, with no per-frame reflection pass. Existing 4K asphalt/2K normal and roughness maps, LOD, shared geometry and frustum culling remain. Water reflection/refraction is an optimized approximation.

Latest continuous-surface revision (supersedes historical notes above): no mountains or separate shoulders. Eight linked 160 m variants form a 1,280 m shoreline pattern, with 5,958 near / 758 far triangles per section and 2 water triangles. Terrain half-width is 160 m including the low-cost horizon continuation. Asphalt and salt blend across one continuous mesh. Salt microtextures are generated mineral grain and tiny raised rims, not cracked-clay scan maps. The shared non-colour depth atlas controls the Blender basin and browser water; matching UV orientation and seams are verified by tools/verify-saltflat-environment.mjs.

Daylight HDRI: Kloofendal 43d Clear Pure Sky, Greg Zaal, Poly Haven, CC0: https://polyhaven.com/a/kloofendal_43d_clear_puresky . Local file: /textures/saltflat-clear-sky-2k.hdr (2K). Shared sky reflection capture is created once at loading, not every frame. Calm water uses Fresnel, normal detail and salt-floor colour absorption; this is an optimized approximation rather than ray-traced water. Near detail fades with distance, geometry and materials are shared across tiles, and the road remains level.

Detail pass: Blender-authored folded galvanized guardrails, shallow dry-salt relief below 4 cm, stronger crystal normal detail, richer asphalt photograph response and a baked sparse high-cloud mask. Submerged salt height remains controlled by the same depth atlas. Tunnel normals and UV phase matched at 56 boundary groups; nearest light pairs fade through wraps.

Salt surface: Ground Salt Flat Smooth by cspykstra, CGTrader Royalty Free (no AI), not CC0. See /textures/CREDITS.md. Original 3K maps. Raised road and narrow ochre embankment authored in Blender.

