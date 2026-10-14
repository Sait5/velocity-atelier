import bpy,os
from mathutils import Vector
from mathutils.bvhtree import BVHTree
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/porsche-911-gt3-door-assembly.glb'));bpy.context.view_layer.update()
ps=[];fs=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or not any('paint' in m.name.lower() for m in o.data.materials):continue
 off=len(ps);ps.extend(o.matrix_world@v.co for v in o.data.vertices);fs.extend([i+off for i in f.vertices] for f in o.data.polygons)
t=BVHTree.FromPolygons(ps,fs)
for x in [-.99,-.95,-.91,-.87,-.83,-.79,-.73]:
 for z in [.44,.74]:
  p,n,i,d=t.ray_cast(Vector((x,-2,z)),Vector((0,1,0)));print('SKIN',x,z,list(p) if p else None)
