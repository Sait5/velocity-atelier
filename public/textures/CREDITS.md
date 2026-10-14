PBR material maps from Poly Haven, CC0. Downloaded through the official API.

- Brown Leather — Rob Tuytel, https://polyhaven.com/a/brown_leather . 0.40 × 0.40 metre tile. 1024 px OpenGL normal and roughness. Albedo is not used; upholstery colour remains configurable.
- Asphalt 01 — Charlotte Baglioni / Dario Barresi, https://polyhaven.com/a/asphalt_01 . 2.08 × 2.08 metre tile. 4096 px diffuse and 2048 px OpenGL normal and roughness for the motion road.

These are generic scanned surfaces, not Ferrari-specific material scans.

## Итальянское окружение

- [Vatican Road](https://polyhaven.com/a/vatican_road) — Greg Zaal / Poly Haven, CC0. Панорама улицы Рима: 1K HDR применяется для освещения и отражений. Сохранённая 8K JPG не используется как видимый фон.
- [Pavement 03](https://polyhaven.com/a/pavement_03) — Poly Haven, CC0. Цветовая карта тротуара 4K; нормали и шероховатость 2K. Преобразованы в WebP; 4K карта используется на тротуарах и в дворах.

- [Roof Tiles](https://polyhaven.com/a/roof_tiles) — Poly Haven, CC0. 2K diffuse, OpenGL normal and roughness converted to WebP, used on new pitched roofs. Geometry, chimneys and gutters are authored for this project.

## Roman stone road
Cobblestone Floor 08 — Poly Haven, CC0. https://polyhaven.com/a/cobblestone_floor_08
Albedo 4K, normal/roughness 2K, compressed to WebP. Preparation: tools/prepare-roman-cobbles.mjs.

Withered Grass — Poly Haven, CC0. https://polyhaven.com/a/withered_grass
2K albedo/normal converted to WebP for Roman countryside.

Leafy Grass — Poly Haven, CC0: https://polyhaven.com/a/leafy_grass
2K albedo and normal, WebP; greener countryside terrain. Prepared by tools/prepare-roman-meadow.mjs.

Sand 01 — Rob Tuytel, Poly Haven, CC0. https://polyhaven.com/a/sand_01 . 4K diffuse, 2K OpenGL normal and roughness. Used for the desert terrain and sand on asphalt.

Salt-flat surface and distant mountain geometry/materials: created for Velocity Atelier from the user's photographic composition reference. Procedural salt crust and mineral colour variation; no third-party salt-flat model loaded. Road: existing Poly Haven Asphalt 01 (CC0).

Salt-flat quality pass: Sand 01 OpenGL normal map and Rock Face 03 diffuse (Poly Haven, CC0) reused for salt microstructure and the distant mountain material. Procedural sky, mineral colour variation and verge geometry created for this project.
Salt-crust colour also reuses the desaturated Sand 01 diffuse map, remapped to a pale mineral palette in the shader (Poly Haven, CC0).

Open highway: Asphalt 01 base colour, OpenGL normal and roughness (Poly Haven, CC0); base colour remapped to neutral charcoal, procedural aggregate micro-normal and shoulder wear. Forward massif: Rock Face 03 diffuse, normal and roughness (Poly Haven, CC0), original procedural terrain geometry.

Blender salt-flat photographic ground and lake normals: see /models/saltflat/SOURCES.md. Poly Haven CC0; Three.js MIT.

Kloofendal 43d Clear Pure Sky — Greg Zaal / Poly Haven, CC0. https://polyhaven.com/a/kloofendal_43d_clear_puresky . File: saltflat-clear-sky-2k.hdr. Saltflat crystal colour/normal/roughness and shore field are generated for this project in Blender.

## Ground Salt Flat Smooth
Author: cspykstra. Source: https://www.cgtrader.com/free-3d-models/textures/natural-textures/ground-salt-flat-smooth
License: CGTrader Royalty Free (no AI), not CC0. Original 3072px Albedo, Normal and Roughness maps used in the salt-flat environment. Downloaded 2026-10-07. No standalone redistribution rights implied.


Snow 02 — Rob Tuytel / Poly Haven, CC0. https://polyhaven.com/a/snow_02 . 4K diffuse and 2K OpenGL normal/roughness, 2m tile. Used on the winter pass close slopes.
