import bpy,json,math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
bpy.ops.wm.open_mainfile(filepath=r'C:\Users\Admin\Downloads\forest-road.blend')
s=bpy.context.scene; dg=bpy.context.evaluated_depsgraph_get()
road=bpy.data.objects['Plane']; curve=bpy.data.objects['NurbsPath']; mesh=curve.evaluated_get(dg).to_mesh()
points=sorted([curve.matrix_world@v.co for v in mesh.vertices],key=lambda p:p.x)
print('PATH VERTICES',len(points))
if not points: points=[curve.matrix_world@Vector(p.co[:3]) for p in curve.data.splines[0].points]
bvh=BVHTree.FromObject(road,dg); route=[]; normals=[]
for i in range(301):
 x=2+i*75/300
 k=next((j for j,p in enumerate(points) if p.x>=x),len(points)-1); a=points[max(0,k-1)];b=points[k]; t=(x-a.x)/max(.0001,b.x-a.x); y=a.y+(b.y-a.y)*t
 hit,n,index,d=bvh.ray_cast(Vector((x,y,100)),Vector((0,0,-1)))
 if hit is None: raise RuntimeError('Forest road probe missed')
 route.append([x,hit.z,-y]);normals.append([n.x,n.z,-n.y])
with open('app/three/forestRoute.json','w') as f:json.dump(route,f)
with open('app/three/forestNormals.json','w') as f:json.dump(normals,f)
# Bake the author's procedural road markings before exporting to glTF.
bpy.ops.object.select_all(action='DESELECT');road.select_set(True);bpy.context.view_layer.objects.active=road
image=bpy.data.images.new('Forest Road original procedural surface',width=4096,height=1024,alpha=False)
for mat in road.data.materials:
 node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;mat.node_tree.nodes.active=node
s.render.engine='CYCLES';s.cycles.samples=4;s.render.bake.use_pass_direct=False;s.render.bake.use_pass_indirect=False;s.render.bake.use_pass_color=True
bpy.ops.object.bake(type='DIFFUSE')
def pbr(name,color=None,normal=None,alpha=False):
 m=bpy.data.materials.new(name);m.use_nodes=True;bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Roughness'].default_value=.95
 if color:
  node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=color;m.node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color'])
  if alpha: m.node_tree.links.new(node.outputs['Alpha'],bs.inputs['Alpha']);m.surface_render_method='DITHERED';m.use_backface_culling=False
 if normal:
  node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=normal;normal.colorspace_settings.name='Non-Color';n=m.node_tree.nodes.new('ShaderNodeNormalMap');m.node_tree.links.new(node.outputs['Color'],n.inputs['Color']);m.node_tree.links.new(n.outputs['Normal'],bs.inputs['Normal'])
 return m
road.data.materials.clear();road.data.materials.append(pbr('Forest Road baked original markings',image))
for mat in list(bpy.data.materials):
 if mat.name.startswith('FTD'):
  images=[n.image for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image]; diffuse=next(i for i in images if i.name.startswith(('FTD','FBD')));normal=next((i for i in images if i.name.startswith(('FTN','FBN'))),None)
  new=pbr('Forest photographic foliage '+mat.name,diffuse,normal,True)
  for o in s.objects:
   for slot in o.material_slots:
    if slot.material==mat:slot.material=new
ground=pbr('Forest ground',bpy.data.images['Forest_ground_basecolor.jpg'],bpy.data.images['Forest_ground_normal.jpg'])
rock=pbr('Original distant rock',bpy.data.images['rock_02_color.jpg'],bpy.data.images['rock_02_normal.jpg'])
for name,mat in [('Plane.001',ground),('Landscape',rock)]:
 o=bpy.data.objects[name];bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.data.materials.clear();o.data.materials.append(mat)
 if not o.data.uv_layers:o.data.uv_layers.new()
 for polygon in o.data.polygons:
  polygon.material_index=0
  for li in polygon.loop_indices:
   p=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co;o.data.uv_layers.active.data[li].uv=(p.x/5,p.y/5)
bpy.ops.object.select_all(action='DESELECT')
for o in s.objects:
 if o.type=='MESH' and o.name not in ['Cube','Cube.001']:o.select_set(True)
bpy.ops.export_scene.gltf(filepath='tools/generated/forest-road.glb',export_format='GLB',use_selection=True,export_apply=True,export_cameras=False,export_lights=False)

