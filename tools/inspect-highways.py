import bpy,os,json
from mathutils import Vector
for key,name in [('wetland','highway_hill_wetland_and_forest.glb'),('highway50','highway_50_-_near_cold_springs.glb')]:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.gltf(filepath=os.path.join(r'C:\Users\Admin\Downloads',name))
 pts=[o.matrix_world@Vector(v) for o in bpy.context.scene.objects if o.type=='MESH' for v in o.bound_box]
 lo=Vector(tuple(min(p[i] for p in pts) for i in range(3)));hi=Vector(tuple(max(p[i] for p in pts) for i in range(3)));c=(lo+hi)/2
 print(key,list(lo),list(hi),flush=True)
 with open('tools/generated/'+key+'-bounds.json','w') as f:json.dump({'min':list(lo),'max':list(hi)},f)
 bpy.ops.object.camera_add(location=(c.x,c.y,hi.z+1000));cam=bpy.context.object;cam.rotation_euler=(0,0,0);cam.data.clip_end=10000;cam.data.type='ORTHO';cam.data.ortho_scale=max(hi.x-lo.x,hi.y-lo.y)*1.05;bpy.context.scene.camera=cam
 bpy.ops.object.light_add(type='SUN');bpy.context.object.data.energy=1.5
 s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=1;s.render.resolution_x=1000;s.render.resolution_y=1000;s.render.resolution_percentage=100;s.world.color=(.4,.4,.4);s.render.filepath=os.path.abspath('tools/generated/'+key+'-top.png');bpy.ops.render.render(write_still=True)

