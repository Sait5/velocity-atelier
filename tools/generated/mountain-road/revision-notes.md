# Mountain and winter environment revision — 2026-10-07

The existing source landforms and flat 7.6 m road corridor are retained.
Blender terrain now has periodic multi-scale relief, variable slope feet,
and a subdivided low-cost outer closure. The mountain valley floor remains
95–141 m below the road; it does not rise into a distant curtain.

All 16 terrain variants and all material textures are decoded before driving.
Terrain buffers and foliage instances are warmed under the loading curtain.
Nine resident section slots use one material and one geometry resolution in
the visible range. Section recycling and foliage culling occur beyond the
740 m fog limit. The unused far meshes remain available in the Blender output,
but are not downloaded or swapped into the driving view.

Source colour noise is desaturated; synthetic moss speckles are removed.
Foliage scatter is grounded by raycasting the exported-resolution Blender mesh.
Clouded morning and winter night skies are also captured into the car's PMREM.
Winter road snow uses a continuous asymmetric world-space mask. Its 16 km
period and independent lateral noise avoid a repeated pattern on each 256 m
road section. Snow uses the Snow 02 diffuse, normal and roughness textures.

Validation: Nuxt typecheck and static build passed. All 32 terrain joins have
zero measured positional gap. Straight road height, controls, tyre contact and
car model are preserved. Browser shaders were checked and the winter pass was
driven to 370 km/h. Performance measurements are local and hardware-dependent.
