import bpy,os,json
from mathutils import Matrix,Vector
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('../blender/Ferrari-Door-Hinges-Marked-Mounts.blend'))
s=bpy.context.scene;s.frame_set(1)
C=Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
for o in s.objects:
 if o.type!='MESH' or not any(m and 'paint' in m.name.lower() for m in o.data.materials):continue
 if 'body_body__carpaint' not in o.name:continue
 pts=[C@(o.matrix_world@v.co) for v in o.data.vertices]
 near=[]
 for f in o.data.polygons:
  p=sum((pts[i] for i in f.vertices),Vector())/len(f.vertices)
  if -.83<p.x<.80 and .17<p.y<.86 and .72<p.z<1:
   n=(pts[f.vertices[1]]-pts[f.vertices[0]]).cross(pts[f.vertices[2]]-pts[f.vertices[0]]).normalized()
   near.append({'p':list(p),'n':list(n),'v':[list(pts[i]) for i in f.vertices]})
 json.dump(near,open('tools/generated/jamb-faces.json','w'))
 print('FACES',len(near))
