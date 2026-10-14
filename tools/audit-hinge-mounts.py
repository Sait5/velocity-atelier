import bpy,os,json
from mathutils import Vector
from mathutils.bvhtree import BVHTree
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/porsche-911-gt3-door-assembly.glb'))
bpy.context.view_layer.update();points=[];faces=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or not any(m and 'paint' in m.name.lower() for m in o.data.materials):continue
 offset=len(points);points.extend(o.matrix_world@v.co for v in o.data.vertices);faces.extend([[v+offset for v in p.vertices] for p in o.data.polygons])
tree=BVHTree.FromPolygons(points,faces)
for x in [-.79,-.77,-.75,-.73]:
 for h in [.44,.54,.67]:
  hit=tree.ray_cast(Vector((x,-1.5,h)),Vector((0,1,0)))
  print('OUTER_SURFACE',x,h,list(hit[0]) if hit[0] else None,flush=True)
