import bpy,json
from mathutils import Vector
out=[]
for o in bpy.context.scene.objects:
 row={'name':o.name,'type':o.type,'parent':o.parent.name if o.parent else None,'location':list(o.location),'rotation':list(o.rotation_euler),'scale':list(o.scale),'constraints':[{'name':c.name,'type':c.type,'target':getattr(getattr(c,'target',None),'name',None)} for c in o.constraints]}
 if o.type=='MESH':row['bounds']=[list(o.matrix_world@Vector(v)) for v in o.bound_box];row['materials']=[m.name for m in o.data.materials if m]
 if o.animation_data:row['action']=o.animation_data.action.name if o.animation_data.action else None;row['nla']=[t.name for t in o.animation_data.nla_tracks];row['drivers']=[{'path':d.data_path,'expression':d.driver.expression} for d in o.animation_data.drivers]
 out.append(row)
print('HINGE_INSPECTION',json.dumps({'frames':[bpy.context.scene.frame_start,bpy.context.scene.frame_end],'objects':out,'actions':[{'name':a.name,'frames':list(a.frame_range)} for a in bpy.data.actions]},indent=2),flush=True)
