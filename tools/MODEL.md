# Ferrari fitted interior

The original exterior stays in `public/models/ferrari.glb`. Replacement closed seats, fitted rear panels and articulated door linings are authored in Blender and exported to `public/models/ferrari-fitted-interior.glb`. Runtime installation is in `app/three/fittedInterior.ts`.

To regenerate, create a `blender` directory beside this checkout and run these commands from the checkout, using your Blender executable:

1. `blender --background --python tools/prepare-blender.py`
2. `node tools/prepare-export.cjs`
3. `node tools/generated/export-interior.mjs`
4. `blender --background --python tools/rebuild-fitted.py`

The full editable vehicle is saved beside the checkout as `blender/Ferrari-458-fitted.blend`. Each inner door assembly is linked to its exterior hinge there. The exported replacement asset keeps the original hinge coordinates; the website attaches it to the existing door group without changing the exterior triangles. Meshes are batched by assembly and material. Upholstery shares the configurator's leather material, while fixed trim stays black.

Checks performed for this version: Draco decoding, finite positions, bounded fitted parts, unchanged exterior triangle count, three door opening angles, outward upholstery volume orientation, front-face ray hits for both door panels and the rear inserts, TypeScript checking, static production build and offline Blender renders. Browser verification was unavailable because local browser access was declined.
