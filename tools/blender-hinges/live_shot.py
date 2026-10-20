# Live helper (run through tools/blender-live.mjs): capture the user's 3D viewport (OpenGL viewport render),
# optionally after moving the view. Prepend: SHOT = 'path.png'; optional VIEW = dict(loc=..., eye=..., lens=mm)
# in three.js car coordinates; optional FRAME = n; optional SIZE = (w, h).
import bpy
from mathutils import Vector, Matrix

B = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))
tb = lambda v: B @ Vector(v)
area = next(a for w in bpy.context.window_manager.windows for a in w.screen.areas if a.type == 'VIEW_3D')
window = next(w for w in bpy.context.window_manager.windows if area in w.screen.areas[:])
space = area.spaces.active; r3d = space.region_3d
view = globals().get('VIEW')
if view:
    target, eye = tb(view['loc']), tb(view['eye'])
    r3d.view_perspective = 'PERSP'
    r3d.view_location = target
    r3d.view_rotation = (eye - target).to_track_quat('Z', 'Y')
    r3d.view_distance = (eye - target).length
    space.lens = view.get('lens', 50)
    space.clip_start = 0.005
if globals().get('FRAME') is not None:
    bpy.context.scene.frame_set(FRAME)
sc = bpy.context.scene
old = (sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage)
sc.render.resolution_x, sc.render.resolution_y = globals().get('SIZE', (area.width, area.height))
sc.render.resolution_percentage = 100
region = next(rg for rg in area.regions if rg.type == 'WINDOW')
try:
    with bpy.context.temp_override(window=window, area=area, region=region):
        bpy.ops.render.opengl(write_still=False, view_context=True)
    bpy.data.images['Render Result'].save_render(SHOT)
finally:
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = old
result = {'shot': SHOT}
