from pathlib import Path
import bpy,json
p=Path('tools/build-saltflat-blender.py');s=p.read_text().replace("bs.inputs['Base Color'].default_value=(.035,.22,.24,1)","bs.inputs['Base Color'].default_value=(.1,.55,.64,1)").replace("bs.inputs['Roughness'].default_value=.12","bs.inputs['Roughness'].default_value=.22").replace("bs.inputs['Transmission Weight'].default_value=.75","bs.inputs['Transmission Weight'].default_value=.35").replace("nm.inputs['Strength'].default_value=.22;water", "nm.inputs['Strength'].default_value=.055;water").replace('for obj in far:obj.hide_render=True',"for obj in far:obj.hide_render=not obj.name.startswith('OuterTerrain_')")
a=s.index('report.update(');b=s.index('\nwith open(',a)
s=s[:a]+"report.update(stationaryMountainOffset=-1800,shoulderWidth=.45,mountainWidthMultiplier=4.0,mountainHeightMultiplier=.45,roadTextureRepeatMetres=1.25,waterReflectionScenePasses=0,drivingShadowResolution=1024,ponds=PONDS,saltPlainHalfWidth=1600)"+s[b:];p.write_text(s)
p=Path('public/models/saltflat/scene.json');d=json.loads(p.read_text());[d.pop(k,None) for k in ['shorelineCentreDistance','waterWidthPerSideApprox','outerShoreCentreDistance']];d.update(mountainWidthMultiplier=4,mountainHeightMultiplier=.45,ponds=[[-25,23,42,13],[48,-31,20,10]],saltPlainHalfWidth=1600);p.write_text(json.dumps(d,indent=2))
bpy.ops.wm.open_mainfile(filepath=str(Path('tools/generated/saltflat/saltflat-speed-test.blend').resolve()))
for o in bpy.data.objects:
 if o.name.startswith('OuterTerrain_'):o.hide_render=False
m=bpy.data.materials['Salt lake water'];bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.1,.55,.64,1);bs.inputs['Roughness'].default_value=.22;bs.inputs['Transmission Weight'].default_value=.35
for n in m.node_tree.nodes:
 if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=.055
bpy.ops.wm.save_as_mainfile(filepath=str(Path('tools/generated/saltflat/saltflat-speed-test.blend').resolve()))
