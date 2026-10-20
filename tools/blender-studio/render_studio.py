"""Garage photographs and films of one car in a dark photo studio, rendered by Blender Cycles on the GPU.

Run headless on a car .blend (the file is only read, never saved):
  photos: blender --background <car.blend> --python render_studio.py -- --out <dir> --name <id> --shots front,side,rear,interior
          [--eye x,y,z]   (driver's eye in Blender coordinates, for the interior shot)
  film:   blender --background <car.blend> --python render_studio.py -- --out <dir> --name <id> --film [--frames 240]
  common: [--paint "material-regex=#rrggbb"] [--samples N] [--size 2560x1440] [--percent 100] [--engine CYCLES|EEVEE]

Studio (the site's own dark palette, no white backdrop): a charcoal infinity cove with a satin floor that reflects the
car, a large overhead softbox, two long strip lights that draw clean highlight lines along the paint, a warm rim light
from behind and a low soft front card so the car never sinks into the dark. Photos: three-quarter front, side profile,
rear three-quarter and the cabin from the driver's seat, PNG. Film: one full turn round the car at constant speed (the
loop has no seam), numbered PNG frames, encoded for the site by tools/blender-studio/encode_film.mjs.
"""
import bpy, math, sys, os, argparse, mathutils, re

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--out', required=True)
ap.add_argument('--name', default='car')
ap.add_argument('--engine', default='CYCLES')
ap.add_argument('--shots', default='', help='comma list of front,side,rear,interior')
ap.add_argument('--film', action='store_true')
ap.add_argument('--frames', type=int, default=240)
ap.add_argument('--samples', type=int, default=0, help='0 = 160 for photos, 48 for film')
ap.add_argument('--size', default='', help='WxH; default 2560x1440 for photos, 1920x1080 for film')
ap.add_argument('--percent', type=int, default=100)
ap.add_argument('--eye', default='', help='driver eye x,y,z (Blender coordinates)')
ap.add_argument('--light', type=float, default=0.3)
ap.add_argument('--view', default='Khronos PBR Neutral', help='colour view transform; PBR Neutral keeps paint hues (the site uses the same)')
ap.add_argument('--exposure', type=float, default=0.0)
ap.add_argument('--cabin-view', dest='cabin_view', default='centre', help='centre (behind the seats) or driver (over the wheel)')
ap.add_argument('--cabin-back', dest='cabin_back', type=float, default=0.42, help='camera distance behind the eye for the cabin shot (m)')
ap.add_argument('--cabin', type=float, default=1.0, help='extra exposure (EV) for the interior shot')
ap.add_argument('--paint', action='append', default=[], help='material-name-regex=#rrggbb, the site\'s colour for that car')
args = ap.parse_args(argv)
scene = bpy.context.scene

# --- paint: the site's colour as a glossy clear-coated lacquer --------------------------------------------------------
for rule in args.paint:
    pattern, hexcode = rule.rsplit('=', 1)
    rgb = mathutils.Color([int(hexcode.lstrip('#')[i:i + 2], 16) / 255 for i in (0, 2, 4)]).from_srgb_to_scene_linear()
    for m in bpy.data.materials:
        if not m.use_nodes or not re.search(pattern, m.name): continue
        for n in m.node_tree.nodes:
            if n.type != 'BSDF_PRINCIPLED': continue
            base = n.inputs['Base Color']
            for l in list(base.links): m.node_tree.links.remove(l)
            base.default_value = (*rgb, 1)
            n.inputs['Metallic'].default_value = 0.08; n.inputs['Roughness'].default_value = 0.24
            if 'Coat Weight' in n.inputs: n.inputs['Coat Weight'].default_value = 0.7; n.inputs['Coat Roughness'].default_value = 0.035
            print('STUDIO paint', m.name, hexcode)

# --- the file's own animation (e.g. doors opening) is evaluated at frame 1 and then removed, so every shot and the whole
# film show the car as it stands, doors closed
scene.frame_set(1)
for o in scene.objects:
    if o.animation_data: o.animation_data_clear()

# --- clear the file's own lights and cameras --------------------------------------------------------------------------
for o in list(scene.objects):
    if o.type in {'LIGHT', 'CAMERA'}:
        bpy.data.objects.remove(o, do_unlink=True)

# --- car bounds (meshes only) -----------------------------------------------------------------------------------------
lo = mathutils.Vector((1e9,) * 3); hi = -lo
for o in scene.objects:
    if o.type != 'MESH' or not o.visible_get(): continue
    for c in o.bound_box:
        w = o.matrix_world @ mathutils.Vector(c)
        lo = mathutils.Vector(map(min, lo, w)); hi = mathutils.Vector(map(max, hi, w))
centre = (lo + hi) / 2; L = max(hi.x - lo.x, hi.y - lo.y); ground = lo.z
print('STUDIO bounds', tuple(round(v, 3) for v in lo), tuple(round(v, 3) for v in hi))

def principled(name, colour, rough, spec=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True; nodes = m.node_tree.nodes
    b = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None) or nodes.new('ShaderNodeBsdfPrincipled')
    o = next((n for n in nodes if n.type == 'OUTPUT_MATERIAL'), None) or nodes.new('ShaderNodeOutputMaterial')
    m.node_tree.links.new(b.outputs[0], o.inputs[0])
    b.inputs['Base Color'].default_value = (*colour, 1); b.inputs['Roughness'].default_value = rough
    if 'Specular IOR Level' in b.inputs: b.inputs['Specular IOR Level'].default_value = spec
    return m

# --- infinity cove: floor curving up into a backdrop all the way round ------------------------------------------------
radius, rise, bend, seg = L * 6, L * 3.2, L * 1.2, 96
profile = [(0.0, 0.0), (radius * 0.5, 0.0), (radius - bend, 0.0)]
profile += [(radius - bend + math.sin(k / 8 * math.pi / 2) * bend, bend - math.cos(k / 8 * math.pi / 2) * bend) for k in range(1, 9)]
profile.append((radius, rise))
verts = [(centre.x + math.cos(s / seg * math.tau) * r, centre.y + math.sin(s / seg * math.tau) * r, ground + z) for r, z in profile for s in range(seg)]
faces = [(i * seg + s, i * seg + (s + 1) % seg, (i + 1) * seg + (s + 1) % seg, (i + 1) * seg + s) for i in range(len(profile) - 1) for s in range(seg)]
mesh = bpy.data.meshes.new('Studio cove'); mesh.from_pydata(verts, [], faces); mesh.update()
for p in mesh.polygons: p.use_smooth = True
cove = bpy.data.objects.new('Studio cove', mesh); scene.collection.objects.link(cove)
# charcoal with the site's faint green cast (#101410-ish), satin so the floor carries a soft reflection of the car
cove.data.materials.append(principled('Studio floor', (0.03, 0.035, 0.033), 0.38, 0.35))

world = scene.world or bpy.data.worlds.new('Studio'); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes.get('Background') or world.node_tree.nodes.new('ShaderNodeBackground')
wout = world.node_tree.nodes.get('World Output') or world.node_tree.nodes.new('ShaderNodeOutputWorld')
for l in list(world.node_tree.links): world.node_tree.links.remove(l)
world.node_tree.links.new(bg.outputs[0], wout.inputs[0])
bg.inputs[0].default_value = (0.06, 0.07, 0.068, 1); bg.inputs[1].default_value = 0.35

def area(name, size, power, location, target, size_y=None, colour=(1, 1, 1)):
    d = bpy.data.lights.new(name, 'AREA'); d.shape = 'RECTANGLE'; d.size = size; d.size_y = size_y or size
    d.energy = power * args.light; d.color = colour
    o = bpy.data.objects.new(name, d); scene.collection.objects.link(o); o.location = location
    o.rotation_euler = (mathutils.Vector(target) - mathutils.Vector(location)).to_track_quat('-Z', 'Y').to_euler()
    return o
c0 = (centre.x, centre.y, ground)
area('Softbox', L * 1.3, 1800, (centre.x, centre.y, ground + L * 1.2), c0, L * 0.6)
area('Strip left', L * 1.25, 950, (centre.x, centre.y + L * 0.9, ground + L * 0.4), (centre.x, centre.y, ground + 0.5), 0.2)
area('Strip right', L * 1.25, 950, (centre.x, centre.y - L * 0.9, ground + L * 0.4), (centre.x, centre.y, ground + 0.5), 0.2)
area('Rim', L * 0.8, 900, (centre.x + L * 1.15, centre.y, ground + L * 0.5), (centre.x, centre.y, ground + 0.6), L * 0.35, (1, 0.95, 0.88))
area('Front card', L * 0.9, 380, (centre.x - L * 1.2, centre.y, ground + 0.45), (centre.x, centre.y, ground + 0.45), 0.6)
# Light linking: the shaping lights light only the car, so the floor stays dark instead of glowing under the big
# softbox; a separate low light gives the floor its soft pool and the car its contact shadow.
car_set = bpy.data.collections.new('Studio car'); scene.collection.children.link(car_set)
for o in scene.objects:
    if o.type == 'MESH' and o is not cove: car_set.objects.link(o)
for o in scene.objects:
    if o.type == 'LIGHT' and hasattr(o, 'light_linking'): o.light_linking.receiver_collection = car_set
area('Floor pool', L * 1.1, 260, (centre.x, centre.y, ground + L * 1.0), c0, L * 0.5)

# --- camera -------------------------------------------------------------------------------------------------------------
cd = bpy.data.cameras.new('Studio camera'); cd.sensor_width = 36; cd.dof.use_dof = True; cd.dof.aperture_fstop = 6.3
cam = bpy.data.objects.new('Studio camera', cd); scene.collection.objects.link(cam); scene.camera = cam
aim = bpy.data.objects.new('Studio aim', None); scene.collection.objects.link(aim); cd.dof.focus_object = aim
track = cam.constraints.new('TRACK_TO'); track.target = aim; track.track_axis = 'TRACK_NEGATIVE_Z'; track.up_axis = 'UP_Y'

def orbit(angle, distance, height, lens, aim_height=0.6):
    """angle 0 = the car's +y side; negative angles swing toward the nose (-x)"""
    t = math.radians(angle); cd.lens = lens
    cam.location = (centre.x + math.sin(t) * distance, centre.y + math.cos(t) * distance, ground + height)
    aim.location = (centre.x, centre.y, ground + aim_height)

# --- render settings ----------------------------------------------------------------------------------------------------
r = scene.render
size = args.size or ('1920x1080' if args.film else '2560x1440')
r.resolution_x, r.resolution_y = map(int, size.split('x')); r.resolution_percentage = args.percent; r.fps = 30
scene.view_settings.view_transform = args.view
try: scene.view_settings.look = 'AgX - Punchy' if args.view == 'AgX' else 'None'
except Exception: pass
scene.view_settings.exposure = args.exposure
samples = args.samples or (48 if args.film else 160)
if args.engine == 'CYCLES':
    r.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'HIP'; prefs.refresh_devices()
    for d in prefs.devices: d.use = d.type == 'HIP'
    c = scene.cycles; c.device = 'GPU'; c.samples = samples; c.use_denoising = True
    c.max_bounces, c.glossy_bounces, c.transmission_bounces, c.diffuse_bounces = 12, 8, 10, 4
    c.use_adaptive_sampling = True; c.adaptive_threshold = 0.015
    r.use_persistent_data = True
else:
    r.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    scene.eevee.taa_render_samples = samples
os.makedirs(args.out, exist_ok=True)
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'

for shot in [s for s in args.shots.split(',') if s]:
    cd.dof.use_dof = True; scene.view_settings.exposure = args.exposure
    if shot == 'front': orbit(-42, L * 1.75, 0.85, 45)
    elif shot == 'side': orbit(0, L * 2.35, 0.7, 70, 0.55)
    elif shot == 'rear': orbit(138, L * 1.8, 1.0, 45)
    elif shot == 'interior':
        # Catalogue cabin shot: from behind the seats on the car's centre line, just above the headrests, looking forward
        # and down at the dashboard, so both seats, the wheel and the console fill the frame and the headliner stays out.
        eye = mathutils.Vector(map(float, args.eye.split(','))) if args.eye else mathutils.Vector((centre.x + 0.1, centre.y + 0.36, ground + 1.0))
        if args.cabin_view == 'driver':
            # from just behind and above the driver's eye, looking down the steering column at the instruments
            cam.location = (eye.x + 0.16, eye.y, eye.z + 0.08); cd.lens = 22; cd.dof.use_dof = False
            aim.location = (eye.x - 0.9, eye.y + (0.12 if eye.y < centre.y else -0.12), eye.z - 0.38)
        else:
            cam.location = (eye.x + args.cabin_back, centre.y, eye.z + 0.1); cd.lens = 20; cd.dof.use_dof = False
            aim.location = (eye.x - 0.95, centre.y, eye.z - 0.42)
        # soft light under the roof and from the side glass, so leather and trim read instead of sinking into shadow
        cab = area('Cabin fill', 0.7, 60, (eye.x - 0.1, eye.y if args.cabin_view == 'driver' else centre.y, eye.z + 0.2), (eye.x - 0.6, eye.y if args.cabin_view == 'driver' else centre.y, eye.z - 0.5), 0.5, (1, 0.97, 0.92))
        scene.view_settings.exposure = args.exposure + args.cabin
    else:
        continue
    r.filepath = os.path.join(args.out, f'{args.name}-{shot}.png')
    bpy.ops.render.render(write_still=True)
    if shot == 'interior': bpy.data.objects.remove(cab, do_unlink=True)
    print('STUDIO shot', shot)

if args.film:
    # one full turn at constant speed, a keyframe per frame: frame N+1 would be frame 1, so the loop has no seam
    scene.frame_start, scene.frame_end = 1, args.frames
    for f in range(1, args.frames + 1):
        orbit(-42 + 360 * (f - 1) / args.frames, L * 1.9, 0.9, 45)
        cam.keyframe_insert('location', frame=f)
    frames_dir = os.path.join(args.out, args.name); os.makedirs(frames_dir, exist_ok=True)
    r.use_overwrite = False; r.use_placeholder = True; r.filepath = os.path.join(frames_dir, 'frame_')
    bpy.ops.render.render(animation=True)
print('STUDIO done', args.name)
