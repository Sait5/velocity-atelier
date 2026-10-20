"""McLaren 750S: dihedral door hardware. As on the real car the hinge itself is hidden in the A-pillar root (its tilted
axis P/AXIS meets the body surface there, so a visible barrel would sit on the wing); what shows when the door is up is
the gas strut in the aperture, from the hinge pillar to the door's inner front face, on black pin brackets.

Output public/models/mclaren-door-hinges.glb, car coordinates, closed doors. Names (P = +z, N = -z): hinge_body_*,
hinge_door_*, strut_cyl_* (origin at the body pin, built along +x) and strut_rod_* (origin at the door pin, along +x).
The site hides the set while the door is closed (it would sit in the gap between door and pillar).
Run: blender -b --python tools/blender-hinges/build_mclaren_hinges.py -- <checkout>
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from hingekit import *
OUT = os.environ.get('HINGE_OUT', os.path.join(os.path.dirname(__file__), 'out'))
EXPORT = ROOT + '/public/models/mclaren-door-hinges.glb'
# the door group's origin and the axis used by app/three/mclaren.ts (three coords, +z door)
P = Vector((-0.98, 0.86, 0.86)); AXIS = Vector((0, -.35, .92)).normalized(); OPEN = 1.3
# found by tools/blender-hinges/search_mclaren_strut.py (run on the rigged .blend): clear of door and body from 5 degrees to fully open, stroke 1.47
BODY_GUESS = Vector((-0.839, 0.716, 0.747)); DOOR_GUESS = Vector((-0.789, 0.401, 0.745))
CYL, ROD = .25, .25

load('mclaren-750s-rigged.glb')
door_objs = {1: bpy.data.objects['McLaren door L'], -1: bpy.data.objects['McLaren door R']}
alld = set(meshes_under(door_objs[1])) | set(meshes_under(door_objs[-1]))
body = [o for o in bpy.data.objects if o.type == 'MESH' and o not in alld and 'wheel' not in o.name.lower()]
bb, db = bvh_for(body), bvh_for(meshes_under(door_objs[1]))
steel = mat('McLaren strut body', (.012, .013, .014), .45, .4)
chrome = mat('McLaren strut rod', (.16, .17, .18), 1.0, .28)
bracket = mat('McLaren hinge bracket', (.008, .009, .01), .35, .45)

def nearest(tree, p):
    loc, n, i, d = tree.find_nearest(tb(p)); return bt(loc), (bt(n + tb((0, 0, 0)))).normalized(), d

# pins sit 2 cm off the nearest surface, on the side the guess came from
def pin_on(tree, guess):
    sp, sn, d = nearest(tree, guess)
    if sn.dot(guess - sp) < 0: sn = -sn
    return sp, sn, sp + sn * .02
b_sp, b_sn, BODY_PIN = pin_on(bb, BODY_GUESS)
d_sp, d_sn, DOOR_PIN = pin_on(db, DOOR_GUESS)
print('pins body', [round(v, 3) for v in BODY_PIN], 'door', [round(v, 3) for v in DOOR_PIN])

def clevis(name, sp, sn, pin, side):
    m = lambda v: Vector((v.x, v.y, v.z * side))
    bm = bmesh.new()
    across = sn.cross(Vector((0, 1, 0))).normalized() if abs(sn.y) < .9 else Vector((1, 0, 0))
    beam(bm, tuple(sp + sn * .002 - across * .018), tuple(sp + sn * .002 + across * .018), .03, .004, tuple(sn), side)
    for k in (-1, 1):
        ear = across * (.0095 * k)
        beam(bm, tuple(sp + sn * .003 + ear), tuple(pin + ear), .016, .003, tuple(across), side)
    cylinder(bm, tuple(pin), tuple(across), .0038, .026, side, 12)
    part = obj(name, bm, bracket)
    bm = bmesh.new()
    for k in (-1, 1): bolt(bm, tuple(sp + sn * .004 + across * .013 * k), tuple(sn), side, .0034, .0028)
    return [part, obj(name + '_bolts', bm, bracket)]

parts = []
for side, tag in ((1, 'P'), (-1, 'N')):
    m = lambda v: Vector((v.x, v.y, v.z * side))
    # strut pin brackets
    parts += clevis(f'hinge_body_{tag}_1', b_sp, b_sn, BODY_PIN, side)
    parts += clevis(f'hinge_door_{tag}_1', d_sp, d_sn, DOOR_PIN, side)
    bm = bmesh.new()
    cylinder(bm, (CYL / 2 + .012, 0, 0), (1, 0, 0), .0115, CYL - .012, 1, 24)
    cylinder(bm, (0, 0, 0), (0, 0, 1), .0085, .014, 1, 18)
    beam(bm, (0, 0, 0), (.016, 0, 0), .012, .009, (0, 0, 1), 1)
    cyl = obj(f'strut_cyl_{tag}', bm, steel)
    bm = bmesh.new()
    cylinder(bm, (ROD / 2 + .010, 0, 0), (1, 0, 0), .0062, ROD - .010, 1, 16)
    cylinder(bm, (0, 0, 0), (0, 0, 1), .0075, .012, 1, 18)
    beam(bm, (0, 0, 0), (.014, 0, 0), .010, .008, (0, 0, 1), 1)
    rod = obj(f'strut_rod_{tag}', bm, chrome)
    for o, pin in ((cyl, BODY_PIN), (rod, DOOR_PIN)): o.matrix_world = Matrix.Translation(tb(m(pin)))
    parts += [cyl, rod]

export(parts, EXPORT); print('exported', os.path.getsize(EXPORT))

# preview: swing the +z door with its brackets and aim the strut like the site does
cam = setup_render((900, 650), 8)
door = door_objs[1]; rest = door.matrix_world.copy()
dparts = [p for p in parts if p.name.startswith('hinge_door_P')]; drest = [p.matrix_world.copy() for p in dparts]
cyl, rod = bpy.data.objects['strut_cyl_P'], bpy.data.objects['strut_rod_P']
xaxis = tb((1, 0, 0)) - tb((0, 0, 0))
for name, f in (('0', 0), ('50', .5), ('100', 1.0)):
    R = three_rotation_about(P, AXIS, OPEN * f)
    door.matrix_world = R @ rest
    for p, r in zip(dparts, drest): p.matrix_world = R @ r
    dp = R @ tb(DOOR_PIN); bp = tb(BODY_PIN); d = (dp - bp).normalized()
    cyl.matrix_world = Matrix.Translation(bp) @ xaxis.rotation_difference(d).to_matrix().to_4x4()
    rod.matrix_world = Matrix.Translation(dp) @ xaxis.rotation_difference(-d).to_matrix().to_4x4()
    print(name, 'strut length', round((dp - bp).length, 3), 'rod overlap', round(CYL + ROD - (dp - bp).length, 3))
    bpy.context.view_layer.update()
    shoot(cam, (-2.2, 1.2, 2.4), (-0.9, 0.75, 0.8), f'{OUT}/mclhinge_{name}.png', 32)
    shoot(cam, (0.2, 0.95, 0.15), (-0.9, 0.62, 0.8), f'{OUT}/mclhinge_{name}_in.png', 30)
    shoot(cam, (-0.35, 0.75, 1.6), (-0.88, 0.6, 0.74), f'{OUT}/mclhinge_{name}_strut.png', 30)
