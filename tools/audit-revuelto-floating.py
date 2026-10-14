import bpy,os,math,json
from mathutils import Matrix,Vector
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/lamborghini-revuelto.glb'))
basis=Matrix.Translation(Vector((.10516,0,.00108)))@Matrix.Rotation(-math.pi/2,4,'Z')
for o in bpy.context.scene.objects:
 if o.parent is None:o.matrix_world=basis@o.matrix_world
bpy.context.view_layer.update();result=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or not o.name.startswith(('DoorLF','DoorJambLF')):continue
 if not any(m and ('paint' in m.name.lower()) for m in o.data.materials):continue
 parents=list(range(len(o.data.vertices)))
 def find(a):
  while parents[a]!=a:parents[a]=parents[parents[a]];a=parents[a]
  return a
 for edge in o.data.edges:
  a,b=map(find,edge.vertices);parents[b]=a
 groups={}
 for v in o.data.vertices:groups.setdefault(find(v.index),[]).append(v.index)
 for vertices in groups.values():
  if len(vertices)<6:continue
  points=[o.matrix_world@o.data.vertices[i].co for i in vertices];lo=[min(p[k] for p in points) for k in range(3)];hi=[max(p[k] for p in points) for k in range(3)]
  if hi[2]<.70 or lo[0]>-.7 or hi[0]<-1.5 or hi[2]>1.15:continue
  result.append({'object':o.name,'vertices':len(vertices),'first':vertices[0],'min':lo,'max':hi})
print('FLOATING_COMPONENTS',json.dumps(result),flush=True)
