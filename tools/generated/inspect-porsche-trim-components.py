import bpy,os,json
from collections import defaultdict
from mathutils import Vector as V
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/porsche-911-gt3-door-assembly.glb'))
result=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or not any('2025Paint_' in m.name for m in o.data.materials):continue
 p=[o.matrix_world@v.co for v in o.data.vertices];faces=list(o.data.polygons);touch=defaultdict(list)
 for f in faces:
  for v in f.vertices:touch[v].append(f.index)
 unseen=set(range(len(faces)));out=[]
 while unseen:
  seed=unseen.pop();part={seed};todo=[seed]
  while todo:
   for v in faces[todo.pop()].vertices:
    for nxt in touch[v]:
     if nxt in unseen:unseen.remove(nxt);part.add(nxt);todo.append(nxt)
  ps=[V((p[v].x,p[v].z,abs(p[v].y))) for i in part for v in faces[i].vertices];lo=[min(v[i] for v in ps) for i in range(3)];hi=[max(v[i] for v in ps) for i in range(3)]
  if hi[0]>-1 and lo[0]<1 and hi[1]>.15 and lo[1]<1 and hi[2]>.65:
   out.append({'count':len(part),'lo':lo,'hi':hi,'faces':list(part)})
 result.append({'name':o.name,'parts':out})
 print('PARTS',o.parent.name,[(r['count'],[round(x,3) for x in r['lo']],[round(x,3) for x in r['hi']]) for r in out if r['count']>10],flush=True)
json.dump(result,open('tools/generated/porsche-trim-components.json','w'))
