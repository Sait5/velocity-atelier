"""Ferrari 458: turn the native (body-welded) hinges into working hinges.

* The native gooseneck arms are cut out of the body mesh and re-attached to each door.
* A body bracket ties every barrel to the A-pillar jamb, a door bracket ties every arm to the door face.
* Door pivot = native barrel axis (vertical, x=-0.7055, |z|=0.9105).
Output: public/models/ferrari-door-hinges.glb (car coordinates, closed pose) + verification renders.
"""
import sys, os, bmesh, json
sys.path.insert(0, os.path.dirname(__file__))
from hingekit import *

OUT = os.environ.get('HINGE_OUT', os.path.join(os.path.dirname(__file__), 'out'))
EXPORT = ROOT + '/public/models/ferrari-door-hinges.glb'
AX, AZ, OPEN = -0.7055, 0.9105, 1.12
BODY = 'fer_f142_10_s_lod0_body_body__carpaint_0'
# arm cut boxes (three coords, +z side; mirrored for -z)
ARM = [dict(y=(.262, .300)), dict(y=(.608, .646))]
# measured surfaces (rays from the barrel): jamb face x, door face x
HINGES = [
    dict(barrel=(.2640, .2870), door_y=(.270, .294), jamb=-0.7430, door=-0.6290, door_z=(.896, .909)),
    dict(barrel=(.6100, .6330), door_y=(.616, .640), jamb=-0.7522, door=-0.6650, door_z=(.884, .900)),
]

load('ferrari-italia-complete.glb')
body = bpy.data.objects[BODY]
paint = body.data.materials[0]
# surfaces the plates are fitted to (+z side, closed door; the native arm is not part of the body tree)
door_tree = bvh_for(meshes_under(bpy.data.objects['door_R']))
body_tree = bvh_for([o for o in bpy.data.objects if o.type == 'MESH' and o is not body and o.parent and not o.parent.name.startswith(('door_', 'wheel_'))] + [body])

fast = bpy.data.materials.new('Italia hinge fastener'); fast.use_nodes = True
bs = fast.node_tree.nodes['Principled BSDF']
bs.inputs['Base Color'].default_value = (.045, .047, .05, 1); bs.inputs['Metallic'].default_value = .55; bs.inputs['Roughness'].default_value = .5


def in_arm(ps, y0, y1, side):
    return all(-.708 < p.x < -.686 and y0 < p.y < y1 and .866 < side * p.z < .912 for p in ps)


def new_obj(name, bm, mats):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    return ob


def box(bm, lo, hi, side):
    """Axis-aligned box given in three coords (+z side), mirrored by side, built in blender space."""
    (x0, y0, z0), (x1, y1, z1) = lo, hi
    zs = sorted((z0 * side, z1 * side))
    corners = [tb((x, y, z)) for x in (x0, x1) for y in (y0, y1) for z in zs]
    r = bmesh.ops.create_cube(bm, size=1.0)
    vs = r['verts']
    c = sum(corners, Vector()) / 8
    size = Vector((abs(x1 - x0), abs(z1 - z0), abs(y1 - y0)))  # blender axes: x, y(-z three), z(y three)
    for v in vs:
        v.co = c + Vector((v.co.x * size.x, v.co.y * size.y, v.co.z * size.z))
    bmesh.ops.bevel(bm, geom=list({e for v in vs for e in v.link_edges}), offset=min(size) * .18, segments=2, affect='EDGES')


def bolt(bm, centre, axis_three, side, r=.0042, h=.003):
    c = tb((centre[0], centre[1], centre[2] * side))
    a = (tb(axis_three) - tb((0, 0, 0))).normalized()
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=r, radius2=r, depth=h)
    rot = a.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=Matrix.Translation(c + a * h / 2) @ rot, verts=res['verts'])
    washer = bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=r * 1.35, radius2=r * 1.35, depth=.0008)
    bmesh.ops.transform(bm, matrix=Matrix.Translation(c + a * .0004) @ rot, verts=washer['verts'])


parts = []
mw = body.matrix_world
for side, tag in ((1, 'P'), (-1, 'N')):
    for i, (arm, h) in enumerate(zip(ARM, HINGES)):
        # 1) native arm -> door part
        bm = bmesh.new(); bm.from_mesh(body.data)
        keep = {f for f in bm.faces if in_arm([bt(mw @ v.co) for v in f.verts], *arm['y'], side)}
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f not in keep], context='FACES')
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        bmesh.ops.transform(bm, matrix=mw, verts=bm.verts)
        print(tag, i, 'arm faces', len(bm.faces))
        # door bracket: from the arm tip to the door face, plate laid on the face (fitted by rays), two bolts
        dy0, dy1 = h['door_y']; dz0, dz1 = h['door_z']
        bmb = bmesh.new()
        hit, n = fitted_bracket(bm, bmb, door_tree, (-.6935, (dy0 + dy1) / 2, (dz0 + dz1) / 2), (1, 0, 0), (0, 1, 0), dy1 - dy0 - .004, dz1 - dz0, side, (.030, .026, .004))
        print(tag, i, 'door plate at', tuple(round(c, 4) for c in hit), 'normal', tuple(round(c, 2) for c in n))
        door_obj = new_obj(f'hinge_door_{tag}_{i}', bm, [paint])
        for p in door_obj.data.polygons: p.material_index = 0
        bolts_door = new_obj(f'hinge_door_{tag}_{i}_bolts', bmb, [fast])
        # body bracket: barrel -> jamb, plate laid on the jamb, two bolts
        by0, by1 = h['barrel']
        bm = bmesh.new(); bmb = bmesh.new()
        hit, n = fitted_bracket(bm, bmb, body_tree, (AX - .004, (by0 + by1) / 2, AZ - .0082), (-1, 0, 0), (0, 1, 0), by1 - by0 - .006, .0095, side, (.034, .024, .004), skip=.012)
        print(tag, i, 'jamb plate at', tuple(round(c, 4) for c in hit), 'normal', tuple(round(c, 2) for c in n))
        body_obj = new_obj(f'hinge_body_{tag}_{i}', bm, [paint])
        bolts_body = new_obj(f'hinge_body_{tag}_{i}_bolts', bmb, [fast])
        parts += [door_obj, bolts_door, body_obj, bolts_body]

# cut the arms out of the body for the preview (the site does the same at runtime)
bm = bmesh.new(); bm.from_mesh(body.data)
dead = [f for f in bm.faces if any(in_arm([bt(mw @ v.co) for v in f.verts], *a['y'], s) for a in ARM for s in (1, -1))]
bmesh.ops.delete(bm, geom=dead, context='FACES'); bm.to_mesh(body.data); bm.free()
print('arm faces removed from body', len(dead))

for p in parts:
    p.data.validate(); p.data.update()
    for poly in p.data.polygons: poly.use_smooth = False

# export only the hinge parts
bpy.ops.object.select_all(action='DESELECT')
for p in parts: p.select_set(True)
bpy.ops.export_scene.gltf(filepath=EXPORT, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
print('exported', EXPORT, os.path.getsize(EXPORT))

# clash check while opening: moving door hardware vs body, body hardware vs door
def parents(o):
    while o.parent:
        o = o.parent; yield o
door_meshes = {'P': meshes_under(bpy.data.objects['door_R']), 'N': meshes_under(bpy.data.objects['door_L'])}
alld = set(door_meshes['P']) | set(door_meshes['N'])
static = [o for o in bpy.data.objects if o.type == 'MESH' and o not in alld and o not in parts and not any(p.name.startswith('wheel_') for p in parents(o))]
static_bvh = bvh_for(static)
for tag, side in (('P', 1), ('N', -1)):
    dparts = [p for p in parts if p.name.startswith('hinge_door_' + tag)]
    bparts = bvh_for([p for p in parts if p.name.startswith('hinge_body_' + tag)])
    for f in (0.0, 0.25, 0.5, 0.75, 1.0):
        R = three_rotation_about(Vector((AX, .5, side * AZ)), (0, 1, 0), -side * OPEN * f)
        moving_hw = bvh_for(dparts, R)
        moving_door = bvh_for(door_meshes[tag], R)
        print(f'{tag} open {f:.2f}: door-hardware x body {len(moving_hw.overlap(static_bvh))}, body-hardware x door {len(bparts.overlap(moving_door))}')

# renders
cam = setup_render((900, 700), 8)
door = bpy.data.objects['door_R']; rest = door.matrix_world.copy()
dparts = [p for p in parts if p.name.startswith('hinge_door_P')]; drest = [p.matrix_world.copy() for p in dparts]
for tag, f in [('closed', 0.0), ('half', .5), ('open', 1.0)]:
    R = three_rotation_about(Vector((AX, .5, AZ)), (0, 1, 0), -OPEN * f)
    door.matrix_world = R @ rest
    for p, r in zip(dparts, drest): p.matrix_world = R @ r
    bpy.context.view_layer.update()
    shoot(cam, (-0.42, 0.66, 0.66), (-0.70, 0.627, 0.905), f'{OUT}/ferhinge_{tag}_upper.png', 60)
    shoot(cam, (-0.42, 0.33, 0.62), (-0.70, 0.281, 0.905), f'{OUT}/ferhinge_{tag}_lower.png', 60)
    shoot(cam, (-0.25, 0.55, 0.45), (-0.72, 0.45, 0.92), f'{OUT}/ferhinge_{tag}_both.png', 32)
