exec(open('tools/audit-revuelto-floating.py',encoding='utf8').read().split("print('FLOATING_COMPONENTS'")[0])
out={}
for mesh in [bpy.data.objects[n] for n in ['DoorJambLF_CarPaint','DoorJambRF_CarPaint','DoorSill_CarPaint','DoorSill_PaintedMetal']]:
 parents=list(range(len(mesh.data.vertices)))
 def find(a):
  while parents[a]!=a:parents[a]=parents[parents[a]];a=parents[a]
  return a
 for edge in mesh.data.edges:
  a,b=map(find,edge.vertices);parents[b]=a
 groups={}
 for v in mesh.data.vertices:groups.setdefault(find(v.index),[]).append(v.index)
 selected=set()
 for key,ids in groups.items():
  points=[mesh.matrix_world@mesh.data.vertices[i].co for i in ids];lo=[min(p[k] for p in points) for k in range(3)];hi=[max(p[k] for p in points) for k in range(3)]
  if mesh.name.startswith('DoorJamb'):
   if len(ids) in [194,90,153] and lo[0]>-.96 and hi[0]<-.79 and lo[2]>.51 and hi[2]<.71:selected.add(key)
  elif lo[0]>-1.06 and hi[0]<-.78 and lo[2]>.50 and hi[2]<.76 and min(abs(p.y) for p in points)>.82 and max(abs(p.y) for p in points)<1.0:selected.add(key)
 def point(v):return ','.join(str(round(n*100000)) for n in (v.x,v.z,-v.y))
 faces=[';'.join(sorted(point(mesh.data.vertices[i].co) for i in f.vertices)) for f in mesh.data.polygons if find(f.vertices[0]) in selected]
 assert faces,(mesh.name,groups.keys());out[mesh.name]=faces;print('IDENTIFIED_LEGACY_HOOK',mesh.name,len(faces),'faces',flush=True)
os.makedirs('app/three/data',exist_ok=True);json.dump(out,open('app/three/data/revueltoLegacyHingeFaces.json','w'))

