import bpy,os,json
base=os.getcwd();out={}
for key,file in [('porsche','porsche-911-gt3.glb'),('ferrari','ferrari-italia-complete.glb'),('revuelto','lamborghini-revuelto.glb')]:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.join(base,'public/models',file))
 out[key]=[{'name':o.name,'type':o.type,'parent':o.parent.name if o.parent else None,'location':list(o.location),'mesh':len(o.data.polygons) if o.type=='MESH' else 0} for o in bpy.context.scene.objects if o.type!='MESH' or (key=='revuelto' and o.name.startswith(('Door','WingMirror','MirrorBase','Glass')))]
json.dump(out,open('tools/generated/door-source-inventory.json','w'),indent=2)
