import bpy, json, os
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='C:/Users/Admin/Downloads/2025_porsche_911_gt3_992-2.glb')
records=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH': continue
 pts=[o.matrix_world@Vector(v) for v in o.bound_box]
 records.append(dict(name=o.name,min=[min(p[i] for p in pts) for i in range(3)],max=[max(p[i] for p in pts) for i in range(3)],faces=len(o.data.polygons),materials=[m.name if m else '' for m in o.data.materials]))
out=os.path.join(ROOT,'tools/generated/porsche');os.makedirs(out,exist_ok=True)
open(os.path.join(out,'inventory.json'),'w').write(json.dumps(records,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'source.blend'))
print('BOUNDS',[(min(r['min'][i] for r in records),max(r['max'][i] for r in records)) for i in range(3)])
for r in records:
 if 'Wheel' in r['name'] or 'Calliper' in r['name'] or 'Paint_Geo' in r['name']: print(r)
