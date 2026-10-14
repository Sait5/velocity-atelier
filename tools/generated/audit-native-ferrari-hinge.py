import bpy,os
from collections import defaultdict
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/ferrari-italia-complete.glb'))
for o in bpy.context.scene.objects:
 if o.type!='MESH' or o.parent and o.parent.name in ['door_L','door_R'] or not any(m.name=='carpaint' for m in o.data.materials):continue
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
  if len(part)>5 and -.95<lo[0] and hi[0]<-.50 and .65<abs((lo[1]+hi[1])/2)<1.0 and .2<lo[2]<.9:print('HINGE',o.name,len(part),lo,hi,flush=True)
