import bpy,os,sys
from mathutils import Vector as V
key=sys.argv[sys.argv.index('--')+1]
path=os.path.abspath('../blender/'+('Porsche' if key=='porsche' else 'Ferrari')+'-Door-Hinges-Marked-Mounts.blend')
bpy.ops.wm.open_mainfile(filepath=path)
s=bpy.context.scene;s.frame_set(241)
for o in s.objects:
 if o.type=='MESH':o.color=(.5,.12,.08,1) if any(m and 'paint' in m.name.lower() for m in o.data.materials) else (.12,.13,.14,1)
camera=bpy.data.cameras.new('Diagnostic');cam=bpy.data.objects.new('Diagnostic',camera);s.collection.objects.link(cam);s.camera=cam;camera.clip_start=.002;camera.type='PERSP';camera.lens=38
s.render.engine='BLENDER_WORKBENCH';s.display.shading.light='STUDIO';s.display.shading.color_type='OBJECT';s.display.shading.show_cavity=True;s.render.resolution_x=600;s.render.resolution_y=600;s.render.resolution_percentage=100
sign=-1
for i,(pos,tar) in enumerate([((-.35,1.4,.72),(-.72,.95,.47)),((-.25,.67,.68),(-.74,.88,.5)),((-.95,1.4,.72),(-.64,1,.47)),((-.8,.7,.55),(-.61,1,.47))]):
 cam.location=V((pos[0],pos[1]*sign,pos[2]));target=V((tar[0],tar[1]*sign,tar[2]));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=os.path.abspath('tools/generated/'+key+'-marked-jamb-'+str(i)+'.png');bpy.ops.render.render(write_still=True)
 if i==1:
  for frame in [1,61,121]:
   s.frame_set(frame);s.render.filepath=os.path.abspath('tools/generated/'+key+'-jamb-closing-'+str(frame)+'.png');bpy.ops.render.render(write_still=True)
  s.frame_set(241)

