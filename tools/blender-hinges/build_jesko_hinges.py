"""Koenigsegg Jesko Attack: dihedral door hardware. The door turns about one diagonal axis that leans forward, outward and
down from the A-pillar root (tools/prepare-jesko-model.py; app/three/jesko.ts). The axis meets the car's flank in the
shut line by the front wing's trailing edge, so, as on the McLaren, the hinge itself stays hidden in the A-pillar root (a
barrel on the axis would sit on the wing); the door carries the game's forged hinge arm in its front, and what shows in
the aperture when the door is up is the gas strut, from the sill's front corner to the door card's lower front, on
black pin brackets.

Output public/models/jesko-door-hinges.glb, car coordinates, closed doors. Names (P = +z, N = -z): hinge_body_*,
hinge_door_*, strut_cyl_* (origin at the body pin, built along +x) and strut_rod_* (origin at the door pin, along +x).
The site hides the set while the door is closed (it would sit inside the door).
Run: blender -b --python tools/blender-hinges/build_jesko_hinges.py -- <checkout>
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from hingekit import *
OUT = os.environ.get('HINGE_OUT', os.path.join(os.path.dirname(__file__), 'out'))
EXPORT = ROOT + '/public/models/jesko-door-hinges.glb'
# the door group's origin and the axis used by app/three/jesko.ts (three coords, +z door)
P = Vector((-0.72, 0.65, 0.91)); AXIS = Vector((-.505, -.674, .539)).normalized(); OPEN = math.radians(115)
# found by tools/blender-hinges/search_jesko_strut.py (run on the rigged .blend): clear of door and body from 5 degrees to fully open, stroke 1.72
BODY_GUESS = Vector((-0.668, 0.528, 0.837)); DOOR_GUESS = Vector((-0.472, 0.580, 0.676))
CYL, ROD = .24, .24

load('koenigsegg-jesko-rigged.glb')   # tools/prepare-jesko-model.py (uncompressed)
door_objs = {1: bpy.data.objects['Jesko door L'], -1: bpy.data.objects['Jesko door R']}
alld = set(meshes_under(door_objs[1])) | set(meshes_under(door_objs[-1]))
body = [o for o in bpy.data.objects if o.type == 'MESH' and o not in alld and 'wheel' not in o.name.lower()]
bb, db = bvh_for(body), bvh_for(meshes_under(door_objs[1]))
steel = mat('Jesko strut body', (.012, .013, .014), .45, .4)
chrome = mat('Jesko strut rod', (.16, .17, .18), 1.0, .28)
bracket = mat('Jesko hinge bracket', (.008, .009, .01), .35, .45)

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
for name, f in (('0', 0), ('25', .25), ('50', .5), ('100', 1.0)):
    R = three_rotation_about(P, AXIS, OPEN * f)
    door.matrix_world = R @ rest
    for p, r in zip(dparts, drest): p.matrix_world = R @ r
    dp = R @ tb(DOOR_PIN); bp = tb(BODY_PIN); d = (dp - bp).normalized()
    cyl.matrix_world = Matrix.Translation(bp) @ xaxis.rotation_difference(d).to_matrix().to_4x4()
    rod.matrix_world = Matrix.Translation(dp) @ xaxis.rotation_difference(-d).to_matrix().to_4x4()
    print(name, 'strut length', round((dp - bp).length, 3), 'rod overlap', round(CYL + ROD - (dp - bp).length, 3))
    bpy.context.view_layer.update()
    shoot(cam, (-1.7, 0.95, 2.1), (-0.7, 0.6, 0.85), f'{OUT}/jeskohinge_{name}.png', 32)
    shoot(cam, (0.15, 0.85, 0.2), (-0.65, 0.55, 0.8), f'{OUT}/jeskohinge_{name}_in.png', 30)
    shoot(cam, (-0.25, 0.75, 1.75), (-0.6, 0.6, 0.78), f'{OUT}/jeskohinge_{name}_strut.png', 30)
