import bpy,os,json,math
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
base=os.path.join(os.path.dirname(__file__),'generated/porsche')
bpy.ops.wm.open_mainfile(filepath=os.path.join(base,'Porsche-911-GT3-rigged.blend'))
d=bpy.data.objects['Porsche door L'];root=bpy.data.objects['Porsche GT3 992.2']
fixed=[o for o in root.children if o.type=='MESH' and '_Paint_Geo' in o.name]
def tree(ps,polys):return BVHTree.FromPolygons(ps,polys,all_triangles=True)
ft=[tree([o.matrix_world@v.co for v in o.data.vertices],[list(p.vertices) for p in o.data.polygons]) for o in fixed]
moving=[([o.matrix_world@v.co for v in o.data.vertices],[list(p.vertices) for p in o.data.polygons]) for o in d.children if o.type=='MESH' and ('_Paint_Geo' in o.name or '_Coloured_Geo' in o.name)]
results=[]
for x in [-.75,-.73,-.71]:
 for y in [-.86,-.89,-.92]:
  pivot=Vector((x,y,.70));hits=[]
  for a in [.05,.1,.175,.35,.7,1.05]:
   rot=Matrix.Rotation(-a,3,'Z');count=0
   for ps,polys in moving:
    t=tree([pivot+rot@(p-pivot)+Vector((0,-.025*math.sin(min(a/.3,1)*math.pi/2),0)) for p in ps],polys)
    count+=sum(len(t.overlap(f)) for f in ft)
   hits.append(count)
  results.append(dict(pivot=[x,y,.70],hits=hits,total=sum(hits)))
results.sort(key=lambda r:r['total'])
print(json.dumps(results[:12],indent=2))
json.dump(results,open(os.path.join(base,'hinge-fit.json'),'w'),indent=2)
