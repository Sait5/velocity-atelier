import bpy,json,os
from mathutils import Vector
base=os.path.join(os.path.dirname(os.path.abspath(__file__)),'generated/porsche')
bpy.ops.wm.open_mainfile(filepath=os.path.join(base,'source.blend'))
result=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 pts=[o.matrix_world@v.co*100 for v in o.data.vertices];uv=o.data.uv_layers.active.data if o.data.uv_layers.active else None;parent=list(range(len(o.data.polygons)));seen={}
 def find(i):
  while i!=parent[i]:parent[i]=parent[parent[i]];i=parent[i]
  return i
 def key(li):
  loop=o.data.loops[li];return tuple(round(v,5) for v in pts[loop.vertex_index])+(tuple(round(v,5) for v in uv[li].uv) if uv else (0,0))
 for f in o.data.polygons:
  ls=list(f.loop_indices)
  for a,b in zip(ls,ls[1:]+ls[:1]):
   k=tuple(sorted([key(a),key(b)]))
   if k in seen:parent[find(f.index)]=find(seen[k])
   else:seen[k]=f.index
 groups={}
 for f in o.data.polygons:groups.setdefault(find(f.index),[]).append(f.index)
 for faces in groups.values():
  vs={v for i in faces for v in o.data.polygons[i].vertices};ps=[pts[i] for i in vs];us=[uv[li].uv for i in faces for li in o.data.polygons[i].loop_indices] if uv else [Vector((0,0))]
  result.append(dict(object=o.name,faces=faces,count=len(faces),min=[min(p[i] for p in ps) for i in range(3)],max=[max(p[i] for p in ps) for i in range(3)],uvmin=[min(u[i] for u in us) for i in range(2)],uvmax=[max(u[i] for u in us) for i in range(2)]))
json.dump(result,open(os.path.join(base,'uv-components.json'),'w'))
for r in result:
 if '_WindowInside' in r['object'] or ('_Base_Geo' in r['object'] and r['min'][1]>-.9 and r['max'][1]<.9):print(r['count'],[round(x,3) for x in r['min']],[round(x,3) for x in r['max']],[round(x,3) for x in r['uvmin']],[round(x,3) for x in r['uvmax']])
print('Largest',[(r['count'],r['min'],r['max']) for r in sorted(result,key=lambda r:-r['count'])[:6]])
