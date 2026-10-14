"""Select an inclined axis while retaining both fitted flange centres."""
exec(open('tools/fit-rigid-revuelto.py',encoding='utf8').read().split("mount=bpy.data.objects['Door_Mount']")[0])
from mathutils import Quaternion
from mathutils.bvhtree import BVHTree
script=open('tools/verify-current-revuelto-clearance.py',encoding='utf8').read()
exec(script[script.index('bpy.context.view_layer.update();ps='):script.index('from collections import Counter')])
base=rig.matrix_world.copy();pivot=centre(body_plate);axis=(centre(door_plate)-pivot).normalized()
mount=bpy.data.objects['Door_Mount'];local=[]
for progress in sorted(set([index/40 for index in range(41)]+[index/240 for index in range(1,6)])):
 frame=1+119*progress;bpy.context.scene.frame_set(int(frame),subframe=frame%1);local.append(mount.matrix_local.copy())
rest=local[0].inverted();results=[]
bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
door_local=base.inverted()@centre(door_plate)
body_local=base.inverted()@centre(body_plate)
target=door_surface.find_nearest(V((-.88,-.86,.64)))[0]
import itertools
for yaw,pitch,tilt in itertools.product([-.4,-.3,-.2,-.1],[1.0,1.1,1.2,1.3],[-.1,0,.1,.2]):
 placement=M.Rotation(yaw,4,'Z')@M.Rotation(tilt,4,'X')@M.Rotation(pitch,4,'Y')@M.Diagonal((.001,-.001,.001,1))
 placement.translation=target-placement@door_local
 for iteration in range(16):
  a,b=placement@body_local,placement@door_local
  ta=body_surface.find_nearest(a)[0];tb=door_surface.find_nearest(b)[0]
  rotation=(b-a).rotation_difference(tb-ta).to_matrix().to_4x4()
  placement=M.Translation((ta+tb)/2)@rotation@M.Translation(-(a+b)/2)@placement
 inverse=placement.inverted();hits=[]
 for pose in local[1:]:
  transform=placement@pose@rest@inverse
  hits.append(len(set(BVHTree.FromPolygons([transform@p for p in ps],fs).overlap(fixed))-baseline))
 results.append({'yaw':yaw,'pitch':pitch,'tilt':tilt,'bodyDistance':body_surface.find_nearest(placement@body_local)[3],'bad':sum(bool(n) for n in hits),'total':sum(hits),'matrix':[placement[r][c] for c in range(4) for r in range(4)]})
results.sort(key=lambda r:(r['bad'],r['total'],r['bodyDistance']))
json.dump(results,open('tools/generated/revuelto-rigid-axis-fit.json','w'),indent=2)
print('RIGID_AXIS',target,results[:3],flush=True)






