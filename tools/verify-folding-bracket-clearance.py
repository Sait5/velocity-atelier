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
body=V((-.9178208532,-.88,.54));length=.127;preferred=V((0,0,1));contacts=[]
for n,p in enumerate(poses):
 moving=p@hook;axis=(moving-body).normalized();bend=(preferred-axis*preferred.dot(axis)).normalized();elbow=(moving+body)*.5+bend*math.sqrt(max(0,length*length-(moving-body).length_squared/4));inv=p.inverted()
 for i,(a,b) in enumerate([(body,elbow),(elbow,moving)]):
  u=(b-a).normalized();v=u.cross(V((0,0,1))).normalized();w=u.cross(v)
  for offset in [V((0,0,0)),v*.006,-v*.006,w*.003,-w*.003]:
   start=a+u*.018+offset;end=b-u*.018+offset
   for label,tree,s,d in [('body',fixed,start,u),('door',door,inv@start,(inv.to_3x3()@u).normalized())]:
    if tree.ray_cast(s,d,(end-start).length)[0]:contacts.append((n,i,label))
report={'samples':241,'clearanceProbeContacts':contacts,'bodyAnchor':list(body),'doorAnchor':list(hook),'linkLength':length}
json.dump(report,open('tools/generated/folding-bracket-clearance.json','w'),indent=2);print(report,flush=True)

