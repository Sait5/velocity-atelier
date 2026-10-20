"""Which pieces of the Ddiaz Aston Martin Valhalla belong to the doors, decided against the door and body meshes of the
"Aston Martin Valhalla" BeamNG mod by S7471C (its doors open in the game, and its model shares the source's axes and
scale: front -y, driver's side +x, metres). Writes tools/source-assets/cars/valhalla-door-pieces.json, read by
tools/prepare-valhalla-model.py.

A piece (vertex-connected faces of one source object) is a door piece when
 - it lies on the door's half of the roof (reaching above 1.05 m, centred above 0.88 m, not crossing the middle) and
   on the mod's door (median distance under 4 cm): the Valhalla's doors cut into the roof, and the mod's body has only
   rails there; or
 - it is nearer the mod's door than its body, within 3 cm of the door (median over the piece's vertices), and stays
   outboard of 0.4 m (the door card is 0.53 m out): a dashboard trim strip touching the door would otherwise go with it.
Usage: node tools/extract-collada-parts.cjs <mod>/vehicles/am/am.dae <parts.json> am_door_L am_doorglass_L am_mirror_L
         am_door_R am_doorglass_R am_mirror_R <every other node of am.dae but the wheels, tyres, calipers and suspension>
       blender -b blender-cars/backups/valhalla-original.blend --python tools/match-valhalla-doors.py -- <parts.json> <out.json>"""
import bpy,sys,json,statistics
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a=sys.argv[sys.argv.index('--')+1:];parts=json.load(open(a[0]));OUT=a[1]
S=100  # the Ddiaz model is modelled at 1:100
def tree(names):
 V=[];T=[]
 for n in names:
  src=parts[n]['V'];bad={i for i,v in enumerate(src) if any(c is None for c in v)}
  b=len(V);V+=[Vector(v) if i not in bad else Vector((0,0,-99)) for i,v in enumerate(src)];T+=[[b+i for i in t] for t in parts[n]['T'] if not bad.intersection(t)]
 return BVHTree.FromPolygons(V,T)
doors={1:tree(['am_door_L','am_doorglass_L','am_mirror_L']),-1:tree(['am_door_R','am_doorglass_R','am_mirror_R'])}
body=tree([n for n in parts if not n.startswith(('am_door','am_mirror'))])
SKIP=('polySurface','SM_Hub_','SM_Disk_','SM_Brake_')
result={};count={1:0,-1:0}
for o in bpy.data.objects:
 if o.type!='MESH' or any(s in o.name for s in SKIP):continue
 me=o.data;M=o.matrix_world;parent=list(range(len(me.vertices)))
 def find(q):
  while parent[q]!=q:parent[q]=parent[parent[q]];q=parent[q]
  return q
 for p in me.polygons:
  r=find(p.vertices[0])
  for v in p.vertices[1:]:
   q=find(v)
   if q!=r:parent[q]=r
 W=[M@v.co*S for v in me.vertices];pieces={}
 for p in me.polygons:pieces.setdefault(find(p.vertices[0]),set()).update(p.vertices)
 for vs in pieces.values():
  vs=sorted(vs);P=[W[v] for v in vs]
  lo=Vector([min(p[i] for p in P) for i in range(3)]);hi=Vector([max(p[i] for p in P) for i in range(3)])
  if lo.x<0<hi.x:continue
  side=1 if lo.x>=0 else -1;sample=vs[::max(1,len(vs)//120)]
  dd=statistics.median(doors[side].find_nearest(W[v])[3] or 9 for v in sample)
  db=statistics.median(body.find_nearest(W[v])[3] or 9 for v in sample)
  c=(lo+hi)/2
  roof=hi.z>1.05 and c.z>.88 and min(abs(lo.x),abs(hi.x))>=.09 and max(abs(lo.x),abs(hi.x))<.78 and -.95<c.y<.52
  inboard=min(abs(lo.x),abs(hi.x))
  if (roof and dd<.04) or (dd<db and dd<.03 and inboard>.4):
   result.setdefault(o.name,{})[str(vs[0])]='L' if side>0 else 'R';count[side]+=len(vs)
json.dump(result,open(OUT,'w'),indent=0,sort_keys=True)
print('MATCH door pieces',sum(len(v) for v in result.values()),'vertices L',count[1],'R',count[-1])
