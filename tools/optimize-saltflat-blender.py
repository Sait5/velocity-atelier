import bpy,math,os,json
root=os.getcwd();path=os.path.join(root,'tools/generated/saltflat/saltflat-speed-test.blend');bpy.ops.wm.open_mainfile(filepath=path);level=8.287;water=8.027
if bpy.data.objects.get('OuterTerrain_1_far'):
 raise SystemExit('Already optimized. Use build-saltflat-blender.py for a full rebuild.')
near=[];far=[]
def outer(x,side):
 p=x/160*math.tau
 return 42+4*math.sin(p*2+side*.4)+1.5*math.cos(p*3+.8)
for obj in list(bpy.data.objects):
 if obj.type!='MESH':continue
 if obj.name.endswith('_near'):near.append(obj)
 if obj.name.endswith('_far'):far.append(obj)
 if obj.name.startswith('Road_'):
  for loop in obj.data.loops:
   v=obj.data.vertices[loop.vertex_index].co;obj.data.uv_layers.active.data[loop.index].uv=(v.x/1.25,v.y/1.25)
 if obj.name.startswith('Water_'):
  side=-1 if '_-1_' in obj.name else 1
  for v in obj.data.vertices:
   x,y,z=v.co;p=x/160*math.tau;inner=7.4+.55*math.sin(p+side*.7)+.25*math.sin(p*3+side*2.1)+.15*math.cos(p*5+.3)-.18
   v.co.y=side*(inner+(abs(y)-inner)/(180-inner)*(outer(x,side)-inner))
  obj.data.update()
 if obj.name.startswith('Salt_'):
  # Centimetre-scale, periodic relief; keep the road and all tile seams level.
  for v in obj.data.vertices:
   x,y,z=v.co;p=x/160*math.tau;shore=7.4+.55*math.sin(p+(-1 if y<0 else 1)*.7)+.25*math.sin(p*3+(-1 if y<0 else 1)*2.1)+.15*math.cos(p*5+.3);t=(abs(y)-5.05)/(shore-5.05)
   v.co.z+=.009*math.sin(t*math.pi)*math.sin(p*3+y*.7)
  obj.data.update()
mountain=bpy.data.objects['Connected_forward_massif'];mountain.scale.y*=1.7
mod=mountain.modifiers.new('Distant silhouette budget','DECIMATE');mod.ratio=.15;bpy.context.view_layer.objects.active=mountain;bpy.ops.object.modifier_apply(modifier=mod.name)
for side in [-1,1]:
 verts=[];uvs=[];faces=[];nx=40;ny=4
 for i in range(nx+1):
  x=-80+i/nx*160
  for j in range(ny+1):
   t=j/ny;bank=outer(x,side);y=side*(bank-.25+t*(1600-bank+.25));z=water-.012+.18*min(1,t*4)+.035*math.sin(x/160*math.tau*3+side)*math.sin(t*math.pi)
   verts.append((x,y,z));uvs.append((x/4,y/4))
 for i in range(nx):
  for j in range(ny):
   k=i*(ny+1)+j;f=(k,k+ny+1,k+ny+2,k+1);faces.append(f if side>0 else tuple(reversed(f)))
 data=bpy.data.meshes.new('Outer terrain');data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new('OuterTerrain_%s_far'%side,data);bpy.context.scene.collection.objects.link(o);data.materials.append(bpy.data.materials['Salt crust PBR']);uv=data.uv_layers.new(name='UVMap')
 for poly in data.polygons:
  poly.use_smooth=True
  for loop in poly.loop_indices:uv.data[loop].uv=uvs[data.loops[loop].vertex_index]
 far.append(o);o.hide_render=False
sun=bpy.data.objects.get('Natural daylight')
if sun:sun.data.energy=2;sun.data.angle=.06;sun.rotation_euler=(math.radians(32),math.radians(-24),math.radians(-35))
bpy.context.scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.55
bpy.ops.wm.save_as_mainfile(filepath=path)
for objects,file in [(near,'road-banks-near.glb'),(far,'road-banks-far.glb'),([mountain],'forward-massif.glb')]:
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.export_scene.gltf(filepath=os.path.join(root,'public/models/saltflat',file),export_format='GLB',use_selection=True,export_materials='NONE',export_yup=True)
print('MOUNTAIN_TRIANGLES',sum(len(p.vertices)-2 for p in mountain.data.polygons));print('WATER_WIDTH_PER_SIDE', 'about 35 metres instead of 1590')
