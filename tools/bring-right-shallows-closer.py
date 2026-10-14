from pathlib import Path
import bpy,math
p=Path('tools/build-saltflat-blender.py');s=p.read_text().replace('inner=8.0+1.3*math.sin(p)+.8*math.sin(p*3+.7)','inner=5.8+.5*math.sin(p)+.3*math.sin(p*3+.7)').replace('smooth(inner,inner+3,y)','smooth(inner,inner+1.8,y)').replace('waterShoreCentreDistance=[5.9,10.1]','waterShoreCentreDistance=[5.0,6.6]');p.write_text(s)
p=Path('app/three/blenderSaltFlatRoad.ts');s=p.read_text().replace('inner=8.+1.3*sin(phase)+.8*sin(phase*3.+.7)','inner=5.8+.5*sin(phase)+.3*sin(phase*3.+.7)').replace('smoothstep(inner,inner+3.,y)','smoothstep(inner,inner+1.8,y)');p.write_text(s)
# Reuse the builder's exact terrain function without baking unchanged photographic maps again.
s=Path('tools/build-saltflat-blender.py').read_text();a=s.index('def smooth(');b=s.index('\ndef mesh(',a)
ns={'math':math,'LEVEL':8.287};exec(s[a:b],ns)
bpy.ops.wm.open_mainfile(filepath=str(Path('tools/generated/saltflat/saltflat-speed-test.blend').resolve()))
for o in bpy.data.objects:
 if o.name.startswith('Salt_'):
  for v in o.data.vertices:v.co.z=ns['salt_height'](v.co.x,v.co.y)
bpy.ops.wm.save_as_mainfile(filepath=str(Path('tools/generated/saltflat/saltflat-speed-test.blend').resolve()))
for suffix,file in [('_near','road-banks-near.glb'),('_far','road-banks-far.glb')]:
 bpy.ops.object.select_all(action='DESELECT');objs=[o for o in bpy.data.objects if o.type=='MESH' and o.name.endswith(suffix)]
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0];bpy.ops.export_scene.gltf(filepath=str(Path('public/models/saltflat',file).resolve()),export_format='GLB',use_selection=True,export_materials='NONE',export_yup=True)
