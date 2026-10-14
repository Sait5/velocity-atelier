from pathlib import Path
import bpy,math
p=Path('app/three/blenderSaltFlatRoad.ts');s=p.read_text().replace('new T.Vector2(.45,.45)','new T.Vector2(.36,.36)').replace('vec2(p.x,-p.y)/4.','vec2(p.x,-p.y)/1.6.')
s=s.replace("roughnessFactor=mix(clamp(roughnessFactor,.7,1.),.46,smoothstep(.004,.075,basin(vec2(mineralPoint.x,mineralPoint.z))));", "roughnessFactor=mix(mix(clamp(roughnessFactor,.7,1.),.46,smoothstep(.004,.075,basin(vec2(mineralPoint.x,mineralPoint.z)))),.95,smoothstep(35.,65.,abs(mineralPoint.z)));" )
s=s.replace("};m.customProgramCacheKey=()=>'photographic-mineral-wet-v2-'+wet}", "shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\\nmapN.xy*=1.-smoothstep(35.,65.,abs(mineralPoint.z));normal=normalize(tbn*mapN);');};m.customProgramCacheKey=()=>'photographic-mineral-wet-v3-'+wet}")
p.write_text(s)
p=Path('app/components/VehicleScene.client.vue');s=p.read_text().replace("const background=props.roadMap==='desert'?", "scene.userData.daylightBloom=props.drive&&props.roadMap==='desert'?.07:.24;const background=props.roadMap==='desert'?");p.write_text(s)
p=Path('app/three/vehiclePost.ts');s=p.read_text().replace("render(quality:string){if(","render(quality:string){bloom.strength=scene.userData.daylightBloom??.24;if(");p.write_text(s)
p=Path('tools/build-saltflat-blender.py');s=p.read_text().replace('nx,ny,bank,salt,4,collection','nx,ny,bank,salt,1.6,collection').replace('outerland,salt,4,far','outerland,salt,1.6,far')
extras='''# Match the editable scene's material and sky balance to the real-time daylight view.
for mat,strength in [(salt,.36),(gravel,.22),(asphalt,.65)]:
 for node in mat.node_tree.nodes:
  if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=strength
bs=asphalt.node_tree.nodes.get('Principled BSDF');links=asphalt.node_tree.links
base=bs.inputs['Base Color'].links[0].from_socket
hue=asphalt.node_tree.nodes.new('ShaderNodeHueSaturation');hue.inputs['Saturation'].default_value=.4;hue.inputs['Value'].default_value=1.18;links.new(base,hue.inputs['Color']);links.new(hue.outputs['Color'],bs.inputs['Base Color'])
'''
s=s.replace('# Editable natural lighting',extras+'# Editable natural lighting');s=s.replace('scene.world=world','scene.world=world;sky=world.node_tree.nodes.new("ShaderNodeTexSky");sky.sky_type="NISHITA";sky.sun_elevation=.55;sky.sun_rotation=-.9;sky.sun_disc=False;world.node_tree.links.new(sky.outputs["Color"],world.node_tree.nodes.get("Background").inputs["Color"]);world.node_tree.nodes.get("Background").inputs["Strength"].default_value=.25');p.write_text(s)
bpy.ops.wm.open_mainfile(filepath=str(Path('tools/generated/saltflat/saltflat-speed-test.blend').resolve()))
for o in bpy.data.objects:
 if o.name.startswith(('Salt_','OuterTerrain_')):
  for loop in o.data.loops:
   v=o.data.vertices[loop.vertex_index].co;o.data.uv_layers.active.data[loop.index].uv=(v.x/1.6,v.y/1.6)
salt=bpy.data.materials['Salt crust PBR'];gravel=bpy.data.materials['Salt mineral shoulder'];asphalt=bpy.data.materials['Asphalt PBR'];exec(extras)
world=bpy.context.scene.world;sky=world.node_tree.nodes.new('ShaderNodeTexSky');sky.sky_type='NISHITA';sky.sun_elevation=.55;sky.sun_rotation=-.9;sky.sun_disc=False;world.node_tree.links.new(sky.outputs['Color'],world.node_tree.nodes.get('Background').inputs['Color']);world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.25
bpy.ops.wm.save_as_mainfile(filepath=str(Path('tools/generated/saltflat/saltflat-speed-test.blend').resolve()))
for suffix,file in [('_near','road-banks-near.glb'),('_far','road-banks-far.glb')]:
 bpy.ops.object.select_all(action='DESELECT');objs=[o for o in bpy.data.objects if o.type=='MESH' and o.name.endswith(suffix)]
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0];bpy.ops.export_scene.gltf(filepath=str(Path('public/models/saltflat',file).resolve()),export_format='GLB',use_selection=True,export_materials='NONE',export_yup=True)
