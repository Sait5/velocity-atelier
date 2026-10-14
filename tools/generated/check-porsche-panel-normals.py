import bpy,os,json
from mathutils import Vector as V
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/porsche-911-gt3-door-assembly.glb'))
parts=json.load(open('tools/generated/porsche-trim-components.json'))
for row in parts:
 o=bpy.data.objects[row['name']]
 for part in row['parts']:
  if part['count'] not in [393,679,695,756,3188]:continue
  area=0;n=V()
  for i in part['faces']:
   f=o.data.polygons[i];p=[o.matrix_world@o.data.vertices[v].co for v in f.vertices];c=(p[1]-p[0]).cross(p[2]-p[0]);n+=c;area+=c.length
  print('NORMAL',o.parent.name,part['count'],list(n/area),flush=True)
