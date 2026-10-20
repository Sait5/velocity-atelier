"""Bugatti Tourbillon: the door hinge sits under the fender skin (tilted axis P/AXIS, hidden like the real car);
the visible part is a gas strut in the door aperture between the A-pillar and the door's front structure.

Output public/models/bugatti-door-hinges.glb, car coordinates, closed doors. Names (P = +z, N = -z):
hinge_body_* pin brackets on the pillar, hinge_door_* pin brackets on the door, strut_cyl_* (origin at the body pin,
built along +x) and strut_rod_* (origin at the door pin, built along +x). The site aims both at each other and shows
the whole set only while the door is open: closed, it would sit in plain view beside the dashboard.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from hingekit import *
OUT = os.environ.get('HINGE_OUT', os.path.join(os.path.dirname(__file__), 'out'))
EXPORT = ROOT + '/public/models/bugatti-door-hinges.glb'
P = Vector((-1.10, 0.78, 0.92)); AXIS = Vector((0, -.55, 1)).normalized(); OPEN = 1.1300804615020752
BODY_PIN = Vector((-0.879, 0.348, 0.730)); DOOR_PIN = Vector((-0.878, 0.699, 0.805))
CYL, ROD = .335, .325

load('bugatti-tourbillon-door-fit-v4.glb')
for o in list(bpy.data.objects):
    if 'mounting' in o.name: bpy.data.objects.remove(o, do_unlink=True)
door_objs = {1: bpy.data.objects['Tourbillon_door_1'], -1: bpy.data.objects['Tourbillon_door_0']}
alld = set(meshes_under(door_objs[1])) | set(meshes_under(door_objs[-1]))
body = [o for o in bpy.data.objects if o.type == 'MESH' and o not in alld and 'wheel' not in o.name.lower()]
bb, db = bvh_for(body), bvh_for(meshes_under(door_objs[1]))
steel = mat('Tourbillon strut body', (.012, .013, .014), .45, .4)    # black, like the other cars' hinges
chrome = mat('Tourbillon strut rod', (.16, .17, .18), 1.0, .28)      # dark steel: a white chrome rod caught the eye from the cabin
bracket = mat('Tourbillon hinge bracket', (.008, .009, .01), .35, .45)

def surface(tree, p):
    loc, n, i, d = tree.find_nearest(tb(p)); return bt(loc), (bt(n + tb((0, 0, 0)))).normalized()

parts = []
for side, tag in ((1, 'P'), (-1, 'N')):
    m = lambda v: Vector((v.x, v.y, v.z * side))
    for kind, pin, tree in (('body', BODY_PIN, bb), ('door', DOOR_PIN, db)):
        sp, sn = surface(tree, pin)
        bm = bmesh.new()
        # clevis: base plate on the surface, two ears around the pin, pin across
        across = sn.cross(Vector((0, 1, 0))).normalized() if abs(sn.y) < .9 else Vector((1, 0, 0))
        beam(bm, tuple(sp + sn * .002 - across * .018), tuple(sp + sn * .002 + across * .018), .03, .004, tuple(sn), side)
        stem_end = pin
        for k in (-1, 1):
            ear = across * (.0095 * k)
            beam(bm, tuple(sp + sn * .003 + ear), tuple(stem_end + ear), .016, .003, tuple(across), side)
        cylinder(bm, tuple(pin), tuple(across), .0038, .026, side, 12)
        parts.append(obj(f'hinge_{kind}_{tag}_0', bm, bracket))
        bm = bmesh.new()
        for k in (-1, 1):
            bolt(bm, tuple(sp + sn * .004 + across * .013 * k), tuple(sn), side, .0034, .0028)
        parts.append(obj(f'hinge_{kind}_{tag}_0_bolts', bm, bracket))
    # strut: cylinder from the body pin, rod from the door pin, both along +x (aimed at runtime)
    bm = bmesh.new()
    cylinder(bm, (CYL / 2 + .012, 0, 0), (1, 0, 0), .0115, CYL - .012, 1, 24)
    cylinder(bm, (0, 0, 0), (0, 0, 1), .0085, .014, 1, 18)          # eye
    beam(bm, (0, 0, 0), (.016, 0, 0), .012, .009, (0, 0, 1), 1)
    cyl = obj(f'strut_cyl_{tag}', bm, steel)
    bm = bmesh.new()
    cylinder(bm, (ROD / 2 + .010, 0, 0), (1, 0, 0), .0062, ROD - .010, 1, 16)
    cylinder(bm, (0, 0, 0), (0, 0, 1), .0075, .012, 1, 18)
    beam(bm, (0, 0, 0), (.014, 0, 0), .010, .008, (0, 0, 1), 1)
    rod = obj(f'strut_rod_{tag}', bm, chrome)
    for o, pin in ((cyl, BODY_PIN), (rod, DOOR_PIN)):
        o.matrix_world = Matrix.Translation(tb(m(pin)))
    parts += [cyl, rod]

export(parts, EXPORT); print('exported', os.path.getsize(EXPORT))

# preview: aim the strut like the site does
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
    shoot(cam, (-0.25, 0.62, 1.55), (-0.88, 0.55, 0.80), f'{OUT}/bugstrut_{name}.png', 34)
    shoot(cam, (-0.35, 0.60, 0.35), (-0.88, 0.55, 0.78), f'{OUT}/bugstrut_{name}_in.png', 34)
