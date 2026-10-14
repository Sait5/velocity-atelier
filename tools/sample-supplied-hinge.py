import bpy,json
main=bpy.data.objects['02 | Main hinge axis - animated']
for frame in [1,16,31,46,61,76,91,106,121,151,181]:
 bpy.context.scene.frame_set(frame);print('HINGE_SAMPLE',frame,list(main.rotation_euler),flush=True)
for o in bpy.context.scene.objects:
 if o.animation_data and o.animation_data.action:
  print('HINGE_ACTION',o.name,list(o.animation_data.action.frame_range),flush=True)
