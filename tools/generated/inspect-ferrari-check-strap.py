import bpy,os,json
from collections import defaultdict
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/ferrari-italia-complete.glb'))
result=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 p=[o.matrix_world@v.co for v in o.data.vertices];faces=list(o.data.polygons);touch=defaultdict(list)
 for f in faces:
  for v in f.vertices:touch[tuple(round(x,5) for x in p[v])].append(f.index)
 unseen=set(range(len(faces)))
 while unseen:
  seed=unseen.pop();part={seed};todo=[seed]
  while todo:
   for v in faces[todo.pop()].vertices:
    for nxt in touch[tuple(round(x,5) for x in p[v])]:
     if nxt in unseen:unseen.remove(nxt);part.add(nxt);todo.append(nxt)
  verts={i for fi in part for i in faces[fi].vertices};ps=[p[i] for i in verts];lo=[min(v[i] for v in ps) for i in range(3)];hi=[max(v[i] for v in ps) for i in range(3)]
  if -.85<lo[0] and hi[0]<-.4 and .65<abs((lo[1]+hi[1])/2)<1.0 and .44<lo[2] and hi[2]<.60:
   result.append({'name':o.name,'parent':o.parent.name if o.parent else None,'faces':len(part),'lo':lo,'hi':hi,'materials':[m.name for m in o.data.materials]})
json.dump(result,open('tools/generated/ferrari-check-strap-components.json','w'),indent=2)
print(json.dumps(result),flush=True)