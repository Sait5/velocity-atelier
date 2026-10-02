# Ferrari fitted interior

The original exterior stays in `public/models/ferrari.glb`. Replacement closed seats, fitted rear panels and articulated door linings are authored in Blender and exported to `public/models/ferrari-carbon-interior.glb`. Runtime installation is in `app/three/fittedInterior.ts`.

To regenerate, create a `blender` directory beside this checkout and run these commands from the checkout, using your Blender executable:

1. `blender --background --python tools/prepare-blender.py`
2. `node tools/prepare-export.cjs`
3. `node tools/generated/export-interior.mjs`
4. `blender --background --python tools/rebuild-fitted.py`

The full editable vehicle is saved beside the checkout as `blender/Ferrari-458-fitted.blend`. Each inner door assembly is linked to its exterior hinge there. The exported replacement asset keeps the original hinge coordinates; the website attaches it to the existing door group without changing the exterior triangles. Meshes are batched by assembly and material. Upholstery shares the configurator's leather material, while fixed trim stays black.

The revised seats use a smooth profile and distinct rounded headrests, with contoured lateral supports and three central seams. Upper rollbar linings repair the original curved source contour; the replaced source faces are removed at runtime to prevent overlap. The door assemblies include slightly curved frameless glass, a polished glass edge, lower rubber wipers and latch fasteners. Rounded modelling modifiers are applied before material batching, so details retain their shapes in the GLB.

The rear closure is one fused carbon shell, with two oval fairings swept rearward and a continuous cross-car bridge. Voxel union and smoothing connect its body returns without overlapping surfaces. The carbon shell was checked in Blender as one connected watertight component. Its runtime material uses a fine diagonal woven texture and shallow bump relief, separate from configurable upholstery. Superseded source lining is removed in the upper rear region. Six cabin-facing ray probes cover the upper closures on both sides. Window lower edges are measured from the original painted door skin, and the front edges follow sampled windshield-pillar coordinates. Offline checks include open-door rear/inner views and a closed-door side view.

Checks performed for this version: Draco decoding, finite positions, bounded fitted parts, unchanged exterior triangle count, three door opening angles, outward upholstery volume orientation, front-face ray hits for both door panels and the rear inserts, TypeScript checking, static production build and offline Blender renders. Browser verification was unavailable because local browser access was declined.

