import bpy,bmesh,os,json
from mathutils import Matrix,Vector
root=r'C:\Users\Admin\Documents\ChatGPT\Velocity Atelier\apex'
bpy.ops.wm.open_mainfile(filepath=root+r'\tools\generated\wet-road-source\scene\scene.blend')
for name in ['Material.001','Material.002']:
 m=bpy.data.materials[name]
 print(name,[(l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name) for l in m.node_tree.links])
 print('Mapping',[(s.name,list(s.default_value) if s.type=='VECTOR' else s.default_value) for s in m.node_tree.nodes['Mapping'].inputs])
dg=bpy.context.evaluated_depsgraph_get()
for o in list(bpy.data.objects):
 if o.name not in ['Cube','SM_fences.011','Trafficlight07.006','Ocean Far.001']:
  bpy.data.objects.remove(o,do_unlink=True);continue
 mesh=bpy.data.meshes.new_from_object(o.evaluated_get(dg));mesh.transform(o.matrix_world)
 o.modifiers.clear();o.parent=None;o.data=mesh;o.matrix_world=Matrix.Identity(4)
 if o.name=='Ocean Far.001':
  for v in mesh.vertices:v.co.x-=600
 else:
  bm=bmesh.new();bm.from_mesh(mesh)
  for x,normal in [(0,(1,0,0)),(420,(-1,0,0))]:
   bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=(x,0,0),plane_no=normal,clear_inner=True)
  bm.to_mesh(mesh);bm.free()
 mesh.update()
# Embedded TIFF source images become PNG without resampling.
folder=root+r'\tools\generated\wet-road-textures';os.makedirs(folder,exist_ok=True)
for image in bpy.data.images:
 if image.size[0] and image.type!='RENDER_RESULT' and not image.name.lower().endswith('.hdr.001'):
  image.filepath_raw=os.path.join(folder,image.name.replace('#','').replace('/','_')+'.png');image.file_format='PNG';image.save();image.pack()
bpy.ops.export_scene.gltf(filepath=root+r'\public\models\wet-road.glb',export_format='GLB',export_apply=True,export_cameras=False,export_lights=False,export_animations=False)
