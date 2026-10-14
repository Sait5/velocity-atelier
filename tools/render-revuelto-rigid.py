import bpy,os
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('../blender/Revuelto-Mechanism-Placed.blend'))
scene=bpy.context.scene;scene.frame_set(241)
data=bpy.data.cameras.new('Hinge review');cam=bpy.data.objects.new('Hinge review',data);scene.collection.objects.link(cam)
target=Vector((-.82,-.86,.72));cam.location=(-.4,-.55,1.18);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=.8;scene.camera=cam
scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True
scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.filepath=os.path.abspath('tools/generated/revuelto-rigid-inside.png');bpy.ops.render.render(write_still=True)

