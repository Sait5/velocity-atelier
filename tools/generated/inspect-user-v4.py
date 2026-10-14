import bpy,os,json
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('../blender/Bugatti-Repair/Bugatti-Tourbillon-Door-Fit-v4.blend'));bpy.context.scene.frame_set(1)
print('RIG',[(o.name,o.parent.name if o.parent else None,list(o.location),list(o.keys())) for o in bpy.context.scene.objects if o.type=='EMPTY'],flush=True)
print('MATERIALS',[(m.name,m.users) for m in bpy.data.materials if m.users],flush=True)
