import bpy,os
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('../blender/Revuelto-Simple-Door-Bracket.blend'))
scene=bpy.context.scene;scene.frame_set(241)
for o in scene.objects:
 if o.type=='MESH':
  o.color=(.9,.18,.025,1) if 'CarPaint' in o.name or 'Original orange' in o.name else (.08,.09,.1,1)
  if o.name.startswith(('Door_Mount','Upper_Arm','Lower_Arm','Body_Mount','Axis_')):o.color=(.4,.42,.45,1)
data=bpy.data.cameras.new('Review');cam=bpy.data.objects.new('Review',data);scene.collection.objects.link(cam);scene.camera=cam
scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='OBJECT';scene.display.shading.show_cavity=True
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
cam.data.type='ORTHO';cam.data.ortho_scale=.45;target=Vector((-.8168,-.9851,.7008))
for i,location in enumerate([(-.2,-1.3,1.0),(-.3,-.8,1.1),(-.2,-1.6,1.3)]):
 cam.location=location;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=os.path.abspath('tools/generated/original-bracket-view-'+str(i)+'.png');bpy.ops.render.render(write_still=True)

