import bpy,os,json
from collections import Counter
from mathutils.kdtree import KDTree
ROOT=os.getcwd()
def read(file):
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/models',file));bpy.context.view_layer.update();points=[];uvs=[];triangles=0;materials=Counter()
 for o in bpy.context.scene.objects:
  if o.type!='MESH':continue
  points.extend(tuple(o.matrix_world@v.co) for v in o.data.vertices);triangles+=len(o.data.polygons)
  if o.data.uv_layers.active:uvs.extend(tuple(v.uv) for v in o.data.uv_layers.active.data)
  for f in o.data.polygons:materials[o.data.materials[f.material_index].name]+=1
 return points,uvs,triangles,materials
before=read('porsche-911-gt3.glb');after=read('porsche-911-gt3-door-assembly.glb')
def distance(a,b):
 kd=KDTree(len(b))
 for i,v in enumerate(b):kd.insert(v if len(v)==3 else (*v,0),i)
 kd.balance();return max(kd.find(v if len(v)==3 else (*v,0))[2] for v in a)
report={'triangles_before':before[2],'triangles_after':after[2],'max_world_vertex_error_m':max(distance(before[0],after[0]),distance(after[0],before[0])),'max_uv_error':max(distance(before[1],after[1]),distance(after[1],before[1])),'material_face_counts_unchanged':before[3]==after[3]}
assert report['triangles_before']==report['triangles_after'];assert report['max_world_vertex_error_m']<1e-5;assert report['max_uv_error']<1e-6;assert report['material_face_counts_unchanged']
json.dump(report,open('tools/generated/porsche/trim-preservation.json','w'),indent=2);print('PRESERVATION',report)
