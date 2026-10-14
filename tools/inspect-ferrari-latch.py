import bpy,os
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/ferrari-italia-complete.glb'))
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 pts=[o.matrix_world@v.co for v in o.data.vertices]
 near=[p for p in pts if .44<p.x<.51 and .82<p.y<.92 and .63<p.z<.7]
 if near:print('NEAR',o.name,o.parent.name,len(near),[m.name for m in o.data.materials])
