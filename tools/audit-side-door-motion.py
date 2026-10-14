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
contacts=[]
for n,poses in enumerate(data['poses']):
 for i,values in enumerate(poses):
  transform=matrix(values)@rest[i].inverted();pairs=set(BVHTree.FromPolygons([transform@p for p in mp[i]],mf[i]).overlap(fixed))-baseline[i]
  outside=[(a,b) for a,b in pairs if a not in {a for a,b in baseline[i]} or b not in {b for a,b in baseline[i]}]
  if n in [1,90,240] and i==0:
   print('EXTERNAL',n,len(outside),flush=True)
   for a,b in outside[:3]:print('CONTACT_GEOMETRY',[[round(v,3) for v in mp[i][index]] for index in mf[i][a]],[[round(v,3) for v in fp[index]] for index in ff[b]],flush=True)
  if outside:contacts.append({'sample':n,'door':i,'pairs':len(outside)})
report={'car':key,'samples':241,'restContacts':[len(s) for s in baseline],'newPaintContactFrames':contacts};json.dump(report,open(os.path.join(ROOT,'tools/generated',key+'-compact-door-clearance.json'),'w'),indent=2);print('CLEARANCE',report,flush=True)


