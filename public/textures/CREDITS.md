# Velocity Atelier — материалы и небо · Materials and sky

За основу взяты сканы материалов и панорама неба других авторов (в основном Poly Haven, CC0), остальное сделано и доработано для проекта. В каждой записи указаны автор, ссылка на источник и лицензия. Ниже — технические заметки, которые велись по ходу работы (на английском); раздел «Архив» описывает текстуры, которые сайт больше не загружает.

The site builds on other authors' material scans and sky panorama (mostly Poly Haven, CC0); the rest was made and refined for the project. Each record names the author, the source and the licence. Below are the technical notes kept as the work went on; the "Archive" section describes textures the site no longer loads.

## Сканы материалов · Material scans

За основу взяты сканы Poly Haven, остальное сделано и доработано для проекта.
Poly Haven scans were the starting point; the rest was made and refined for the project.

PBR material maps from Poly Haven, CC0. Downloaded through the official API.

- Asphalt 01 — Charlotte Baglioni / Dario Barresi, https://polyhaven.com/a/asphalt_01 . 2.08 × 2.08 metre tile. 4096 px diffuse and 2048 px OpenGL normal and roughness for the roads of every map.
- Rock Face 03 — Dario Barresi / Rico Cilliers, https://polyhaven.com/a/rock_face_03 . Diffuse, OpenGL normal and roughness for the mountain valley slopes.
- Snow 02 — Rob Tuytel / Poly Haven, CC0. https://polyhaven.com/a/snow_02 . 4K diffuse and 2K OpenGL normal/roughness, 2m tile. Used on the winter pass close slopes.
- Sand 01 — Rob Tuytel, https://polyhaven.com/a/sand_01 . 2K diffuse map for the salt-flat road banks.

These are generic scanned surfaces, not Ferrari-specific material scans.

## Небо · Sky

За основу взята панорама неба Poly Haven, остальное сделано и доработано для проекта.
The Poly Haven sky panorama was the starting point; the rest was made and refined for the project.

Kloofendal 43d Clear Pure Sky — Greg Zaal / Poly Haven, CC0. https://polyhaven.com/a/kloofendal_43d_clear_puresky . File: saltflat-clear-sky-2k.hdr. Saltflat crystal colour/normal/roughness and shore field are generated for this project in Blender.

## Солончак · Salt flat

За основу взят фотоскан соляной корки, остальное сделано для проекта.
A photo scan of the salt crust was the starting point; the rest was made for the project.

Ground Salt Flat Smooth — Author: cspykstra. Source: https://www.cgtrader.com/free-3d-models/textures/natural-textures/ground-salt-flat-smooth
License: CGTrader Royalty Free (no AI), not CC0. Original 3072px Albedo, Normal and Roughness maps used in the salt-flat environment. Downloaded 2026-10-07. No standalone redistribution rights implied.

Blender salt-flat photographic ground and lake normals: see /models/saltflat/SOURCES.md. Poly Haven CC0; Three.js MIT.

## Тоннель · Tunnel finishes — 2026-10-16

За основу взяты карты бетона из модели тоннеля (ambientCG, CC0), остальное сделано и доработано для проекта.
The concrete maps of the tunnel model (ambientCG, CC0) were the starting point; the rest was made and refined for the project.

Asphalt 01 OpenGL normal and roughness (Poly Haven, CC0, already listed above) add surface relief and a worn sheen to the tunnel road on a second metric UV set. The cladding panels, sprayed-concrete vault, soot and luminaire spill are shader work on the tunnel model's existing Concrete042A maps (ambientCG, CC0). The mountain sea, mist banks, snowfall and salt ridges are procedural, no new third-party assets.

## Вода · Water

За основу взята карта нормалей воды из примеров three.js (MIT), остальное сделано для проекта.
The water normal map from the three.js examples (MIT) was the starting point; the rest was made for the project.

`salt-lake-water-normal.jpg`: Three.js examples/textures/waternormals.jpg — MIT, Three.js contributors, https://github.com/mrdoob/three.js/blob/dev/LICENSE . Used for the salt-flat lakes and the mountain sea.

## Архив · Archive

Текстуры, которые сайт больше не загружает; записи оставлены для истории.
Textures the site no longer loads; the records are kept for history.

### Итальянское окружение

- [Vatican Road](https://polyhaven.com/a/vatican_road) — Greg Zaal / Poly Haven, CC0. Панорама улицы Рима: 1K HDR применялась для освещения и отражений. Сохранённая 8K JPG не использовалась как видимый фон.
- [Pavement 03](https://polyhaven.com/a/pavement_03) — Poly Haven, CC0. Цветовая карта тротуара 4K; нормали и шероховатость 2K. Преобразованы в WebP; 4K карта использовалась на тротуарах и в дворах.

- [Roof Tiles](https://polyhaven.com/a/roof_tiles) — Poly Haven, CC0. 2K diffuse, OpenGL normal and roughness converted to WebP, used on new pitched roofs. Geometry, chimneys and gutters are authored for this project.

### Brown Leather
- Brown Leather — Rob Tuytel, https://polyhaven.com/a/brown_leather . 0.40 × 0.40 metre tile. 1024 px OpenGL normal and roughness. Albedo was not used; the upholstery colour stayed configurable. The cabins now carry their own leather textures.

### Roman stone road
Cobblestone Floor 08 — Poly Haven, CC0. https://polyhaven.com/a/cobblestone_floor_08
Albedo 4K, normal/roughness 2K, compressed to WebP. Preparation: tools/prepare-roman-cobbles.mjs.

Withered Grass — Poly Haven, CC0. https://polyhaven.com/a/withered_grass
2K albedo/normal converted to WebP for Roman countryside.

Leafy Grass — Poly Haven, CC0: https://polyhaven.com/a/leafy_grass
2K albedo and normal, WebP; greener countryside terrain. Prepared by tools/prepare-roman-meadow.mjs.

### Earlier salt-flat and highway passes
Sand 01 earlier: 4K diffuse, 2K OpenGL normal and roughness. Used for the desert terrain and sand on asphalt.

Salt-flat surface and distant mountain geometry/materials: created for Velocity Atelier from the user's photographic composition reference. Procedural salt crust and mineral colour variation; no third-party salt-flat model loaded. Road: existing Poly Haven Asphalt 01 (CC0).

Salt-flat quality pass: Sand 01 OpenGL normal map and Rock Face 03 diffuse (Poly Haven, CC0) reused for salt microstructure and the distant mountain material. Procedural sky, mineral colour variation and verge geometry created for this project.
Salt-crust colour also reuses the desaturated Sand 01 diffuse map, remapped to a pale mineral palette in the shader (Poly Haven, CC0).

Open highway: Asphalt 01 base colour, OpenGL normal and roughness (Poly Haven, CC0); base colour remapped to neutral charcoal, procedural aggregate micro-normal and shoulder wear. Forward massif: Rock Face 03 diffuse, normal and roughness (Poly Haven, CC0), original procedural terrain geometry.

### Asset cleanup — 2026-10-15
Textures no live scene loads were removed (they stay in git history): desert sand, Italian pavement and roof sets, Roman grass, the salt-crust and salt-crystal sets, the 8K Vatican road photo, Rock 3, the 1K asphalt and the Sand 01 normal/roughness maps.
