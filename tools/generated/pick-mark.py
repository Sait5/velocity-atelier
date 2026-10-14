exec(open('tools/generated/render-mark.py').read().split('for i,location')[0])
from mathutils.bvhtree import BVHTree
cam.location=(-.3,-.8,1.1);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();bpy.context.view_layer.update()
mesh=bpy.data.objects['DoorJambLF_CarPaint'];opened=mesh.matrix_world.copy()
tree=BVHTree.FromPolygons([opened@v.co for v in mesh.data.vertices],[list(p.vertices) for p in mesh.data.polygons])
for px,py in [(360,520)]:
 origin=cam.matrix_world@Vector(((px/800-.5)*.45,(.5-py/800)*.45,0));direction=cam.matrix_world.to_3x3()@Vector((0,0,-1))
 hit,normal,index,distance=tree.ray_cast(origin,direction)
 if hit:
  local=opened.inverted()@hit;scene.frame_set(1);closed=mesh.matrix_world@local;closednormal=mesh.matrix_world.to_3x3()@opened.to_3x3().inverted()@normal;print('CLOSED_NORMAL',list(closednormal));scene.frame_set(241)
  print('PICK',px,py,'world',list(hit),'closed',list(closed),'normal',list(normal),'face',index)
plate=bpy.data.objects['Door_Mount | bolt flange'];print('PLATE',list(plate.dimensions),[list(v) for v in plate.bound_box])


