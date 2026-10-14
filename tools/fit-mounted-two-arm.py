import bpy,os,math,json
from mathutils import Matrix as M,Vector as V
from mathutils.bvhtree import BVHTree
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=os.path.join(os.path.dirname(ROOT),'blender/Revuelto-Two-Arm-Mechanism.blend'))
mount=bpy.data.objects['Door_Mount'];poses=[]
for frame in [1+i*119/40 for i in range(41)]:
 bpy.context.scene.frame_set(int(frame),subframe=frame%1);poses.append(mount.matrix_local.copy())
bpy.context.scene.frame_set(120);poses.append(mount.matrix_local.copy())
initial=poses[0].inverted()
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/models/lamborghini-revuelto.glb'))
basis=M.Translation(V((.10516,0,.00108)))@M.Rotation(-math.pi/2,4,'Z')
for o in bpy.context.scene.objects:
 if o.parent is None:o.matrix_world=basis@o.matrix_world
bpy.context.view_layer.update();ps=[];fs=[];fp=[];ff=[];movingNames=[];fixedNames=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or not any(m and 'paint' in m.name.lower() for m in o.data.materials):continue
 if o.name.startswith(('DoorJambLFPiston','DoorJambRFPiston')):continue
 moving=o.name.startswith(('DoorLF_','DoorJambLF_','DoorCardLF','WingMirrorL_','MirrorBaseL_','GlassLM_'))
 points,faces=(ps,fs) if moving else (fp,ff);off=len(points);points.extend(o.matrix_world@v.co for v in o.data.vertices)
 masks=json.load(open(os.path.join(ROOT,'app/three/data/revueltoLegacyHingeFaces.json')))
 def point(v):return ','.join(str(round(n*100000)) for n in (v.x,v.z,-v.y))
 hidden=set(masks.get(o.name,[]))
 polygons=[f for f in o.data.polygons if ';'.join(sorted(point(o.data.vertices[i].co) for i in f.vertices)) not in hidden]
 faces.extend([v+off for v in f.vertices] for f in polygons)
 (movingNames if moving else fixedNames).extend([o.name]*len(polygons))
fixed=BVHTree.FromPolygons(fp,ff);baseline=set(BVHTree.FromPolygons(ps,fs).overlap(fixed));results=[]
for x in [-1.10,-1.02,-.94]:
 for height in [.54,.60,.66]:
  for tilt in [.25,.45,.65]:
   for yaw in [-.2,0,.2]:
    placement=M.Translation(V((x,-.90,height)))@M.Rotation(yaw,4,'Z')@M.Rotation(tilt,4,'X')@M.Rotation(-math.pi/2,4,'Y')@M.Diagonal((.001,.001,.001,1))
    inverse=placement.inverted();hits=[]
    for pose in poses[1:]:
     transform=placement@pose@initial@inverse
     hits.append(len(set(BVHTree.FromPolygons([transform@p for p in ps],fs).overlap(fixed))-baseline))
    result={'x':x,'yaw':yaw,'height':height,'tilt':tilt,'total':sum(hits),'bad':sum(bool(n) for n in hits),'peak':max(hits),'hits':hits};results.append(result)
results.sort(key=lambda r:(r['bad'],r['total']));json.dump(results,open(os.path.join(ROOT,'tools/generated/two-arm-clearance.json'),'w'),indent=2);print('BEST_PLACEMENT',json.dumps(results[:5]),flush=True)
from collections import Counter
r=results[0];placement=M.Translation(V((r['x'],-.90,r['height'])))@M.Rotation(r['yaw'],4,'Z')@M.Rotation(r['tilt'],4,'X')@M.Rotation(-math.pi/2,4,'Y')@M.Diagonal((.001,.001,.001,1));transform=placement@poses[r['hits'].index(r['peak'])+1]@initial@placement.inverted();points=[transform@p for p in ps];pairs=set(BVHTree.FromPolygons(points,fs).overlap(fixed))-baseline
print('COLLISION_OBJECTS',Counter((movingNames[a],fixedNames[b]) for a,b in pairs),flush=True)
for name,count in Counter((movingNames[a],fixedNames[b]) for a,b in pairs).items():
 ids={v for a,b in pairs if (movingNames[a],fixedNames[b])==name for v in fs[a]};verts=[points[i] for i in ids];print('COLLISION_REGION',name,[min(p[k] for p in verts) for k in range(3)],[max(p[k] for p in verts) for k in range(3)],flush=True)







