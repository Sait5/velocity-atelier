import bpy,os
from collections import defaultdict
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/porsche-911-gt3-door-assembly.glb'))
o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.parent and o.parent.name=='Porsche wheel 0')
faces=o.data.polygons;touch=defaultdict(list)
for f in faces:
 for v in f.vertices:touch[v].append(f.index)
unseen=set(range(len(faces)))
while unseen:
 seed=unseen.pop();todo=[seed];part=[seed]
 while todo:
  for v in faces[todo.pop()].vertices:
   for n in touch[v]:
    if n in unseen:unseen.remove(n);todo.append(n);part.append(n)
 pts=[o.matrix_local@o.data.vertices[v].co for i in part for v in faces[i].vertices]
 # Blender wheel plane is XZ, axle Y.
 radii=[(p.x*p.x+p.z*p.z)**.5 for p in pts]
 uv=o.data.uv_layers.active.data;uvs=[uv[j].uv for i in part for j in faces[i].loop_indices]
 if len(part)>20:print('ISLAND',len(part),'RAD',round(min(radii),4),round(max(radii),4),'AXIS',round(min(p.y for p in pts),4),round(max(p.y for p in pts),4),'UV',[round(min(v[k] for v in uvs),3) for k in [0,1]],[round(max(v[k] for v in uvs),3) for k in [0,1]],flush=True)
