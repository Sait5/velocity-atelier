"""Keep the door flange and bake a simple rectangular sliding metal connector."""
import bpy,bmesh,json,os,math
from mathutils import Matrix as M,Vector as V
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
directory=os.path.join(os.path.dirname(ROOT),'blender')
bpy.ops.wm.open_mainfile(filepath=os.path.join(directory,'Revuelto-Mechanism-Placed.blend'))
bpy.context.scene.frame_set(1)
for side in ['L','R']:
 assembly=bpy.data.objects['Revuelto fitted mechanism '+side]
 for node in assembly.children_recursive:
  if node.type=='MESH' and not node.name.startswith(('Door'+side+'F_','DoorJamb'+side+'F_','DoorCard'+side+'F','WingMirror'+side+'_','MirrorBase'+side+'_','Glass'+side+'M_')):
   node.hide_render=True;node.hide_set(True)
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/models/lamborghini-revuelto.glb'))
donors=[o for o in bpy.data.objects if o not in before]
masks=json.load(open(os.path.join(ROOT,'app/three/data/revueltoLegacyHingeFaces.json')))
fit=json.load(open(os.path.join(ROOT,'app/three/data/revueltoFoldingBracket.json')))
basis=M.Translation(V((.10516,0,.00108)))@M.Rotation(-math.pi/2,4,'Z')
for side in ['L','R']:
 name='DoorJamb'+side+'F_CarPaint'
 donor=next(o for o in donors if o.name==name or o.name.startswith(name+'.'))
 target=bpy.data.objects[name];data=donor.data.copy();bm=bmesh.new();bm.from_mesh(data)
 def key(vertex):return ','.join(str(round(n*100000)) for n in (vertex.co.x,vertex.co.z,-vertex.co.y))
 mask=set(masks[name]);removed=[f for f in bm.faces if ';'.join(sorted(key(v) for v in f.verts)) not in mask]
 bmesh.ops.delete(bm,geom=removed,context='FACES');bm.to_mesh(data);bm.free()
 assert len(data.polygons)==649,(name,len(data.polygons))
 bm=bmesh.new();bm.from_mesh(data);transform=basis@donor.matrix_world
 trim=[f for f in bm.faces if not ((point:=transform@f.calc_center_median()).x>-.85 and point.z<.585)]
 bmesh.ops.delete(bm,geom=trim,context='FACES');bm.to_mesh(data);bm.free()
 assert len(data.polygons)>0
 part=bpy.data.objects.new('Original orange door bracket '+side,data);bpy.context.scene.collection.objects.link(part)
 part.matrix_world=basis@donor.matrix_world
 world=part.matrix_world.copy();part.parent=target;part.matrix_parent_inverse=target.matrix_world.inverted();part.matrix_world=world
 data.materials.clear()
 for material in target.data.materials:data.materials.append(material)
 part.hide_render=True;part.hide_set(True);part['original_orange_door_bracket']=True
 part['note']='Original rigid orange hook follows the accepted door animation.'
 body=V((fit['bodyPoint'][0],(-1 if side=='L' else 1)*fit['bodyPoint'][2],fit['bodyPoint'][1]))
 hook=V((fit['doorMountPoint'][0],(-1 if side=='L' else 1)*fit['doorMountPoint'][2],fit['doorMountPoint'][1]))
 local_hook=target.matrix_world.inverted()@hook
 material=bpy.data.materials.get('Simple bracket black') or bpy.data.materials.new('Simple bracket black')
 material.diffuse_color=(.025,.028,.032,1)
 material.use_nodes=True
 bsdf=next((n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None) or material.node_tree.nodes.new('ShaderNodeBsdfPrincipled');bsdf.inputs['Base Color'].default_value=(.025,.028,.032,1);bsdf.inputs['Metallic'].default_value=.65;bsdf.inputs['Roughness'].default_value=.4
 output_node=next((n for n in material.node_tree.nodes if n.type=='OUTPUT_MATERIAL'),None) or material.node_tree.nodes.new('ShaderNodeOutputMaterial')
 material.node_tree.links.new(bsdf.outputs['BSDF'],output_node.inputs['Surface'])
 assembly=bpy.data.objects.new('Independent folding bracket '+side,None);bpy.context.scene.collection.objects.link(assembly)
 surface=V((fit['surfacePoint'][0],(-1 if side=='L' else 1)*fit['surfacePoint'][2],fit['surfacePoint'][1]))
 normal=V((fit['surfaceNormal'][0],(-1 if side=='L' else 1)*fit['surfaceNormal'][2],fit['surfaceNormal'][1])).normalized()
 bpy.ops.mesh.primitive_cube_add(size=1)
 plate=bpy.context.object;plate.name='Marked inner body mount plate '+side;plate.parent=assembly;plate.dimensions=(.034,.048,.008)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);plate.location=surface;plate.rotation_euler=normal.to_track_quat('Z','Y').to_euler();plate.data.materials.append(material)
 bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.007,depth=.018)
 post=bpy.context.object;post.name='Inner body mount standoff '+side;post.parent=assembly;post.location=(surface+body)*.5;post.rotation_euler=(body-surface).to_track_quat('Z','Y').to_euler();post.data.materials.append(material)
 binding=target.matrix_world.inverted()@part.matrix_world
 part.parent=assembly;part.matrix_parent_inverse=M.Identity(4)
 bpy.ops.mesh.primitive_cube_add(size=1)
 door_pad=bpy.context.object;door_pad.name='Solid door connector flange '+side;door_pad.parent=assembly
 door_pad.dimensions=(.045,.04,.026);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 door_pad.data.materials.append(material);door_pad.location=hook;door_pad.rotation_mode='QUATERNION'
 pad_binding=target.matrix_world.inverted()@door_pad.matrix_world
 parts=[]
 for i,label in enumerate(['body metal bar','middle metal bar','door metal bar']):
  bpy.ops.mesh.primitive_cube_add(size=1)
  node=bpy.context.object;node.name='Original bracket '+side+' '+label
  node.dimensions=(.028-i*.006,.016-i*.004,.09);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  node.parent=assembly;node.data.materials.append(material);node.rotation_mode='QUATERNION';parts.append(node)
 pins=[]
 for label in ['pillar pin','hook pin']:
  bpy.ops.mesh.primitive_cube_add(size=1)
  bpy.context.object.dimensions=(.032,.018,.012);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  node=bpy.context.object;node.name='Original bracket '+side+' '+label;node.parent=assembly;node.data.materials.append(material);pins.append(node)
 part.rotation_mode='QUATERNION'
 for frame in range(1,bpy.context.scene.frame_end+1):
  bpy.context.scene.frame_set(frame)
  moving=target.matrix_world@local_hook;direction=(moving-body).normalized()
  distance=(moving-body).length
  assert .09<=distance<=.27,('Connector exceeds sliding range',side,frame,distance)
  centers=[.045,distance*.5,distance-.045]
  for i,node in enumerate(parts):
   node.location=body+direction*centers[i]
   node.rotation_quaternion=direction.to_track_quat('Z','Y');node.keyframe_insert('location',frame=frame);node.keyframe_insert('rotation_quaternion',frame=frame)
  for node,point in zip(pins,[body,moving]):
   node.location=point;node.rotation_euler=direction.to_track_quat('Z','Y').to_euler();node.keyframe_insert('location',frame=frame);node.keyframe_insert('rotation_euler',frame=frame)
  part.matrix_world=target.matrix_world@binding;part.keyframe_insert('location',frame=frame);part.keyframe_insert('rotation_quaternion',frame=frame);part.keyframe_insert('scale',frame=frame)
  door_pad.matrix_world=target.matrix_world@pad_binding;door_pad.keyframe_insert('location',frame=frame);door_pad.keyframe_insert('rotation_quaternion',frame=frame)
 bpy.context.scene.frame_set(1)
for node in donors:bpy.data.objects.remove(node,do_unlink=True)
bpy.context.scene.frame_set(1)
output=os.path.join(directory,'Revuelto-Simple-Door-Bracket.blend')
bpy.ops.wm.save_as_mainfile(filepath=output)
print('SIMPLE_DOOR_BRACKET_SAVED',output,flush=True)



