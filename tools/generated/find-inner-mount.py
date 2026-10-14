import bpy,os
from mathutils import Vector as V
from mathutils.bvhtree import BVHTree
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('../blender/Revuelto-Simple-Door-Bracket.blend'))
bpy.context.scene.frame_set(176)
for x in [-1.02,-.97,-.92,-.87,-.82]:
 for z in [.45,.55,.65,.75]:
  hits=[]
  for o in bpy.context.scene.objects:
   if o.type!='MESH' or o.hide_render or o.name.startswith(('Door','Original','Wing','Glass','Mirror')):continue
   ps=[o.matrix_world@v.co for v in o.data.vertices]
   if not ps:continue
   tree=BVHTree.FromPolygons(ps,[p.vertices[:] for p in o.data.polygons])
   loc,norm,idx,d=tree.ray_cast(V((x,-.65,z)),V((0,-1,0)),.35)
   if loc:hits.append((d,o.name,tuple(round(v,4) for v in loc),tuple(round(v,3) for v in norm)))
  print(x,z,sorted(hits)[:2],flush=True)
