Revuelto mechanism trial — 2026-10-10

Only the Revuelto hardware branch and Revuelto exported models were changed in this trial. Body and door mesh positions, topology, UVs and materials remain unchanged in the closed exported pose (maximum world-space vertex difference 1.79e-7 m).

Two paired rigid sculpted links: 290 mm and 310 mm, connected to body and moving door brackets. Three body attachment plates, two door attachment plates, pins and bolts. A 220 mm fixed-length gas cylinder with a sliding rod and connected eyes. Curved corrugated wiring boot. Independent left/right open/close GLB clips.

121 samples per door: link endpoint error < 8.2e-8 m; gas support endpoint error < 8.6e-8 m. Links and gas cylinder do not stretch. Complete GLB animation return and opposite-door independence pass. Nuxt typecheck passes.

This is a visual/mechanical trial, not validated factory CAD. The existing door trajectory is unchanged. Paint-surface sweep still finds intersections of the imported inner jamb with body/sill in 150 of 241 sampled positions (peak 231 triangle pairs); collision-free opening is NOT achieved. Hardware/body collision clearance has not been certified.

Assets: revuelto-fitted.blend; public/models/fitted-hinges/revuelto-complete.glb; public/models/fitted-hinges/revuelto-hinges.glb.