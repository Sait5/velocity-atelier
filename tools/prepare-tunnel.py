import bpy,bmesh,json,math
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath=r'C:\Users\Admin\Downloads\Tunnel.blend')
dg=bpy.context.evaluated_depsgraph_get(); wall=bpy.data.objects['Tunnel walls']; corners=[wall.matrix_world@Vector(v) for v in wall.evaluated_get(dg).bound_box]; yMax=max(p.y for p in corners); yMin=min(p.y for p in corners);period=yMax-yMin
print('TUNNEL PERIOD',period,yMin,yMax)
# Preserve the source assembly; clip each part at the same boundaries for repetition.
for o in list(bpy.context.scene.objects):
 if o.type!='MESH' or o.name=='Cube.002':bpy.data.objects.remove(o,do_unlink=True);continue
 if o.name=='Above utility pipe':
  for mod in o.modifiers:
   if mod.type=='ARRAY':mod.count=22
 dg=bpy.context.evaluated_depsgraph_get();mesh=bpy.data.meshes.new_from_object(o.evaluated_get(dg));mesh.transform(o.matrix_world);o.modifiers.clear();o.data=mesh;o.matrix_world.identity()
 bm=bmesh.new();bm.from_mesh(mesh)
 for y,n in [(yMin,Vector((0,1,0))),(yMax,Vector((0,-1,0)))]:bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=Vector((0,y,0)),plane_no=n,clear_inner=True,clear_outer=False)
 for v in bm.verts:v.co.y-=yMax
 bm.to_mesh(mesh);bm.free();mesh.update()
print('EXPORT MESHES',[(o.name,len(o.data.polygons)) for o in bpy.context.scene.objects])
with open('app/three/tunnelMeta.json','w') as f:json.dump({'period':period},f)
bpy.ops.export_scene.gltf(filepath='tools/generated/road-tunnel.glb',export_format='GLB',export_apply=True,export_cameras=False,export_lights=False)
