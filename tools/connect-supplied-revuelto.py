"""Place the supplied animated hinge and attach intact imported door assemblies."""
import bpy,os,math,json,subprocess
from mathutils import Matrix,Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE=os.path.join(os.path.dirname(ROOT),'blender','Scissor-Hinge.blend')
bpy.ops.wm.read_factory_settings(use_empty=True)
attachments=[]
for side,sign in [('L',1),('R',-1)]:
 with bpy.data.libraries.load(SOURCE,link=False) as (src,dst):
  dst.objects=[n for n in src.objects if n not in ['Studio floor','Key','Rim','Front','Camera']]
 objects=[o for o in dst.objects if o]
 for o in objects:bpy.context.scene.collection.objects.link(o)
 rig=next(o for o in objects if o.name.startswith('SCISSOR HINGE'))
 attachment=next(o for o in objects if o.name.startswith('DOOR_ATTACHMENT'))
 # Source rotation is around Blender -Y. Place that axis upward and outward.
 axis=Vector((sign*.035,-1,-sign*.55)).normalized()
 orientation=Vector((0,-1,0)).rotation_difference(axis).to_matrix().to_4x4()
 mirror=Matrix.Diagonal((1,-1,1,1)) if sign<0 else Matrix.Identity(4)
 rig.matrix_world=Matrix.Translation(Vector((-1.08,-sign*.85,.68)))@orientation@mirror
 for o in objects:
  original=o.name.split('.0')[0] if o.name.startswith(('SCISSOR HINGE','DOOR_ATTACHMENT','01 |','02 |','03 |','04 |')) else o.name
  o.name=f'Supplied_{side}_{original}'
  if o.type=='MESH':
   for slot in o.material_slots:
    material=slot.material
    if not material or material.name.startswith(('Black seals','Polished piston rod','Bronze bearing','Orange identification')):continue
    # Keep authored surface properties; whiten only the main structural pieces.
    if material.name.startswith(('Satin machined titanium','Graphite anodized aluminum')):
     white=material.copy();white.name='Visible white hinge '+material.name;slot.material=white
     white.diffuse_color=(.91,.93,.94,1)
     if white.use_nodes:
      for node in white.node_tree.nodes:
       if node.type=='BSDF_PRINCIPLED':node.inputs['Base Color'].default_value=(.91,.93,.94,1);node.inputs['Metallic'].default_value=.18
 attachments.append(attachment)
bpy.context.scene.frame_start=16;bpy.context.scene.frame_end=76;bpy.context.scene.render.fps=50
bpy.context.scene.frame_set(16);bpy.context.view_layer.update()
outdir=os.path.join(ROOT,'public/models/fitted-hinges');os.makedirs(outdir,exist_ok=True)
settings=dict(export_format='GLB',export_animations=True,export_animation_mode='SCENE',export_force_sampling=True,export_frame_range=True,export_frame_step=1)
bpy.ops.export_scene.gltf(filepath=os.path.join(outdir,'revuelto-supplied-hinges.glb'),**settings)
existing=set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/models/lamborghini-revuelto.glb'))
car=[o for o in bpy.context.scene.objects if o not in existing]
basis=Matrix.Translation(Vector((.10516,0,.00108)))@Matrix.Rotation(-math.pi/2,4,'Z')
for o in car:
 if o.parent is None:o.matrix_world=basis@o.matrix_world
bpy.context.view_layer.update()
originals=[o for o in car if o.type=='MESH'];baseline={o.name:[o.matrix_world@v.co for v in o.data.vertices] for o in originals}
for o in originals:
 if o.name.startswith(('DoorJambLFPiston','DoorJambRFPiston')):o.hide_set(True)
for code,attachment in zip(['L','R'],attachments):
 d=bpy.data.objects.new('Revuelto door '+code,None);bpy.context.scene.collection.objects.link(d)
 d.matrix_world=Matrix.Translation(Vector((-1.10,-.86 if code=='L' else .86,.64)));bpy.context.view_layer.update()
 for o in originals:
  if o.name.startswith(('Door'+code+'F_','DoorJamb'+code+'F_','DoorCard'+code+'F','WingMirror'+code+'_','MirrorBase'+code+'_','Glass'+code+'M_')):
   w=o.matrix_world.copy();o.parent=d;o.matrix_parent_inverse=Matrix.Identity(4);o.matrix_world=w
 w=d.matrix_world.copy();d.parent=attachment;d.matrix_parent_inverse=Matrix.Identity(4);d.matrix_world=w
bpy.context.view_layer.update()
error=max((o.matrix_world@o.data.vertices[i].co-v).length for o in originals for i,v in enumerate(baseline[o.name]));assert error<1e-5,error
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(os.path.dirname(ROOT),'blender','Revuelto-Connected-Hinge.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(outdir,'revuelto-supplied-complete.glb'),use_visible=True,**settings)
json.dump({'source':SOURCE,'closed_vertex_error':error,'attachment_nodes':[o.name for o in attachments],'frames':[16,76]},open(os.path.join(ROOT,'tools/generated/door-mechanisms/supplied-hinge-connection.json'),'w'),indent=2)
print('SUPPLIED_HINGE_CONNECTED',error,flush=True)
subprocess.run(['node','tools/split-supplied-hinge-clips.mjs'],cwd=ROOT,check=True)
