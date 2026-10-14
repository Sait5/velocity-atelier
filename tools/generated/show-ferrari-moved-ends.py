import bpy,os
from mathutils import Vector as V
path=os.path.abspath('../blender/Ferrari-Door-Hinges-Marked-Mounts.blend')
bpy.ops.wm.open_mainfile(filepath=path)
bpy.context.scene.frame_set(241)
bpy.ops.object.select_all(action='DESELECT')
chosen=[]
for o in bpy.context.scene.objects:
 if o.name.startswith('Body hinge plate') and o.matrix_world.translation.y<-.7:
  o.select_set(True);chosen.append(o)
if chosen:bpy.context.view_layer.objects.active=max(chosen,key=lambda o:o.matrix_world.translation.z)
position=V((-.25,-.67,.68));target=V((-.74,-.88,.5));rotation=(target-position).to_track_quat('-Z','Y')
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   space=area.spaces.active;space.clip_start=.002;space.lens=38;space.shading.type='SOLID';space.shading.color_type='MATERIAL'
   space.region_3d.view_rotation=rotation;space.region_3d.view_location=target;space.region_3d.view_distance=(position-target).length;space.region_3d.view_perspective='PERSP'
bpy.ops.wm.save_as_mainfile(filepath=path)
print('MOVED_ENDS',[(o.name,list(o.matrix_world.translation)) for o in chosen],flush=True)
