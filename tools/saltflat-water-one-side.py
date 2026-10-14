from pathlib import Path
import bpy,math,json
p=Path('tools/build-saltflat-blender.py');s=p.read_text().replace('PONDS=[(-25,23,42,13),(48,-31,20,10)]','PONDS=[(-25,23,42,13)]');p.write_text(s)
p=Path('app/three/blenderSaltFlatRoad.ts');s=p.read_text().replace('+basin(p,vec4(48.,31.,20.,10.))','');p.write_text(s)
bpy.ops.wm.open_mainfile(filepath=str(Path('tools/generated/saltflat/saltflat-speed-test.blend').resolve()))
for name in ['Water_1_near','Water_1_far']:
 o=bpy.data.objects.get(name)
 if o:bpy.data.objects.remove(o,do_unlink=True)
for name in ['Salt_-1_near','Salt_-1_far']:
 for v in bpy.data.objects[name].data.vertices:v.co.z=8.287-.08+.004*math.sin(v.co.x/160*math.tau*3)*math.sin(v.co.y*.6)
bpy.ops.wm.save_as_mainfile(filepath=str(Path('tools/generated/saltflat/saltflat-speed-test.blend').resolve()))
for suffix,file in [('_near','road-banks-near.glb'),('_far','road-banks-far.glb')]:
 bpy.ops.object.select_all(action='DESELECT');objs=[o for o in bpy.data.objects if o.type=='MESH' and o.name.endswith(suffix)]
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0];bpy.ops.export_scene.gltf(filepath=str(Path('public/models/saltflat',file).resolve()),export_format='GLB',use_selection=True,export_materials='NONE',export_yup=True)
p=Path('public/models/saltflat/scene.json');d=json.loads(p.read_text());d['ponds']=[[-25,23,42,13]];d['waterSide']='right';p.write_text(json.dumps(d,indent=2))
