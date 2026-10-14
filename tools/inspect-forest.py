import bpy
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath=r'C:\Users\Admin\Downloads\forest-road.blend')
for o in bpy.context.scene.objects:
 if not o.name.startswith(('FTD','FBD')): print('OBJECT',o.name,o.type,tuple(o.location),tuple(o.dimensions),[(m.name,m.type) for m in o.modifiers], 'faces',len(o.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh().polygons) if o.type=='MESH' else 0)
print('INSTANCES',sum(1 for _ in bpy.context.evaluated_depsgraph_get().object_instances))
for m in bpy.data.materials:
 print('MAT',m.name,[n.image.name for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image] if m.use_nodes else [])
print('IMAGES',[(i.name,i.size[:],bool(i.packed_file)) for i in bpy.data.images])
o=bpy.data.objects['NurbsPath']; print('SPLINES',[(s.type,[tuple(p.co) for p in s.points],[(tuple(p.co),tuple(p.handle_left),tuple(p.handle_right)) for p in s.bezier_points]) for s in o.data.splines])
