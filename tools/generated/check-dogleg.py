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
hook=V((-.94,-.884,.675))
def hits(tree,a,b):
 d=b-a
 if d.length<.04:return False
 direction=d.normalized();return tree.ray_cast(a+direction*.018,direction,d.length-.036)[0] is not None
body=V((-.923877954,-.92,.54));length=.151;preferred=V((1,0,0))
for offset,away_direction in [(s,V((x,y,z))) for s in [.015,.03,.05] for x in [-1,0,1] for y in [-1,0,1] for z in [-1,0,1] if x or y or z]:
 count=0
 for n,p in enumerate(poses):
  moving=p@hook;direction=(moving-body).normalized();bend=(preferred-direction*preferred.dot(direction)).normalized();elbow=(moving+body)*.5+bend*math.sqrt(max(0,length*length-(moving-body).length_squared/4));inv=p.inverted()
  for i,(a,b) in enumerate([(body,elbow),(elbow,moving)]):
   axis=(b-a).normalized();away=(away_direction-axis*away_direction.dot(axis)).normalized()*offset if i else V((0,0,0))
   path=[a,a.lerp(b,.2)+away,a.lerp(b,.8)+away,b]
   for k,(u,v) in enumerate(zip(path,path[1:])):
    d=v-u;start=u+d.normalized()*(.018 if k==0 else 0);end=v-d.normalized()*(.018 if k==2 else 0)
    count+=bool(fixed.ray_cast(start,d.normalized(),(end-start).length)[0] or door.ray_cast(inv@start,(inv.to_3x3()@d).normalized(),(end-start).length)[0])
 if count<10:print('DOGLEG',offset,list(away_direction),count,flush=True)


