import bpy, math
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=r'C:\Users\Admin\Downloads\coast_road_and_rocks_ver2.0.glb')
points=[o.matrix_world@Vector(v) for o in bpy.context.scene.objects if o.type=='MESH' for v in o.bound_box]
lo=Vector(tuple(min(p[i] for p in points) for i in range(3))); hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
print('WORLD BOUNDS',lo,hi)
center=(lo+hi)/2
import json
route=[]
for px,py in [(278,695),(360,660),(468,613),(545,552),(579,468),(594,370),(582,270),(555,183),(527,123)]:
 x=center.x+(px-600)*max(hi.x-lo.x,hi.y-lo.y)*1.15/1200
 y=center.y+(600-py)*max(hi.x-lo.x,hi.y-lo.y)*1.15/1200
 hit,loc,normal,index,obj,matrix=bpy.context.scene.ray_cast(bpy.context.evaluated_depsgraph_get(),Vector((x,y,100)),Vector((0,0,-1)))
 if not hit: raise RuntimeError('Route leaves scan')
 route.append([x,loc.z,-y])
with open('app/three/coastRoute.json','w') as f: json.dump(route,f)
import os
if os.path.exists('tools/coast-probes.json'):
 with open('tools/coast-probes.json') as f: probes=json.load(f)
 route=[]; normals=[]
 for x,_,z in probes:
  hit,loc,normal,index,obj,matrix=bpy.context.scene.ray_cast(bpy.context.evaluated_depsgraph_get(),Vector((x,-z,100)),Vector((0,0,-1)))
  if not hit: raise RuntimeError('Road probe leaves scan')
  route.append([x,loc.z,z]); normals.append([normal.x,normal.z,-normal.y])
 with open('app/three/coastRoute.json','w') as f: json.dump(route,f)
 with open('app/three/coastNormals.json','w') as f: json.dump(normals,f)
grid=[]; size=96
for j in range(size):
 for i in range(size):
  x=lo.x+(hi.x-lo.x)*i/(size-1); z=-hi.y+(hi.y-lo.y)*j/(size-1)
  hit,loc,normal,index,obj,matrix=bpy.context.scene.ray_cast(bpy.context.evaluated_depsgraph_get(),Vector((x,-z,100)),Vector((0,0,-1)))
  grid.append(round(loc.z,2) if hit else -1.05)
with open('app/three/coastTerrain.json','w') as f: json.dump({'size':size,'minX':lo.x,'maxX':hi.x,'minZ':-hi.y,'maxZ':-lo.y,'heights':grid},f)
center=(lo+hi)/2
bpy.ops.object.camera_add(location=(center.x,center.y,hi.z+200)); camera=bpy.context.object; camera.rotation_euler=(0,0,0); camera.data.type='ORTHO'; camera.data.ortho_scale=max(hi.x-lo.x,hi.y-lo.y)*1.15
bpy.context.scene.camera=camera
bpy.ops.object.light_add(type='SUN',location=(0,0,100)); bpy.context.object.data.energy=2; bpy.context.object.rotation_euler=(.3,-.3,0)
s=bpy.context.scene; s.render.engine='CYCLES'; s.cycles.samples=8; s.render.resolution_x=1200; s.render.resolution_y=1200; s.render.resolution_percentage=100; s.world.color=(.3,.3,.3); s.render.filepath=r'C:\Users\Admin\Documents\ChatGPT\Velocity Atelier\apex\tools\coast-top.png'; bpy.ops.render.render(write_still=True)
