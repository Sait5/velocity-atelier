import bpy,math,os
root=os.getcwd();source=os.path.join(root,'tools/generated/saltflat/saltflat-speed-test.blend');bpy.ops.wm.open_mainfile(filepath=source)
def coast(x,s,near=False):
 p=x/160*math.tau
 return (11.5+1.4*math.sin(p+s*.7)+.8*math.sin(p*3+s*2.1)+.45*math.cos(p*5+.3)) if near else (24+3.1*math.sin(p+s*.7)+1.7*math.sin(p*3+s*2.1)+.9*math.cos(p*5+.3))
for obj in bpy.data.objects:
 if obj.type!='MESH':continue
 if obj.name.startswith(('Salt_','Water_')):
  side=-1 if '_-1_' in obj.name else 1
  for v in obj.data.vertices:
   x,y,z=v.co;old=coast(x,side);new=coast(x,side,True)
   if obj.name.startswith('Salt_'):v.co.y=side*(5.95+(abs(y)-5.95)/(old-5.95)*(new-5.95))
   else:v.co.y=side*(new-.18+(abs(y)-old+.18)/(180-old+.18)*(180-new+.18))
  if obj.name.startswith('Salt_'):
   uv=obj.data.uv_layers.active
   for loop in obj.data.loops:uv.data[loop.index].uv=(obj.data.vertices[loop.vertex_index].co.x/4,obj.data.vertices[loop.vertex_index].co.y/4)
  obj.data.update()
 if obj.name=='Connected_forward_massif':obj.location.x=-1800
if bpy.context.scene.camera:bpy.context.scene.camera.data.clip_end=5000
bpy.ops.wm.save_as_mainfile(filepath=source)
for suffix,file in [('near','road-banks-near.glb'),('far','road-banks-far.glb'),('massif','forward-massif.glb')]:
 objects=[o for o in bpy.data.objects if o.type=='MESH' and (o.name.endswith('_'+suffix) if suffix!='massif' else o.name=='Connected_forward_massif')]
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=os.path.join(root,'public/models/saltflat',file),export_format='GLB',use_selection=True,export_materials='NONE',export_yup=True)
