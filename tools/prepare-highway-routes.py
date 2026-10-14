import bpy,json,math,os
from mathutils import Vector
configs=[('wetland','highway_hill_wetland_and_forest.glb',[(875,530),(120,390)]),('highway50','highway_50_-_near_cold_springs.glb',[(860,448),(130,575)])]
for key,name,pixels in configs:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);bpy.ops.import_scene.gltf(filepath=os.path.join(r'C:\Users\Admin\Downloads',name))
 bounds=json.load(open('tools/generated/'+key+'-bounds.json'));lo=Vector(bounds['min']);hi=Vector(bounds['max']);c=(lo+hi)/2;scale=max(hi.x-lo.x,hi.y-lo.y)*1.05
 ends=[Vector((c.x+(px-500)*scale/1000,c.y+(500-py)*scale/1000,0)) for px,py in pixels];route=[];normals=[]
 for i in range(151):
  p=ends[0].lerp(ends[1],i/150);hit,loc,n,_,_,_=bpy.context.scene.ray_cast(bpy.context.evaluated_depsgraph_get(),Vector((p.x,p.y,hi.z+20)),Vector((0,0,-1)))
  if not hit:raise RuntimeError('Route leaves scan '+key)
  route.append([loc.x,loc.z,-loc.y]);normals.append([n.x,n.z,-n.y])
 with open('app/three/'+key+'Route.json','w') as f:json.dump({'points':route,'normals':normals},f)
 print(key,'route length',sum((Vector(route[i])-Vector(route[i-1])).length for i in range(1,len(route))),flush=True)
