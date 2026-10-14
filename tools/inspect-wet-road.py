import bpy,json
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath=r'C:\Users\Admin\Documents\ChatGPT\Velocity Atelier\apex\tools\generated\wet-road-source\scene\scene.blend')
out={'objects':[],'materials':[],'images':[]}
dg=bpy.context.evaluated_depsgraph_get()
for o in bpy.data.objects:
    bounds=[o.matrix_world@Vector(v) for v in o.evaluated_get(dg).bound_box] if o.type=='MESH' else []
    out['objects'].append({'name':o.name,'type':o.type,'loc':list(o.location),'scale':list(o.scale),'bounds':[[min(v[i] for v in bounds),max(v[i] for v in bounds)] for i in range(3)] if bounds else [],'materials':[m.name for m in o.data.materials] if o.type=='MESH' else [],'mods':[(m.name,m.type) for m in o.modifiers]})
for m in bpy.data.materials:
    out['materials'].append({'name':m.name,'nodes':[(n.name,n.type, n.image.name if n.type=='TEX_IMAGE' and n.image else '') for n in m.node_tree.nodes] if m.use_nodes else []})
for i in bpy.data.images:out['images'].append({'name':i.name,'size':list(i.size),'packed':bool(i.packed_file),'path':i.filepath})
open(r'C:\Users\Admin\Documents\ChatGPT\Velocity Atelier\apex\tools\generated\wet-road-inspection.json','w').write(json.dumps(out,indent=2))
