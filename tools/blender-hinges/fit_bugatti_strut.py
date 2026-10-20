"""Pick gas-strut anchors for the Tourbillon door: body pin on the A-pillar inside the aperture, door pin on the door's front structure."""
import sys, os, random
sys.path.insert(0, os.path.dirname(__file__))
from common import *
load('bugatti-tourbillon-door-fit-v4.glb')
for o in list(bpy.data.objects):
    if 'mounting' in o.name: bpy.data.objects.remove(o, do_unlink=True)
door = bpy.data.objects['Tourbillon_door_1']
dm = meshes_under(door)
alld = set(dm) | set(meshes_under(bpy.data.objects['Tourbillon_door_0']))
body = [o for o in bpy.data.objects if o.type == 'MESH' and o not in alld and 'wheel' not in o.name.lower()]
bb, db = bvh_for(body), bvh_for(dm)
P = Vector((-1.10, 0.78, 0.92)); AXIS = Vector((0, -.55, 1)).normalized(); OPEN = 1.13
X = lambda v: tb(v) - tb((0, 0, 0))
# candidate surface points
bodyC = [bt(o.matrix_world @ v.co) for o in body for v in o.data.vertices]
bodyC = [p for p in bodyC if -1.05 < p.x < -0.80 and 0.30 < p.y < 0.62 and 0.72 < p.z < 0.90]
doorC = [bt(o.matrix_world @ v.co) for o in dm for v in o.data.vertices]
doorC = [p for p in doorC if p.x < -0.80 and 0.45 < p.y < 0.80 and 0.78 < p.z < 0.97]
random.seed(1); bodyC = random.sample(bodyC, min(400, len(bodyC))); doorC = random.sample(doorC, min(400, len(doorC)))
print('candidates', len(bodyC), len(doorC))
mats = [three_rotation_about(P, AXIS, OPEN * f) for f in (0, .25, .5, .75, 1)]
def blocked(a, b):
    d = b - a; L = d.length; d /= L; n = 0
    for tree in (bb,):
        o = tb(a + d * .01); h = tree.ray_cast(o, X(d), L - .02)
        if h[0]: n += 1
    return n
best = []
for B0 in bodyC:
    for D0 in random.sample(doorC, 60):
        Ds = [bt(M @ tb(D0)) for M in mats]
        Ls = [(D - B0).length for D in Ds]
        if not (.22 < Ls[0] < .40): continue
        if max(Ls) / min(Ls) > 1.75: continue
        # segment must not pass through the body; through the door only at the very ends
        if any(blocked(B0, D) for D in Ds): continue
        dbs = 0
        for M, D in zip(mats, Ds):
            tree = bvh_for(dm, M); d = (D - B0); L = d.length; d /= L
            h = tree.ray_cast(tb(B0 + d * .01), X(d), L - .03)
            if h[0]: dbs += 1
        if dbs: continue
        best.append((max(Ls) / min(Ls), tuple(round(c, 3) for c in B0), tuple(round(c, 3) for c in D0), [round(l, 3) for l in Ls]))
    if len(best) > 25: break
best.sort()
for b in best[:10]: print('OK', b)
print('found', len(best))
