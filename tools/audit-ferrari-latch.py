import bpy,os
from mathutils.bvhtree import BVHTree
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('tools/generated/door-mechanisms/ferrari-door-mechanisms.blend'))
bpy.context.scene.frame_set(1);bpy.context.view_layer.update();d=bpy.data.objects['door_L'];moving=list(d.children_recursive)
paint=lambda o:o.type=='MESH' and any(m.name=='carpaint' for m in o.data.materials)
def tree(o):return BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[list(f.vertices) for f in o.data.polygons])
fixed=[o for o in bpy.context.scene.objects if paint(o) and o not in moving and not 'doorLF_' in o.name and not 'mirrorL_' in o.name]
ft={o.name:tree(o) for o in fixed};latch={}
for o in moving:
 if not paint(o):continue
 p=[o.matrix_world@v.co for v in o.data.vertices]
 latch[o.name]={f.index for f in o.data.polygons if all(.449<p[v].x<.469 and .65<p[v].z<.68 for v in f.vertices)}
for frame in [2,3,4,5,7,10]:
 bpy.context.scene.frame_set(frame);bpy.context.view_layer.update()
 for o in moving:
  if not paint(o):continue
  hits=[pair for t in ft.values() for pair in tree(o).overlap(t)]
  if hits:print('HITS',frame,o.name,'total',len(hits),'latch',sum(a in latch[o.name] for a,b in hits))
