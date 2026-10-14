# Requested additional driving maps — 2026-10-07

Existing salt-flat fixes completed locally: removed fracture shader, soft edge sand deposits, closed steel W-beam profile, GPU staging before driving, consistent terrain geometry across LODs.

Completed source downloads and Blender adaptations:
1. Mount Rainier terrain by ridwansyah940, CGTrader model 4497957, Royalty Free (no AI). Blender and textures ZIP, 161 MB, source texture advertised 13K. https://www.cgtrader.com/free-3d-models/exterior/landscape/snowy-mountain-with-slopes-and-forests-free-to-download
2. Snowy-terrain by Kubocarte, Sketchfab model eef014b3a7dd4056a2481234e5b64f74, CC BY 4.0. Original FBX archive 94 MB, diffuse/normal/roughness/displacement maps. https://sketchfab.com/3d-models/snowy-terrain-eef014b3a7dd4056a2481234e5b64f74

Sketchfab is used for the non-snow mountain valley (map=mountain), with mineral materials, a left slope, a right valley and sparse instanced shrubs. CGTrader is used for the winter pass (map=winter), with the source photographic albedo retained at 8192px wide and tiled Snow 02 PBR detail near the camera. Both have level straight roads and separate sky/light rigs.

Sources extracted into tools/source-assets. Editable scenes: tools/generated/mountain-road/environment.blend and tools/generated/winter-road/environment.blend. Sixteen connected source chunks per map, 4096m cycle, near/far geometry, seven visible slots. All terrain variants are decoded and uploaded behind the loading curtain. Metadata and credits are in public/models/mountain-road and public/models/winter-road. The map chooser includes both new maps alongside the tunnel and salt flat.

Checks: typecheck, static build, tools/verify-mountain-roads.mjs (all 16 joins per map, zero positional gap), browser driving and camera checks. Road level .007m; constant wheel-contact probes. Winter driving reached 370km/h with about 140FPS on the current machine. Screenshots are stored alongside the Blender scenes.

No commit, push or deployment requested.
