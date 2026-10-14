# Fitted door hardware — verified status

Runtime: app/three/fittedDoorHardware.ts. The rejected external hinge rig is disconnected and archived under tools/generated/rejected-external-hinges.

Changes:
- Porsche: unchanged closed geometry, UVs and material assignments; corrected door-card and stationary sill ownership. Fixed hinge axis (-0.87, 0.70, ±0.84), compact upper/lower hardware and sliding check.
- Ferrari: fixed internal hinge axis 0.14 m ahead of the authored pivot, lateral ±0.84; compact upper/lower hardware. No source geometry changes.
- Revuelto: restored door liner ownership, added connected brackets, links and telescopic support. Source door motion retained. This is a visual linkage, not an OEM CAD or rigid-link engineering simulation.

Outputs: public/models/fitted-hinges/{porsche,ferrari,revuelto}-complete.glb and editable *-fitted.blend files in this directory. Original source GLBs remain intact.

Rebuild from apex:
1. node tools/export-fitted-hinges.mjs
2. blender -b --python tools/assemble-fitted-hinge-glbs.py (also restores exact animation samples)
3. node tools/verify-fitted-hinges.mjs
4. node tools/verify-fitted-full.mjs
5. blender -b --python tools/verify-fitted-clearance.py

Verified:
- Porsche trim: 308081 triangles; zero change to world vertex positions and UVs; identical material face counts.
- Closed source positions preserved by all three complete exports (maximum numeric error below 0.000001 m).
- Both independent open/close pairs work in all complete GLBs, last 1.2 seconds and return exactly to rest.
- Typecheck and production build pass.
- Porsche: zero new painted-panel triangle intersections in 241 positions on both doors.

Remaining limitations (do not label all three collision-free):
- Ferrari: 40 of 241 sampled positions have new inner painted-surface contacts, peak 172 triangle pairs. Fully open pose is clear.
- Revuelto: 150 of 241 positions have contacts involving its original jamb, fixed lower piston, sill and rear body/gascap surface. Fully open pose is clear.
- Clearance test covers painted meshes, not every trim mesh or hardware self-contact. Existing closed-pose intersection pairs are reported separately and excluded from new-contact counts.
