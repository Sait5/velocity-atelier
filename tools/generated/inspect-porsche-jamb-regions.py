import bpy,os,math,json
from collections import defaultdict
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/porsche-911-gt3-door-assembly.glb'))
o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.polygons)==25052)
faces=o.data.polygons;edges=defaultdict(list)
for f in faces:
 for e in f.edge_keys:edges[tuple(sorted(e))].append(f.index)
for degrees in [20,35,50]:
 adj=defaultdict(list)
 for ff in edges.values():
  if len(ff)==2 and faces[ff[0]].normal.dot(faces[ff[1]].normal)>math.cos(math.radians(degrees)):
   adj[ff[0]].append(ff[1]);adj[ff[1]].append(ff[0])
 unseen=set(range(len(faces)));parts=[]
 while unseen:
  seed=unseen.pop();part=[seed];todo=[seed]
  while todo:
   for n in adj[todo.pop()]:
    if n in unseen:unseen.remove(n);todo.append(n);part.append(n)
  ps=[o.matrix_world@o.data.vertices[v].co for i in part for v in faces[i].vertices]
  lo=[min(p.x for p in ps),min(p.z for p in ps),min(abs(p.y) for p in ps)];hi=[max(p.x for p in ps),max(p.z for p in ps),max(abs(p.y) for p in ps)]
  if lo[0]>-1 and hi[0]<1.2 and lo[2]>.5 and len(part)>15:
   parts.append({'count':len(part),'lo':lo,'hi':hi,'faces':part})
 print('REGIONS',degrees,[(p['count'],[round(x,3) for x in p['lo']],[round(x,3) for x in p['hi']]) for p in parts],flush=True)
 json.dump({'name':o.name,'parts':parts},open('tools/generated/porsche-jamb-regions-'+str(degrees)+'.json','w'))
