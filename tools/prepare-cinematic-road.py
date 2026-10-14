import bpy,json
from mathutils import Vector
from pathlib import Path
bpy.ops.wm.open_mainfile(filepath=str(Path('tools/generated/cinematic-road-source/Cinematic roads pack/Straight road/forBlender.blend').resolve()))
road=bpy.data.objects['Plane'];b=[road.matrix_world@Vector(v) for v in road.bound_box]
xc=(min(v.x for v in b)+max(v.x for v in b))/2;yc=(min(v.y for v in b)+max(v.y for v in b))/2;period=max(v.y for v in b)-min(v.y for v in b)
for o in list(bpy.context.scene.objects):
 if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True);continue
 o.data.transform(o.matrix_world);o.matrix_world.identity()
 for v in o.data.vertices:v.co.x-=xc;v.co.y-=yc
 o.data.update()
for o in bpy.context.scene.objects:
 for m in o.data.materials:
  if not m:continue
  for n in m.node_tree.nodes:
   if n.type=='BSDF_PRINCIPLED' and o.name=='Plane':n.inputs['Roughness'].default_value=.78
bpy.ops.export_scene.gltf(filepath=str(Path('public/models/cinematic-road.glb').resolve()),export_format='GLB',export_apply=True,export_cameras=False,export_lights=False,export_image_format='AUTO')
Path('app/three/cinematicMeta.json').write_text(json.dumps({'period':period,'width':max(v.x for v in b)-min(v.x for v in b)}))
