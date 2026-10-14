import bpy,os
from mathutils import Vector as V
from mathutils.bvhtree import BVHTree
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('../blender/Revuelto-Simple-Door-Bracket.blend'))
trees=[]
for name in ['DoorSill_PaintedMetal','DoorSill_CarPaint','Body_PaintedMetal']:
 o=bpy.data.objects[name];points=[o.matrix_world@v.co for v in o.data.vertices];trees.append((name,BVHTree.FromPolygons(points,[p.vertices[:] for p in o.data.polygons])))
for y in [-.75,-.8,-.85,-.9,-.95]:
 for z in [.4,.5,.6,.7]:
  print(y,z,[(name,tuple(round(v,4) for v in hit[0]),tuple(round(v,3) for v in hit[1])) for name,tree in trees if (hit:=tree.ray_cast(V((-.6,y,z)),V((-1,0,0)),.6))[0]],flush=True)
