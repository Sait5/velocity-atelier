import bpy,os
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
bpy.ops.wm.open_mainfile(filepath=os.path.join(os.path.dirname(ROOT),'blender/Porsche-Compact-Door-Hinges.blend'))
scene=bpy.context.scene;scene.frame_set(241)
for o in scene.objects:
 if o.type=='MESH':o.color=(.85,.87,.88,1) if any(m and 'paint' in m.name.lower() for m in o.data.materials) else (.075,.08,.085,1)
camera=bpy.data.cameras.new('Inside review');cam=bpy.data.objects.new('Inside review',camera);scene.collection.objects.link(cam);scene.camera=cam
cam.location=Vector((-.18,.1,.9));target=Vector((-.7,-.84,.56));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camera.type='ORTHO';camera.ortho_scale=.5
scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='OBJECT';scene.display.shading.show_cavity=True
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.filepath=os.path.join(ROOT,'tools/generated/porsche-compact-inside.png');bpy.ops.render.render(write_still=True)