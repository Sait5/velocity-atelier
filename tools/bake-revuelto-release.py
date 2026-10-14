"""Store the accepted outward-release door path in the review scene."""
import bpy,os,json,re
from mathutils import Matrix as M
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
path=os.path.join(os.path.dirname(ROOT),'blender/Revuelto-Mechanism-Placed.blend')
bpy.ops.wm.open_mainfile(filepath=path)
samples=json.load(open(os.path.join(ROOT,'tools/generated/revuelto-release-bake.json')))
placements=json.load(open(os.path.join(ROOT,'app/three/data/revueltoMechanismPlacement.json')))
hardware=json.load(open(os.path.join(ROOT,'tools/generated/revuelto-door-hardware.json')))
conversion=M(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
bpy.context.scene.frame_set(1)
door_world={o:o.matrix_world.copy() for o in bpy.context.scene.objects if o.type=='MESH' and re.match(r'^(Door[LR]F_|DoorJamb[LR]F_|DoorCard[LR]F|WingMirror[LR]_|MirrorBase[LR]_|Glass[LR]M_)',o.name)}
for side in ['L','R']:
 assembly=bpy.data.objects['Revuelto fitted mechanism '+side]
 values=placements['left' if side=='L' else 'right']
 matrix=M([[values[c*4+r] for c in range(4)] for r in range(4)])
 matrix.translation.y-=.08
 assembly.matrix_world=conversion.inverted()@matrix@conversion@M.Diagonal((.001,.001,.001,1))
 assembly['hardware_drop']=.08
 mount=next(o for o in assembly.children_recursive if o.name=='Door_Mount' or o.name.startswith('Door_Mount.'))
 occurrences={}
 for item in hardware:
  base=re.sub(r'\d{3}$','',item['name'])
  candidates=sorted((o for o in mount.children if re.sub(r'\.\d+$','',o.name).replace(' ','_')==base),key=lambda o:o.name)
  index=occurrences.get(base,0);node=candidates[index];occurrences[base]=index+1
  values=item['matrix'];matrix=M([[values[c*4+r] for c in range(4)] for r in range(4)])
  node.matrix_local=conversion.inverted()@matrix@conversion
 for name,matrices in samples.items():
  node=next(o for o in assembly.children_recursive if o.name==name or o.name.startswith(name+'.'))
  node.animation_data_clear()
  for constraint in list(node.constraints):node.constraints.remove(constraint)
  node.rotation_mode='QUATERNION'
  sequence=matrices+list(reversed(matrices[:-1]))
  for frame,values in enumerate(sequence,1):
   matrix=conversion.inverted()@M([[values[c*4+r] for c in range(4)] for r in range(4)])@conversion
   node.location,node.rotation_quaternion,node.scale=matrix.decompose()
   for property in ['location','rotation_quaternion','scale']:node.keyframe_insert(data_path=property,frame=frame)
bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=481;bpy.context.scene.render.fps=200
bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()
for node,world in door_world.items():node.matrix_world=world
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=path)
print('BAKED_OUTWARD_RELEASE',path,flush=True)
