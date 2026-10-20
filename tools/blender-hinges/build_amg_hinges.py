"""Mercedes-AMG GT 63 S 4-Door: two steel hinges per front door on its vertical axis at the door's front edge (on the
A-pillar), plus a door check strap between them, as on the Porsche. Only the front doors open on the site; the rear doors
stay shut and get none.

Usage: blender -b --python tools/blender-hinges/build_amg_hinges.py -- <checkout>
Output public/models/amg-door-hinges.glb, car coordinates, closed pose.
Parts: hinge_body_{P|N}_{F|R}{i}, hinge_door_{P|N}_{F|R}{i}, check_body_{P|N}_{F|R}, check_door_{P|N}_{F|R},
check_strap_{P|N}_{F|R} (P = +z side, the driver's; F/R = front/rear door). check_strap origin = body pin, local +x
points at the door guide. The site gives each part to the nearest door on its side (sideDoorConnections.ts).
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from hingekit import *

OUT = os.environ.get('HINGE_OUT', os.path.join(os.path.dirname(__file__), 'out'))
EXPORT = ROOT + '/public/models/amg-door-hinges.glb'
OPEN = 1.12
HEIGHTS = (0.47, 0.80)
CHECK_Y = 0.64

load('mercedes-amg-gt63-rigged.glb')   # tools/prepare-amg-model.py (uncompressed)
steel = mat('carpaint', (.8, .8, .8), .2, .35)  # painted with the body; the site swaps in the hinge black
zinc = mat('AMG hinge fastener', (.06, .062, .065), .45, .5)
bracket = mat('AMG check bracket', (.05, .052, .055), .35, .6)
rubber = mat('AMG check boot', (.018, .018, .02), 0, .85)
strap_m = mat('AMG check strap', (.03, .031, .033), .4, .55)
groups = {(s, w): bpy.data.objects[f'AMG door {"L" if s == 1 else "R"} {"front" if w == "F" else "rear"}'] for s in (1, -1) for w in 'FR'}
door_meshes = {k: meshes_under(g) for k, g in groups.items()}
alld = {o for v in door_meshes.values() for o in v}
body_tree = bvh_for([o for o in bpy.data.objects if o.type == 'MESH' and o not in alld])

# the hardware is fitted on the driver's (+z) side and mirrored: the car is symmetric
parts = []
hinged = {k: g for k, g in groups.items() if k[1] == 'F'}
for (side, which), g in hinged.items():
    tag = ('P' if side == 1 else 'N') + '_' + which
    pivot = bt(groups[(1, which)].matrix_world.translation)
    # the front doors' axes lie at the skin's surface: the knuckles stand 4 mm inboard of the axis and are slim, so they
    # stay inside the panel gap (the door knuckle's 4 mm orbit is lost in the gap)
    AX, AZ = pivot.x, abs(pivot.z) - .004
    door_tree = bvh_for(door_meshes[(1, which)])
    t0, t1 = AZ - .0068, AZ - .0026          # leaf plate: tangent to the inner side of the barrel
    for i, y in enumerate(HEIGHTS):
        # body leaf: top and bottom knuckles, web, plate fitted to the pillar's face by rays, pin and caps
        bm = bmesh.new()
        for ys in ((y - .024, y - .009), (y + .009, y + .024)):
            cylinder(bm, (AX, sum(ys) / 2, AZ), (0, 1, 0), .0058, ys[1] - ys[0] - .0006, side)
            box(bm, (AX - .018, ys[0] + .001, t0), (AX - .002, ys[1] - .001, t1), side)
        cylinder(bm, (AX, y, AZ), (0, 1, 0), .0026, .056, side, 12)
        for ys in (y - .0285, y + .0285):
            cylinder(bm, (AX, ys, AZ), (0, 1, 0), .0042, .0026, side, 16)
        bmb = bmesh.new()
        plate = (.040, .026, .004)
        dev, shift = flattest_shift(body_tree, (AX - .016, y, (t0 + t1) / 2), (-1, 0, 0), (0, 1, 0), .036, plate, [(0, 0, -k * .0025) for k in range(0, 15)])
        print(tag, i, 'pillar plate shift', tuple(round(v, 4) for v in shift), 'flatness', round(dev * 1000, 1), 'mm')
        fitted_bracket(bm, bmb, body_tree, (AX - .016, y, (t0 + t1) / 2), (-1, 0, 0), (0, 1, 0), .034, .004, side, plate, plate_shift=shift)
        parts.append(obj(f'hinge_body_{tag}{i}', bm, steel)); parts.append(obj(f'hinge_body_{tag}{i}_bolts', bmb, zinc))
        # door leaf: middle knuckle, neck, web to the door's front shut face, plate fitted to it
        bm = bmesh.new()
        cylinder(bm, (AX, y, AZ), (0, 1, 0), .0058, .0168, side)
        box(bm, (AX + .002, y - .008, t0), (AX + .007, y + .008, t1), side)
        bmb = bmesh.new()
        plate = (.038, .028, .004)
        dev, shift = flattest_shift(door_tree, (AX + .003, y, (t0 + t1) / 2), (1, 0, 0), (0, 1, 0), .034, plate, [(0, 0, -k * .0025) for k in range(0, 15)])
        print(tag, i, 'door plate shift', tuple(round(v, 4) for v in shift), 'flatness', round(dev * 1000, 1), 'mm')
        fitted_bracket(bm, bmb, door_tree, (AX + .003, y, (t0 + t1) / 2), (1, 0, 0), (0, 1, 0), .034, .004, side, plate, plate_shift=shift)
        parts.append(obj(f'hinge_door_{tag}{i}', bm, steel)); parts.append(obj(f'hinge_door_{tag}{i}_bolts', bmb, zinc))
    # door check: pin bracket on the pillar, rubber boot on the door's shut face, sliding strap between them
    cy, cz = CHECK_Y, AZ - .045
    bm = bmesh.new()
    hb, nb = surface_hit(body_tree, (AX, cy, cz), (-1, 0, 0), (0, 1, 0), .03)
    Ub = (Vector((0, 1, 0)) - nb * nb.y).normalized()
    beam(bm, tuple(hb + nb * .002 - Ub * .019), tuple(hb + nb * .002 + Ub * .019), .028, .004, tuple(nb), side)
    for k in (-1, 1):
        beam(bm, tuple(hb + nb * .003 + Ub * .0105 * k), tuple(hb + nb * .017 + Ub * .0105 * k), .015, .004, tuple(Ub), side)
    pin3 = hb + nb * .0125
    cylinder(bm, tuple(pin3), tuple(Ub), .0028, .026, side, 12)
    parts.append(obj(f'check_body_{tag}', bm, bracket))
    bm = bmesh.new()
    hd, nd = surface_hit(door_tree, (AX, cy, cz), (1, 0, 0), (0, 1, 0), .03)
    Ud = (Vector((0, 1, 0)) - nd * nd.y).normalized()
    beam(bm, tuple(hd + nd * .0035 - Ud * .016), tuple(hd + nd * .0035 + Ud * .016), .027, .006, tuple(nd), side, .3)
    parts.append(obj(f'check_door_{tag}', bm, rubber))
    length = max(.08, (hd - hb).length + .02)
    bm = bmesh.new()
    box(bm, (-.0068, -.0075, -.0035), (length, .0075, .0035), 1)
    cylinder(bm, (0, 0, 0), (0, 1, 0), .0068, .016, 1)
    box(bm, (length, -.0095, -.0052), (length + .012, .0095, .0052), 1)
    strap = obj(f'check_strap_{tag}', bm, strap_m)
    pin = (pin3.x, pin3.y, pin3.z * side)
    strap.matrix_world = Matrix.Translation(tb(pin))
    for v in strap.data.vertices: v.co -= tb(pin)
    parts.append(strap)
    print(tag, 'axis', round(AX, 3), round(AZ, 3), 'check pin', tuple(round(v, 3) for v in pin3), 'boot', tuple(round(v, 3) for v in hd))

export(parts, EXPORT)
print('exported', EXPORT, os.path.getsize(EXPORT))

# ---- verification: clashes while opening ----
static = [o for o in bpy.data.objects if o.type == 'MESH' and o not in alld and o not in parts]
static_bvh = bvh_for(static)
for (side, which), g in hinged.items():
    tag = ('P' if side == 1 else 'N') + '_' + which
    pivot = bt(g.matrix_world.translation)
    dparts = [p for p in parts if p.name.startswith(('hinge_door_' + tag, 'check_door_' + tag))]
    bparts = bvh_for([p for p in parts if p.name.startswith(('hinge_body_' + tag, 'check_body_' + tag))])
    for f in (0.0, 0.5, 1.0):
        R = three_rotation_about(Vector((pivot.x, .5, pivot.z)), (0, 1, 0), -side * OPEN * f)
        print(f'{tag} open {f:.1f}: door-hw x body {len(bvh_for(dparts, R).overlap(static_bvh))}, body-hw x door {len(bparts.overlap(bvh_for(door_meshes[(side, which)], R)))}')
