import bpy, math, os, json, numpy as np
from mathutils import Vector, noise
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'public/models/saltflat'); TEX=os.path.join(ROOT,'public/textures'); SRC=os.path.join(ROOT,'tools/generated/saltflat')
os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
LEVEL=8.287;WATER=LEVEL-.055
images={}
def img(name,noncolor=False):
 if name not in images: images[name]=bpy.data.images.load(os.path.join(TEX,name),check_existing=True)
 image=images[name]
 if noncolor:image.colorspace_settings.name='Non-Color'
 return image
def pbr(name,base,normal,rough,normal_strength=.4):
 mat=bpy.data.materials.new(name);mat.use_nodes=True;n=mat.node_tree.nodes;l=mat.node_tree.links;bs=n.get('Principled BSDF')
 for path,socket,nc in [(base,'Base Color',False),(rough,'Roughness',True)]:
  node=n.new('ShaderNodeTexImage');node.image=img(path,nc);l.new(node.outputs['Color'],bs.inputs[socket])
 nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=normal_strength;node=n.new('ShaderNodeTexImage');node.image=img(normal,True);l.new(node.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],bs.inputs['Normal'])
 return mat
# Bake a pale mineral palette from photographic cracked-ground colour, retaining real grain/fissures.
mat=bpy.data.materials.new('Salt photographic mineral palette');mat.use_nodes=True;n=mat.node_tree.nodes;n.clear();l=mat.node_tree.links
photo=n.new('ShaderNodeTexImage');photo.image=img('salt-crust-source-4k.jpg')
ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements.remove(ramp.color_ramp.elements[1]);ramp.color_ramp.elements[0].position=.025;ramp.color_ramp.elements[0].color=(.61,.63,.60,1)
for pos,col in [(.18,(.71,.73,.70,1)),(.44,(.79,.81,.77,1)),(.8,(.85,.87,.81,1))]:ramp.color_ramp.elements.new(pos).color=col
l.new(photo.outputs['Color'],ramp.inputs['Fac']);em=n.new('ShaderNodeEmission');l.new(ramp.outputs['Color'],em.inputs['Color']);output=n.new('ShaderNodeOutputMaterial');l.new(em.outputs[0],output.inputs['Surface'])
bpy.ops.mesh.primitive_plane_add(size=2);bake=bpy.context.object;bake.data.materials.append(mat)
baked=bpy.data.images.new('Salt crust albedo 4K',width=4096,height=4096);target=n.new('ShaderNodeTexImage');target.image=baked;n.active=target
bpy.ops.object.bake(type='EMIT');baked.filepath_raw=os.path.join(TEX,'salt-crust-albedo-4k.png');baked.file_format='PNG';baked.save();bpy.data.objects.remove(bake,do_unlink=True)
asphalt=pbr('Asphalt PBR','asphalt_01_diff_4k.jpg','asphalt_01_nor_gl_2k.jpg','asphalt_01_rough_2k.jpg',.55)
salt=pbr('Salt crust PBR','salt-crust-albedo-4k.png','salt-crust-normal-2k.jpg','salt-crust-rough-2k.jpg',.28)
gravel=salt.copy();gravel.name='Salt mineral shoulder'
paint=bpy.data.materials.new('Road marking');paint.diffuse_color=(.7,.65,.49,1);paint.use_nodes=True;paint.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.8
water=bpy.data.materials.new('Salt lake water');water.use_nodes=True;bs=water.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.1,.55,.64,1);bs.inputs['Roughness'].default_value=.22;bs.inputs['Transmission Weight'].default_value=.35;bs.inputs['IOR'].default_value=1.333
wn=water.node_tree.nodes.new('ShaderNodeTexImage');wn.image=img('salt-lake-water-normal.jpg',True);nm=water.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.055;water.node_tree.links.new(wn.outputs['Color'],nm.inputs['Color']);water.node_tree.links.new(nm.outputs['Normal'],bs.inputs['Normal'])
heightimg=bpy.data.images.load(os.path.join(SRC,'crust-height.png'));heightimg.colorspace_settings.name='Non-Color';pixels=np.empty(len(heightimg.pixels),dtype=np.float32);heightimg.pixels.foreach_get(pixels);heightfield=pixels.reshape(heightimg.size[1],heightimg.size[0],4)[:,:,0]
def sampleheight(x,y):return float(heightfield[int((y/4%1)*(heightimg.size[1]-1)),int((x/4%1)*(heightimg.size[0]-1))])
def coast(x,side):
 p=x/160*math.tau
 return 7.4+.55*math.sin(p+side*.7)+.25*math.sin(p*3+side*2.1)+.15*math.cos(p*5+.3)
def outer(x,side):
 p=x/160*math.tau
 return 42+4*math.sin(p*2+side*.4)+1.5*math.cos(p*3+.8)
def roadedge(x,side):
 p=x/160*math.tau
 return 3.7+.018*math.sin(p*11+side)+.009*math.sin(p*23+side*.7)
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def lake_depth(x,y):
 if y<0:return 0
 p=x/160*math.tau
 inner=max(4.4,6.2+1.8*math.sin(p+.3)+1.2*math.sin(p*3+1.1)+.5*math.sin(p*7))
 outer=64+10*math.sin(p*2+1)+6*math.sin(p*3)+2*math.sin(p*7+.7)
 depth=(.15+.03*math.sin(p*2+y*.13))*smooth(inner,inner+2.8,y)*(1-smooth(outer-9,outer,y))
 for cx,cy,rx,ry in [(-48,27,27,13),(22,48,30,16),(68,19,20,10)]:
  dx=((x-cx+80)%160-80)/rx;dy=(y-cy)/ry
  angle=math.atan2(dy,dx)
  r=math.hypot(dx+.13*math.sin(dy*3),dy+.09*math.sin(dx*4))/(1+.16*math.sin(angle*3+.4)+.09*math.sin(angle*5))
  depth*=smooth(.64,1.12,r)
 return depth*smooth(.0,.24,.5+.5*math.sin(p+.8+.3*math.sin(y*.14)))

def salt_height(x,y):
 return LEVEL-.015-lake_depth(x,y)+.003*math.sin(x/160*math.tau*3)*math.sin(y*.6)*smooth(4,5,abs(y))

# The editable Blender scene uses the same basin coverage as the lightweight browser shader.
coverage=bpy.data.images.new('Right shallow-water coverage',width=1024,height=512)
rgba=np.ones((512,1024,4),dtype=np.float32)
for j in range(512):
 for i in range(1024):
  x=-80+(i+.5)/1024*160;y=4.2+(j+.5)/512*77.8
  rgba[j,i,:3]=smooth(.001,.025,max(0,lake_depth(x,y)-.04-.003*math.sin(x/160*math.tau*3)*math.sin(y*.6)))
coverage.pixels.foreach_set(rgba.ravel());coverage.filepath_raw=os.path.join(SRC,'water-coverage.png');coverage.file_format='PNG';coverage.save()
nodes=water.node_tree.nodes;links=water.node_tree.links;mask=nodes.new('ShaderNodeTexImage');mask.image=coverage;mask.extension='EXTEND'
uvmask=nodes.new('ShaderNodeUVMap');uvmask.uv_map='WaterMask';links.new(uvmask.outputs[0],mask.inputs['Vector'])
transparent=nodes.new('ShaderNodeBsdfTransparent');mix=nodes.new('ShaderNodeMixShader');links.new(mask.outputs['Color'],mix.inputs[0]);links.new(transparent.outputs[0],mix.inputs[1]);links.new(nodes.get('Principled BSDF').outputs[0],mix.inputs[2]);links.new(mix.outputs[0],nodes.get('Material Output').inputs['Surface'])

def mesh(name,verts,faces,uvs,mat):
 data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update();obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);data.materials.append(mat)
 uv=data.uv_layers.new(name='UVMap')
 for poly in data.polygons:
  poly.use_smooth=True
  for loop in poly.loop_indices:uv.data[loop].uv=uvs[data.loops[loop].vertex_index]
 return obj
near=[];far=[]
def grid(name,nx,ny,fn,mat,scale,collection):
 verts=[];uvs=[];faces=[]
 for i in range(nx+1):
  x=-80+i/nx*160
  for j in range(ny+1):
   y,z=fn(x,j/ny);verts.append((x,y,z));uvs.append((x/scale,y/scale))
 for i in range(nx):
  for j in range(ny):
   k=i*(ny+1)+j;faces.append((k,k+ny+1,k+ny+2,k+1))
 if fn(-80,1)[0]<fn(-80,0)[0]:faces=[tuple(reversed(f)) for f in faces]
 obj=mesh(name,verts,faces,uvs,mat);collection.append(obj);return obj
for lod,collection,nx,ny in [('near',near,160,40),('far',far,40,24)]:
 grid('Road_'+lod,nx,1,lambda x,t:(-roadedge(x,-1)+t*(roadedge(x,1)+roadedge(x,-1)),LEVEL),asphalt,1.25,collection)
 for side in [-1,1]:
  def verge(x,t,side=side):
   y=side*(roadedge(x,side)+t*.14);relief=.012*math.sin(x/160*math.tau*17+side)*math.sin(t*math.pi)
   return y,LEVEL-.015*t+relief*.08
  grid('Shoulder_%s_%s'%(side,lod),nx,4 if lod=='near' else 2,verge,gravel,.8,collection)
  def bank(x,t,side=side):
   edge=roadedge(x,side)+.14; y=side*(edge+t*(90-edge))
   return y,salt_height(x,y)
  grid('Salt_%s_%s'%(side,lod),nx,ny,bank,salt,.8,collection)
  grid('Edge_line_%s_%s'%(side,lod),1,1,lambda x,t,side=side:(side*(3.35+t*.105),LEVEL+.003),paint,1,collection)
 # All dash meshes are joined into one draw call.
 verts=[];uvs=[];faces=[]
 for i in range(16):
  x=-80+i*10;k=len(verts);verts.extend([(x,-.055,LEVEL+.004),(x+3,-.055,LEVEL+.004),(x+3,.055,LEVEL+.004),(x,.055,LEVEL+.004)]);uvs.extend([(0,0),(3,0),(3,.11),(0,.11)]);faces.append((k,k+1,k+2,k+3))
 collection.append(mesh('Centre_lines_'+lod,verts,faces,uvs,paint))
 watermesh=grid('Water_0_'+lod,40,2,lambda x,t:(4.2+t*77.8,WATER),water,16,collection)
 uv=watermesh.data.uv_layers.new(name='WaterMask')
 for loop in watermesh.data.loops:
  pos=watermesh.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=((pos.x+80)/160,(pos.y-4.2)/77.8)
# A low mineral shore closes the lake into a continuous lightweight plain.
for side in [-1,1]:
 def outerland(x,t,side=side):
  y=side*(90+t*130)
  return y,salt_height(x,y)
 grid('OuterTerrain_%s_far'%side,40,4,outerland,salt,.8,far)
# Weld the feather into the salt bank: no separate long shoulder object or draw call.
import bmesh
for lod,collection in [('near',near),('far',far)]:
 for side in [-1,1]:
  bank=next(o for o in collection if o.name=='Salt_%s_%s'%(side,lod))
  feather=next(o for o in collection if o.name=='Shoulder_%s_%s'%(side,lod))
  collection.remove(feather);bpy.ops.object.select_all(action='DESELECT');bank.select_set(True);feather.select_set(True);bpy.context.view_layer.objects.active=bank;bpy.ops.object.join()
  bm=bmesh.new();bm.from_mesh(bank.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.to_mesh(bank.data);bm.free()
# Match the editable scene's material and sky balance to the real-time daylight view.
for mat,strength in [(salt,.18),(gravel,.18),(asphalt,.55)]:
 for node in mat.node_tree.nodes:
  if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=strength
bs=asphalt.node_tree.nodes.get('Principled BSDF');links=asphalt.node_tree.links
base=bs.inputs['Base Color'].links[0].from_socket
hue=asphalt.node_tree.nodes.new('ShaderNodeHueSaturation');hue.inputs['Saturation'].default_value=.4;hue.inputs['Value'].default_value=1.18;links.new(base,hue.inputs['Color']);links.new(hue.outputs['Color'],bs.inputs['Base Color'])
balance=asphalt.node_tree.nodes.new('ShaderNodeMixRGB');balance.inputs[0].default_value=.32;balance.inputs[2].default_value=(.16,.155,.145,1);links.new(hue.outputs['Color'],balance.inputs[1]);links.new(balance.outputs[0],bs.inputs['Base Color'])
# Blend the narrow boundary using physical cross-road coordinates in the editable source.
nodes=gravel.node_tree.nodes;links=gravel.node_tree.links;bs=nodes.get('Principled BSDF')
base=bs.inputs['Base Color'].links[0].from_socket
coord=nodes.new('ShaderNodeTexCoord');sep=nodes.new('ShaderNodeSeparateXYZ');links.new(coord.outputs['Geometry'] if 'Geometry' in coord.outputs else coord.outputs['Generated'],sep.inputs[0])
# Object coordinate is measured in metres; both shoulders are merged only in the browser.
links.new(coord.outputs['Object'],sep.inputs[0])
absolute=nodes.new('ShaderNodeMath');absolute.operation='ABSOLUTE';links.new(sep.outputs['Y'],absolute.inputs[0])
remap=nodes.new('ShaderNodeMapRange');remap.inputs['From Min'].default_value=3.7;remap.inputs['From Max'].default_value=3.84;remap.clamp=True;links.new(absolute.outputs[0],remap.inputs['Value'])
roadtex=nodes.new('ShaderNodeTexImage');roadtex.image=img('asphalt_01_diff_4k.jpg')
mix=nodes.new('ShaderNodeMixRGB');links.new(remap.outputs[0],mix.inputs[0]);links.new(roadtex.outputs['Color'],mix.inputs[1]);links.new(base,mix.inputs[2]);links.new(mix.outputs[0],bs.inputs['Base Color'])
# Editable natural lighting and camera in Blender.
bpy.ops.object.light_add(type='SUN',location=(0,0,30));sun=bpy.context.object;sun.name='Natural daylight';sun.data.energy=2.6;sun.data.angle=.045;sun.rotation_euler=(math.radians(58),math.radians(-18),math.radians(-42))
world=bpy.data.worlds.new('Clear daylight');world.use_nodes=True;world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.45,.64,.8,1);world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.35;scene.world=world;sky=world.node_tree.nodes.new("ShaderNodeTexSky");sky.sky_type="MULTIPLE_SCATTERING";sky.sun_elevation=.55;sky.sun_rotation=-.9;sky.sun_disc=False;world.node_tree.links.new(sky.outputs["Color"],world.node_tree.nodes.get("Background").inputs["Color"]);world.node_tree.nodes.get("Background").inputs["Strength"].default_value=.25
bpy.ops.object.camera_add(location=(12,-10,LEVEL+4.5));camera=bpy.context.object;camera.rotation_euler=(Vector((-30,0,LEVEL))-camera.location).to_track_quat('-Z','Y').to_euler();scene.camera=camera;camera.data.lens=38;camera.data.clip_end=5000;scene.render.resolution_x=1400;scene.render.resolution_y=900;scene.render.resolution_percentage=100
# Store all mesh variants and PBR node graphs in the source. Export geometry without duplicating textures in GLB.
for obj in far:obj.hide_render=not obj.name.startswith('OuterTerrain_')
# Linked preview tiles preserve the authored geometry and keep the saved Blender scene usable.
preview=bpy.data.collections.new('Linked road preview — not exported');scene.collection.children.link(preview)
for i in range(-10,11):
 if i==0:continue
 originals=near if abs(i)==1 else [o for o in far if not o.name.startswith('OuterTerrain_')]
 for source in originals+[o for o in far if o.name.startswith('OuterTerrain_')]:
  instance=source.copy();instance.data=source.data;instance.name=source.name+'_preview_'+str(i);instance.location.x=i*160;instance.hide_render=False;preview.objects.link(instance)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SRC,'saltflat-speed-test.blend'))
def export(objects,name):
 bpy.ops.object.select_all(action='DESELECT')
 for obj in objects:obj.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name),export_format='GLB',use_selection=True,export_materials='NONE',export_yup=True,export_cameras=False,export_lights=False)
export(near,'road-banks-near.glb');export(far,'road-banks-far.glb')
report={'tileLength':160,'roadLevel':LEVEL,'waterLevel':WATER,'nearTriangles':sum(len(o.data.polygons)*2 for o in near),'farTriangles':sum(len(o.data.polygons)*2 for o in far),'mountainTriangles':0,'source':'tools/generated/saltflat/saltflat-speed-test.blend'}
report.update(roadWidth=7.4,shoulderWidth=.14,roadTextureRepeatMetres=1.25,saltTextureRepeatMetres=.8,waterReflectionScenePasses=0,drivingShadowResolution=1024,waterSide="right",waterShoreCentreDistance=[4.4,9.7],saltPlainHalfWidth=220)
with open(os.path.join(OUT,'scene.json'),'w') as f:json.dump(report,f,indent=2)
print('SALTFLAT_EXPORT',json.dumps(report))





