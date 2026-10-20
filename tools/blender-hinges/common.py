"""Shared helpers for Velocity Atelier car inspection in Blender (background mode).

Coordinates: helpers take/return three.js (Y-up) car coordinates, matching the runtime code.
"""
import bpy, math, os, sys
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree

ROOT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else ''
ARGS = sys.argv[sys.argv.index('--') + 2:] if '--' in sys.argv else []

# three (x, y, z) -> blender (x, -z, y)
B = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
BI = B.inverted()

def tb(v):
    return (B @ Vector((v[0], v[1], v[2], 1))).xyz

def bt(v):
    return (BI @ Vector((v[0], v[1], v[2], 1))).xyz


def load(glb):
    """A site model from public/models, or an editable source model from tools/source-assets/cars."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    path = ROOT + '/public/models/' + glb
    if not os.path.exists(path): path = ROOT + '/tools/source-assets/cars/' + glb
    bpy.ops.import_scene.gltf(filepath=path)
    bpy.context.view_layer.update()


def meshes_under(obj):
    return [c for c in obj.children_recursive if c.type == 'MESH']


def bvh_for(objs, matrix=Matrix.Identity(4)):
    verts, polys = [], []
    for o in objs:
        m = matrix @ o.matrix_world
        base = len(verts)
        verts += [m @ v.co for v in o.data.vertices]
        polys += [[base + i for i in p.vertices] for p in o.data.polygons]
    return BVHTree.FromPolygons(verts, polys, all_triangles=False, epsilon=0.0)


def three_rotation_about(pivot, axis, angle):
    """Matrix (in blender space) rotating about a three.js-space axis through pivot."""
    p, a = tb(pivot), (B.to_3x3() @ Vector(axis)).normalized()
    return Matrix.Translation(p) @ Matrix.Rotation(angle, 4, a) @ Matrix.Translation(-p)


def setup_render(res=(1200, 800), samples=16):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.film_transparent = False
    try:
        sc.eevee.taa_render_samples = samples
    except Exception:
        pass
    world = bpy.data.worlds.new('w'); sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.55, 0.57, 0.6, 1); bg.inputs[1].default_value = 1.0
    for i, (loc, e) in enumerate([((4, -4, 5), 3.0), ((-4, 4, 4), 2.0), ((0, 0, 6), 2.0)]):
        l = bpy.data.lights.new('sun%d' % i, 'SUN'); l.energy = e
        o = bpy.data.objects.new('sun%d' % i, l); sc.collection.objects.link(o)
        o.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    cam = bpy.data.cameras.new('cam'); cam.lens = 35; cam.clip_start = 0.01
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    return co


def shoot(cam, eye, target, path, lens=35):
    e, t = tb(eye), tb(target)
    cam.location = e
    cam.rotation_euler = (t - e).to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = lens
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
