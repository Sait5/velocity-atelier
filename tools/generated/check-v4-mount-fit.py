import bpy,os
from mathutils import Vector
from mathutils.bvhtree import BVHTree
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('../blender/Bugatti-Repair/Bugatti-Tourbillon-Door-Fit-v4.blend'));s=bpy.context.scene;s.frame_set(1)
def surface(obs,offset=Vector()):
 vs=[];fs=[]
 for o in obs:
  start=len(vs);vs.extend(o.matrix_world@v.co+offset for v in o.data.vertices);fs.extend([start+i for i in p.vertices] for p in o.data.polygons)
 return BVHTree.FromPolygons(vs,fs)
body=[o for o in s.objects if o.type=='MESH' and o.parent and o.parent.name=='BUGATTI TOURBILLON' and any('Paint_' in m.name for m in o.data.materials)];body_bvh=surface(body)
for progress in [.4,.55,.7,.85,1.]:
 fit=max(0,min(1,(progress-.4)/.6));fit=fit*fit*(3-2*fit)
 for label,sign in [('LEFT',1),('RIGHT',-1)]:
  d=bpy.data.objects[label+' DOOR • Open control'];d['Open']=progress;d.update_tag();bpy.context.view_layer.update()
  skin=[o for o in d.children if o.type=='MESH' and any('Paint_' in m.name for m in o.data.materials)]
  original=set(surface(skin).overlap(body_bvh));fitted=set(surface(skin,Vector((-.04*fit,-sign*.08*fit,0))).overlap(body_bvh))
  print(progress,label,'before',len(original),'after',len(fitted),'new',len(fitted-original),flush=True)

