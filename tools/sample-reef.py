import bpy,json,math
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=r'C:\Users\Admin\Downloads\reef_and_coastal_road.glb')
with open('tools/generated/reef-bounds.json') as f:bounds=json.load(f)
lo=Vector(bounds['min']);hi=Vector(bounds['max']);center=(lo+hi)/2;scale=max(hi.x-lo.x,hi.y-lo.y)*1.1
dg=bpy.context.evaluated_depsgraph_get()
pixels=[(1290,1076),(1160,1070),(1030,1075),(890,1100),(760,1100),(640,1080),(540,1015),(490,910),(485,795),(530,680),(610,580),(720,500),(845,445),(990,410),(1140,410),(1280,410)]
route=[];normals=[]
for px,py in pixels:
 x=center.x+(px-700)*scale/1400;y=center.y+(700-py)*scale/1400
 hit,loc,n,*_=bpy.context.scene.ray_cast(dg,Vector((x,y,100)),Vector((0,0,-1)))
 if not hit:raise RuntimeError('Route missed scan')
 route.append([x,loc.z,-y]);normals.append([n.x,n.z,-n.y])
with open('app/three/reefRoute.json','w') as f:json.dump(route,f)
with open('app/three/reefNormals.json','w') as f:json.dump(normals,f)
with open('tools/generated/reef-probes.json') as f:probes=json.load(f)
route=[];normals=[]
for x,_,z in probes:
 hit,loc,n,*_=bpy.context.scene.ray_cast(dg,Vector((x,-z,100)),Vector((0,0,-1)))
 if not hit:raise RuntimeError('Route probe missed scan')
 route.append([x,loc.z,z]);normals.append([n.x,n.z,-n.y])
with open('app/three/reefRoute.json','w') as f:json.dump(route,f)
with open('app/three/reefNormals.json','w') as f:json.dump(normals,f)
grid=[];size=96
for j in range(size):
 for i in range(size):
  x=lo.x+(hi.x-lo.x)*i/(size-1);z=-hi.y+(hi.y-lo.y)*j/(size-1)
  hit,loc,n,*_=bpy.context.scene.ray_cast(dg,Vector((x,-z,100)),Vector((0,0,-1)))
  grid.append(round(loc.z,2) if hit else 2.2)
with open('app/three/reefTerrain.json','w') as f:json.dump({'size':size,'minX':lo.x,'maxX':hi.x,'minZ':-hi.y,'maxZ':-lo.y,'heights':grid},f)
print('REEF PATH BAKED',len(route),flush=True)
