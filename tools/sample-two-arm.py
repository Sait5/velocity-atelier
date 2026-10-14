import bpy,json
control=bpy.data.objects['CONTROL | Opening 0 to 1']
samples=[]
for frame in [1,20,40,60,80,90,100,120,140,160,180]:
 bpy.context.scene.frame_set(frame)
 samples.append({'frame':frame,'control':dict(control.items()),'nodes':{name:{'location':list(bpy.data.objects[name].location),'rotation':list(bpy.data.objects[name].rotation_euler),'world':[list(row) for row in bpy.data.objects[name].matrix_world]} for name in ['Door_Mount','Upper_Arm','Lower_Arm','ASSEMBLY | inclined hinge plane']}})
print('TWO_ARM_SAMPLES',json.dumps(samples),flush=True)
for o in bpy.context.scene.objects:
 if o.animation_data:
  for d in o.animation_data.drivers:print('DRIVER_VALID',o.name,d.driver.is_valid,flush=True)
