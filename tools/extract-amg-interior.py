"""Cut the cabin out of "Mercedes-AMG E 63 S (W213)" (Mona x Supercars / Car2022, Sketchfab, CC BY 4.0) for the AMG GT 63
S 4-Door, whose own free model has only a placeholder interior. The AMG GT 4-Door shares the E-Class platform and its
widescreen cockpit (wheelbase 2.92 vs 2.94 m, doors of the same length in the same places, cabin floor at the same
height), so the W213 cabin goes in at its own scale, axles centred on the AMG's.
Kept: every face inside the cabin box (inside the door cards, between the firewall and the rear bulkhead, floor to
headliner) except paint, glass, lamps and running gear. tools/prepare-amg-model.py fits it under the AMG's roof and
glass and hands the door cards to the doors.
Usage: blender -b --python tools/extract-amg-interior.py -- <donor scene.gltf> <out.glb>
(the donor as downloaded from Sketchfab, glTF archive, extracted on its own)"""
import bpy, bmesh, sys, math
from mathutils import Matrix, Vector
args = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = args[0], args[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
# donor units: about 1:0.252 (wheelbase 11.69 units = 2.94 m), front +y, the car's centre line at x -5.15, ground at z 9.538
S, CX, Y0, Z0 = 3.97, -5.15, (7.27 - 4.42) / 2, 9.538
# u across (+ right), v along (+ front), w up, in metres; the AMG's axles are centred at x -0.144 (front -x, driver -y)
to_metres = Matrix.Scale(1 / S, 4) @ Matrix.Translation((-CX, -Y0, -Z0))
to_amg = Matrix.Translation((-0.144, 0, 0)) @ Matrix.Rotation(math.pi / 2, 4, 'Z')
# paint (New_Material; New_Material_2 is door and dash trim), glass (New_Material_1 is the panoramic roof's tint), lamps,
# wheels, calipers, bumper, bonnet
DROP_NAMES = {'glass', 'glass_18', 'red_glass', 'new_material', 'new_material_1'}
# the door cards (base panels with the pockets) and their trim, armrests, handles, sill chrome and window frames
# (prepare-amg-model.py gives each to its door)
DOOR = {15, 21, 23, 25, 99, 113, 117, 121, 201, 207} | set(range(125, 188))
# the door cards' base panels (prepare-amg-model.py rebuilds them: their edges are a saw without the W213's skin)
BASE = {15, 21, 23, 25}
# the tyres (plain black objects at the wheels) reach into the box at the rear arches; the pockets' thin edge strips lay
# flush on the base panels and are lost in the rebuilt ones
SKIP = {5, 7, 9, 11, 129, 145, 163, 175}
DROP_PARTS = ('mesheslights', 'mesheswheel', 'meshescaliper', 'meshesbumprear', 'meshesbonnet')
def keep(u, v, w): return abs(u) < .80 and -1.50 < v < 1.10 and .22 < w < 1.42
kept = 0
for o in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
    n = o.name.split('_')[-1]
    if n.isdigit() and int(n) in SKIP: bpy.data.objects.remove(o, do_unlink=True); continue
    M = o.matrix_world.copy(); o.parent = None
    if o.data.users > 1: o.data = o.data.copy()
    me = o.data; me.transform(to_metres @ M); o.matrix_world = Matrix()
    bm = bmesh.new(); bm.from_mesh(me)
    drop = []
    for f in bm.faces:
        m = me.materials[f.material_index] if f.material_index < len(me.materials) else None
        name = (m.name if m else '').lower()
        c = f.calc_center_median()
        if name in DROP_NAMES or name.startswith(DROP_PARTS) or not keep(c.x, c.y, c.z): drop.append(f)
    bmesh.ops.delete(bm, geom=drop, context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(me); bm.free()
    if not me.polygons: bpy.data.objects.remove(o, do_unlink=True); continue
    me.transform(to_amg); kept += len(me.polygons)
    n = o.name.split('_')[-1]
    o.name = ('W213 door base ' if n.isdigit() and int(n) in BASE else 'W213 door ' if n.isdigit() and int(n) in DOOR else 'W213 ') + o.name
for o in [o for o in bpy.context.scene.objects if o.type != 'MESH']: bpy.data.objects.remove(o, do_unlink=True)
# The seat, door and dash leather: its texture is a dark grain; lifted to a light grain (mean ~0.8) so the configurator's
# upholstery colour, which the site multiplies in, comes out as that colour with the grain on it
leather = bpy.data.materials['Mesheschassis0291_diff']; leather.name = 'AMG leather'
img = next(n.image for n in leather.node_tree.nodes if n.type == 'TEX_IMAGE')
px = list(img.pixels); lum = sum(.2126 * px[i] + .7152 * px[i + 1] + .0722 * px[i + 2] for i in range(0, len(px), 4)) / (len(px) // 4)
gain = .8 / lum
img.pixels = [min(1, v * gain) if i % 4 != 3 else v for i, v in enumerate(px)]; img.update(); img.pack()
print('EXTRACT leather mean %.3f gain %.2f' % (lum, gain))
# The game repeats three textures under many material names at lower resolutions (the door cards' leather, fabric and
# carbon inserts): each family is folded into one material, so the door inserts take the seats' leather (and with it
# the upholstery colour) and the project's fabric and carbon (prepare-amg-model.py)
bpy.data.materials['Mesheschassis0301_diff'].name = 'AMG fabric'
FAMILY = {'AMG leather': ('Mesheschassis0291', 'Meshesdoorrfok0441', 'Meshesdoorrfok0311', 'Meshesdoorrfok0051', 'Meshesdoorrfok0181', 'Meshessalon0051'),
          'AMG fabric': ('Mesheschassis0301', 'Meshesdoorrfok0451', 'Meshesdoorrfok0061', 'Meshesdoorrfok0191', 'Meshesdoorlrok0061'),
          'Mesheschassis0311_diff': ('Mesheschassis0311', 'Meshesdoorrfok0461', 'Meshesdoorrfok0071', 'Meshesdoorrfok0201', 'Meshesdoorlrok0071')}
def image_of(m):
    return next((n.image.name for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image), '') if m and m.use_nodes else ''
folded = 0
for o in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
    for i, m in enumerate(o.data.materials):
        name = image_of(m)
        for target, prefixes in FAMILY.items():
            if name.startswith(prefixes) and m.name != target: o.data.materials[i] = bpy.data.materials[target]; folded += 1
print('EXTRACT material slots folded', folded)
print('EXTRACT kept faces', kept, 'objects', len(bpy.context.scene.objects))
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_draco_mesh_compression_enable=False, export_animations=False, export_skins=False)
print('EXTRACT exported', OUT)
