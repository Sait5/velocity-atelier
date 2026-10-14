import bpy,os,sys,json,subprocess
from mathutils import Matrix,Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
for key,file,names in [('porsche','porsche-911-gt3-door-assembly.glb',['Porsche door L','Porsche door R']),('ferrari','ferrari-italia-complete.glb',['door_L','door_R']),('revuelto','lamborghini-revuelto.glb',[])]:
 if selected and key not in selected:continue
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/models',file))
 if key=='revuelto':
  basis=Matrix.Translation(Vector((.10516,0,.00108)))@Matrix.Rotation(-1.5707963267948966,4,'Z')
  for o in list(bpy.context.scene.objects):
   if o.parent is None:o.matrix_world=basis@o.matrix_world
 bpy.context.view_layer.update();originals=[o for o in bpy.context.scene.objects if o.type=='MESH'];baseline={o.name:[o.matrix_world@v.co for v in o.data.vertices] for o in originals}
 if key=='revuelto':
  doors=[]
  for o in originals:
   if o.name.startswith(('DoorJambLFPiston','DoorJambRFPiston')):o.hide_set(True)
  for code,side in [('L',-1),('R',1)]:
   d=bpy.data.objects.new('Revuelto door '+code,None);bpy.context.scene.collection.objects.link(d);d.location=(-1.10,side*.86,.64);doors.append(d);bpy.context.view_layer.update()
   for o in originals:
    if o.name.startswith(('Door'+code+'F_','DoorJamb'+code+'F_','DoorCard'+code+'F','WingMirror'+code+'_','MirrorBase'+code+'_','Glass'+code+'M_')):
     w=o.matrix_world.copy();o.parent=d;o.matrix_world=w
 else:doors=[bpy.data.objects[name] for name in names]
 bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/models/fitted-hinges',key+'-hinges.glb'))
 bpy.context.scene.frame_set(0);bpy.context.view_layer.update()
 for d,side in zip(doors,['L','R']):
  w=d.matrix_world.copy();d.parent=bpy.data.objects['DoorAnchor_'+side];d.matrix_world=w
 bpy.context.view_layer.update()
 error=max((o.matrix_world@o.data.vertices[i].co-v).length for o in originals for i,v in enumerate(baseline[o.name]));assert error<1e-5,(key,error)
 out=os.path.join(ROOT,'public/models/fitted-hinges',key+'-complete.glb')
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'tools/generated/door-mechanisms',key+'-fitted.blend'))
 bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',use_visible=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=False,export_frame_range=False)
 print('FITTED_EXPORT',key,'closed vertex error',error,flush=True)

# Blender quantizes animation times to scene frames. Restore the exact samples
# from the same rig used by the browser after combining the scene geometry.
subprocess.run(['node','tools/preserve-fitted-animation.mjs',*selected],cwd=ROOT,check=True)


