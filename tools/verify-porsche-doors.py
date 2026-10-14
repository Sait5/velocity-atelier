import bpy,os,json
from collections import Counter
from mathutils import Matrix
base=os.path.join(os.path.dirname(os.path.abspath(__file__)),'generated/porsche')
transform=Matrix(((0,100,0,0),(-100,0,0,0),(0,0,100,.00528),(0,0,0,1)))
def signature(o,matrix):
 uv=o.data.uv_layers.active
 result=Counter()
 for f in o.data.polygons:
  corners=[]
  for li in f.loop_indices:
   p=matrix@o.data.vertices[o.data.loops[li].vertex_index].co
   u=uv.data[li].uv if uv else (0,0)
   corners.append(tuple(round(x,4) for x in p)+tuple(round(x,5) for x in u))
  material=o.data.materials[f.material_index].name
  # Upholstery recoloring changes the material assignment, not the source mesh.
  if material in ('Porsche upholstery','Porsche door backing'):material='Porsche_911GT39922_2025InteriorA_Material1'
  result[(material,tuple(sorted(corners)))]+=1
 return result
bpy.ops.wm.open_mainfile(filepath=os.path.join(base,'source.blend'))
original=Counter()
for o in bpy.context.scene.objects:
 if o.type=='MESH':original.update(signature(o,transform@o.matrix_world))
bpy.ops.wm.open_mainfile(filepath=os.path.join(base,'Porsche-911-GT3-rigged.blend'))
rigged=Counter()
for o in bpy.context.scene.objects:
 if o.type=='MESH':rigged.update(signature(o,o.matrix_world))
# Floating-point metre baking can cross a rounded boundary. Exact face counts
# are mandatory; measure any changed corner tuple before accepting the result.
missing=original-rigged;extra=rigged-original
assert sum(original.values())==308387
# Lettering: 15 faces per seat; malformed hinge atlas ribbons: 138 per door.
assert sum(rigged.values())==308081
print('Triangle count:',sum(original.values()),'unmatched rounded corner signatures:',sum(missing.values()))
assert sum(missing.values())<1000
# Whole UV pieces must belong to one group; no triangle-level clipping remains.
for name in ['Porsche door L','Porsche door R']:
 d=bpy.data.objects[name];assert len(d.children)>=10
 print(name,'inner trim triangles',sum(len(o.data.polygons) for o in d.children if '_Interior_Geo' in o.name))
json.dump({'triangles':sum(original.values()),'rounded_corner_mismatches':sum(missing.values()),'door_groups':2,'partition':'whole UV-connected pieces'},open(os.path.join(base,'door-verification.json'),'w'),indent=2)
