from pathlib import Path
import bpy,math
p=Path('tools/build-saltflat-blender.py');s=p.read_text().replace('return depth\n\ndef salt_height','return depth*smooth(.05,.42,.5+.5*math.sin(p+.8+.3*math.sin(y*.14)))\n\ndef salt_height');p.write_text(s)
p=Path('app/three/blenderSaltFlatRoad.ts');r=p.read_text().replace("'#c7c9c3'","'#d4ceca'").replace('vec4(68.,13.,18.,9.));}', 'vec4(68.,13.,18.,9.))*smoothstep(.05,.42,.5+.5*sin(phase+.8+.3*sin(y*.14)));}');p.write_text(r)
a=s.index('def smooth(');b=s.index('\ndef mesh(',a);ns={'math':math,'LEVEL':8.287};exec(s[a:b],ns)
bpy.ops.wm.open_mainfile(filepath=str(Path('tools/generated/saltflat/saltflat-speed-test.blend').resolve()))
for o in bpy.data.objects:
 if o.name.startswith('Salt_'):
  for v in o.data.vertices:v.co.z=ns['salt_height'](v.co.x,v.co.y)
bpy.ops.wm.save_as_mainfile(filepath=str(Path('tools/generated/saltflat/saltflat-speed-test.blend').resolve()))
for suffix,file in [('_near','road-banks-near.glb'),('_far','road-banks-far.glb')]:
 bpy.ops.object.select_all(action='DESELECT');objs=[o for o in bpy.data.objects if o.type=='MESH' and o.name.endswith(suffix)]
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0];bpy.ops.export_scene.gltf(filepath=str(Path('public/models/saltflat',file).resolve()),export_format='GLB',use_selection=True,export_materials='NONE',export_yup=True)
