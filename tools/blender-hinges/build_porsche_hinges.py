"""Porsche 911 GT3: two steel side-door hinges on a vertical axis in the front door gap, plus a door check strap.

Output public/models/porsche-door-hinges.glb, car coordinates, closed pose.
Parts: hinge_body_{P|N}_{i}, hinge_door_{P|N}_{i}, check_body_{P|N}, check_door_{P|N}, check_strap_{P|N}
(P = +z side, N = -z side). check_strap origin = body pin, local +x points at the door guide.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from hingekit import *

OUT = os.environ.get('HINGE_OUT', os.path.join(os.path.dirname(__file__), 'out'))
EXPORT = ROOT + '/public/models/porsche-door-hinges.glb'
AX, AZ, OPEN = -0.715, 0.835, 1.12
HINGES = [dict(y=0.42, jamb=-0.737, door=-0.660), dict(y=0.68, jamb=-0.747, door=-0.662)]
CHECK = dict(y=0.555, z=0.800, jamb=-0.746, door=-0.667)

load('porsche-911-gt3-door-assembly.glb')
steel = mat('carpaint', (.8, .8, .8), .2, .35)  # painted with the body; the site swaps in the live paint
hinge_steel = mat('Porsche check bracket', (.05, .052, .055), .35, .6)
zinc = mat('Porsche hinge fastener', (.06, .062, .065), .45, .5)
rubber = mat('Porsche check boot', (.018, .018, .02), 0, .85)
strap_m = mat('Porsche check strap', (.03, .031, .033), .4, .55)
# surfaces the plates are fitted to (+z side, closed door)
door_tree = bvh_for(meshes_under(bpy.data.objects['Porsche door L']))
body_tree = bvh_for([o for o in bpy.data.objects if o.type == 'MESH' and o not in set(meshes_under(bpy.data.objects['Porsche door L'])) | set(meshes_under(bpy.data.objects['Porsche door R']))])

parts = []
for side, tag in ((1, 'P'), (-1, 'N')):
    for i, h in enumerate(HINGES):
        y, xj, xd = h['y'], h['jamb'], h['door']
        t0, t1 = AZ - .0080, AZ - .0030          # leaf plate: tangent to the inner side of the barrel
        # body leaf: top+bottom knuckles, split web near the barrel, full web, flange on the jamb, pin + caps
        bm = bmesh.new()
        for ys in ((y - .022, y - .0085), (y + .0085, y + .022)):
            cylinder(bm, (AX, sum(ys) / 2, AZ), (0, 1, 0), .0068, ys[1] - ys[0] - .0006, side)
            box(bm, (AX - .016, ys[0] + .001, t0), (AX - .002, ys[1] - .001, t1), side)
        cylinder(bm, (AX, y, AZ), (0, 1, 0), .0030, .052, side, 12)
        for ys in (y - .0265, y + .0265):
            cylinder(bm, (AX, ys, AZ), (0, 1, 0), .0048, .0026, side, 16)
        bmb = bmesh.new()   # web to the jamb, plate laid on the jamb (fitted by rays), two bolts
        # the jamb has a step (z~.77-.79) and a curled skin flange (z~.83): put the plate where it lies flattest
        plate = (.042, .024, .004) if i else (.034, .020, .004)   # slim leaves; the lower jamb is less even: smaller plate
        dev, shift = flattest_shift(body_tree, (AX - .015, y, (t0 + t1) / 2), (-1, 0, 0), (0, 1, 0), .036, plate, [(0, 0, -k * .0025) for k in range(0, 15)])
        print(tag, i, 'jamb plate shift', shift, 'flatness', round(dev * 1000, 1), 'mm')
        fitted_bracket(bm, bmb, body_tree, (AX - .015, y, (t0 + t1) / 2), (-1, 0, 0), (0, 1, 0), min(.036, plate[0] - .006), .004, side, plate, plate_shift=shift)
        parts.append(obj(f'hinge_body_{tag}_{i}', bm, steel))
        parts.append(obj(f'hinge_body_{tag}_{i}_bolts', bmb, zinc))
        # door leaf: middle knuckle, narrow neck, full web to the door face, flange on the door face
        bm = bmesh.new()
        cylinder(bm, (AX, y, AZ), (0, 1, 0), .0068, .0158, side)
        box(bm, (AX + .002, y - .0075, t0), (AX + .016, y + .0075, t1), side)
        bmb = bmesh.new()   # web to the door face, plate laid on the face, two bolts
        plate = (.040, .028, .004) if i else (.030, .022, .004)   # slim leaves; the lower door face is curved: smaller plate
        dev, shift = flattest_shift(door_tree, (AX + .015, y, (t0 + t1) / 2), (1, 0, 0), (0, 1, 0), .034, plate, [(0, 0, -k * .0025) for k in range(0, 15)])
        print(tag, i, 'door plate shift', shift, 'flatness', round(dev * 1000, 1), 'mm')
        fitted_bracket(bm, bmb, door_tree, (AX + .015, y, (t0 + t1) / 2), (1, 0, 0), (0, 1, 0), min(.034, plate[0] - .006), .004, side, plate, plate_shift=shift)
        parts.append(obj(f'hinge_door_{tag}_{i}', bm, steel))
        parts.append(obj(f'hinge_door_{tag}_{i}_bolts', bmb, zinc))
    # door check: pin bracket on the jamb, boot on the door face, sliding strap
    cy, cz, cj, cd = CHECK['y'], CHECK['z'], CHECK['jamb'], CHECK['door']
    bm = bmesh.new()   # pin bracket: base plate on the jamb, two ears along the surface normal, pin across
    hb, nb = surface_hit(body_tree, (cj + .03, cy, cz), (-1, 0, 0), (0, 1, 0), .03)
    Ub = (Vector((0, 1, 0)) - nb * nb.y).normalized()
    beam(bm, tuple(hb + nb * .002 - Ub * .019), tuple(hb + nb * .002 + Ub * .019), .028, .004, tuple(nb), side)
    for k in (-1, 1):
        beam(bm, tuple(hb + nb * .003 + Ub * .0105 * k), tuple(hb + nb * .017 + Ub * .0105 * k), .015, .004, tuple(Ub), side)
    pin3 = hb + nb * .0125
    cylinder(bm, tuple(pin3), tuple(Ub), .0028, .026, side, 12)
    parts.append(obj(f'check_body_{tag}', bm, hinge_steel))
    bm = bmesh.new()   # rubber boot on the door face
    hd, nd = surface_hit(door_tree, (cd - .03, cy, cz), (1, 0, 0), (0, 1, 0), .03)
    Ud = (Vector((0, 1, 0)) - nd * nd.y).normalized()
    beam(bm, tuple(hd + nd * .0035 - Ud * .016), tuple(hd + nd * .0035 + Ud * .016), .027, .006, tuple(nd), side, .3)
    parts.append(obj(f'check_door_{tag}', bm, rubber))
    # strap built along +x from the body pin; the site aims it at the door guide every frame
    bm = bmesh.new()
    box(bm, (-.0068, -.0075, -.0035), (.150, .0075, .0035), 1)
    cylinder(bm, (0, 0, 0), (0, 1, 0), .0068, .016, 1)
    box(bm, (.150, -.0095, -.0052), (.162, .0095, .0052), 1)
    strap = obj(f'check_strap_{tag}', bm, strap_m)
    pin = (pin3.x, pin3.y, pin3.z * side)
    strap.matrix_world = Matrix.Translation(tb(pin))   # origin at the body pin (blender space)
    me = strap.data
    for v in me.vertices: v.co -= tb(pin)
    parts.append(strap)

export(parts, EXPORT)
print('exported', EXPORT, os.path.getsize(EXPORT))

# ---- verification: clashes while opening, then renders ----
door_meshes = {1: meshes_under(bpy.data.objects['Porsche door L']), -1: meshes_under(bpy.data.objects['Porsche door R'])}
alld = set(door_meshes[1]) | set(door_meshes[-1])
static = [o for o in bpy.data.objects if o.type == 'MESH' and o not in alld and o not in parts]
static_bvh = bvh_for(static)
for side, tag in ((1, 'P'), (-1, 'N')):
    dparts = [p for p in parts if p.name.startswith(('hinge_door_' + tag, 'check_door_' + tag))]
    bparts = bvh_for([p for p in parts if p.name.startswith(('hinge_body_' + tag, 'check_body_' + tag))])
    for f in (0.0, 0.5, 1.0):
        R = three_rotation_about(Vector((AX, .5, side * AZ)), (0, 1, 0), -side * OPEN * f)
        print(f'{tag} open {f:.1f}: door-hw x body {len(bvh_for(dparts, R).overlap(static_bvh))}, body-hw x door {len(bparts.overlap(bvh_for(door_meshes[side], R)))}')

cam = setup_render((900, 700), 8)
door = bpy.data.objects['Porsche door L']; rest = door.matrix_world.copy()
dparts = [p for p in parts if p.name.startswith(('hinge_door_P', 'check_door_P'))]; drest = [p.matrix_world.copy() for p in dparts]
strap = bpy.data.objects['check_strap_P']; pin = bt(strap.matrix_world.translation)
guide0 = Vector((CHECK['door'], CHECK['y'], CHECK['z']))
for tag, f in [('closed', 0.0), ('half', .5), ('open', 1.0)]:
    R = three_rotation_about(Vector((AX, .5, AZ)), (0, 1, 0), -OPEN * f)
    door.matrix_world = R @ rest
    for p, r in zip(dparts, drest): p.matrix_world = R @ r
    guide = bt(R @ tb(guide0))
    d = (tb(guide) - tb(pin)).normalized()
    strap.matrix_world = Matrix.Translation(tb(pin)) @ (tb((1, 0, 0)) - tb((0, 0, 0))).rotation_difference(d).to_matrix().to_4x4()
    bpy.context.view_layer.update()
    shoot(cam, (-0.40, 0.62, 0.55), (-0.71, 0.55, 0.83), f'{OUT}/porhinge_{tag}_in.png', 30)
    shoot(cam, (-0.42, 0.72, 0.62), (-0.71, 0.68, 0.83), f'{OUT}/porhinge_{tag}_upper.png', 55)
    shoot(cam, (-0.30, 0.75, 1.45), (-0.71, 0.55, 0.86), f'{OUT}/porhinge_{tag}_out.png', 32)
