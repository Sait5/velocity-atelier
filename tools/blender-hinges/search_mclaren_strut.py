# Search strut pins (site axes, driver door): body pins on the aperture's front pillar face, door pins on the door's
# inner front face, each 2 cm off its surface. Keep pairs whose segment stays clear of door and body from 5 deg to fully
# open, with a gas-strut-like stroke (open/closed length <= 2.1). Print the best few (three.js coords too).
import bpy,math,random
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
P=Vector((-0.98,-0.86,0.86));AX=Vector((0,-.92,-.35)).normalized()
door=bpy.data.objects['McLaren door L'];root=bpy.data.objects['McLaren 750S']
def collect(objs,skip=''):
 vs=[];ps=[]
 for o in objs:
  if skip and skip in o.name:continue
  M=o.matrix_world;me=o.data;b=len(vs);vs+=[M@v.co for v in me.vertices];ps+=[[b+i for i in p.vertices] for p in me.polygons]
 return vs,ps
dv,dp=collect([o for o in door.children_recursive if o.type=='MESH'])
bv,bp=collect([o for o in root.children if o.type=='MESH'])
bt=BVHTree.FromPolygons(bv,bp);dt0=BVHTree.FromPolygons(dv,dp)
angles=[5,12,20,30,40,50,60,68,75]
rots=[Matrix.Translation(P)@Matrix.Rotation(math.radians(a),4,AX)@Matrix.Translation(-P) for a in angles]
dts=[BVHTree.FromPolygons([R@v for v in dv],dp) for R in rots]
def pin(tree,p,towards):
 loc,n,i,d=tree.find_nearest(p)
 if loc is None or d>.06:return None
 if n.dot(towards)<0:n=-n
 q=loc+n*.02
 if tree.find_nearest(q)[3]<.018:return None
 return q
def clear(a,b,trees):
 seg=b-a;L=seg.length;d=seg/L
 for t in trees:
  h=t.ray_cast(a+d*.025,d,L-.05)
  if h[0] is not None:return False
 return True
random.seed(3);bodies=[];doors=[]
for _ in range(500):
 p=Vector((random.uniform(-1.0,-.80),random.uniform(-.78,-.55),random.uniform(.25,.85)))
 q=pin(bt,p,Vector((.3,-.2,0)));
 if q:bodies.append(q)
for _ in range(500):
 p=Vector((random.uniform(-1.0,-.75),random.uniform(-.82,-.62),random.uniform(.40,.85)))
 q=pin(dt0,p,Vector((.2,.6,0)))
 if q:doors.append(q)
print('SEARCH candidates',len(bodies),len(doors))
best=[]
for b in bodies:
 for d0 in doors:
  L0=(d0-b).length
  if L0<.18 or L0>.36:continue
  lens=[];ok=True
  for R,t in zip(rots,dts):
   d=R@d0
   if (d-b).length<.15 or not clear(b,d,[bt,t]):ok=False;break
   lens.append((d-b).length)
  if not ok:continue
  stroke=max(lens)/min(lens+[L0])
  if stroke>2.1:continue
  # prefer struts in plain view in the aperture: forward and not buried low
  score=stroke+abs(b.z-.55)+abs(L0-.26)*2
  best.append((score,b,d0,L0,max(lens),stroke))
best.sort(key=lambda r:r[0])
three=lambda v:'(%.3f, %.3f, %.3f)'%(v.x,v.z,-v.y)
for s,b,d0,L0,Lmax,st in best[:8]:print('SEARCH score %.3f body %s door %s len %.3f->%.3f stroke %.2f'%(s,three(b),three(d0),L0,Lmax,st))
print('SEARCH found',len(best))
