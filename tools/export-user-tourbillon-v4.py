import bpy,os,math
from mathutils import Matrix,Vector
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('../blender/Bugatti-Repair/Bugatti-Tourbillon-Door-Fit-v4.blend'))
scene=bpy.context.scene;scene.frame_set(1)
root=bpy.data.objects['BUGATTI TOURBILLON'];root.name='Tourbillon'
conversion=Matrix.Rotation(-math.pi/2,4,'X')
for i,label in enumerate(['LEFT','RIGHT']):
 door=bpy.data.objects[label+' DOOR • Open control'];samples=[]
 for step in range(101):
  door['Open']=step/100;door.update_tag();bpy.context.view_layer.update()
  m=conversion@door.matrix_local@conversion.inverted();p,q,s=m.decompose();samples.append([*p,q.x,q.y,q.z,q.w])
 door['Open']=0;door.update_tag();bpy.context.view_layer.update()
 door.name='Tourbillon_door_'+str(i);door['siteDoorSamples']=samples
 for child in door.children:
  if child.type=='MESH' and any('2026Window_' in m.name for m in child.data.materials):child.name='door'+str(i)+'_sliding_glass'
for i in range(4):
 wheel=bpy.data.objects['WHEEL '+str(i+1)];saved={child:child.matrix_world.copy() for child in wheel.children}
 pts=[child.matrix_world@Vector(p) for child in wheel.children if child.type=='MESH' for p in child.bound_box]
 if pts:
  wheel.location=Vector([(min(p[k] for p in pts)+max(p[k] for p in pts))/2 for k in range(3)]);bpy.context.view_layer.update()
  for child,m in saved.items():child.matrix_world=m
 wheel.name='Tourbillon_wheel_'+str(i)
# Export a copy only. The user's .blend is never saved or modified.
bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:
 if obj.type in ['MESH','EMPTY']:obj.select_set(True)
scene.frame_set(1);bpy.context.view_layer.update()
bpy.ops.export_scene.gltf(filepath=os.path.abspath('public/models/bugatti-tourbillon-door-fit-v4.glb'),export_format='GLB',export_yup=True,export_materials='EXPORT',export_animations=False,export_extras=True,use_selection=True)
print('EXPORTED USER V4',flush=True)
