import bpy,os,bmesh
root=os.getcwd();src=os.path.join(root,'tools/generated/saltflat/saltflat-speed-test.blend');out=os.path.join(root,'public/models/saltflat')
bpy.ops.wm.open_mainfile(filepath=src)
for o in bpy.data.objects:
 if o.type=='MESH' and ('_-1_' in o.name or o.name=='Connected_forward_massif'):
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
bpy.ops.wm.save_as_mainfile(filepath=src)
for suffix,file in [('near','road-banks-near.glb'),('far','road-banks-far.glb'),('massif','forward-massif.glb')]:
 objects=[o for o in bpy.data.objects if o.type=='MESH' and (o.name.endswith('_'+suffix) if suffix!='massif' else o.name=='Connected_forward_massif')]
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=os.path.join(out,file),export_format='GLB',use_selection=True,export_materials='NONE',export_yup=True)
