import bpy,json,sys
from pathlib import Path
root=Path(__file__).resolve().parent.parent
kind=sys.argv[-1]
if kind=='winter': bpy.ops.wm.open_mainfile(filepath=str(root/'tools/source-assets/winter/untitled.blend'))
else:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.fbx(filepath=str(root/'tools/source-assets/mountain/original/Snowy-terrain.fbx'))
for o in bpy.data.objects:
 if o.type=='MESH':
  pts=[o.matrix_world@v.co for v in o.data.vertices]
  print('MESH',o.name,len(pts),len(o.data.polygons),'bounds',[[min(p[i] for p in pts),max(p[i] for p in pts)] for i in range(3)],'uv',list(o.data.uv_layers.keys()))
for im in bpy.data.images:print('IMAGE',im.name,im.size[:],im.filepath)
for m in bpy.data.materials:print('MATERIAL',m.name)
