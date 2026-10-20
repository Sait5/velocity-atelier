"""Save an editable .blend per car: the site model, the hinge hardware and animated doors (frames 1-60 open, 61-100 open, 101-150 close).

Usage: blender --background --python tools/blender-hinges/export_blend.py -- <checkout> <ferrari|porsche|revuelto|bugatti|mclaren|valhalla|amg|jesko> <out.blend>
Each door hangs from an empty 'Hinge axis ...' placed on the real hinge axis (its local Z is the axis); struts and
check straps use Damped Track constraints, the same aiming the site does every frame.
"""
import sys, os, math, mathutils
sys.path.insert(0, os.path.dirname(__file__))
from common import *

car, out = ARGS[0], ARGS[1]
coll = lambda: bpy.context.scene.collection


def empty(name, loc3, axis3=None, parent=None, size=.05):
    e = bpy.data.objects.new(name, None); e.empty_display_size = size; e.empty_display_type = 'ARROWS'
    coll().objects.link(e)
    m = Matrix.Translation(tb(loc3))
    if axis3 is not None:
        m = m @ (tb(axis3) - tb((0, 0, 0))).normalized().to_track_quat('Z', 'Y').to_matrix().to_4x4()
    e.matrix_world = m
    if parent: keep_parent(e, parent)
    return e


def keep_parent(o, parent):
    bpy.context.view_layer.update()
    w = o.matrix_world.copy(); o.parent = parent; o.matrix_world = w


def hinge(name, pivot3, axis3, angle, objects):
    """Door objects swing about pivot/axis; returns the rotating empty."""
    base = empty(f'Hinge axis {name}', pivot3, axis3, size=.12)
    rot = bpy.data.objects.new(f'Hinge rotation {name}', None); rot.empty_display_size = .08; coll().objects.link(rot)
    rot.parent = base
    for o in objects: keep_parent(o, rot)
    for frame, a in ((1, 0), (60, angle), (100, angle), (150, 0)):
        rot.rotation_euler = (0, 0, a); rot.keyframe_insert('rotation_euler', frame=frame)
    return rot


def viewport_colours():
    # Solid viewport colours: the game materials carry none, so Blender drew black rubber and dark leather pale grey and
    # every seal and trim edge looked like a white shard. Each material gets its real colour (textured ones the mean of
    # their texture times the base colour).
    for m in bpy.data.materials:
        if not m.use_nodes or not m.node_tree: continue
        b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not b: continue
        col = list(b.inputs['Base Color'].default_value[:3])
        link = b.inputs['Base Color'].links[0].from_node if b.inputs['Base Color'].is_linked else None
        while link is not None and link.type != 'TEX_IMAGE':
            link = next((i.links[0].from_node for i in link.inputs if i.is_linked), None)
        if link is not None and link.image:
            small = link.image.copy(); small.scale(32, 32); px = list(small.pixels)
            n = len(px) // 4; mean = [sum(px[i::4][:n]) / max(1, n) for i in range(3)]
            bpy.data.images.remove(small)
            # texture colours are sRGB: back to linear for the viewport colour
            col = [(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4) for c in mean]
        m.diffuse_color = (*col, 1)


def track(o, target):
    c = o.constraints.new('DAMPED_TRACK'); c.target = target; c.track_axis = 'TRACK_X'


def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


def parents(o):
    while o.parent:
        o = o.parent; yield o


def remove_loose(objs, boxes, max_faces):
    """Delete whole small islands lying inside one of the boxes (car coordinates, |z|): native hardware the
    Blender-built hinges replace (same rule as removeLooseHardware on the site)."""
    import bmesh
    for o in objs:
        m = o.matrix_world; bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table(); seen, kill = set(), []
        for f in bm.faces:
            if f in seen: continue
            st, comp = [f], [f]; seen.add(f)
            while st:
                for v in st.pop().verts:
                    for h in v.link_faces:
                        if h not in seen: seen.add(h); comp.append(h); st.append(h)
            pts = [bt(m @ v.co) for g in comp for v in g.verts]
            if len(comp) < max_faces and any(all(b[0] <= p.x <= b[1] and b[2] <= p.y <= b[3] and b[4] <= abs(p.z) <= b[5] for p in pts) for b in boxes):
                kill += comp
        bmesh.ops.delete(bm, geom=kill, context='FACES'); bm.to_mesh(o.data); bm.free()


def black_hinges(objs):
    """The site paints the Blender-built hinges black e-coat instead of body colour."""
    black = bpy.data.materials.new('Hinge black e-coat'); black.diffuse_color = (.006, .007, .008, 1)
    black.use_nodes = True; bsdf = black.node_tree.nodes.get('Principled BSDF')
    if bsdf: bsdf.inputs['Base Color'].default_value = (.006, .007, .008, 1); bsdf.inputs['Metallic'].default_value = .35; bsdf.inputs['Roughness'].default_value = .42
    for o in objs:
        if o.type == 'MESH':
            for slot in o.material_slots:
                if slot.material and slot.material.name.startswith('carpaint'): slot.material = black


models = ROOT + '/public/models/'
if car == 'ferrari':
    load('ferrari-italia-complete.glb')
    import bmesh
    body = bpy.data.objects['fer_f142_10_s_lod0_body_body__carpaint_0']
    arms = [(-.708, -.686, .262, .300, .866, .912), (-.708, -.686, .608, .646, .866, .912)]
    bm = bmesh.new(); bm.from_mesh(body.data); mw = body.matrix_world
    dead = [f for f in bm.faces if any(all(r[0] < p.x < r[1] and r[2] < p.y < r[3] and r[4] < abs(p.z) < r[5] for p in [bt(mw @ v.co) for v in f.verts]) for r in arms)]
    bmesh.ops.delete(bm, geom=dead, context='FACES'); bm.to_mesh(body.data); bm.free()
    # the unused native door check, cut out on the site as well (sideDoorConnections.retiredItaliaHardware)
    for name, r in (('fer_f142_10_s_lod0_body_body__carpaint_0', (-.614, -.587, .503, .533, .880, .906)),
                    ('fer_f142_10_s_lod0_body_metal__emblem_0', (-.665, -.587, .520, .535, .807, .905)),
                    ('fer_f142_10_s_lod0_body_rubber_trim__rubber_0', (-.623, -.598, .504, .526, .865, .892))):
        o = bpy.data.objects[name]; bm = bmesh.new(); bm.from_mesh(o.data); mw = o.matrix_world
        dead = [f for f in bm.faces if all(r[0] < p.x < r[1] and r[2] < p.y < r[3] and r[4] < abs(p.z) < r[5] for p in [bt(mw @ v.co) for v in f.verts])]
        bmesh.ops.delete(bm, geom=dead, context='FACES'); bm.to_mesh(o.data); bm.free()
    remove_loose([bpy.data.objects[n] for n in ('fer_f142_10_s_lod0_doorLF_body_2__carpaint_0', 'fer_f142_10_s_lod0_doorRF_body_2__carpaint_0')], [(-.676, -.630, .493, .684, .784, .911)], 400)
    hw = import_glb(models + 'ferrari-door-hinges.glb'); black_hinges(hw)
    for side, door, tag in ((1, 'door_R', 'P'), (-1, 'door_L', 'N')):
        parts = [bpy.data.objects[door]] + [o for o in hw if o.name.startswith('hinge_door_' + tag)]
        hinge(tag, (-.7055, .45, side * .9105), (0, 1, 0), -side * 1.12, parts)

elif car == 'porsche':
    load('porsche-911-gt3-door-assembly.glb')
    remove_loose([o for o in bpy.data.objects if o.type == 'MESH' and o.name.endswith(('Paint_Material1_0.001', 'Paint_Material1_0.002'))], [(-.722, -.648, .369, .438, .770, .845), (-.708, -.636, .709, .777, .770, .845)], 100)
    hw = import_glb(models + 'porsche-door-hinges.glb'); black_hinges(hw)
    for side, door, tag in ((1, 'Porsche door L', 'P'), (-1, 'Porsche door R', 'N')):
        parts = [bpy.data.objects[door]] + [o for o in hw if o.name.startswith(('hinge_door_' + tag, 'check_door_' + tag))]
        rot = hinge(tag, (-.715, .55, side * .835), (0, 1, 0), -side * 1.12, parts)
        boot = bpy.data.objects['check_door_' + tag]
        ps = [boot.matrix_world @ v.co for v in boot.data.vertices]
        guide = bpy.data.objects.new('Check strap guide ' + tag, None); guide.empty_display_size = .02; coll().objects.link(guide)
        guide.location = sum(ps, Vector()) / len(ps); keep_parent(guide, rot)
        track(bpy.data.objects['check_strap_' + tag], guide)

elif car == 'revuelto':
    import re
    load('lamborghini-revuelto-web.glb')
    root = bpy.data.objects.new('Revuelto (site orientation)', None); coll().objects.link(root)
    for o in list(bpy.data.objects):
        if o.parent is None and o is not root: o.parent = root
    root.matrix_world = B @ (Matrix.Translation((.10516, .00108, 0)) @ Matrix.Rotation(-math.pi / 2, 4, 'Y')) @ BI
    bpy.context.view_layer.update()
    hw = import_glb(models + 'revuelto-door-hinges.glb')
    for side, code, tag in ((1, 'L', 'P'), (-1, 'R', 'N')):
        pat = re.compile(rf'^(Door{code}F_|DoorJamb{code}F_|DoorCard{code}F|WingMirror{code}_|MirrorBase{code}_|Glass{code}M_)')
        parts = [o for o in bpy.data.objects if o.type == 'MESH' and pat.match(o.name) and 'Piston' not in o.name]
        parts += [o for o in hw if o.name.startswith('hinge_door_' + tag)]
        rot = hinge(tag, (-.955, .67, side * .89), (0, -side * .55, 1), 1.22, parts)
        # native gas strut: cylinder turns on the body pin, rod rides on the door's hinge arm
        bodyEnd, doorEnd = (-.795, .267, side * .877), (-.856, .545, side * .924)
        direction = Vector(doorEnd) - Vector(bodyEnd)
        cylPin = empty('Strut body pin ' + tag, bodyEnd, None, size=.02)
        rodPin = empty('Strut door pin ' + tag, doorEnd, None, rot, size=.02)
        cylAim = empty('Strut cylinder aim ' + tag, bodyEnd, None, size=.03)
        cylAim.matrix_world = Matrix.Translation(tb(bodyEnd)) @ (tb(direction) - tb((0, 0, 0))).normalized().to_track_quat('X', 'Z').to_matrix().to_4x4()
        rodAim = empty('Strut rod aim ' + tag, doorEnd, None, size=.03)
        rodAim.matrix_world = Matrix.Translation(tb(doorEnd)) @ (tb(-direction) - tb((0, 0, 0))).normalized().to_track_quat('X', 'Z').to_matrix().to_4x4()
        keep_parent(rodAim, rot)
        keep_parent(bpy.data.objects[f'DoorJamb{code}FPistonUpper_PaintedMetal'], cylAim)
        keep_parent(bpy.data.objects[f'DoorJamb{code}FPistonLower_PaintedMetal'], rodAim)
        track(cylAim, rodPin); track(rodAim, cylPin)

elif car == 'bugatti':
    load('bugatti-tourbillon-web.glb')   # clean_bugatti_doors.py + compress-glb.mjs
    for o in list(bpy.data.objects):
        if 'mounting' in o.name: bpy.data.objects.remove(o, do_unlink=True)
    ret = bpy.data.materials.get('Door return • fine dark carbon')   # exported untextured white; dark carbon on the site
    if ret: ret.diffuse_color = (.007, .008, .009, 1)
    if ret and ret.use_nodes and ret.node_tree.nodes.get('Principled BSDF'): ret.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.007, .008, .009, 1)
    hw = import_glb(models + 'bugatti-door-hinges.glb')
    for side, door, tag in ((1, 'Tourbillon_door_1', 'P'), (-1, 'Tourbillon_door_0', 'N')):
        parts = [bpy.data.objects[door]] + [o for o in hw if o.name.startswith('hinge_door_' + tag)]
        rot = hinge(tag, (-1.10, .78, side * .92), (0, -side * .55, 1), 1.13, parts)
        cyl, rod = bpy.data.objects['strut_cyl_' + tag], bpy.data.objects['strut_rod_' + tag]
        bodyPin = empty('Strut body pin ' + tag, bt(cyl.matrix_world.translation), size=.02)
        keep_parent(rod, rot)
        doorPin = empty('Strut door pin ' + tag, bt(rod.matrix_world.translation), None, rot, size=.02)
        track(cyl, doorPin); track(rod, bodyPin)

elif car == 'mclaren':
    load('mclaren-750s-rigged.glb')   # tools/prepare-mclaren-model.py (uncompressed, with the door shut faces)
    # what app/three/mclaren.ts does at load: the door's perimeter seal is black rubber, its inner frame matte black
    seal = bpy.data.materials.new('McLaren door seal'); seal.diffuse_color = (.006, .007, .007, 1)
    frame = bpy.data.materials.new('McLaren door frame'); frame.diffuse_color = (.003, .003, .003, 1)
    for m, rgb, rough in ((seal, (.006, .007, .007), .62), (frame, (.003, .003, .003), .85)):
        m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
        b = nt.nodes.new('ShaderNodeBsdfPrincipled'); o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(b.outputs[0], o.inputs[0])
        b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = 0
    viewport_colours()
    hw = import_glb(models + 'mclaren-door-hinges.glb'); black_hinges(hw)
    for o in hw:
        if o.type == 'MESH':
            for slot in o.material_slots:
                if slot.material: slot.material.diffuse_color = (.015, .016, .017, 1)
    for side, door, tag in ((1, 'McLaren door L', 'P'), (-1, 'McLaren door R', 'N')):
        d = bpy.data.objects[door]
        for o in d.children_recursive:
            if o.type != 'MESH': continue
            for slot in o.material_slots:
                if slot.material and slot.material.name.startswith('m_0_2316'): slot.material = seal
                elif slot.material and slot.material.name.startswith('m_0_1188'): slot.material = frame
        parts = [d] + [o for o in hw if o.name.startswith('hinge_door_' + tag)]
        # dihedral: the axis runs across the car, tilted outward (app/three/mclaren.ts), 1.3 rad open
        rot = hinge(tag, (-.98, .86, side * .86), (0, -side * .35, .92), 1.3, parts)
        cyl, rod = bpy.data.objects['strut_cyl_' + tag], bpy.data.objects['strut_rod_' + tag]
        bodyPin = empty('Strut body pin ' + tag, bt(cyl.matrix_world.translation), size=.02)
        keep_parent(rod, rot)
        doorPin = empty('Strut door pin ' + tag, bt(rod.matrix_world.translation), None, rot, size=.02)
        track(cyl, doorPin); track(rod, bodyPin)

elif car == 'valhalla':
    load('aston-martin-valhalla-rigged.glb')   # tools/prepare-valhalla-model.py (uncompressed)
    viewport_colours()
    hw = import_glb(models + 'valhalla-door-hinges.glb'); black_hinges(hw)
    for o in hw:
        if o.type == 'MESH':
            for slot in o.material_slots:
                if slot.material: slot.material.diffuse_color = (.015, .016, .017, 1)
    # the hinge is hidden in the A-pillar root: the doors swing about the axis app/three/valhalla.ts uses (through the
    # BeamNG mod's two hinge nodes), 1.15 rad open; the gas strut in the aperture is aimed like the McLaren's
    for side, door, tag in ((1, 'Valhalla door L', 'P'), (-1, 'Valhalla door R', 'N')):
        d = bpy.data.objects[door]
        parts = [d] + [o for o in hw if o.name.startswith('hinge_door_' + tag)]
        rot = hinge(tag, (-1.063, .777, side * .742), (-.0146 * side, -.0852 * side, .0931), 1.15, parts)
        cyl, rod = bpy.data.objects['strut_cyl_' + tag], bpy.data.objects['strut_rod_' + tag]
        bodyPin = empty('Strut body pin ' + tag, bt(cyl.matrix_world.translation), size=.02)
        keep_parent(rod, rot)
        doorPin = empty('Strut door pin ' + tag, bt(rod.matrix_world.translation), None, rot, size=.02)
        track(cyl, doorPin); track(rod, bodyPin)

elif car == 'amg':
    load('mercedes-amg-gt63-rigged.glb')   # tools/prepare-amg-model.py (uncompressed)
    viewport_colours()
    # conventional doors on vertical hinges at their front edges (app/three/amg.ts), 1.12 rad open; only the front pair
    # opens (the rear doors stay shut, as on the site); the driver's side (+z in three.js) turns the negative way. Each
    # carries its hinge leaves and check boot (build_amg_hinges.py), the check strap tracks the boot.
    hw = import_glb(models + 'amg-door-hinges.glb'); black_hinges(hw)
    for tag, side, code in (('L', 1, 'P'), ('R', -1, 'N')):
        for which in ('front',):
            g = bpy.data.objects[f'AMG door {tag} {which}']; key = f'{code}_{which[0].upper()}'
            p = bt(g.matrix_world.translation)
            parts = [g] + [o for o in hw if o.name.startswith(('hinge_door_' + key, 'check_door_' + key))]
            rot = hinge(f'{tag} {which}', (p.x, p.y, p.z), (0, 1, 0), -1.12 * side, parts)
            boot = bpy.data.objects['check_door_' + key]
            ps = [boot.matrix_world @ v.co for v in boot.data.vertices]
            guide = bpy.data.objects.new('Check strap guide ' + key, None); guide.empty_display_size = .02; coll().objects.link(guide)
            guide.location = sum(ps, Vector()) / len(ps); keep_parent(guide, rot)
            track(bpy.data.objects['check_strap_' + key], guide)
    # the cabin leather is a light grain the site tints with the upholstery colour: here the site's default (#242826,
    # lifted as liftDarkUpholstery does) is multiplied in
    lm = bpy.data.materials['AMG leather']; nt = lm.node_tree; lb = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    src = lb.inputs['Base Color'].links[0].from_socket
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 1
    mix.inputs[7].default_value = (*mathutils.Color((.180, .192, .186)).from_srgb_to_scene_linear(), 1)
    nt.links.new(src, mix.inputs[6]); nt.links.new(mix.outputs[2], lb.inputs['Base Color'])
    # the site's plate (app/three/plates.ts, saved from the page as amg-plate.png) on the model's two plain white
    # plates: planar UVs across each, reading left to right from the side it faces (front -x, rear +x)
    img = bpy.data.images.load(ROOT + '/tools/source-assets/cars/amg-plate.png'); img.pack()
    mat = bpy.data.materials['white.007']; bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    tex = mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = img
    mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value = .36
    for o in [o for o in bpy.data.objects if o.type == 'MESH' and 'white.007' in [m.name for m in o.data.materials if m]]:
        me = o.data; slot = [m.name if m else '' for m in me.materials].index('white.007')
        uv = me.uv_layers.active or me.uv_layers.new(name='UVMap')
        for front in (True, False):
            faces = [p for p in me.polygons if p.material_index == slot and ((o.matrix_world @ p.center).x < 0) == front]
            if not faces: continue
            pts = {i: o.matrix_world @ me.vertices[i].co for p in faces for i in p.vertices}
            ys = [v.y for v in pts.values()]; zs = [v.z for v in pts.values()]
            for p in faces:
                for li in p.loop_indices:
                    v = pts[me.loops[li].vertex_index]; u = (max(ys) - v.y) / (max(ys) - min(ys))
                    uv.data[li].uv = (u if front else 1 - u, (v.z - min(zs)) / (max(zs) - min(zs)))

elif car == 'jesko':
    load('koenigsegg-jesko-rigged.glb')   # tools/prepare-jesko-model.py (uncompressed)
    viewport_colours()
    hw = import_glb(models + 'jesko-door-hinges.glb'); black_hinges(hw)
    for o in hw:
        if o.type == 'MESH':
            for slot in o.material_slots:
                if slot.material: slot.material.diffuse_color = (.015, .016, .017, 1)
    # dihedral synchro-helix doors: one turn of 115 degrees about the diagonal axis at the A-pillar root that
    # app/three/jesko.ts uses (forward, outward and down; mirrored for the passenger's side); the gas strut in the
    # aperture is aimed like the McLaren's
    for side, door, tag in ((1, 'Jesko door L', 'P'), (-1, 'Jesko door R', 'N')):
        d = bpy.data.objects[door]
        parts = [d] + [o for o in hw if o.name.startswith('hinge_door_' + tag)]
        rot = hinge(tag, (-.72, .65, side * .91), (-.505, -.674, .539 * side), math.radians(115) * side, parts)
        cyl, rod = bpy.data.objects['strut_cyl_' + tag], bpy.data.objects['strut_rod_' + tag]
        bodyPin = empty('Strut body pin ' + tag, bt(cyl.matrix_world.translation), size=.02)
        keep_parent(rod, rot)
        doorPin = empty('Strut door pin ' + tag, bt(rod.matrix_world.translation), None, rot, size=.02)
        track(cyl, doorPin); track(rod, bodyPin)
    # the cabin leather is a plain colour the site sets from the upholstery: here the site's default (#242826, lifted as
    # liftDarkUpholstery does)
    lb = next(n for n in bpy.data.materials['Jesko leather'].node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    lb.inputs['Base Color'].default_value = (*mathutils.Color((.180, .192, .186)).from_srgb_to_scene_linear(), 1)

sc = bpy.context.scene
sc.frame_start, sc.frame_end, sc.frame_current = 1, 150, 60
setup_render((1600, 1000), 32)
cam = sc.camera; cam.name = 'View camera'
e, t = tb((-3.2, 1.6, 3.6)), tb((-.4, .7, .6))
cam.location = e; cam.rotation_euler = (t - e).to_track_quat('-Z', 'Y').to_euler()
os.makedirs(os.path.dirname(out), exist_ok=True)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
print('saved', out, os.path.getsize(out))
