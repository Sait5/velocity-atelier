from pathlib import Path
import bpy, math,json
p=Path('app/three/blenderSaltFlatRoad.ts');s=p.read_text().replace("color:'#f1f2ee'","color:'#d6d8d5'").replace("outerMat.color.set('#f1f2ee')","outerMat.color.set('#d6d8d5')").replace("rock.color.set('#b4c2cc')","rock.color.set('#7e8a98')").replace("normalScale:new T.Vector2(.22,.22),roughness:.95","normalScale:new T.Vector2(.30,.30),roughness:.95")
s=s.replace("diffuseColor.rgb=mix(diffuseColor.rgb,vec3(aggregate),.9);", "diffuseColor.rgb=mix(diffuseColor.rgb,vec3(aggregate),.9);diffuseColor.rgb*=mix(.90,1.08,texture2D(map,vMapUv.yx*2.+vec2(.31,.57)).r);")
p.write_text(s)
p=Path('tools/build-saltflat-blender.py');s=p.read_text().replace("(v.co.z-(LEVEL-1))*.45","(v.co.z-(LEVEL-1))*.65").replace('mountainHeightMultiplier=.45','mountainHeightMultiplier=.65');p.write_text(s)
bpy.ops.wm.open_mainfile(filepath=str(Path('tools/generated/saltflat/saltflat-speed-test.blend').resolve()))
m=bpy.data.objects['Connected_forward_massif']
for v in m.data.vertices:v.co.z=7.287+(v.co.z-7.287)*.65/.45
bpy.ops.wm.save_as_mainfile(filepath=str(Path('tools/generated/saltflat/saltflat-speed-test.blend').resolve()))
bpy.ops.object.select_all(action='DESELECT');m.select_set(True);bpy.context.view_layer.objects.active=m;bpy.ops.export_scene.gltf(filepath=str(Path('public/models/saltflat/forward-massif.glb').resolve()),export_format='GLB',use_selection=True,export_materials='NONE',export_yup=True)
p=Path('public/models/saltflat/scene.json');d=json.loads(p.read_text());d['mountainHeightMultiplier']=.65;p.write_text(json.dumps(d,indent=2))
