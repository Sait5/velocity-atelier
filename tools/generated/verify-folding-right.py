import bpy,os,json,math
from mathutils import Vector as V,Matrix as M
from mathutils.bvhtree import BVHTree
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('../blender/Revuelto-Simple-Door-Bracket.blend'));bpy.context.scene.frame_set(1)
fixedp=[];fixedf=[];doorp=[];doorf=[];fixednames=[];doornames=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or o.hide_render or o.name.startswith(('Original','Marked inner','Inner body','DoorJambLFPiston','DoorJambRFPiston')):continue
 moving=o.name.startswith(('DoorRF_','DoorJambRF_','DoorCardRF','WingMirrorR_','MirrorBaseR_','GlassRM_'))
 ps,fs=(doorp,doorf) if moving else (fixedp,fixedf)
 (doornames if moving else fixednames).extend([o.name]*len(o.data.polygons));off=len(ps);ps.extend(o.matrix_world@v.co for v in o.data.vertices);fs.extend([[off+i for i in p.vertices] for p in o.data.polygons])
fixed=BVHTree.FromPolygons(fixedp,fixedf);door=BVHTree.FromPolygons(doorp,doorf)
o=bpy.data.objects['Body_PaintedMetal'];panel=BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[p.vertices[:] for p in o.data.polygons])
C=M(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
raw=json.load(open('tools/generated/revuelto-approved-door-poses.json'));poses=[C.inverted()@M([[a[c*4+r] for c in range(4)] for r in range(4)])@C for a in raw]
hook=V((-.815,.895,.535))
def hits(tree,a,b):
 d=b-a
 if d.length<.04:return False
 direction=d.normalized();return tree.ray_cast(a+direction*.018,direction,d.length-.036)[0] is not None
reflection=M.Diagonal((1,-1,1,1));poses=[reflection@p@reflection for p in poses]
contacts=[];intentional=0
for n,p in enumerate(poses):
 bpy.context.scene.frame_set(n+1);inv=p.inverted()
 anchors=[V((-.9178208532,.88,.54)),p@hook]
 for name in ['Original bracket R pillar arm','Original bracket R door arm']:
  node=bpy.data.objects[name];points=[node.matrix_world@v.co for v in node.data.vertices];faces=[f.vertices[:] for f in node.data.polygons]
  for label,tree,ps in [('body',fixed,points),('door',door,[inv@v for v in points])]:
   own=BVHTree.FromPolygons(ps,faces)
   overlaps=own.overlap(tree)
   for a,b in overlaps:
    from mathutils.geometry import intersect_ray_tri
    src=fixedp if label=='body' else doorp;polygons=fixedf if label=='body' else doorf
    arm=[ps[i] for i in faces[a]];other=[src[i] for i in polygons[b]];intersection=[]
    for triangle in [[arm[0],arm[i],arm[i+1]] for i in range(1,len(arm)-1)]:
     for t,edges in [(triangle,other),(other,triangle)]:
      for u,v in zip(edges,edges[1:]+edges[:1]):
       vector=v-u
       if vector.length<1e-8:continue
       hit=intersect_ray_tri(t[0],t[1],t[2],vector.normalized(),u,True)
       if hit is not None and (hit-u).dot(vector)>=-1e-8 and (hit-u).length<=vector.length+1e-8:intersection.append(hit if label=='body' else p@hit)
    if intersection and all(min((point-anchor).length for anchor in anchors)<.023 for point in intersection):intentional+=1
    elif intersection:contacts.append((n,name,label,a,b))
report={'samples':241,'linkTriangleContacts':contacts,'mountInterfaceContacts':intentional}
json.dump(report,open('tools/generated/folding-bracket-volume-clearance-right.json','w'),indent=2);print('VOLUME',len(contacts),contacts[:10],intentional,flush=True)




