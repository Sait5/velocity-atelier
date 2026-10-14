import bpy,os,json
from mathutils import Vector as V
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/ferrari-italia-complete.glb'))
for name in ['door_L','door_R']:
 o=bpy.data.objects[name];ps=[child.matrix_world@v.co for child in o.children_recursive if child.type=='MESH' for v in child.data.vertices]
 print('DOOR',name,list(o.location),'bounds',[[min(p[i] for p in ps) for i in range(3)],[max(p[i] for p in ps) for i in range(3)]],flush=True)
for m in bpy.data.materials:
 if m.use_nodes:
  for n in list(m.node_tree.nodes):
   if n.type=='TEX_IMAGE':m.node_tree.nodes.remove(n)
bpy.ops.export_scene.gltf(filepath=os.path.abspath('tools/generated/ferrari-side-door-test.glb'),export_format='GLB',export_draco_mesh_compression_enable=False)
