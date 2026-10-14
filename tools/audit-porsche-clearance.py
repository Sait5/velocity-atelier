import bpy,os,json,math
from mathutils.bvhtree import BVHTree
from mathutils import Vector
base=os.path.join(os.path.dirname(__file__),'generated/porsche')
bpy.ops.wm.open_mainfile(filepath=os.path.join(base,'Porsche-911-GT3-rigged.blend'))
door=bpy.data.objects['Porsche door L']
root=bpy.data.objects['Porsche GT3 992.2']
fixed=[o for o in root.children if o.type=='MESH']
def tree(o):
 return BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[list(p.vertices) for p in o.data.polygons],all_triangles=True,epsilon=0)
def bounds(o):
 ps=[o.matrix_world@Vector(v) for v in o.bound_box]
 return [min(p[i] for p in ps) for i in range(3)],[max(p[i] for p in ps) for i in range(3)]
def intersects(a,b):
 x,y=bounds(a);u,v=bounds(b)
 return all(x[i]<=v[i] and u[i]<=y[i] for i in range(3))
fixed_trees={o.name:tree(o) for o in fixed}
out=[]
for door_name,sign in [('Porsche door L',-1),('Porsche door R',1)]:
 door=bpy.data.objects[door_name]
 for angle in [.35,.7,1.05]:
  door.rotation_euler.z=sign*angle
  door.location.y=sign*(.89+.025*math.sin(min(angle/.3,1)*math.pi/2))
  bpy.context.view_layer.update()
  count=0
  for a in door.children:
   if a.type!='MESH':continue
   t=tree(a)
   for b in fixed:
    if not intersects(a,b):continue
    hits=t.overlap(fixed_trees[b.name])
    count+=len(hits)
    if hits:out.append({'door':door_name,'angle':angle,'moving':a.name,'fixed':b.name,'hits':len(hits)})
  print(door_name,angle,'intersections',count)
 door.rotation_euler.z=0;door.location.y=sign*.89
 bpy.context.view_layer.update()
json.dump(out,open(os.path.join(base,'clearance-audit.json'),'w'),indent=2)
assert not out,'Door intersects fixed body at an open inspection angle'
