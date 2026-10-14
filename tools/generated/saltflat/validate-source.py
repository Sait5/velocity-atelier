import bpy,json,os
root=os.path.dirname(__file__)
bpy.ops.wm.open_mainfile(filepath=os.path.join(root,'saltflat-speed-test.blend'))
mat=bpy.data.materials['Asphalt PBR'];nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
if not any(n.type=='MIX_RGB' for n in nodes):
 base=bs.inputs['Base Color'].links[0].from_socket
 balance=nodes.new('ShaderNodeMixRGB');balance.inputs[0].default_value=.32;balance.inputs[2].default_value=(.16,.155,.145,1);links.new(base,balance.inputs[1]);links.new(balance.outputs[0],bs.inputs['Base Color'])
assert not any(o.name.startswith('Shoulder_') for o in bpy.data.objects)
assert not any('mountain' in o.name.lower() for o in bpy.data.objects)
assert bpy.data.images.get('Right shallow-water coverage')
assert bpy.data.collections.get('Linked road preview — not exported')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,'saltflat-speed-test.blend'))
print('BLENDER_SOURCE_VALIDATED',json.dumps({'mountains':0,'standaloneShoulderMeshes':0,'previewObjects':len(bpy.data.collections['Linked road preview — not exported'].objects)}))
