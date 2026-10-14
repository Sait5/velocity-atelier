import bpy,json,os
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'tools/generated/porsche/source.blend'))
results=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or not any(t in o.name for t in ['_Paint_Geo','_Interior_Geo','_Window_Geo','_Carbon1_Geo','_Base_Geo','_Coloured_Geo']):continue
 pts=[o.matrix_world@v.co for v in o.data.vertices];parent=list(range(len(pts)));same={}
 def find(i):
  while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
  return i
 def union(a,b):parent[find(a)]=find(b)
 for i,p in enumerate(pts):
  k=tuple(round(v,7) for v in p)
  if k in same:union(i,same[k])
  else:same[k]=i
 for f in o.data.polygons:
  for i in f.vertices:union(f.vertices[0],i)
 groups={}
 for f in o.data.polygons:groups.setdefault(find(f.vertices[0]),[]).append(f.index)
 for key,faces in groups.items():
  if len(faces)<15:continue
  vs={i for fi in faces for i in o.data.polygons[fi].vertices};p=[pts[i]*100 for i in vs]
  r={'object':o.name,'faces':faces,'count':len(faces),'min':[round(min(v[i] for v in p),3) for i in range(3)],'max':[round(max(v[i] for v in p),3) for i in range(3)]};results.append(r)
open(os.path.join(ROOT,'tools/generated/porsche/components.json'),'w').write(json.dumps(results))
for r in results:
 if r['count']>120:print(r['object'].split('_Geo')[0],r['count'],r['min'],r['max'])
