"""Bake the supplied drivers for glTF without editing the supplied Blender file."""
import bpy,os,json,subprocess
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=os.path.join(os.path.dirname(ROOT),'blender/Revuelto-Two-Arm-Mechanism.blend'))
rig=bpy.data.objects['ASSEMBLY | inclined hinge plane'];rig.location=(0,0,0);rig.rotation_euler=(0,0,0)
members=[rig,*rig.children_recursive];moving=[o for o in members if (o.animation_data and o.animation_data.drivers) or o.constraints]
samples={o:[] for o in moving}
for frame in range(1,121):
 bpy.context.scene.frame_set(frame);graph=bpy.context.evaluated_depsgraph_get()
 for o in moving:samples[o].append(o.evaluated_get(graph).matrix_local.copy())
for o in moving:
 o.animation_data_clear()
 for constraint in list(o.constraints):o.constraints.remove(constraint)
 o.rotation_mode='QUATERNION'
 for frame,matrix in enumerate(samples[o],1):
  o.location,o.rotation_quaternion,o.scale=matrix.decompose()
  for path in ['location','rotation_quaternion','scale']:o.keyframe_insert(data_path=path,frame=frame)
bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=120;bpy.context.scene.render.fps=100
bpy.context.scene.frame_set(1)
for o in bpy.context.scene.objects:o.select_set(o in members)
os.makedirs(os.path.join(ROOT,'public/models'),exist_ok=True)
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public/models/revuelto-two-arm-mechanism.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='SCENE',export_force_sampling=True,export_frame_range=True,export_frame_step=1)
print('BAKED_EXISTING_TWO_ARM',len(moving),'animated objects',flush=True)
subprocess.run(['node','tools/prepare-two-arm-clip.mjs'],cwd=ROOT,check=True)
