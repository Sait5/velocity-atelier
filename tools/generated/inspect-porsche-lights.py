import bpy,os
from collections import defaultdict
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/porsche-911-gt3-door-assembly.glb'))
o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and any('2025LightA_' in m.name for m in o.data.materials))
faces=o.data.polygons;touch=defaultdict(list)
for f in faces:
 for v in f.vertices:touch[v].append(f.index)
unseen=set(range(len(faces)));uv=o.data.uv_layers.active.data
while unseen:
 seed=unseen.pop();todo=[seed];part=[seed]
 while todo:
  for v in faces[todo.pop()].vertices:
   for n in touch[v]:
    if n in unseen:unseen.remove(n);todo.append(n);part.append(n)
 pts=[o.matrix_world@o.data.vertices[v].co for i in part for v in faces[i].vertices]
 lo=[min(p.x for p in pts),min(p.z for p in pts),min(p.y for p in pts)];hi=[max(p.x for p in pts),max(p.z for p in pts),max(p.y for p in pts)]
 us=[uv[j].uv for i in part for j in faces[i].loop_indices]
 print('LIGHT',len(part),[round(v,4) for v in lo],[round(v,4) for v in hi],'UV',[round(min(v[k] for v in us),4) for k in [0,1]],[round(max(v[k] for v in us),4) for k in [0,1]],flush=True)
