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
body=V((-.912364006,-.9,.52));length=.20;preferred=V((1,0,0));steps=180
allowed=[]
for n,p in enumerate(poses):
 moving=p@hook;axis=(moving-body).normalized();base=(preferred-axis*preferred.dot(axis)).normalized();tangent=axis.cross(base);inv=p.inverted();row=[]
 for j in range(steps+1):
  angle=(j-steps/2)*math.pi/(steps/2);bend=base*math.cos(angle)+tangent*math.sin(angle);elbow=(moving+body)*.5+bend*math.sqrt(max(0,length*length-(moving-body).length_squared/4));clear=True
  for a,b in [(body,elbow),(elbow,moving)]:
   d=b-a;u=d.normalized();v=u.cross(V((0,0,1))).normalized();w=u.cross(v)
   for offset in [V((0,0,0)),v*.005,-v*.005,w*.005,-w*.005]:
    start=a+u*.023+offset;end=b-u*.023+offset
    if fixed.ray_cast(start,u,(end-start).length)[0] or door.ray_cast(inv@start,(inv.to_3x3()@u).normalized(),(end-start).length)[0]:clear=False;break
   if not clear:break
  row.append(clear)
 allowed.append(row)
 if not any(row):print('NO_CLEAR_ANGLE',n,flush=True)
# Dynamic programming prefers small, continuous changes of the folding plane.
cost=[((j-steps/2)/steps)**2 if safe else 1e30 for j,safe in enumerate(allowed[0])];parents=[]
for row in allowed[1:]:
 new=[];parent=[]
 for j,safe in enumerate(row):
  choices=[(cost[k]+.02*min(abs(j-k),steps-abs(j-k))**2+.002*((j-steps/2)/steps)**2,k) for k in range(steps+1)]
  value,k=min(choices);new.append(value if safe else 1e30);parent.append(k)
 parents.append(parent);cost=new
index=min(range(steps+1),key=lambda j:cost[j]);angles=[index]
for parent in reversed(parents):index=parent[index];angles.append(index)
angles=list(reversed(angles));result={'bodyPoint':[body.x,body.z,-body.y],'surfacePoint':[-.92436403,.52,.9],'linkLength':length,'foldAngles':[(j-steps/2)*math.pi/(steps/2) for j in angles]}
for i in range(1,len(result['foldAngles'])):
 while result['foldAngles'][i]-result['foldAngles'][i-1]>math.pi:result['foldAngles'][i]-=2*math.pi
 while result['foldAngles'][i]-result['foldAngles'][i-1]<-math.pi:result['foldAngles'][i]+=2*math.pi
json.dump(result,open('app/three/data/revueltoFoldingBracket.json','w'),indent=2)
print('ANGLE_RESULT',max(abs(a) for a in result['foldAngles']),max(abs(a-b) for a,b in zip(result['foldAngles'],result['foldAngles'][1:])),min(cost),flush=True)





