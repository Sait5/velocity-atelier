import bpy,os,json
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/porsche-911-gt3.glb'))
out=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or 'door' in o.parent.name.lower():continue
 adj={i:set() for i in range(len(o.data.vertices))}
 for e in o.data.edges:a,b=e.vertices;adj[a].add(b);adj[b].add(a)
 todo=set(adj)
 while todo:
  v=todo.pop();ids={v};stack=[v]
  while stack:
   for n in adj[stack.pop()]:
    if n in todo:todo.remove(n);ids.add(n);stack.append(n)
  ps=[o.matrix_world@o.data.vertices[i].co for i in ids];lo=[min(p[j] for p in ps) for j in range(3)];hi=[max(p[j] for p in ps) for j in range(3)]
  if lo[0]>-.9 and hi[0]<.8 and (lo[1]>.58 or hi[1]<-.58) and lo[2]>.2:
   out.append({'name':o.name,'verts':len(ids),'lo':lo,'hi':hi,'mat':[m.name for m in o.data.materials]})
json.dump(out,open('tools/generated/porsche/fixed-door-candidates.json','w'),indent=2)
print(json.dumps(out))
