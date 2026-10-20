"""Tourbillon door clean-up: put loose islands on the right side of the door split, drop orphan fragments.

The door assemblies were split from a static CSR2 model by heuristics; when the doors open, small pieces that
belong to the body ride along (and float), body pieces hidden inside the closed door stay behind, and a few
fragments are attached to nothing. Rules, per connected island (closed doors, car coordinates):
  * door island attached to no other door geometry (< 30 % of its vertices within 4 mm of the rest of the door):
      - lies on the body (>= 50 % within 15 mm of body surfaces)  -> move to the body
      - otherwise                                                -> delete
  * body island lying on the door (>= 50 % within 12 mm) but on no other body geometry (< 25 %) -> move to the door
  * only in the front corner around the hinge (x < -0.85 for 70 % of a cluster), small islands that touch each other are judged as one cluster
Then the trim cut and the hidden front sheets are cleaned up, and the paint skin and the return around the door edge are
repaired (door_skin.py): no cracks, holes, saw-tooth hem or return showing through the paint.
Usage: blender --background --python tools/blender-hinges/clean_bugatti_doors.py -- <checkout> preview|export [out.glb]
The site model is the export compressed with tools/compress-glb.mjs into public/models/bugatti-tourbillon-web.glb.
"""
import sys, os, math, bmesh
sys.path.insert(0, os.path.dirname(__file__))
from common import *
from door_skin import weld, fill_small_holes, fill_notches, tuck_under
from mathutils.bvhtree import BVHTree
OUT = os.environ.get('HINGE_OUT', os.path.join(os.path.dirname(__file__), 'out'))
mode = ARGS[0]
load('bugatti-tourbillon-door-fit-v4.glb')
doors = {1: bpy.data.objects['Tourbillon_door_1'], -1: bpy.data.objects['Tourbillon_door_0']}
root = doors[1].parent
mounting = [o for o in bpy.data.objects if 'mounting' in o.name]
for o in mounting: bpy.data.objects.remove(o, do_unlink=True)
dmesh = {s: meshes_under(d) for s, d in doors.items()}
alld = set(dmesh[1]) | set(dmesh[-1])
body = [o for o in bpy.data.objects if o.type == 'MESH' and o not in alld and 'wheel' not in o.name.lower()]


def islands(o):
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
    seen, out = set(), []
    for f in bm.faces:
        if f.index in seen: continue
        stack, comp = [f], []; seen.add(f.index)
        while stack:
            g = stack.pop(); comp.append(g.index)
            for v in g.verts:
                for h in v.link_faces:
                    if h.index not in seen: seen.add(h.index); stack.append(h)
        out.append(comp)
    bm.free(); return out


def tree_of(items):
    """BVH over (object, faces) islands; returns tree and per-triangle island id."""
    verts, polys, owner = [], [], []
    for k, (o, comp) in enumerate(items):
        m = o.matrix_world
        for fi in comp:
            p = o.data.polygons[fi]; base = len(verts)
            verts += [m @ o.data.vertices[i].co for i in p.vertices]; polys.append(list(range(base, base + len(p.vertices)))); owner.append(k)
    return BVHTree.FromPolygons(verts, polys), owner


def island_points(o, comp, step=1):
    vs = sorted({i for fi in comp for i in o.data.polygons[fi].vertices})[::step]
    return [o.matrix_world @ o.data.vertices[i].co for i in vs]


def frac_other(pts, tree, owner, me, d):
    hit = 0
    for p in pts:
        if any(owner[i] != me for loc, n, i, dist in tree.find_nearest_range(p, d)): hit += 1
    return hit / len(pts)


body_tree = bvh_for(body)
moves = []   # (obj, comp, 'body' | side | 'delete')
for s in (1, -1):
    items = [(o, c) for o in dmesh[s] for c in islands(o)]
    small = [k for k, (o, c) in enumerate(items) if len(c) <= 300]
    main = [items[k] for k in range(len(items)) if k not in set(small)]
    main_tree = tree_of(main)[0]
    small_tree, small_owner = tree_of([items[k] for k in small])
    pts = {k: island_points(*items[k], max(1, len(items[k][1]) // 40)) for k in small}
    # small islands touching each other form clusters; a cluster belongs to the door only if it touches the main door
    parent = {k: k for k in small}
    def find(k):
        while parent[k] != k: parent[k] = parent[parent[k]]; k = parent[k]
        return k
    for j, k in enumerate(small):
        for p in pts[k]:
            for loc, n, i, d in small_tree.find_nearest_range(p, .004):
                other = small[small_owner[i]]
                if other != k: parent[find(other)] = find(k)
    clusters = {}
    for k in small: clusters.setdefault(find(k), []).append(k)
    for members in clusters.values():
        allpts = [p for k in members for p in pts[k]]
        # only the front corner around the hinge, which the closed door tucks under the fender
        if sum(1 for p in allpts if bt(p).x < -0.85) / len(allpts) < .7: continue
        attached = sum(1 for p in allpts if main_tree.find_nearest_range(p, .004)) / len(allpts)
        if attached >= .3: continue
        on_body = sum(1 for p in allpts if (body_tree.find_nearest(p)[3] or 1) < .015) / len(allpts)
        for k in members: moves.append((items[k][0], items[k][1], 'body' if on_body >= .5 else 'delete'))
items = [(o, c) for o in body for c in islands(o) if len(c) <= 300]
door_tree = {s: bvh_for(dmesh[s]) for s in (1, -1)}
bt_all, bowner = tree_of([(o, c) for o in body for c in islands(o)])
index = {}
k = 0
for o in body:
    for c in islands(o): index[(o.name, c[0])] = k; k += 1
for o, comp in items:
    pts = island_points(o, comp, max(1, len(comp) // 40))
    s = 1 if sum(bt(p).z for p in pts) > 0 else -1
    on_door = sum(1 for p in pts if (door_tree[s].find_nearest(p)[3] or 1) < .012) / len(pts)
    if on_door < .5: continue
    if frac_other(pts, bt_all, bowner, index[(o.name, comp[0])], .012) < .25: moves.append((o, comp, s))
summary = {}
for o, comp, dest in moves: summary[str(dest)] = summary.get(str(dest), 0) + len(comp)
print('MOVES', len(moves), summary)

by_obj = {}
for o, comp, dest in moves: by_obj.setdefault(o, []).append((comp, dest))
created = []
for o, groups in by_obj.items():
    for j, (comp, dest) in enumerate(groups):
        if dest == 'delete': continue
        keep = set(comp); bm = bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context='FACES')
        tag = 'body' if dest == 'body' else ('door1' if dest == 1 else 'door0')
        me = bpy.data.meshes.new('m'); bm.to_mesh(me); bm.free()
        for mt in o.data.materials: me.materials.append(mt)
        n = bpy.data.objects.new(f'{tag} • reassigned {o.name.split("• ")[-1]} {j}', me); bpy.context.scene.collection.objects.link(n)
        n.matrix_world = o.matrix_world.copy(); target = root if dest == 'body' else doors[dest]
        w = n.matrix_world.copy(); n.parent = target; n.matrix_world = w
        created.append((n, dest))
    dead = {fi for comp, _ in groups for fi in comp}
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.faces[i] for i in dead], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(o.data); bm.free()

# The inner door trim was cut from the A-pillar trim along a saw-tooth line, and loose strips of the window-frame trim
# hang above it; when the door opens they read as torn sheets. Around the cut (seeded by points on it, closed door,
# door1 side; door0 is the exact mirror): erode the teeth (boundary triangles with 2+ open edges), drop the faces above
# the sill line connected to the cut, then the small loose strips left in the same corner.
TRIM_CUT = [(-0.655, 0.7582, 0.76), (-0.71, 0.7687, 0.731), (-0.7161, 0.7022, 0.765), (-0.4995, 0.9167, 0.6777),
            (-0.5669, 0.7744, 0.7512), (-0.7404, 0.7783, 0.7174), (-0.4928, 0.7687, 0.7632), (-0.5377, 0.8616, 0.7142)]
SILL_Y = .86
STRIP_BOX = ((-.62, -.46), (.78, .99), (.63, .79))


def trim_cut_edge(o, s):
    m = o.matrix_world; tree = bvh_for([o])
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
    zone = {tree.find_nearest(tb((x, y, s * z)))[2] for x, y, z in TRIM_CUT}; ring = set(zone)
    for _ in range(8):
        ring = {h.index for fi in ring for e in bm.faces[fi].edges for h in e.link_faces if h.index not in zone}; zone |= ring
    faces = {bm.faces[i] for i in zone}; teeth = 0
    for _ in range(3):
        ears = [f for f in faces if f.is_valid and sum(1 for e in f.edges if len(e.link_faces) == 1) >= 2]
        if not ears: break
        bmesh.ops.delete(bm, geom=ears, context='FACES'); teeth += len(ears); faces = {f for f in faces if f.is_valid}
    up = lambda f: bt(m @ f.calc_center_median()).y > SILL_Y
    above = {f for f in faces if up(f)}; stack = list(above)
    while stack:
        for e in stack.pop().edges:
            for h in e.link_faces:
                if h not in above and up(h): above.add(h); stack.append(h)
    bmesh.ops.delete(bm, geom=list(above), context='FACES')
    seen, strips = set(), []
    for f in bm.faces:
        if f in seen: continue
        comp, stack = [f], [f]; seen.add(f)
        while stack:
            for e in stack.pop().edges:
                for h in e.link_faces:
                    if h not in seen: seen.add(h); comp.append(h); stack.append(h)
        if len(comp) <= 80 and all(lo <= c <= hi for v in {v for g in comp for v in g.verts}
                                   for c, (lo, hi) in zip(bt(m @ v.co) * Vector((1, 1, s)), STRIP_BOX)):
            strips += comp
    bmesh.ops.delete(bm, geom=strips, context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(o.data); bm.free()
    print('TRIM', o.name, 'teeth', teeth, 'above sill', len(above), 'loose strips', len(strips))


for s, d in doors.items():
    trim_cut_edge(bpy.data.objects[f'{"door1" if s == 1 else "door0"} • InteriorA_Material1'], s)

# Ahead of the shut line the doors carry thin sheets of A-pillar and fender structure that the split gave them. Closed,
# they sit under the fender and nobody sees them; open, they stick out of the door's front end as torn sheets. Drop
# every door face ahead of FRONT_X that no viewpoint around the car or in the cabin can see with the doors closed
# (the fitted return surface around the door edge stays).
FRONT_X = -0.88


def drop_hidden_front():
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get(); sc = bpy.context.scene
    cabin = [(x, 0.95, z) for x in (-0.4, 0.0, 0.4) for z in (-0.35, 0.0, 0.35)]
    for s, d in doors.items():
        ring = [(-1.0 + 3.0 * math.cos(a), 0.4 + h, s * 3.0 * math.sin(a)) for a in [i * math.pi / 12 for i in range(13)] for h in (0.2, 1.0, 2.2)]
        views = [tb(v) for v in ring + cabin]
        for o in meshes_under(d):
            if 'glass' in o.name or 'perimeter' in o.name: continue
            m = o.matrix_world; hidden = []
            for p in o.data.polygons:
                c = m @ p.center
                if bt(c).x >= FRONT_X: continue
                seen = False
                for v in views:
                    ray = c - v; dist = ray.length; ray.normalize()
                    hit, loc, n, fi, ob, mx = sc.ray_cast(dg, v, ray, distance=dist + .002)
                    if hit and ob == o and fi == p.index: seen = True; break
                if not seen: hidden.append(p.index)
            if not hidden: continue
            bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
            bmesh.ops.delete(bm, geom=[bm.faces[i] for i in hidden], context='FACES')
            bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
            bm.to_mesh(o.data); bm.free()
            print('HIDDEN FRONT', o.name, len(hidden))


drop_hidden_front()

# The paint skin itself came out of the split with cracks (duplicate vertices), small holes and a saw-tooth hem, and the
# fitted return around the door edge is much coarser than the skin: at the front-top corner and in the sculpted channel at
# the rear-bottom it cuts through the curved paint, which reads as dark jagged patches and voids on the panel. A leaf-shaped
# scrap of B-pillar carbon also sticks out of the rear shut face beside the latch. Repairs: door_skin.py.
LATCH_BOX = ((.03, .19), (.30, .58), (.80, .94))   # rear shut face around the latch (x, y, |z|), closed door
LEAF_EXTENT = .10   # the leaf is a 38-face sheet ~19 cm long; the latch housing beside it (36 faces) spans 5 cm


def repair_skin():
    for s in doors:
        tag = 'door1' if s == 1 else 'door0'
        paint = bpy.data.objects[f'{tag} • Paint_Material1']
        welded, holes, notches = weld(paint), fill_small_holes(paint), 0
        for _ in range(8):   # a closed notch can expose the next pair of teeth
            n = fill_notches(paint, .05); notches += n
            if not n: break
        carbon = bpy.data.objects[f'{tag} • Carbon1_Material1']; m = carbon.matrix_world
        def scrap(comp):
            pts = [bt(m @ carbon.data.vertices[i].co) * Vector((1, 1, s)) for i in {i for fi in comp for i in carbon.data.polygons[fi].vertices}]
            inside = all(lo <= c <= hi for p in pts for c, (lo, hi) in zip(p, LATCH_BOX))
            extent = max((a - b).length for a in pts for b in pts)
            return len(comp) <= 40 and inside and extent > LEAF_EXTENT
        leaf = [fi for comp in islands(carbon) if scrap(comp) for fi in comp]
        bm = bmesh.new(); bm.from_mesh(carbon.data); bm.faces.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[bm.faces[i] for i in leaf], context='FACES')
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        bm.to_mesh(carbon.data); bm.free()
        tuck = tuck_under(bpy.data.objects[f'{tag} • fitted inner perimeter'], paint)
        print('SKIN', tag, 'welded', welded, 'hole faces', holes, 'notch faces', notches, 'leaf faces', len(leaf), 'return', tuck)


repair_skin()

if mode == 'preview':
    for n, dest in created:
        n.data.materials.clear(); m = bpy.data.materials.new('hl'); m.diffuse_color = (1, .15, .1, 1) if dest == 'body' else (.1, .4, 1, 1); n.data.materials.append(m)
    sc = bpy.context.scene; setup_render((900, 700), 8)
    sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'MATERIAL'; sc.display.shading.show_cavity = True
    cam = sc.camera

    def shots(views):
        for name, eye, tgt, lens in views:
            e, t = tb(eye), tb(tgt); cam.location = e; cam.rotation_euler = (t - e).to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = lens; cam.data.clip_start = .005
            sc.render.filepath = f'{OUT}/clean_{name}.png'; bpy.ops.render.render(write_still=True)
    # the trim cut seen from the driver's seat with the doors closed, both sides
    shots((('closed_drv1', (0.10, 1.00, 0.30), (-0.85, 0.95, 0.85), 30), ('closed_drv0', (0.10, 1.00, -0.30), (-0.85, 0.95, -0.85), 30)))
    for s, d in doors.items():
        d.matrix_world = three_rotation_about(Vector((-1.10, 0.78, s * 0.92)), Vector((0, -s * .55, 1)).normalized(), 1.13) @ d.matrix_world
    bpy.context.view_layer.update()
    shots((('rear_in', (0.6, 1.25, 1.5), (-0.6, 1.0, 0.85), 26), ('rear_zoom', (0.2, 1.1, 1.45), (-0.75, 1.05, 0.88), 40),
           ('rear_zoom0', (0.2, 1.1, -1.45), (-0.75, 1.05, -0.88), 40),
           ('in_low', (-0.30, 0.65, 0.40), (-0.95, 0.65, 0.95), 22), ('below', (-0.6, 0.2, 1.4), (-0.95, 0.9, 0.92), 30)))
else:
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.context.scene.objects:
        if o.type in ('MESH', 'EMPTY'): o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=ARGS[1], export_format='GLB', export_yup=True, export_materials='EXPORT',
                              export_animations=False, export_extras=True, use_selection=True)
    print('EXPORTED', ARGS[1], os.path.getsize(ARGS[1]))
