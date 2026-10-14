import bpy
bpy.ops.wm.open_mainfile(filepath=r'C:\Users\Admin\Downloads\Tunnel.blend')
for o in bpy.context.scene.objects:
 print('OBJECT',o.name,o.type,tuple(o.location),tuple(o.dimensions),[(m.name,m.type,getattr(m,'count',0),tuple(getattr(m,'relative_offset_displace',(0,0,0)))) for m in o.modifiers])
for m in bpy.data.materials:
 print('MATERIAL',m.name,[(n.type,n.name,n.image.name if n.type=='TEX_IMAGE' and n.image else '') for n in m.node_tree.nodes] if m.use_nodes else [])
print('IMAGES',[(i.name,i.size[:],bool(i.packed_file)) for i in bpy.data.images])
