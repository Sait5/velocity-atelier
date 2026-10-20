"""Repairs for door panels split out of a static model (used by clean_bugatti_doors.py).

The Tourbillon doors were cut from a static CSR2 body by triangle selection, so their paint skin carries cracks (coincident
duplicate vertices), small holes and a saw-tooth hem, and the fitted return around the door edge (built for the cut, much
coarser than the skin) cuts through the curved skin in places: from outside it shows as dark jagged patches on the paint.

  weld(obj)               merge the duplicate vertices of the cracks
  fill_small_holes(obj)   close small closed holes (also holes touching the rim at a single vertex)
  fill_notches(obj)       close the notches between saw-tooth tips so the hem runs straight from tip to tip
  tuck_under(obj, skin)   refine the return where it stands proud of the skin and pull it just under the skin

New faces take the winding of the surface they close and the UVs and corner normals of the faces around them, so the
panel keeps its texture and shading. Everything works in world space; callers pass Blender objects.
"""
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree


def boundary_loops(bm):
    """Open-boundary vertex chains; a closed chain ends with its first vertex."""
    seen, loops = set(), []
    for e0 in [e for e in bm.edges if len(e.link_faces) == 1]:
        if e0 in seen: continue
        v0, v = e0.verts; chain = [v0]; e = e0; seen.add(e0)
        while True:
            chain.append(v)
            nxt = [x for x in v.link_edges if x is not e and len(x.link_faces) == 1 and x not in seen]
            if not nxt: break
            e = nxt[0]; seen.add(e); v = e.other_vert(v)
            if v is v0: chain.append(v0); break
        loops.append(chain)
    return loops


def pinched(chain):
    """Split a closed boundary chain at vertices it passes twice (holes touching the rim at one vertex)."""
    out, stack, changed = [], list(chain[:-1]), True
    while changed:
        changed, first = False, {}
        for i, v in enumerate(stack):
            if v in first:
                j = first[v]; out.append(stack[j:i] + [v]); stack = stack[:j] + stack[i:]; changed = True; break
            first[v] = i
    out.append(stack + [stack[0]])
    return out


def orient_like_neighbours(new_faces):
    """Across a shared edge two consistently wound faces run the edge in opposite directions; spread that from the
    existing faces into the new ones."""
    new, done = set(new_faces), set()
    runs = lambda f, a, b: any(l.vert is a and l.link_loop_next.vert is b for l in f.loops)
    for _ in range(len(new) + 1):
        progress = False
        for f in new - done:
            for e in f.edges:
                g = next((h for h in e.link_faces if h is not f and (h not in new or h in done)), None)
                if g is None: continue
                a, b = e.verts
                if runs(f, a, b) == runs(g, a, b): f.normal_flip()
                done.add(f); progress = True; break
        if not progress: break


def corner_normals(me):
    """Shading normal of every face corner, whatever domain the mesh keeps its normals in (an edited mesh without custom
    normals reports them per vertex or per face)."""
    cn = me.corner_normals
    if len(cn) == len(me.loops): return [c.vector.copy() for c in cn]
    if me.normals_domain == 'POINT': return [me.vertices[l.vertex_index].normal.copy() for l in me.loops]
    out = [None] * len(me.loops)
    for p in me.polygons:
        for li in p.loop_indices: out[li] = p.normal.copy()
    return out


def _add_faces(obj, build):
    """Run build(bm) -> new bmesh faces (n-gons), triangulate and orient them, then give their corners the UV and corner
    normal of the most similar existing face at each vertex. Returns the number of triangles added."""
    me = obj.data; uv = me.uv_layers.active; cn = corner_normals(me)
    corner = {}
    for p in me.polygons:
        for li, vi in zip(p.loop_indices, p.vertices):
            corner.setdefault(vi, []).append((p.normal.copy(), cn[li], uv.data[li].uv.copy() if uv else None))
    old_loops = list(cn)
    old_faces = len(me.polygons)
    bm = bmesh.new(); bm.from_mesh(me)
    new = build(bm)
    if not new: bm.free(); return 0
    faces = bmesh.ops.triangulate(bm, faces=new)['faces']
    orient_like_neighbours(faces)
    bm.normal_update(); bm.to_mesh(me); bm.free()
    uv = me.uv_layers.active   # to_mesh rebuilds the layer
    normals = list(old_loops)
    for p in me.polygons[old_faces:]:
        for li, vi in zip(p.loop_indices, p.vertices):
            cands = corner.get(vi, []); best = max(cands, key=lambda c: c[0].dot(p.normal)) if cands else None
            normals.append(best[1] if best else p.normal.copy())
            if uv and best and best[2] is not None: uv.data[li].uv = best[2]
    me.normals_split_custom_set(normals)
    return len(faces)


def weld(obj, dist=.0003):
    """Merge coincident vertices (cracks left where a surface was split); corner normals stay per face corner."""
    me = obj.data
    normals = corner_normals(me)
    bm = bmesh.new(); bm.from_mesh(me); before = len(bm.verts)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=dist)
    after = len(bm.verts); bm.to_mesh(me); bm.free()
    # remove_doubles keeps faces and their corner order, so the per-corner normals still line up
    if len(me.loops) == len(normals): me.normals_split_custom_set(normals)
    return before - after


def fill_small_holes(obj, max_edges=60, max_span=.12):
    """Close the small holes of a skin: closed boundary loops (split at pinch vertices) that are short and compact."""
    m = obj.matrix_world
    def build(bm):
        new = []
        for chain in [c for loop in boundary_loops(bm) if loop[0] is loop[-1] for c in pinched(loop)]:
            if len(chain) - 1 > max_edges or len(chain) < 4: continue
            pts = [m @ v.co for v in chain[:-1]]
            if max((a - b).length for a in pts for b in pts) > max_span: continue
            try: new.append(bm.faces.new(chain[:-1]))
            except ValueError: pass
        return new
    return _add_faces(obj, build)


def fill_notches(obj, max_span=.05, max_chain=12, keep=lambda pts: True):
    """Close the saw-tooth notches of the open boundary: between consecutive tooth tips (both boundary edges of a vertex on
    one face) the chain is closed by new faces, so the edge runs straight from tip to tip."""
    m = obj.matrix_world
    def build(bm):
        new = []
        for chain in boundary_loops(bm):
            closed = chain[0] is chain[-1]
            if closed: chain = chain[:-1]
            n = len(chain)
            if n < 4: continue
            def tip(i):
                e1 = bm.edges.get((chain[i - 1], chain[i])); e2 = bm.edges.get((chain[i], chain[(i + 1) % n]))
                return e1 and e2 and e1.link_faces and e2.link_faces and e1.link_faces[0] is e2.link_faces[0]
            tips = [i for i in range(n) if tip(i)]
            for k in range(len(tips) - (0 if closed else 1)):
                i, j = tips[k], tips[(k + 1) % len(tips)]
                span = (j - i) % n
                if span < 2 or span > max_chain: continue
                verts = [chain[(i + s) % n] for s in range(span + 1)]
                if (m @ verts[0].co - m @ verts[-1].co).length > max_span or not keep([m @ v.co for v in verts]): continue
                try: new.append(bm.faces.new(verts))
                except ValueError: pass
        return new
    return _add_faces(obj, build)


SAMPLES = [(a / 6, b / 6, 1 - a / 6 - b / 6) for a in range(7) for b in range(7 - a)]


class Skin:
    """World-space lookup on a skin mesh: nearest surface point, and whether that point lies on the skin's open edge."""
    def __init__(self, obj):
        m = obj.matrix_world; me = obj.data
        self.bvh = BVHTree.FromPolygons([m @ v.co for v in me.vertices], [list(p.vertices) for p in me.polygons])
        bm = bmesh.new(); bm.from_mesh(me); pts = []
        for e in bm.edges:
            if len(e.link_faces) != 1: continue
            a, b = m @ e.verts[0].co, m @ e.verts[1].co; k = max(1, int((a - b).length / .0002))
            pts += [a.lerp(b, i / k) for i in range(k + 1)]
        bm.free()
        self.rim = KDTree(len(pts))
        for i, p in enumerate(pts): self.rim.insert(p, i)
        self.rim.balance()

    def over(self, q, reach):
        """Signed height of q over the skin when q lies over the skin itself (not past its open edge) within reach, else None."""
        loc, n, fi, d = self.bvh.find_nearest(q)
        if loc is None or d > reach or self.rim.find(loc)[2] < .0002: return None
        return (q - loc).dot(n)


def face_samples(m, f):
    vs = [m @ v.co for v in f.verts]
    return [a * u + b * v + c * w for a, b, c in [(vs[0], vs[i], vs[i + 1]) for i in range(1, len(vs) - 1)] for u, v, w in SAMPLES]


def poking_faces(bm, m, skin, tol=.0003, reach=.02):
    """Faces whose interior stands proud of the outer face of the skin by more than tol."""
    return [f for f in bm.faces if max((h for h in (skin.over(q, reach) for q in face_samples(m, f)) if h is not None), default=0) > tol]


def push_under(bm, m, skin, faces, depth, reach):
    """Move the vertices of `faces` that are not yet `depth` under the skin down to that depth; spread each push over three
    rings of neighbours with falloff, so the panel bends under the skin smoothly instead of rumpling. The panel's own open
    edge (where it meets the skin edge) stays put."""
    mi = m.inverted(); need = {}
    for v in {v for f in faces for v in f.verts}:
        w = m @ v.co; h = skin.over(w, reach)
        if h is None or h <= -depth: continue
        loc, n, fi, d = skin.bvh.find_nearest(w); need[v] = loc - n * depth - w
    disp = dict(need); ring = set(need)
    for _ in range(3):
        ring = {u for v in ring for e in v.link_edges for u in [e.other_vert(v)] if u not in disp and not u.is_boundary}
        step = {}
        for u in ring:
            nb = [disp[e.other_vert(u)] for e in u.link_edges if e.other_vert(u) in disp]
            step[u] = sum(nb, Vector()) / len(nb) * .55
        disp.update(step)
    for v, dv in disp.items(): v.co = mi @ (m @ v.co + dv)
    return len(need)


def tuck_under(obj, skin_obj, depth=.0015, rounds=4, reach=.02):
    """Where a coarse panel (the fitted return around the door edge) cuts through a curved skin, refine its faces and pull
    their vertices under the skin, so the skin covers it from outside while it still closes the gap from inside. Faces that
    still stand proud in tight folds and lie over the skin all over are dropped: the skin already covers them. Faces lying
    on the skin within a fraction of a millimetre are left to the renderer's depth offset (tourbillon.ts)."""
    skin = Skin(skin_obj); me = obj.data; m = obj.matrix_world
    bm = bmesh.new(); bm.from_mesh(me); moved = refined = 0
    for _ in range(rounds):
        bad = poking_faces(bm, m, skin, reach=reach)
        if not bad: break
        edges = list({e for f in bad for e in f.edges if (m @ e.verts[0].co - m @ e.verts[1].co).length > .012})
        if edges:
            bmesh.ops.subdivide_edges(bm, edges=edges, cuts=1, use_grid_fill=True)
            bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3]); refined += len(edges)
            bad = poking_faces(bm, m, skin, reach=reach)
        moved += push_under(bm, m, skin, bad, depth, reach)
    covered = [f for f in poking_faces(bm, m, skin, reach=reach) if all(skin.over(q, reach) is not None for q in face_samples(m, f))]
    bmesh.ops.delete(bm, geom=covered, context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    left = len(poking_faces(bm, m, skin, reach=reach))
    bm.normal_update(); bm.to_mesh(me); bm.free(); me.update()
    return {'refined edges': refined, 'pushed': moved, 'dropped': len(covered), 'still proud': left}
