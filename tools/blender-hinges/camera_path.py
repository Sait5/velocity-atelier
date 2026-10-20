import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import *
def bez(p0, p1, p2, p3, t):
    u = 1 - t; return p0*u*u*u + p1*3*u*u*t + p2*3*u*t*t + p3*t*t*t
car = ARGS[0]
if car == 'ferrari':
    load('ferrari-italia-complete.glb'); door = bpy.data.objects['door_R']; R = three_rotation_about(Vector((-.7055, .5, .9105)), (0, 1, 0), -1.12); anchor = Vector((.02, 1.04, .35))
else:
    load('porsche-911-gt3-door-assembly.glb'); door = bpy.data.objects['Porsche door L']; R = three_rotation_about(Vector((-.715, .7, .835)), (0, 1, 0), -1.12); anchor = Vector((.10, 1.02, .34))
dm = meshes_under(door)
tree = bvh_for(dm, R)
others = set(dm) | set(meshes_under(bpy.data.objects['door_L' if car == 'ferrari' else 'Porsche door R']))
body = bvh_for([o for o in bpy.data.objects if o.type == 'MESH' and o not in others])
def report(label, pts):
    worst = min(((tree.find_nearest(tb(p))[3], p) for p in pts), key=lambda x: x[0])
    wb = min(((body.find_nearest(tb(p))[3], p) for p in pts), key=lambda x: x[0])
    print(label, 'closest to open door', round(worst[0], 3), 'at', tuple(round(c, 2) for c in worst[1]), '| closest to body', round(wb[0], 3), 'at', tuple(round(c, 2) for c in wb[1]))
start = Vector((-5, 1.5, 4.5))
approach = Vector((-.13, 1.18, 1.75))
path = [start.lerp(approach, t / 20) for t in range(21)] + [bez(approach, Vector((-.22, 1.17, 1.15)), Vector((-.18, 1.12, .54)), anchor, t / 40) for t in range(41)]
report('current', path)
import itertools
res = []
for ax, az, c1x, c1y, c1z, c2y, c2z in itertools.product([0.0, 0.12, 0.25], [1.55, 1.8], [-0.05, 0.05], [1.0, 1.06], [1.1, 1.25], [1.0, 1.06], [0.62, 0.75]):
    a = Vector((ax, 1.12, az)); c1 = Vector((c1x, c1y, c1z)); c2 = Vector((-0.06, c2y, c2z))
    pts = [start.lerp(a, t / 20) for t in range(21)] + [bez(a, c1, c2, anchor, t / 40) for t in range(41)]
    dd = min(tree.find_nearest(tb(p))[3] for p in pts)
    outside = [p for p in pts if p.z > 0.55]
    bd = min(body.find_nearest(tb(p))[3] for p in outside)
    res.append((min(dd, bd * 1.5), round(dd, 3), round(bd, 3), (ax, az), (c1x, c1y, c1z), (c2y, c2z)))
for r in sorted(res, reverse=True)[:5]: print('cand', r)
