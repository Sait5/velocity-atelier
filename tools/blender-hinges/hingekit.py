"""Procedural hinge hardware in three.js car coordinates (+z side, mirrored by `side`)."""
import bmesh, math
from common import *


def mat(name, rgb, metal, rough):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    return m


def obj(name, bm, material):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.materials.append(material)
    for p in me.polygons: p.use_smooth = True
    me.validate(); me.update()
    try: me.shade_smooth_by_angle(angle=math.radians(35))
    except Exception: pass
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    return ob


def box(bm, lo, hi, side, bevel=0.18):
    (x0, y0, z0), (x1, y1, z1) = lo, hi
    zs = sorted((z0 * side, z1 * side))
    c = (tb((x0, y0, zs[0])) + tb((x1, y1, zs[1]))) / 2
    size = Vector((abs(x1 - x0), abs(z1 - z0), abs(y1 - y0)))
    r = bmesh.ops.create_cube(bm, size=1.0)
    for v in r['verts']:
        v.co = c + Vector((v.co.x * size.x, v.co.y * size.y, v.co.z * size.z))
    if bevel:
        bmesh.ops.bevel(bm, geom=list({e for v in r['verts'] for e in v.link_edges}), offset=min(size) * bevel, segments=2, affect='EDGES')


def cylinder(bm, centre, axis, r, h, side, seg=20):
    c = tb((centre[0], centre[1], centre[2] * side))
    a = (tb((axis[0], axis[1], axis[2] * side)) - tb((0, 0, 0))).normalized()
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=h)
    bmesh.ops.transform(bm, matrix=Matrix.Translation(c) @ a.to_track_quat('Z', 'Y').to_matrix().to_4x4(), verts=res['verts'])


def bolt(bm, seat, axis, side, r=.0042, h=.0032):
    """Hex head + washer sitting on a surface at `seat`, sticking out along `axis` (three coords, +z side)."""
    a3 = Vector(axis).normalized()
    cylinder(bm, tuple(Vector(seat) + a3 * (.0004)), axis, r * 1.4, .0008, side, 18)
    cylinder(bm, tuple(Vector(seat) + a3 * (.0008 + h / 2)), axis, r, h, side, 6)


def export(objs, path):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)


def beam(bm, a, b, width, thick, up, side=1, bevel=0.2):
    """Box from a to b (three coords, +z side mirrored by side): `width` across, `thick` along `up` (projected)."""
    m = lambda v: Vector((v[0], v[1], v[2] * side))
    A, Bv, U = tb(m(a)), tb(m(b)), (tb(m(up)) - tb((0, 0, 0)))
    x = (Bv - A); length = x.length; x.normalize()
    z = (U - x * U.dot(x)).normalized(); y = z.cross(x)
    rot = Matrix((x, y, z)).transposed().to_4x4()
    r = bmesh.ops.create_cube(bm, size=1.0)
    for v in r['verts']:
        v.co = Vector((v.co.x * length, v.co.y * width, v.co.z * thick))
    bmesh.ops.transform(bm, matrix=Matrix.Translation((A + Bv) / 2) @ rot, verts=r['verts'])
    if bevel:
        bmesh.ops.bevel(bm, geom=list({e for v in r['verts'] for e in v.link_edges}), offset=min(width, thick) * bevel, segments=2, affect='EDGES')


def surface_hit(tree, start, direction, across, width, n=5, reach=.25):
    """Mean hit point and normal (three coords) of rays from `start` along `direction`, spread `width` along `across`.
    The normal is flipped to face back towards the start."""
    d = tb(Vector(direction).normalized()); pts, nrm = [], Vector()
    for k in range(n):
        o = Vector(start) + Vector(across).normalized() * width * (k / (n - 1) - .5)
        h = tree.ray_cast(tb(o), d, reach)
        if h[0] is None: continue
        pts.append(bt(h[0])); nn = bt(h[1]).normalized()
        nrm += nn if nn.dot(Vector(direction)) < 0 else -nn
    if not pts: return None, None
    return sum(pts, Vector()) / len(pts), nrm.normalized()


def fitted_bracket(bm, bolts_bm, tree, start, direction, across, width, thick, side, plate=(.030, .026, .004), bolt_r=.0036, skip=0.0, plate_shift=(0, 0, 0)):
    """Arm from `start` to the surface hit along `direction`, ending on a plate laid flat on that surface, two bolts.
    Rays start `skip` metres along the direction (to clear the barrel). Everything in three coords for the +z side;
    `side` mirrors. Returns (hit, normal)."""
    # the plate is fitted where it actually sits (start slid by plate_shift), the arm then runs from start to it
    hit, n = surface_hit(tree, Vector(start) + Vector(plate_shift) + Vector(direction).normalized() * skip, direction, across, width)
    if hit is None: raise RuntimeError(f'no surface from {tuple(start)} along {tuple(direction)}')
    ph, pw, pt = plate
    U = Vector(across) - n * Vector(across).dot(n); U.normalize()
    up = Vector(direction).cross(Vector(across))
    beam(bm, tuple(start), tuple(hit + n * pt * .5), width, thick, tuple(up), side)
    c = hit
    beam(bm, tuple(c + n * pt * .5 - U * ph * .5), tuple(c + n * pt * .5 + U * ph * .5), pw, pt, tuple(n), side)
    for k in (-1, 1):
        bolt(bolts_bm, tuple(c + n * pt + U * ph * .3 * k), tuple(n), side, bolt_r, .0028)
    return hit, n


def flattest_shift(tree, start, direction, across, width, plate, shifts):
    """Pick the plate_shift (three coords) where the surface under a plate of size `plate` is flattest:
    rays at the plate corners must land within a few millimetres of the plate plane."""
    ph, pw, pt = plate; best = None
    for s in shifts:
        hit, n = surface_hit(tree, Vector(start) + Vector(s), direction, across, width)
        if hit is None: continue
        U = Vector(across) - n * Vector(across).dot(n); U.normalize(); V = n.cross(U)
        dev = 0
        for a in (-.5, 0, .5):
            for b in (-.5, 0, .5):
                q = hit + U * ph * a + V * pw * b
                h = tree.ray_cast(tb(q + n * .03), tb(-n), .08)
                dev = max(dev, abs(((bt(h[0]) - hit).dot(n)) if h[0] is not None else .05))
        if best is None or dev < best[0]: best = (dev, tuple(s))
    return best
