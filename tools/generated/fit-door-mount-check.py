import bpy,os,json,math
from mathutils import Vector as V,Matrix as M
from mathutils.bvhtree import BVHTree
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('../blender/Revuelto-Simple-Door-Bracket.blend'));bpy.context.scene.frame_set(1)
fixedp=[];fixedf=[];doorp=[];doorf=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or o.hide_render or o.name.startswith(('Original','DoorJambLFPiston','DoorJambRFPiston')):continue
 moving=o.name.startswith(('DoorLF_','DoorJambLF_','DoorCardLF','WingMirrorL_','MirrorBaseL_','GlassLM_'))
 ps,fs=(doorp,doorf) if moving else (fixedp,fixedf)
 off=len(ps);ps.extend(o.matrix_world@v.co for v in o.data.vertices);fs.extend([[off+i for i in p.vertices] for p in o.data.polygons])
fixed=BVHTree.FromPolygons(fixedp,fixedf);door=BVHTree.FromPolygons(doorp,doorf)
o=bpy.data.objects['Body_PaintedMetal'];panel=BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[p.vertices[:] for p in o.data.polygons])
C=M(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
raw=json.load(open('tools/generated/revuelto-approved-door-poses.json'));poses=[C.inverted()@M([[a[c*4+r] for c in range(4)] for r in range(4)])@C for a in raw]
hook=V((-.815,-.895,.535))
def hits(tree,a,b):
 d=b-a
 if d.length<.04:return False
 direction=d.normalized();return tree.ray_cast(a+direction*.018,direction,d.length-.036)[0] is not None
best=[]
for y in [-.82,-.85,-.88,-.91,-.94]:
 for z in [.38,.40,.42,.44,.46,.48,.50,.52,.54,.56,.58,.60,.62]:
  surface=panel.ray_cast(V((-.6,y,z)),V((-1,0,0)),.6)[0]
  if surface is None:continue
  body=surface+V((.012,0,0))
  maximum=max((p@hook-body).length for p in poses)
  for length in [maximum/2+.005,maximum/2+.015,maximum/2+.03]:
   for preferred in [V((x,y,z)) for x in [-1,0,1] for y in [-1,0,1] for z in [-1,0,1] if x or y or z]:
    collisions=0
    for p in poses[::4]:
     moving=p@hook;direction=(moving-body).normalized();bend=(preferred-direction*preferred.dot(direction)).normalized();elbow=(moving+body)*.5+bend*math.sqrt(max(0,length*length-(moving-body).length_squared/4))
     inv=p.inverted()
     for a,b in [(body,elbow),(elbow,moving)]:
      collisions+=hits(fixed,a,b) or hits(door,inv@a,inv@b)
    best.append((collisions,list(body),length,list(preferred),list(surface)))
best.sort(key=lambda r:r[0]);print('BEST',best[:12],flush=True);json.dump(best[:12],open('tools/generated/folding-mount-candidates.json','w'))




