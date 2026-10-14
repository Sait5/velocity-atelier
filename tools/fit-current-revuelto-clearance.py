import bpy,os,math,json
from mathutils import Matrix as M,Vector as V
from mathutils.bvhtree import BVHTree
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=os.path.join(os.path.dirname(ROOT),'blender/Revuelto-Two-Arm-Mechanism.blend'))
mount=bpy.data.objects['Door_Mount'];poses=[]
for frame in range(1,121,3):
 bpy.context.scene.frame_set(frame);poses.append(mount.matrix_local.copy())
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
from collections import Counter
conversion=M(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
samples=json.load(open(os.path.join(ROOT,'tools/generated/revuelto-current-door-poses.json')))
fits=[]
for dx in [0,.025,.05]:
 for dy in [.02,.05,.08]:
  for dz in [.025,.05,.075]:
   total=0;bad=0
   for index in range(4,len(samples),8):
    values=samples[index];p=index/(len(samples)-1);u=min(1,p/.18);u=u*u*(3-2*u)
    matrix=M([[values[c*4+r] for c in range(4)] for r in range(4)])
    matrix.translation+=V((dx*u,dy*u,dz*u))
    transform=conversion.inverted()@matrix@conversion
    count=len(set(BVHTree.FromPolygons([transform@v for v in ps],fs).overlap(fixed))-baseline)
    total+=count;bad+=bool(count)
   fits.append({'dx':dx,'dy':dy,'dz':dz,'total':total,'bad':bad})
fits.sort(key=lambda r:(r['bad'],r['total']))
print('CLEARANCE_FIT',fits[:8],flush=True)
json.dump(fits,open(os.path.join(ROOT,'tools/generated/revuelto-release-fit.json'),'w'),indent=2)
raise SystemExit
contacts=Counter()
for index,values in enumerate(samples):
 matrix=M([[values[c*4+r] for c in range(4)] for r in range(4)])
 transform=conversion.inverted()@matrix@conversion
 pairs=set(BVHTree.FromPolygons([transform@p for p in ps],fs).overlap(fixed))-baseline
 contacts.update((movingNames[a],fixedNames[b]) for a,b in pairs)
 results.append({'progress':index/(len(samples)-1),'contacts':len(pairs)})
report={'samples':len(samples),'contactFrames':[r for r in results if r['contacts']],'objects':{str(k):v for k,v in contacts.items()}}
json.dump(report,open(os.path.join(ROOT,'tools/generated/revuelto-current-clearance.json'),'w'),indent=2)
print('CURRENT_CLEARANCE',report,flush=True)

