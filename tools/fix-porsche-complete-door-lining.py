import bpy,bmesh,os,json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/models/porsche-911-gt3-door-assembly.glb'))
doors=[bpy.data.objects['Porsche door L'],bpy.data.objects['Porsche door R']]
report=[]
for source in list(bpy.context.scene.objects):
 if source.type!='MESH' or not ('_Interior_Geo' in source.name or 'fixed sill' in source.name.lower()) or source.parent in doors:continue
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
  if side is not None and lo[0]>-.65 and hi[0]<.43 and lo[2]>.30 and hi[2]<.9 and (hi[2]>.42 or (hi[0]-lo[0]>.3 and hi[2]-lo[2]>.025)):
   parts[side].update(ids);report.append({'source':source.name,'side':side,'lo':lo,'hi':hi})
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
  o=bpy.data.objects.new(source.name if side==2 else 'Porsche complete door lining '+str(side),data);bpy.context.scene.collection.objects.link(o);o.parent=source.parent if side==2 else doors[side];o.matrix_world=source.matrix_world.copy()
 bpy.data.objects.remove(source,do_unlink=True)
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public/models/porsche-911-gt3-side-door-fixed.glb'),export_format='GLB')
json.dump(report,open(os.path.join(ROOT,'tools/generated/porsche/complete-lining-repair.json'),'w'),indent=2)
print('MOVED_COMPONENTS',len(report))
