import bpy,os
from collections import defaultdict
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/ferrari-italia-complete.glb'))
o=next(o for o in bpy.context.scene.objects if 'doorRF_body_2__carpaint' in o.name)
p=[o.matrix_world@v.co for v in o.data.vertices];faces=list(o.data.polygons);touch=defaultdict(list)
for f in faces:
 for v in f.vertices:touch[tuple(round(x,5) for x in p[v])].append(f.index)
unseen=set(range(len(faces)))
while unseen:
 seed=unseen.pop();part={seed};todo=[seed]
 while todo:
  f=faces[todo.pop()]
  for v in f.vertices:
   for nxt in touch[tuple(round(x,5) for x in p[v])]:
    if nxt in unseen:unseen.remove(nxt);part.add(nxt);todo.append(nxt)
 verts={i for fi in part for i in faces[fi].vertices};ps=[p[i] for i in verts]
 if any(.44<v.x<.51 and .8<v.y<.92 and .63<v.z<.7 for v in ps):print('PART',len(part),[min(v[i] for v in ps) for i in range(3)],[max(v[i] for v in ps) for i in range(3)])
