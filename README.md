# Velocity 3 — development edition

Nuxt 4 / Vue 3 / TypeScript / Three.js / GSAP ScrollTrigger / Rapier.

Run `npm install`, `npm run dev`, `npm run typecheck`, `npm run build`.

This is a working interaction prototype with a detailed Ferrari 458 preview and original procedural reference geometry, not a finished manufacturer-accurate automotive portfolio. The eight entries use distinct silhouette variants. The Ferrari 458 preview uses the Three.js example model by vicent091036 (see public/models/CREDITS.md). Its door panels are separated procedurally; production requires artist-authored pivots and clean door seams. Specifications are illustrative and must be verified for the exact production configuration before public marketing use.

Implemented: shader-based paint, rim and caliper materials, animated door pivots, cockpit camera, hotspots, lighting presets, real initialization milestones, orbit/pinch/zoom, scroll camera, adaptive resolution, shadow settings, reduced motion, fullscreen, synthesized engine audio, garage selection, Rapier ground/barriers/rigid-body driving, three cameras, reset, keyboard and touch controls.

Remaining production requirements: licensed detailed GLBs for all eight cars; Blender optimization and model-specific door rigs; GLTF byte progress and retry for assets; compressed textures/LOD; accurate interiors; recorded per-vehicle audio; professional postprocessing and reflection passes; verified 60 FPS across target devices. TresJS is installed for migration to declarative scene ownership; this prototype owns its scene through the Three.js API.

Vehicle geometry is isolated in `app/three/vehicle.ts`; renderer lifecycle is in `app/components/VehicleScene.client.vue`. `useAtelier` owns shared preferences and configuration. No backend is required.
