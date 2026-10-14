import bpy,json
from mathutils import Vector
from pathlib import Path
p=Path('tools/generated/cinematic-road-source/Cinematic roads pack/Straight road/forBlender.blend').resolve()
bpy.ops.wm.open_mainfile(filepath=str(p))
out={'objects':[],'materials':[],'images':[]}
dg=bpy.context.evaluated_depsgraph_get()
for o in bpy.context.scene.objects:
 b=[o.matrix_world@Vector(v) for v in o.evaluated_get(dg).bound_box] if o.type=='MESH' else []
 out['objects'].append({'name':o.name,'type':o.type,'bounds':[[min(v[i] for v in b),max(v[i] for v in b)] for i in range(3)] if b else [],'polys':len(o.data.polygons) if b else 0,'materials':[m.name for m in o.data.materials] if b else [],'mods':[(m.name,m.type) for m in o.modifiers]})
for m in bpy.data.materials:
 out['materials'].append({'name':m.name,'nodes':[(n.name,n.type,n.image.name if n.type=='TEX_IMAGE' and n.image else '') for n in m.node_tree.nodes] if m.use_nodes else []})
for i in bpy.data.images:out['images'].append({'name':i.name,'size':list(i.size),'packed':bool(i.packed_file),'path':i.filepath})
Path('tools/generated/cinematic-inspection.json').write_text(json.dumps(out,indent=2))
