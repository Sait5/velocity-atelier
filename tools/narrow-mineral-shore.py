import bpy,math,os
root=os.getcwd();path=os.path.join(root,'tools/generated/saltflat/saltflat-speed-test.blend');bpy.ops.wm.open_mainfile(filepath=path)
def shoreline(x,s,new=False):
 p=x/160*math.tau
 return 7.4+.55*math.sin(p+s*.7)+.25*math.sin(p*3+s*2.1)+.15*math.cos(p*5+.3) if new else 11.5+1.4*math.sin(p+s*.7)+.8*math.sin(p*3+s*2.1)+.45*math.cos(p*5+.3)
clay=bpy.data.materials['Salt crust PBR'].copy();clay.name='Pale mineral clay shoulder';n=clay.node_tree.nodes;l=clay.node_tree.links;bs=n.get('Principled BSDF');base=bs.inputs['Base Color'].links[0].from_socket;mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(.4,.39,.35,1);l.new(base,mix.inputs[1]);l.new(mix.outputs[0],bs.inputs['Base Color'])
for obj in bpy.data.objects:
 if obj.type!='MESH' or not obj.name.startswith(('Salt_','Shoulder_','Water_')):continue
 side=-1 if '_-1_' in obj.name else 1
 for v in obj.data.vertices:
  x,y,z=v.co;old=shoreline(x,side);new=shoreline(x,side,True)
  if obj.name.startswith('Shoulder_'):v.co.y=side*(4.6+(abs(y)-4.6)/1.35*.45)
  elif obj.name.startswith('Salt_'):v.co.y=side*(5.05+(abs(y)-5.95)/(old-5.95)*(new-5.05))
  else:v.co.y=side*(new-.18+(abs(y)-old+.18)/(180-old+.18)*(180-new+.18))
 if obj.name.startswith('Shoulder_'):obj.data.materials.clear();obj.data.materials.append(clay)
 if obj.name.startswith(('Shoulder_','Salt_')):
  uv=obj.data.uv_layers.active
  for loop in obj.data.loops:co=obj.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(co.x/4,co.y/4)
 obj.data.update()
bpy.ops.wm.save_as_mainfile(filepath=path)
for suffix,file in [('near','road-banks-near.glb'),('far','road-banks-far.glb')]:
 objects=[o for o in bpy.data.objects if o.type=='MESH' and o.name.endswith('_'+suffix)]
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=os.path.join(root,'public/models/saltflat',file),export_format='GLB',use_selection=True,export_materials='NONE',export_yup=True)
