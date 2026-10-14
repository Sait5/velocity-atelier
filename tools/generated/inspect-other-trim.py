import bpy,os,sys
car=sys.argv[-1]
path='porsche-911-gt3-door-assembly.glb' if car=='porsche' else 'lamborghini-revuelto-user-edited.glb'
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/'+path))
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 mats=[m.name for m in o.data.materials if m]
 if any('Paint' in m or 'paint' in m for m in mats):
  print('PAINT',o.name,'PARENT',o.parent.name if o.parent else '', 'FACES',len(o.data.polygons),flush=True)
