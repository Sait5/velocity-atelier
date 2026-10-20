import sys, os, itertools
sys.path.insert(0, os.path.dirname(__file__))
from revuelto_common import *

root, doors = setup_revuelto()
door = doors[1]
dset = set(doors[1]) | set(doors[-1])
body = [o for o in bpy.data.objects if o.type == 'MESH' and o not in dset and 'Glass' not in o.name and 'Piston' not in o.name and o.visible_get()]
# door front edge profile
pts = [bt(o.matrix_world @ v.co) for o in door for v in o.data.vertices]
for y in [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]:
    band = [p for p in pts if abs(p.y - y) < .015]
    if band:
        f = min(band, key=lambda p: p.x); print(f'door front y={y}: x={f.x:.3f} z={f.z:.3f}')
# pistons (native strut) in car coords
for n in ('DoorJambLFPistonLower_PaintedMetal', 'DoorJambLFPistonUpper_PaintedMetal'):
    o = bpy.data.objects[n]; ps = [bt(o.matrix_world @ v.co) for v in o.data.vertices]
    print(n, [round(min(p[k] for p in ps), 3) for k in range(3)], [round(max(p[k] for p in ps), 3) for k in range(3)])

verts, polys = [], []
for o in body:
    m = o.matrix_world; base = len(verts); vs = [m @ v.co for v in o.data.vertices]; verts += vs
    for p in o.data.polygons:
        c = bt(sum((vs[i] for i in p.vertices), Vector()) / len(p.vertices))
        if c.z > 0.4 and -1.6 < c.x < 0.6: polys.append([base + i for i in p.vertices])
bb = BVHTree.FromPolygons(verts, polys)
rest = {o: o.matrix_world.copy() for o in door}
def dbvh(M): return bvh_for(door, M)
closed = set(a for a, b in bb.overlap(dbvh(Matrix.Identity(4))))
print('closed contacts', len(closed))
def clash(pivot, axis, ang=1.30):
    n = 0
    for f in (0.08, 0.2, 0.4, 0.65, 1.0):
        n += sum(1 for a, b in bb.overlap(dbvh(three_rotation_about(Vector(pivot), axis, ang * f))) if a not in closed)
    return n
print('current axis', clash((-.80, .98, .86), Vector((.035, -.55, 1)).normalized(), 1.22))
res = []
for x, y, z, ty, tx, ang in itertools.product([-0.985, -0.97, -0.955], [0.67, 0.70, 0.73], [0.89, 0.93], [0.0, -0.3, -0.55], [0.0, 0.12], [1.22]):
    axis = Vector((tx, ty, 1)).normalized()
    c = clash((x, y, z), axis, ang); res.append((c, x, y, z, ty, tx)); print('cand', res[-1], flush=True)
print('BEST', sorted(res)[:12])
