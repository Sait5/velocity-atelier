# Fitted donor assets

The public base `models/ferrari.glb` is preserved. `ferrari-donor-interior.glb` contains only selected interior geometry and the fitted closed rear shell/side glazing. `ferrari-donor-wheels.glb` contains four rotating wheel assemblies and four stationary caliper assemblies.

Blender 5.2 authoring scripts are mirrored here. They use the sibling `blender` working directory and the originals saved under `assets-research/donors` outside the published checkout. Donor originals were downloaded through the user's authenticated Sketchfab session; authentication information is not retained.

Inputs in the Blender directory: `italia.blend`, `speciale.blend`. These were imported from `italia.glb` and `speciale.glb` by `inspect_donors.py`. The fitted rear/glazing baseline is `public/models/ferrari-carbon-interior.glb`, produced by the previous `rebuild-fitted.py`. Run `transplant-donors.py` then `transplant-wheels.py` with Blender's background Python command. The scripts preserve source texture UVs and export Draco GLBs plus component manifests.

Validation performed: decoded finite geometry/UVs/normals, unchanged body triangle count, original body file hash, bounded seats and wheels, closed upper rear probes on both sides, inner door front-face visibility, original hinge fit at three opening angles, stationary calipers and spinning wheel groups. Offline Blender inspection uses the actual runtime geometry with restored donor material maps. Browser GPU appearance and listening were not verified in this update.

Audio preparation and exact source clip ranges are documented in `supplied-audio-manifest.json` and `public/audio/CREDITS.md`.
