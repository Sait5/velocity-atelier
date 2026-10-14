import bpy,json,math,os
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=r'C:\Users\Admin\Downloads\reef_and_coastal_road.glb')
points=[o.matrix_world@Vector(v) for o in bpy.context.scene.objects if o.type=='MESH' for v in o.bound_box]
lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)));center=(lo+hi)/2
print('REEF BOUNDS',list(lo),list(hi),flush=True)
with open('tools/generated/reef-bounds.json','w') as f:json.dump({'min':list(lo),'max':list(hi)},f)
bpy.ops.object.camera_add(location=(center.x,center.y,hi.z+200));camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=max(hi.x-lo.x,hi.y-lo.y)*1.1;camera.rotation_euler=(0,0,0);bpy.context.scene.camera=camera
bpy.ops.object.light_add(type='SUN');bpy.context.object.data.energy=2;bpy.context.object.rotation_euler=(.2,-.2,0)
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=4;s.render.resolution_x=1400;s.render.resolution_y=1400;s.render.resolution_percentage=100;s.world.color=(.4,.4,.4);s.render.filepath=os.path.abspath('tools/generated/reef-top.png');bpy.ops.render.render(write_still=True)
