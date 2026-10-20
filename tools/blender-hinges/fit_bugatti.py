import sys, os, itertools, math, json
sys.path.insert(0, os.path.dirname(__file__))
from common import *

load('bugatti-tourbillon-door-fit-v4.glb')
door = bpy.data.objects['Tourbillon_door_1']   # +z side
samples = door.get('siteDoorSamples')
s0, s1 = samples[0], samples[-1]
q = Quaternion((s1[6], s1[3], s1[4], s1[5]))
print('door_1 sample end: pos', [round(v, 3) for v in s1[:3]], 'angle', round(math.degrees(q.angle), 1), 'axis', [round(v, 3) for v in q.axis])
dm = [o for o in meshes_under(door) if 'mounting' not in o.name]
others = set(dm) | set(meshes_under(bpy.data.objects['Tourbillon_door_0']))
body = [o for o in bpy.data.objects if o.type == 'MESH' and o not in others and 'wheel' not in o.name.lower() and 'glass' not in o.name.lower() and 'mounting' not in o.name]
for o in bpy.data.objects:
    if 'mounting' in o.name and o.type == 'MESH':
        ps = [bt(o.matrix_world @ v.co) for v in o.data.vertices]
        print('MOUNT', o.name, o.parent.name if o.parent else None, [round(min(p[k] for p in ps), 3) for k in range(3)], [round(max(p[k] for p in ps), 3) for k in range(3)])
pts = [bt(o.matrix_world @ v.co) for o in dm for v in o.data.vertices]
for y in [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1]:
    band = [p for p in pts if abs(p.y - y) < .015]
    if band:
        f = min(band, key=lambda p: p.x); print(f'door front y={y}: x={f.x:.3f} z={f.z:.3f}  outer z={max(p.z for p in band):.3f}')
verts, polys = [], []
for o in body:
    m = o.matrix_world; base = len(verts); vs = [m @ v.co for v in o.data.vertices]; verts += vs
    for p in o.data.polygons:
        c = bt(sum((vs[i] for i in p.vertices), Vector()) / len(p.vertices))
        if c.z > 0.35 and -1.7 < c.x < 0.8: polys.append([base + i for i in p.vertices])
bb = BVHTree.FromPolygons(verts, polys)
closed = set(a for a, b in bb.overlap(bvh_for(dm)))
print('closed contacts', len(closed))
def clash(pivot, axis, ang):
    return sum(sum(1 for a, b in bb.overlap(bvh_for(dm, three_rotation_about(Vector(pivot), axis, ang * f))) if a not in closed) for f in (0.08, 0.2, 0.4, 0.65, 1.0))
sign = 1 if q.axis.z > 0 else -1
ANG = q.angle * sign
res = []
for x, y, z, ay, ax in itertools.product([-1.10, -1.04, -0.98], [0.70, 0.80, 0.90], [0.86, 0.93], [-0.3, -0.55, -0.8], [-0.25, 0.0, 0.25]):
    axis = Vector((ax, ay, 1)).normalized()
    c = clash((x, y, z), axis, ANG); res.append((c, x, y, z, ay, ax)); print('cand', res[-1], flush=True)
print('ANG', ANG)
print('BEST', sorted(res)[:12])
