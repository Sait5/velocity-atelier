import bpy,os,json,math
from mathutils import Vector as V,Matrix as M,Quaternion as Q
from mathutils.bvhtree import BVHTree
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/lamborghini-revuelto.glb'))
basis=M.Translation(V((.10516,0,.00108)))@M.Rotation(-math.pi/2,4,'Z')
for o in list(bpy.context.scene.objects):
 if o.parent is None:o.matrix_world=basis@o.matrix_world
bpy.context.view_layer.update()
ps=[];fs=[];fp=[];ff=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or not any(m and 'paint' in m.name.lower() for m in o.data.materials):continue
 moving=o.name.startswith(('DoorLF_','DoorJambLF_','DoorCardLF','WingMirrorL_','MirrorBaseL_','GlassLM_'))
 points,faces=(ps,fs) if moving else (fp,ff);off=len(points);points.extend(o.matrix_world@v.co for v in o.data.vertices);faces.extend([v+off for v in f.vertices] for f in o.data.polygons)
fixed=BVHTree.FromPolygons(fp,ff);baseline=set(BVHTree.FromPolygons(ps,fs).overlap(fixed));results=[]
for x in [-1.10,-1.16,-1.04]:
 for lateral in [.84,.86,.88]:
  for yaw in [.05,.15,.25,.4]:
   pivot=V((x,-lateral,.64));axis=V((.05,-1,-yaw)).normalized();hits=[]
   for i in range(1,41):
    rot=Q(axis,1.12*i/40);hits.append(len(set(BVHTree.FromPolygons([pivot+rot@(p-pivot) for p in ps],fs).overlap(fixed))-baseline))
   results.append({'pivot':list(pivot),'yaw':yaw,'total':sum(hits),'hits':hits})
results.sort(key=lambda r:r['total']);json.dump(results,open('tools/generated/revuelto-motion-fit.json','w'),indent=2);print(json.dumps(results[:3]),flush=True)
