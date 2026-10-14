import bpy,os,json
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='C:/Users/Admin/Downloads/2026_bugatti_tourbillon.glb')
mesh=[o for o in bpy.context.scene.objects if o.type=='MESH']
pts=[o.matrix_world@Vector(v) for o in mesh for v in o.bound_box]
print('FULL', [min(p[i] for p in pts) for i in range(3)],[max(p[i] for p in pts) for i in range(3)])
for o in mesh:
 if not o.name.startswith('polySurface'):
  pts=[o.matrix_world@Vector(v) for v in o.bound_box]
  print('PART',o.name, [round(min(p[i] for p in pts),3) for i in range(3)],[round(max(p[i] for p in pts),3) for i in range(3)])
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('tools/generated/Tourbillon-source.blend'))
