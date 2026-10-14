import bpy,math,os
from mathutils import Vector,noise
root=os.getcwd();path=os.path.join(root,'tools/generated/saltflat/saltflat-speed-test.blend');bpy.ops.wm.open_mainfile(filepath=path)
o=bpy.data.objects['Connected_forward_massif']
for v in o.data.vertices:
 x,y,z=v.co;t=(-x-710)/330;u=(y+290)/580;edge=max(0,math.sin(math.pi*u))**1.3*max(0,math.sin(math.pi*t))**.8
 n=noise.ridged_multi_fractal(Vector((x*.024,y*.024,1.7)),1,2.1,5,1,1.8)
 peaks=95*math.exp(-((x+865)/72)**2-((y+15)/65)**2)+68*math.exp(-((x+920)/70)**2-((y+145)/75)**2)+72*math.exp(-((x+825)/65)**2-((y-135)/70)**2)
 v.co.z=7.287+max(0,(peaks*(.68+n*.2)+n*9)*edge)
o.data.update()
for obj in bpy.data.objects:
 if obj.type=='MESH' and obj.name.startswith('Shoulder_'):
  for v in obj.data.vertices:
   x,y,z=v.co;t=(abs(y)-4.6)/1.35;side=1 if y>0 else -1
   v.co.z=8.287-.015-t*.065+.012*math.sin(x/160*math.tau*17+side)*math.sin(t*math.pi)
  obj.data.update()
bpy.ops.wm.save_as_mainfile(filepath=path)
for suffix,file in [('near','road-banks-near.glb'),('far','road-banks-far.glb'),('massif','forward-massif.glb')]:
 objects=[obj for obj in bpy.data.objects if obj.type=='MESH' and (obj.name.endswith('_'+suffix) if suffix!='massif' else obj.name=='Connected_forward_massif')]
 bpy.ops.object.select_all(action='DESELECT')
 for obj in objects:obj.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=os.path.join(root,'public/models/saltflat',file),export_format='GLB',use_selection=True,export_materials='NONE',export_yup=True)
