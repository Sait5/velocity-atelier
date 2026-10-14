import bpy,os
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('tools/generated/door-mechanisms/ferrari-door-mechanisms.blend'))
bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
d=bpy.data.objects['door_L']
for o in d.children_recursive:
 if o.type=='MESH' and any(m.name=='carpaint' for m in o.data.materials):
  p=[o.matrix_world@v.co for v in o.data.vertices];print('BOUNDS',o.name,[min(x[i] for x in p) for i in range(3)],[max(x[i] for x in p) for i in range(3)])
