exec(open('tools/fit-revuelto-motion.py').read().split('ps=[]')[0])
import bmesh
for o in bpy.context.scene.objects:
 if o.type!='MESH' or not o.name.startswith('DoorJambLF_'):continue
 bm=bmesh.new();bm.from_mesh(o.data);seen=set();out=[]
 for v in bm.verts:
  if v in seen:continue
  stack=[v];seen.add(v);verts=[]
  while stack:
   a=stack.pop();verts.append(a)
   for e in a.link_edges:
    b=e.other_vert(a)
    if b not in seen:seen.add(b);stack.append(b)
  points=[o.matrix_world@a.co for a in verts]
  out.append({'vertices':len(verts),'bounds':[[min(p[i] for p in points) for i in range(3)],[max(p[i] for p in points) for i in range(3)]]})
 print('COMPONENTS',o.name,json.dumps(out),flush=True)
