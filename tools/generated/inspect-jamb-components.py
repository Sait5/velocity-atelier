import bpy,os,json
from collections import defaultdict
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('../blender/Ferrari-Door-Hinges-Marked-Mounts.blend'));bpy.context.scene.frame_set(1)
o=bpy.data.objects['fer_f142_10_s_lod0_body_body__carpaint_0'];p=[o.matrix_world@v.co for v in o.data.vertices];faces=list(o.data.polygons);touch=defaultdict(list)
for f in faces:
 for v in f.vertices:touch[v].append(f.index)
unseen=set(range(len(faces)));out=[]
while unseen:
 seed=unseen.pop();part={seed};todo=[seed]
 while todo:
  for v in faces[todo.pop()].vertices:
   for nxt in touch[v]:
    if nxt in unseen:unseen.remove(nxt);part.add(nxt);todo.append(nxt)
 ps=[p[v] for i in part for v in faces[i].vertices];lo=[min(v[i] for v in ps) for i in range(3)];hi=[max(v[i] for v in ps) for i in range(3)]
 if hi[0]>-.8 and lo[0]<.8 and hi[2]>.17 and lo[2]<.86 and lo[1]<-.73:out.append({'count':len(part),'lo':lo,'hi':hi,'faces':list(part)})
json.dump(out,open('tools/generated/jamb-components.json','w'))
print('COMPONENTS',[(r['count'],[round(x,3) for x in r['lo']],[round(x,3) for x in r['hi']]) for r in out],flush=True)
