"""Fit the supplied assembly to the existing jamb surfaces and save the Blender scene."""
import bpy, os, math, json, bmesh
from mathutils import Matrix as M, Vector as V
from mathutils.bvhtree import BVHTree
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE=os.path.join(os.path.dirname(ROOT),'blender/Revuelto-Two-Arm-Mechanism.blend')
bpy.ops.wm.open_mainfile(filepath=SOURCE)
bpy.context.scene.frame_set(1)
rig=bpy.data.objects['ASSEMBLY | inclined hinge plane']
original_members=[rig,*rig.children_recursive]
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/models/lamborghini-revuelto.glb'))
car=[o for o in bpy.data.objects if o not in before]
basis=M.Translation(V((.10516,0,.00108)))@M.Rotation(-math.pi/2,4,'Z')
for o in car:
 if o.parent is None:o.matrix_world=basis@o.matrix_world
bpy.context.view_layer.update()
masks=json.load(open(os.path.join(ROOT,'app/three/data/revueltoLegacyHingeFaces.json')))
for o in car:
 if o.name.startswith(('DoorJambLFPiston','DoorJambRFPiston')):o.hide_render=True;o.hide_set(True)
 if o.type!='MESH' or o.name not in masks:continue
 def point(v):return ','.join(str(round(n*100000)) for n in (v.x,v.z,-v.y))
 hidden=set(masks[o.name]);bm=bmesh.new();bm.from_mesh(o.data)
 faces=[f for f in bm.faces if ';'.join(sorted(point(v.co) for v in f.verts)) in hidden]
 bmesh.ops.delete(bm,geom=faces,context='FACES');bm.to_mesh(o.data);bm.free()
def moving(o,code):return o.name.startswith(('Door'+code+'F_','DoorJamb'+code+'F_','DoorCard'+code+'F','WingMirror'+code+'_','MirrorBase'+code+'_','Glass'+code+'M_'))
def tree(objects):
 vertices=[];faces=[]
 for o in objects:
  if o.type!='MESH' or o.hide_get():continue
  offset=len(vertices);vertices.extend(o.matrix_world@v.co for v in o.data.vertices);faces.extend([offset+i for i in p.vertices] for p in o.data.polygons)
 return BVHTree.FromPolygons(vertices,faces)
# Reuse the reviewed rigid fit. Do not refit against door upholstery or add
# independent offsets: both would change the physical linkage and door path.
placements=json.load(open(os.path.join(ROOT,'app/three/data/revueltoMechanismPlacement.json')))
conversion=M(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
values=placements['left'];left=M([[values[c*4+r] for c in range(4)] for r in range(4)])
rig.matrix_world=conversion.inverted()@left@conversion@M.Diagonal((.001,.001,.001,1))
bpy.context.view_layer.update();left_matrix=rig.matrix_world.copy()
assemblies=[(rig,bpy.data.objects['Door_Mount'],'L')]
output=os.path.join(os.path.dirname(ROOT),'blender/Revuelto-Mechanism-Placed.blend')
bpy.ops.wm.save_as_mainfile(filepath=output)
with bpy.data.libraries.load(SOURCE,link=False) as (src,dst):dst.objects=list(src.objects)
imported=[o for o in dst.objects if o]
for o in imported:bpy.context.scene.collection.objects.link(o)
right_rig=next(o for o in imported if o.name.startswith('ASSEMBLY | inclined hinge plane'))
right_mount=next(o for o in imported if o.name.startswith('Door_Mount') and o.type=='EMPTY')
right_rig.matrix_world=M.Diagonal((1,-1,1,1))@left_matrix
assemblies.append((right_rig,right_mount,'R'))
bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
for assembly,mount,code in assemblies:
 for o in car:
  if moving(o,code):
   world=o.matrix_world.copy();o.parent=mount;o.matrix_parent_inverse=mount.matrix_world.inverted();o.matrix_world=world
 assembly.name='Revuelto fitted mechanism '+code
 for o in [assembly,*assembly.children_recursive]:
  if o.type=='MESH' and o not in car:
   for slot in o.material_slots:
    material=slot.material
    if material:
     white=material.copy();white.name='Revuelto hinge black '+material.name;slot.material=white;white.diffuse_color=(.006,.007,.008,1)
     if white.use_nodes:
      for node in white.node_tree.nodes:
       if node.type=='BSDF_PRINCIPLED':
        node.inputs['Base Color'].default_value=(.006,.007,.008,1)
        node.inputs['Metallic'].default_value=.25
        node.inputs['Roughness'].default_value=.5
bpy.context.view_layer.update()
output=os.path.join(os.path.dirname(ROOT),'blender/Revuelto-Mechanism-Placed.blend')
bpy.ops.wm.save_as_mainfile(filepath=output)
print('PLACED_IN_BLENDER',output,flush=True)

