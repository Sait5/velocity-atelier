import bpy,os,json,sys
from mathutils import Matrix as M,Vector as V
from mathutils.bvhtree import BVHTree
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
key=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'porsche'
source='porsche-911-gt3-door-assembly.glb' if key=='porsche' else 'ferrari-italia-complete.glb'
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/models',source))
data=json.load(open(os.path.join(ROOT,'tools/generated',key+'-compact-hinges.json')))
C=M(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
def matrix(a):return C.inverted()@M([[a[c*4+r] for c in range(4)] for r in range(4)])@C
names=[name if name in bpy.data.objects else name.replace('_',' ') for name in data['doorNames']]
doors=[bpy.data.objects[name] for name in names]
allmoving=set(o for door in doors for o in door.children_recursive)
fp=[];ff=[];mp=[[],[]];mf=[[],[]]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or not any(m and 'paint' in m.name.lower() for m in o.data.materials):continue
 side=next((i for i,door in enumerate(doors) if o in door.children_recursive),None)
 ps,fs=(mp[side],mf[side]) if side is not None else (fp,ff)
 off=len(ps);ps.extend(o.matrix_world@v.co for v in o.data.vertices);fs.extend([[off+i for i in p.vertices] for p in o.data.polygons])
fixed=BVHTree.FromPolygons(fp,ff)
rest=[door.matrix_world.copy() for door in doors];baseline=[set(BVHTree.FromPolygons(mp[i],mf[i]).overlap(fixed)) for i in range(2)]
results=[];i=0
for x in [-.85,-.9,-.95,-1.0,-1.05]:
 for y in [.80,.84,.88,.92,.96]:
  pivot=V((x,y,.651469));hits=[]
  for p in [.002,.01,.03,.06,.12,.2,.3,.4,.6,.8,1.0]:
   transform=M.Translation(pivot)@M.Rotation(1.12*p,4,'Z')@M.Translation(-pivot)
   pairs=set(BVHTree.FromPolygons([transform@q for q in mp[i]],mf[i]).overlap(fixed))-baseline[i]
   hits.append(len(pairs))
  results.append((sum(hits),x,y,hits))
results.sort();print('PIVOTS',results[:10],flush=True);json.dump(results,open(os.path.join(ROOT,'tools/generated/ferrari-side-pivot-fit.json'),'w'))
