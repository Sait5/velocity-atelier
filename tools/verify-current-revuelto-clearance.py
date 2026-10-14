import bpy,os,math,json,sys
from mathutils import Matrix as M,Vector as V
from mathutils.bvhtree import BVHTree
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
side='R' if '--' in sys.argv and sys.argv[sys.argv.index('--')+1:] == ['R'] else 'L'
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
 moving=o.name.startswith(('Door'+side+'F_','DoorJamb'+side+'F_','DoorCard'+side+'F','WingMirror'+side+'_','MirrorBase'+side+'_','Glass'+side+'M_'))
 points,faces=(ps,fs) if moving else (fp,ff);off=len(points);points.extend(o.matrix_world@v.co for v in o.data.vertices)
 masks=json.load(open(os.path.join(ROOT,'app/three/data/revueltoLegacyHingeFaces.json')))
 def point(v):return ','.join(str(round(n*100000)) for n in (v.x,v.z,-v.y))
 hidden=set(masks.get(o.name,[]))
 polygons=[f for f in o.data.polygons if ';'.join(sorted(point(o.data.vertices[i].co) for i in f.vertices)) not in hidden]
 faces.extend([v+off for v in f.vertices] for f in polygons)
 (movingNames if moving else fixedNames).extend([o.name]*len(polygons))
fixed=BVHTree.FromPolygons(fp,ff);baseline=set(BVHTree.FromPolygons(ps,fs).overlap(fixed));results=[]
from collections import Counter
print('REST_CONTACTS',Counter((movingNames[a],fixedNames[b]) for a,b in baseline),flush=True)
conversion=M(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
samples=json.load(open(os.path.join(ROOT,'tools/generated/revuelto-current-door-poses.json')))
contacts=Counter();depths=[];newTriangles=[]
baselineMoving={a for a,b in baseline};baselineFixed={b for a,b in baseline}
for index,values in enumerate(samples):
 matrix=M([[values[c*4+r] for c in range(4)] for r in range(4)])
 if side=='R':matrix=M.Diagonal((1,1,-1,1))@matrix@M.Diagonal((1,1,-1,1))
 transform=conversion.inverted()@matrix@conversion
 current=set(BVHTree.FromPolygons([transform@p for p in ps],fs).overlap(fixed));pairs=current-baseline
 newTriangles.extend((index,a,b) for a,b in pairs if a not in baselineMoving or b not in baselineFixed)
 contacts.update((movingNames[a],fixedNames[b]) for a,b in pairs)
 for a,b in pairs:
  vertices=[transform@ps[v] for v in fs[a]];q=[fp[v] for v in ff[b]]
  normal=(q[1]-q[0]).cross(q[2]-q[0]).normalized();distances=[(v-q[0]).dot(normal) for v in vertices]
  depths.append(min(abs(min(distances)),abs(max(distances))))
 results.append({'progress':index/(len(samples)-1),'contacts':len(pairs),'totalIncludingRestContacts':len(current)})
report={'samples':len(samples),'baselineContacts':len(baseline),'contactFrames':[r for r in results if r['contacts']],'newContactTriangles':newTriangles,'objects':{str(k):v for k,v in contacts.items()},'maxTrianglePlaneCrossingMetres':max(depths,default=0)}
json.dump(report,open(os.path.join(ROOT,'tools/generated/revuelto-current-clearance'+('-right' if side=='R' else '')+'.json'),'w'),indent=2)
print('CURRENT_CLEARANCE',report,flush=True)

