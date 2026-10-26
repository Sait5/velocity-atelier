# Velocity Atelier — 3D-модели и карты · 3D models and maps

За основу взяты каркасы моделей и сцен других авторов, остальное сделано и доработано для проекта. В каждой записи указаны автор, ссылка на источник и лицензия. Ниже — технические заметки, которые велись по ходу работы (на английском); раздел «Архив» описывает версии, которые сайт больше не загружает.

The site builds on the base meshes of other authors' models and scenes; the rest was made and refined for the project. Each record names the author, the source and the licence. Below are the technical notes kept as the work went on; the "Archive" section describes versions the site no longer loads.

## Автомобили · Cars

### Ferrari 458 Italia

За основу взят каркас модели, остальное сделано и доработано для проекта.
The model's base mesh was the starting point; the rest was made and refined for the project.

**2011 Ferrari 458 Italia**, Ddiaz Design (@ddiaz-design):
https://sketchfab.com/3d-models/2011-ferrari-458-italia-bb6c7fa565c04ec59cd9d0e0a4d0098c
CC Attribution 4.0: https://creativecommons.org/licenses/by/4.0/
Uploader identifies the source as Forza Motorsport 4, crediting https://vk.com/free_3d_car_models .

`ferrari-italia-complete.glb` is used in both showroom and drive. Changes: orientation and floor centering, named door hinges including native cards/windows/mirrors, rotating wheel groups with stationary calipers, physical finish adjustments and a tintable leather albedo.

Build: `tools/prepare-full-italia.py`; inventory: `tools/complete-italia-manifest.json`. No affiliation with Ferrari. Attribution records uploader provenance without independently asserting clearance of underlying game rights.

### Lamborghini Revuelto

За основу взят каркас модели, остальное сделано и доработано для проекта.
The model's base mesh was the starting point; the rest was made and refined for the project.

Author: Anatolian Studios. Source: https://sketchfab.com/3d-models/lamborghini-revuelto-099b60042519463ead19ce054d479724
License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
File: `lamborghini-revuelto-web.glb` (Draco/WebP; editable source in `tools/source-assets/cars`). Adaptations: coordinate alignment, scissor-door groups, retractable side windows, wheel pivots with stationary calipers, paint and lamp controls.

### Porsche 911 GT3 992.2 (2025)

За основу взят каркас модели, остальное сделано и доработано для проекта.
The model's base mesh was the starting point; the rest was made and refined for the project.

Ddiaz Design; source credits GM25 / CSR2. https://sketchfab.com/3d-models/2025-porsche-911-gt3-992-2-1503f8d08f154ec7ab52f95a99c55134
CC BY-NC-SA 4.0: https://creativecommons.org/licenses/by-nc-sa/4.0/ . Noncommercial only; uploader identifies CSR2 provenance; underlying game rights have not independently been established.
File: `porsche-911-gt3-web.glb` (Draco/WebP). Changes: metre scale, independent door and wheel pivots, separated door trim and glass, runtime materials and lighting. Editable adaptation: tools/generated/porsche/Porsche-911-GT3-rigged.blend.

Porsche door correction: complete UV/edge-connected trim, window seals, carbon inserts and speaker pieces assigned to their respective hinges. Original corner normals retained.

### Bugatti Tourbillon

За основу взят каркас модели, остальное сделано и доработано для проекта.
The model's base mesh was the starting point; the rest was made and refined for the project.

2026 Bugatti Tourbillon — Ddiaz Design; based on CSR2, credits ZD 3D Modelling and Design. CC BY-NC-SA 4.0. https://sketchfab.com/3d-models/2026-bugatti-tourbillon-4f63f5a74611477989cefd9861b9784a
File: `bugatti-tourbillon-web.glb` (Draco/WebP). Changes: metre scale, door and wheel assemblies, materials and lamp controls. Source rights beyond uploader license not independently verified.

### McLaren 750S

За основу взят каркас модели, остальное сделано и доработано для проекта.
The model's base mesh was the starting point; the rest was made and refined for the project.

**McLaren 750S**, geyges: https://sketchfab.com/3d-models/mclaren-750s-d9c90e0bb53c450f88544559640143e0
Sketchfab Free Standard licence: https://sketchfab.com/licenses

`mclaren-750s-web.glb` is built by `tools/prepare-mclaren-model.py` (Blender) and `tools/compress-glb.mjs`. Changes: turned
to the site axes, the merged wheel meshes split into four wheels, the door parts gathered into two dihedral door groups,
identical materials folded, Draco geometry and WebP textures. No affiliation with McLaren.

### Mercedes-AMG GT 63

За основу взят каркас кузова, остальное сделано и доработано для проекта. Салон — на основе Mercedes-AMG E 63 S (W213).
The body's base mesh was the starting point; the rest was made and refined for the project. The cabin is based on the Mercedes-AMG E 63 S (W213).

**Mercedes Gt63 Amg**, mohamedouartassi: https://sketchfab.com/3d-models/mercedes-gt63-amg-fdca0306571b47adaf440f08a9b98231
CC Attribution 4.0: https://creativecommons.org/licenses/by/4.0/

Its cabin is based on **Mercedes-AMG E 63 S (W213)**, Mona x Supercars (@Car2022):
https://sketchfab.com/3d-models/mercedes-amg-e-63-s-w213-f61d8efb0b9b4c499fc66fcf35a4d09c
CC Attribution 4.0: https://creativecommons.org/licenses/by/4.0/

`mercedes-amg-gt63-web.glb` is built by `tools/prepare-amg-model.py` (Blender) and `tools/compress-glb.mjs`. Changes to
the GT 63: modifiers applied (subdivision one level lighter than the source's viewport, tyres decimated), scaled to
metres and turned to the site axes, four wheel groups (calipers stay still), four door groups hinged at their front
edges with their glass (the site opens only the front pair), beltline trim and mirrors, tyre and indicator lens colours reduced to plain surfaces (the
source's procedural dust layers do not survive glTF), the author's plate lettering removed (the site draws its own
plates), painted shut faces with a rubber seal, window ledges and hinge faces closing the doors, painted hinge pillars with the body's aperture flange and the door seal. Its own
cabin, a placeholder, is replaced by the W213's (`tools/extract-amg-interior.py`: the cabin only, no paint, glass,
lamps, running gear or the doors' base panels), fitted under the GT 63's roof and glass, the door card pieces given to
the doors with their window frames cut off and closed into whole door shells (the card's base panel rebuilt from its own
surface, shut faces, window ledges, a speaker, a door pocket and a carpet strip built for the project), materials made matte, the pure-black plastics lifted to a charcoal, repeated textures folded into one
material each, the leather texture lifted to a light grain the upholstery colour tints, the steering wheel rim rebuilt
as a smooth tube on the same ring, the airbag cover subdivided, the console controller's chrome ring and the hazard
switch's triangle rebuilt, the game's instrument cluster screen replaced by a screen filling its half of the widescreen
glass, the wheel's silver spokes welded and subdivided; the game's label atlases and door inserts
upscaled 2-4x (`tools/amg-hd-textures.mjs`). The instrument cluster, media screen, carbon, microfibre, leather, door grain
(with their normal maps) and speaker grille textures
(`amg-cabin-*.png`) were drawn for the project. Door hinges
and check straps (`amg-door-hinges.glb`) are original geometry built for this project in Blender
(`tools/blender-hinges/build_amg_hinges.py`). Draco geometry and WebP textures. No affiliation with Mercedes-Benz.

### Koenigsegg Jesko Attack

За основу взят каркас модели, остальное сделано и доработано для проекта.
The model's base mesh was the starting point; the rest was made and refined for the project.

**2023 Koenigsegg Jesko Attack**, Ddiaz Design: https://sketchfab.com/3d-models/2023-koenigsegg-jesko-attack-18240b21b4d747c7b7e86a404c3a195a
CC Attribution-NonCommercial-ShareAlike 4.0: https://creativecommons.org/licenses/by-nc-sa/4.0/

This work is based on "2023 Koenigsegg Jesko Attack" by Ddiaz Design, licensed under CC BY-NC-SA 4.0.
`koenigsegg-jesko-web.glb` is built by `tools/prepare-jesko-model.py` (Blender) and `tools/compress-glb.mjs`. Changes:
scaled from 1:100 to metres and turned to the site axes, four wheel groups on their axles (calipers stay still), the two
doors rigged as dihedral doors on one diagonal hinge axis at the A-pillar root (the axis found by sweeping the door's
path against the body), the model's own hinge arm kept in the doors and its clevis on the A-pillar removed, the lamp
atlas split into head, tail and mirror-indicator lamps, the leathers made one plain leather the upholstery colour sets,
the cabin made matte (its light trims a satin aluminium), every material two-sided, the back of the roof's and pillars'
paint lined where the cabin sees it through the headliner's ribs. The carbon weave (2048 px, with its normal map), the
screens (the centre touchscreen with a Russian interface and the steering-wheel cluster, 4096 px in the game atlas's
layout) and the tyres' sidewall lettering (Michelin Pilot Sport Cup 2 in place of the game's own branding) were drawn
for the project; the cabin, label, badge, lamp, tyre and brake atlases were upscaled 4x (`tools/jesko-hd-textures.mjs`).
The cluster's speed, gear and rev ring are drawn live on the site (`app/three/jeskoInstruments.ts`). The gas strut and
pin brackets in the door aperture (`jesko-door-hinges.glb`) are original geometry built for this project in Blender
(`tools/blender-hinges/build_jesko_hinges.py`). Draco geometry and WebP textures. Distributed under the same licence;
non-commercial use only. No affiliation with Koenigsegg.

### Aston Martin Valhalla

За основу взят каркас модели, остальное сделано и доработано для проекта.
The model's base mesh was the starting point; the rest was made and refined for the project.

**2026 Aston Martin Valhalla**, Ddiaz Design (@ddiaz-design): https://sketchfab.com/3d-models/2026-aston-martin-valhalla-deeba86cc31e47de90237cafdf2be348
CC Attribution-NonCommercial-ShareAlike 4.0: https://creativecommons.org/licenses/by-nc-sa/4.0/
Door ends and apertures: the "Aston Martin Valhalla" mod for BeamNG.drive by S7471C.

`aston-martin-valhalla-web.glb` is built by `tools/prepare-valhalla-model.py` (Blender) and `tools/compress-glb.mjs`. Changes:
scaled from 1:100 to metres and turned to the site axes, four wheel groups (calipers stay still), two dihedral door
groups with their halves of the roof, wheel groups on their true (cambered) axles, the lamp atlas split into front and
rear, loose hem triangles and hinge-corner pieces hidden by the shut doors removed, a dark finish in the hinge pockets and
a dark lining inside the door skins, the doors' open ends (front, rear, bottom) closed with the mod's door ends where the
shut car hides them (`tools/extract-valhalla-door-ends.py`; geometry only, in a dark finish), the door apertures (sill
with its seal channel, jambs) taken from the mod's body where the shut doors hide them (`tools/extract-valhalla-apertures.py`;
geometry only, in the model's own carbon), a gas strut and pin
brackets in the door aperture (`valhalla-door-hinges.glb`, built for the project), Draco geometry and WebP textures. The door parts and the hinge axis were decided against the door meshes and
hinge nodes of the "Aston Martin Valhalla" mod for BeamNG.drive by S7471C (`tools/match-valhalla-doors.py`); nothing of
the mod is shipped but those door ends and apertures. Distributed under the same licence; non-commercial use only. No affiliation with Aston Martin.

### Петли дверей · Door hinges

Сделаны для проекта в Blender.
Made for the project in Blender.

Door hinge hardware (`*-door-hinges.glb`) is original geometry built for this project in Blender (`tools/blender-hinges`).

## Карты · Maps

### Тоннель · Road Tunnel

За основу взят каркас тоннеля, остальное сделано и доработано для проекта.
The tunnel's base mesh was the starting point; the rest was made and refined for the project.

- **Road Tunnel**, judefelix, [source](https://www.cgtrader.com/free-3d-models/exterior/cityscape/road-tunnel-1a320a5a-c9a7-407a-a7b6-74ddcfd05d85). Listed as **Royalty Free License (no AI)** on CGTrader.
- File: `road-tunnel.glb`. Original Blender geometry and bundled textures exported with arrays applied, sections clipped to common boundaries, compressed with Meshopt/WebP. Runtime instances share resources; two live warm lights replace the Blender area-light array. The original volume cube is omitted. Surface finishes: see /textures/CREDITS.md.

### Горная долина · Mountain valley

За основу взят каркас рельефа, остальное сделано и доработано для проекта.
The base terrain mesh was the starting point; the rest was made and refined for the project.

Snowy-terrain — Kubocarte: https://sketchfab.com/3d-models/snowy-terrain-eef014b3a7dd4056a2481234e5b64f74
License: Creative Commons Attribution 4.0, https://creativecommons.org/licenses/by/4.0/
Shrubs: Shrub 01 — Poly Haven, CC0: https://polyhaven.com/a/shrub_01
Technical notes: /models/mountain-road/SOURCES.md

### Зимний перевал · Winter pass

За основу взят каркас рельефа, остальное сделано и доработано для проекта.
The base terrain mesh was the starting point; the rest was made and refined for the project.

Snowy Mountain with slopes and forests — ridwansyah940: https://www.cgtrader.com/free-3d-models/exterior/landscape/snowy-mountain-with-slopes-and-forests-free-to-download
License: CGTrader Royalty Free License (no AI).
Technical notes: /models/winter-road/SOURCES.md

### Солончак · Salt flat

За основу взят фотоскан соляной корки, остальное сделано для проекта.
A photo scan of the salt crust was the starting point; the rest was made for the project.

Salt surface: Ground Salt Flat Smooth by cspykstra, CGTrader Royalty Free (no AI): https://www.cgtrader.com/free-3d-models/textures/natural-textures/ground-salt-flat-smooth
Geometry, road banks and barriers were made for Velocity Atelier in Blender.
Technical notes: /models/saltflat/SOURCES.md and /textures/CREDITS.md

## Ролики гаража · Garage trailers

Записи сцен самого сайта.
Recordings of the site's own scenes.

`public/video/garage/*.webm`, their MP4 copies and posters are recordings of the site's own scenes (the car models listed above on the project's maps). Each clip carries the licence and attribution of the car model it shows: Revuelto (Anatolian Studios), Ferrari 458 Italia (Ddiaz Design) and Mercedes-AMG GT 63 (mohamedouartassi; its cabin based on Mercedes-AMG E 63 S (W213) by Mona x Supercars) CC BY 4.0; Porsche 911 GT3, Bugatti Tourbillon, Koenigsegg Jesko Attack and Aston Martin Valhalla (Ddiaz Design) CC BY-NC-SA 4.0; McLaren 750S (geyges) Sketchfab Free Standard.

## Архив · Archive

Версии и сцены, которые сайт больше не загружает; записи оставлены для истории.
Versions and scenes the site no longer loads; the records are kept for history.

### Earlier Ferrari base (no longer loaded)

Model by **vicent091036**.
Original: https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6
Source distribution: https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf
Creative Commons Attribution (CC BY 4.0): https://creativecommons.org/licenses/by/4.0/

Changes in this project: material replacements, orientation, lighting and centering. No affiliation with Ferrari. The Draco decoder is distributed with Three.js; see its bundled license.

### Ferrari donor interior and wheels — 2026-10-03 (no longer loaded)

The earlier exterior above was the base then. Its GLB was unchanged (Git blob `435197c5f9b56e08c114505ee019dedbc3d033a3`). No donor exterior panels or roof were included in the replacement assets.

**2011 Ferrari 458 Italia**, Ddiaz Design (@ddiaz-design):
https://sketchfab.com/3d-models/2011-ferrari-458-italia-bb6c7fa565c04ec59cd9d0e0a4d0098c
CC Attribution 4.0: https://creativecommons.org/licenses/by/4.0/
Uploader describes the source as a Forza Motorsport 4 model, with credits to https://vk.com/free_3d_car_models .
Used: seats, steering wheel, dashboard, instruments, switches, console/tunnel, carpet/floor, internal side/rear trim, belts, wheel rims/tires/rotors/calipers and hub details.

**2014 Ferrari 458 Speciale**, Ddiaz Design (@ddiaz-design):
https://sketchfab.com/3d-models/2014-ferrari-458-speciale-dd0b0a79ec7e4a44906cd54a43d0b364
CC Attribution-NonCommercial-ShareAlike 4.0: https://creativecommons.org/licenses/by-nc-sa/4.0/
Uploader describes the source as a CSR2 model, crediting ZD 3D Modelling and Design Discord Server: https://discord.gg/ZwWHzxk2zu .
Used: carbon door cards and internal upper door/release trim only.

Changes: removed unneeded donor geometry; fitted interior width, height, position and door hinge coordinates; preserved UVs and embedded textures; neutralized the leather albedo for the existing upholstery color control; recolored stitching and carpet; fitted wheels to the original axle positions and separated rotating components from stationary calipers. Authored closed rear shell, side glazing and pedal hardware were retained from this project.

The combined modified `ferrari-donor-interior.glb` was distributed under CC BY-NC-SA 4.0; `ferrari-donor-wheels.glb` under CC BY 4.0. Source attribution/provenance is recorded as stated by the uploaders, without independently asserting clearance of the underlying game or Ferrari rights.

Part inventories: `tools/donor-parts-manifest.json` and `tools/donor-wheel-manifest.json` in the project source.

Alps Field photographic HDR panorama — Andreas Mischok / Poly Haven, CC0. Source: https://polyhaven.com/a/alps_field ; License: https://polyhaven.com/license

Evening Road 01 photographic HDR panorama — Sergej Majboroda / Poly Haven, CC0. Source: https://polyhaven.com/a/evening_road_01 ; License: https://polyhaven.com/license

### Объёмное окружение Revuelto — Poly Haven, CC0

- [Modular Urban Apartments Facade](https://polyhaven.com/a/modular_urban_apartments_facade) — James Ray Cock. Небольшие одно-, двух- и трёхэтажные здания с четырьмя стенами и крышами собраны из исходных модулей, объединены, текстуры сжаты в WebP, геометрия — Meshopt. Файл: `italian-urban-facade.glb`.
- [Island Tree 01](https://polyhaven.com/a/island_tree_01) — Rico Cilliers, Rob Tuytel. Подготовлен уровень детализации для браузера, восстановлена маска листьев, сохранены PBR-текстуры. Файл: `italian-roadside-tree.glb`.

Для фасадов использованы исходные 4K карты цвета и нормалей штукатурки; остальные карты — 2K. Отделка меняется между кремовым, терракотовым и приглушённым оливковым: оттенок исходной фотографии нейтрализован шейдером с сохранением зерна, износа и рельефа.

Оба ресурса используются по [CC0](https://polyhaven.com/license), без обязательной атрибуции.

- [Tree Small 02](https://polyhaven.com/a/tree_small_02) — Rico Cilliers, CC0. Второй вид дерева с плотной кроной; оптимизирована геометрия, восстановлена альфа-маска листьев, текстуры сжаты в WebP. Файл: `italian-canopy-tree.glb`.

### Roman countryside vegetation
- Pine Tree 01 — Rob Tuytel (photography), Rico Cilliers (modeling), CC0: https://polyhaven.com/a/pine_tree_01
- Shrub 01 — Poly Haven, CC0: https://polyhaven.com/a/shrub_01
- Grass Medium 01 — Poly Haven, CC0: https://polyhaven.com/a/grass_medium_01

Prepared with tools/prepare-roman-nature.mjs: one pine variant, reduced mesh density, alpha masking, 1K WebP textures and Meshopt compression. These are decorative botanical assets; the pine is not claimed to be a verified Pinus pinea scan.

Distant groves use reduced variants of the same CC0 trees: tools/prepare-roman-lod.mjs. Full and reduced variants share textures at runtime.

### Rocky coast route

- **Coast road and rocks ver2.0**, Metazeon, [source](https://sketchfab.com/3d-models/coast-road-and-rocks-ver20-cb5baff4d1754208b9d372ec2aea24bb), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- File: `coast-road-rocks.glb`. Original 4K GLB downloaded from Sketchfab. Meshopt geometry compression and WebP textures; scanned road geometry retained. An animated sea and sky were added by Velocity Atelier.
- This is a short scanned coastal section, not a geographically verified Italian route or an infinite highway.

### Forest Road

- **Forest Road**, Toby Noby, [source](https://www.blendkit.com/asset-gallery-detail/46a567f5-8301-4b89-90ec-e6c361325256/). Listed as free, **Royalty Free** on Blendkit; see [Blendkit licenses](https://www.blendkit.com/docs/licenses/).
- File: `forest-road.glb`. Exported from the author's Blender scene. Procedural road markings baked to a 4K texture; original terrain and photographic alpha foliage retained. Color foliage textures reduced to 2K, foliage normals to 1K; Meshopt and WebP compression. Blender volume objects replaced by browser fog. The source uses flat photographic foliage, not volumetric tree models.

### Desert road
Source assembly: blender/desert/Desert-environment.blend. Full asset authors, licenses and links were kept in /models/desert/SOURCES.md (removed with the map; in git history).
Route adaptation: straight 8.6 m road, grading only its corridor, cleared vegetation, sand dust material; shared browser instances and Meshopt/WebP compression without texture resizing.

### Asset cleanup — 2026-10-15
Models the site no longer loads were removed from `public/models` (they stay in git history): the desert map (`desert/`), `fitted-hinges/`, `italian-urban-facade.glb`, `revuelto-two-arm-mechanism.glb`, `saltflat/forward-massif.glb`, unused far terrain tiles, and the uncompressed car exports `lamborghini-revuelto.glb`, `porsche-911-gt3.glb`, `porsche-911-gt3-side-door-fixed.glb`, `bugatti-tourbillon.glb`.
The site now serves Draco/WebP web versions: `lamborghini-revuelto-web.glb`, `porsche-911-gt3-web.glb`, `bugatti-tourbillon-web.glb` (same authors and licenses as above). Their editable sources are in `tools/source-assets/cars`.
