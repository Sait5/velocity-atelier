import bpy,os,json,hashlib
folder=os.path.abspath('../blender')
for suffix in ['.blend1','.blend']:
 path=os.path.join(folder,'Revuelto-Simple-Door-Bracket'+suffix);bpy.ops.wm.open_mainfile(filepath=path);bpy.context.scene.frame_set(1)
 rows=[]
 for o in bpy.data.objects:
  if o.type=='MESH':
   sig=hashlib.sha256(repr(([tuple(v.co) for v in o.data.vertices],[tuple(p.vertices) for p in o.data.polygons])).encode()).hexdigest()
   rows.append({'name':o.name,'vertices':len(o.data.vertices),'polygons':len(o.data.polygons),'hash':sig,'hide':o.hide_render,'matrix':list(v for row in o.matrix_world for v in row)})
 json.dump(rows,open('tools/generated/user-bracket'+suffix+'.json','w'),indent=2)
 print('FILE',suffix,'objects',len(rows),'connector',[(r['name'],r['vertices'],r['polygons'],r['hide']) for r in rows if any(k in r['name'] for k in ['Original','Solid','Marked','Inner body'])],flush=True)
