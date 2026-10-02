# Velocity 3 — interactive development edition

Nuxt 4 / Vue 3 / TypeScript / Three.js / GSAP / Rapier.

Run `npm install`, `npm run dev`, `npm run typecheck`, `npm run build`.

The Ferrari 458 preview uses the Three.js example model by vicent091036 (public/models/CREDITS.md). The eight Garage entries remain procedural silhouette prototypes; they do not represent finished licensed models.

Implemented: Russian/English interface and persisted language, physical paint and upholstery materials, six upholstery finishes, eight studio background colors, five lighting schemes, four outdoor locations, reconstructed closed inner door panels with outward hinges, fixed-position cabin look controls and entry transition, actual detail viewpoints, instrument graphics, leather/carbon grain, closed rounded seat volumes, rear cabin bulkhead, surface-bound stitching, mounted pedals, rebuilt fork-spoke wheels, machined rotors and stationary calipers. Removed scroll-controlled camera, filler story sections, rotor tint controls and continuous synthetic engine audio. Optional interface sounds are brief clicks.

Driving uses Rapier ground contact, acceleration/braking/steering, physical WASD codes independent of keyboard layout, automatic seven-speed transmission with RPM telemetry, screen controls, optional sustained throttle, reset and three camera views. Country road, alpine valley, coast and sunset fields are shared with the showroom. The straight road wraps at its ends; driving is an interactive prototype, not a vehicle dynamics simulator.

Verification for this revision: TypeScript; decoded GLB geometry test (exterior skins preserved, obsolete inner frames removed, outward doors, bounded wheel assemblies and two watertight seat backrests); fixed-seat camera stress test; automatic acceleration, shifts, braking and reset; browser checks of cabin, finishes, scenery and real driving telemetry.

Remaining production requirements: licensed detailed GLBs for the eight Garage cars, artist-authored interior assets and rigs, detailed landscape assets, LOD/texture optimization, accurate vehicle dynamics, recorded audio and device performance profiling. The generated scenery includes rolling terrain, branched trees, grass, textured asphalt, gravel shoulders, guardrails and reflector posts. Specifications are illustrative.

Scene lifecycle: `app/components/VehicleScene.client.vue`. Ferrari preparation: `app/three/loadVehicle.ts`, `rigDoors.ts`, `enhanceVehicle.ts`, `cockpitDetails.ts`. Environment: `scenery.ts`. Transmission: `automaticDrive.ts`. Shared state: `useAtelier`. No backend is required.

