import bpy,os
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/ferrari-italia-complete.glb'))
for o in bpy.context.scene.objects:
 if o.type=='MESH' and any(m and m.name=='carpaint' for m in o.data.materials):
  p=[o.matrix_world@v.co for v in o.data.vertices]
  print('PAINT',o.name,o.parent.name, len(o.data.polygons),[round(min(v[i] for v in p),4) for i in range(3)],[round(max(v[i] for v in p),4) for i in range(3)],flush=True)
