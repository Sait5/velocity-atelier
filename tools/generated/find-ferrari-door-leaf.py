import bpy,os
from collections import defaultdict
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/ferrari-italia-complete.glb'))
from mathutils import Vector as V
from mathutils.bvhtree import BVHTree
for height in [.275,.621]:
 point=V((-.706,.91,height));hits=[]
 for o in bpy.data.objects['door_L'].children_recursive:
  if o.type=='MESH' and any(m.name=='carpaint' for m in o.data.materials):
   tree=BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[p.vertices[:] for p in o.data.polygons]);hit=tree.find_nearest(point);hits.append((hit[3],o.name,list(hit[0])))
 print('ATTACHMENT',height,sorted(hits)[:2],flush=True)
