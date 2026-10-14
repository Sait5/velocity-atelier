import bpy, bmesh, os, json
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/models/porsche-911-gt3.glb'))
doors=[bpy.data.objects['Porsche door L'],bpy.data.objects['Porsche door R']]
report=[]
for source in list(bpy.context.scene.objects):
 if source.type!='MESH' or '_Interior_Geo' not in source.name or source.parent in doors:continue
 adj={i:set() for i in range(len(source.data.vertices))}
 for e in source.data.edges:a,b=e.vertices;adj[a].add(b);adj[b].add(a)
 todo=set(adj);parts={0:set(),1:set()}
 while todo:
  v=todo.pop();ids={v};stack=[v]
  while stack:
   for n in adj[stack.pop()]:
    if n in todo:todo.remove(n);ids.add(n);stack.append(n)
  ps=[source.matrix_world@source.data.vertices[i].co for i in ids];lo=[min(p[j] for p in ps) for j in range(3)];hi=[max(p[j] for p in ps) for j in range(3)]
  side=0 if hi[1]<-.625 else 1 if lo[1]>.625 else None
  if side is not None and lo[0]>-.65 and hi[0]<.43 and lo[2]>.30 and .42<hi[2]<.80:parts[side].update(ids)
 if not any(parts.values()):continue
 buckets={0:[],1:[],2:[]}
 for f in source.data.polygons:
  side=next((s for s in [0,1] if all(v in parts[s] for v in f.vertices)),2);buckets[side].append(f.index)
 normals=[n.vector.copy() for n in source.data.corner_normals]
 for side,faces in buckets.items():
  if not faces:continue
  data=source.data.copy();attr=data.attributes.new('source_corner','INT','CORNER')
  for i,x in enumerate(attr.data):x.value=i
  bm=bmesh.new();bm.from_mesh(data);bm.faces.ensure_lookup_table();keep=set(faces);bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index not in keep],context='FACES');bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(data);bm.free()
  data.normals_split_custom_set([normals[x.value] for x in data.attributes['source_corner'].data]);data.attributes.remove(data.attributes['source_corner'])
  o=bpy.data.objects.new(source.name if side==2 else 'Porsche door trim '+str(side),data);bpy.context.scene.collection.objects.link(o);o.parent=source.parent if side==2 else doors[side];o.matrix_world=source.matrix_world.copy()
  report.append({'part':o.name,'side':side,'faces':len(faces)})
 bpy.data.objects.remove(source,do_unlink=True)
# The low inboard sill and luggage-release switches belong to the body.
# Some of these pieces were already incorrectly parented in the input asset.
for source in list(bpy.context.scene.objects):
 if source.type!='MESH' or '_Interior_Geo' not in source.name or source.parent not in doors:continue
 adj={i:set() for i in range(len(source.data.vertices))}
 for e in source.data.edges:a,b=e.vertices;adj[a].add(b);adj[b].add(a)
 todo=set(adj);fixed_ids=set()
 while todo:
  v=todo.pop();ids={v};stack=[v]
  while stack:
   for n in adj[stack.pop()]:
    if n in todo:todo.remove(n);ids.add(n);stack.append(n)
  ps=[source.matrix_world@source.data.vertices[i].co for i in ids];lo=[min(p[j] for p in ps) for j in range(3)];hi=[max(p[j] for p in ps) for j in range(3)]
  if lo[0]>-.65 and hi[0]<.43 and lo[2]>.30 and hi[2]<.42 and max(abs(lo[1]),abs(hi[1]))<.75:fixed_ids.update(ids)
 if not fixed_ids:continue
 buckets={False:[],True:[]}
 for f in source.data.polygons:buckets[all(v in fixed_ids for v in f.vertices)].append(f.index)
 normals=[n.vector.copy() for n in source.data.corner_normals]
 for is_fixed,faces in buckets.items():
  if not faces:continue
  data=source.data.copy();attr=data.attributes.new('source_corner','INT','CORNER')
  for i,x in enumerate(attr.data):x.value=i
  bm=bmesh.new();bm.from_mesh(data);bm.faces.ensure_lookup_table();keep=set(faces);bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index not in keep],context='FACES');bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(data);bm.free()
  data.normals_split_custom_set([normals[x.value] for x in data.attributes['source_corner'].data]);data.attributes.remove(data.attributes['source_corner'])
  o=bpy.data.objects.new('Porsche fixed sill switches' if is_fixed else source.name,data);bpy.context.scene.collection.objects.link(o);o.parent=doors[0].parent if is_fixed else source.parent;o.matrix_world=source.matrix_world.copy()
  report.append({'part':o.name,'fixed_sill':is_fixed,'faces':len(faces)})
 bpy.data.objects.remove(source,do_unlink=True)

bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public/models/porsche-911-gt3-door-assembly.glb'),export_format='GLB')
json.dump(report,open(os.path.join(ROOT,'tools/generated/porsche/trim-repair.json'),'w'),indent=2)
print(report)

