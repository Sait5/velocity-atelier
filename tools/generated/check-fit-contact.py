import bpy,os,json,math
from mathutils import Vector as V,Matrix as M
from mathutils.bvhtree import BVHTree
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('../blender/Revuelto-Simple-Door-Bracket.blend'));bpy.context.scene.frame_set(1)
fixedp=[];fixedf=[];doorp=[];doorf=[];fixednames=[];doornames=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or o.hide_render or o.name.startswith(('Original','DoorJambLFPiston','DoorJambRFPiston')):continue
 moving=o.name.startswith(('DoorLF_','DoorJambLF_','DoorCardLF','WingMirrorL_','MirrorBaseL_','GlassLM_'))
 ps,fs=(doorp,doorf) if moving else (fixedp,fixedf)
 (doornames if moving else fixednames).extend([o.name]*len(o.data.polygons));off=len(ps);ps.extend(o.matrix_world@v.co for v in o.data.vertices);fs.extend([[off+i for i in p.vertices] for p in o.data.polygons])
fixed=BVHTree.FromPolygons(fixedp,fixedf);door=BVHTree.FromPolygons(doorp,doorf)
o=bpy.data.objects['Body_PaintedMetal'];panel=BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[p.vertices[:] for p in o.data.polygons])
C=M(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
raw=json.load(open('tools/generated/revuelto-approved-door-poses.json'));poses=[C.inverted()@M([[a[c*4+r] for c in range(4)] for r in range(4)])@C for a in raw]
hook=V((-.94,-.884,.675))
def hits(tree,a,b):
 d=b-a
 if d.length<.04:return False
 direction=d.normalized();return tree.ray_cast(a+direction*.018,direction,d.length-.036)[0] is not None
body=V((-.923877954,-.92,.54));length=.1505941886;preferred=V((1,0,0))
for n,p in enumerate(poses):
 moving=p@hook;direction=(moving-body).normalized();bend=(preferred-direction*preferred.dot(direction)).normalized();elbow=(moving+body)*.5+bend*math.sqrt(max(0,length*length-(moving-body).length_squared/4));inv=p.inverted()
 for i,(a,b) in enumerate([(body,elbow),(elbow,moving)]):
  for label,tree,u,v in [('fixed',fixed,a,b),('door',door,inv@a,inv@b)]:
   d=v-u;hit=tree.ray_cast(u+d.normalized()*.018,d.normalized(),d.length-.036)
   if hit[0]:print('CONTACT',n,i,label,(fixednames if label=='fixed' else doornames)[hit[2]],list(hit[0]),flush=True)

