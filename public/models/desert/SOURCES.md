# Desert environment — sources and changes

Assembled 2026-10-05. The original downloaded source files remain in `assets-research/desert`. The Blender master embeds its image textures. Licenses below describe the source assets; this assembly does not relicense them.

| Asset | Creator | Source | License shown at download |
| --- | --- | --- | --- |
| FREE Desert Terrain / Landscape, variant 3 | stashevsky | https://www.fab.com/listings/566c89bb-7c12-4a78-8df8-711bd114f783 | CC BY 4.0 |
| Opuntia / Prickly Pear Cactus | cook4986 | https://sketchfab.com/3d-models/opuntia-prickly-pear-cactus-bbc37de8363e45b5a33175942ffe7368 | CC BY 4.0 |
| Desert Shrubs, user selection 1 | evolveduk | https://sketchfab.com/3d-models/desert-shrubs-3f116a7e0c464f2798fe25c7dae4fabb | Sketchfab Free Standard |
| Rhazya Plant Shrub, user selection 2 | tree52787 | https://www.cgtrader.com/free-3d-models/plant/other/rhazya-plant-shrub-ba5f9c63-4f2d-49d0-bb8b-583f45b14533 | CGTrader Royalty Free (no AI) |
| Photorealistic Bush, user selection 4 | Adrian Sheremet | https://sketchfab.com/3d-models/photorealistic-bush-8db54bf299954daa9ee29b233e923672 | CC BY 4.0 |
| Desert Plants | aprodnuk | https://sketchfab.com/3d-models/desert-plants-5534df1a219841dbaefa9016310d8cdc | Sketchfab Free Standard |
| Tumbleweed | biggreenorange | https://sketchfab.com/3d-models/tumbleweed-e9fa341c64fe4626b5d5b0052b0c0b64 | CC BY 4.0 |
| Gravelly Sand, 4K diffuse / OpenGL normal / roughness / height | Dario Barresi / Poly Haven | https://polyhaven.com/a/gravelly_sand | CC0 |

License links: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), [Sketchfab licenses](https://sketchfab.com/licenses), [CGTrader terms](https://www.cgtrader.com/pages/terms-and-conditions), [Poly Haven CC0](https://polyhaven.com/license).

Changes: terrain uniformly scaled and recentered without reshaping the relief; ground shader rebuilt with 2.5 m photogrammetry mapping, two rotated texture samples, macro colour variation, fine bump and restrained cracks. Metric plant normalization, linked collection instances, material saturation/roughness adjustments, cleaned cactus scan remnants, rounded tumbleweed stems. New procedural pebbles, a continuous distant ground skirt, physical sky and Sun, two inspection cameras. Sources do not imply endorsement by their creators.

Pear Cactus was not downloadable and was omitted with the user's explicit approval. Bush selection 3 was not used. The numbered selection 4 source happens to contain mesh names beginning with `Bush 3 (smaller)`; those are names inside the correct downloaded asset, not the excluded user selection.

The animated BlenderKit option was not needed; tumbleweeds are static. The original Desert Plants and Tumbleweed contain relatively simple geometry; close-view fidelity remains partly constrained by those selected sources.

Sand 01 PBR material — Rob Tuytel / Poly Haven, CC0. https://polyhaven.com/a/sand_01 . Local 4K diffuse and 2K OpenGL normal/roughness maps replace the previous terrain sand finish.
