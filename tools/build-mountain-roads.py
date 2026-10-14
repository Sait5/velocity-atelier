import bpy, math, json, sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
root=Path(__file__).resolve().parent.parent
kind=sys.argv[-1];winter=kind=='winter'
out=root/'public/models'/('winter-road' if winter else 'mountain-road');out.mkdir(parents=True,exist_ok=True)
if winter:bpy.ops.wm.open_mainfile(filepath=str(root/'tools/source-assets/winter/untitled.blend'))
else:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.fbx(filepath=str(root/'tools/source-assets/mountain/original/Snowy-terrain.fbx'))
source=max((o for o in bpy.data.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices))
verts=[source.matrix_world@v.co for v in source.data.vertices]
lo=[min(p[i] for p in verts) for i in range(3)];hi=[max(p[i] for p in verts) for i in range(3)]
polygons=[list(p.vertices) for p in source.data.polygons];source_name=source.name
bvh=BVHTree.FromPolygons(verts,polygons)
# Preserve the source landform and UV orientation, not a replacement made from primitive hills.
uv=source.data.uv_layers.active
uv_by_v={source.data.loops[i].vertex_index:uv.data[i].uv.copy() for i in range(len(source.data.loops))}
samples={}
def original(u,v):
 u=max(.00001,min(.99999,u));v=max(.00001,min(.99999,v));key=(round(u,7),round(v,7))
 if key not in samples:
  hit,n,idx,d=bvh.ray_cast(Vector((lo[0]+u*(hi[0]-lo[0]),lo[1]+v*(hi[1]-lo[1]),hi[2]+100)),Vector((0,0,-1)))
  if hit is None:samples[key]=(0,(u,v))
  else:
   # Source maps are affine DEM/Gaea UVs; interpolate the UV of the hit face.
   ids=polygons[idx];a,b,c=[verts[i] for i in ids[:3]]
   ab=b-a;ac=c-a;ap=hit-a;den=ab.dot(ab)*ac.dot(ac)-ab.dot(ac)**2
   vb=(ac.dot(ac)*ap.dot(ab)-ab.dot(ac)*ap.dot(ac))/max(1e-12,den);vc=(ab.dot(ab)*ap.dot(ac)-ab.dot(ac)*ap.dot(ab))/max(1e-12,den)
   tuv=uv_by_v[ids[0]]*(1-vb-vc)+uv_by_v[ids[1]]*vb+uv_by_v[ids[2]]*vc
   samples[key]=((hit.z-lo[2])/(hi[2]-lo[2]),tuple(tuv))
 return samples[key]
def terrain(x,y):
 # Ping-pong the original terrain at its outermost edge: adjacent chunks share exact vertices.
 q=(x+1024)%4096;u=(q/2048 if q<=2048 else (4096-q)/2048)
 v=.5+y/1000 if winter else .63+y/1100
 h,tuv=original(u,v);h0,_=original(u,.5 if winter else .63)
 # The source relief changes the foot of each slope along the route; no identical walls.
 toe,_=original(u,.43 if y<0 else .71)
 foot=5.5+6*toe+5*(.5+.5*math.sin(x*math.tau*43/4096+(1.7 if y>0 else 0)))
 a=max(0,abs(y)-foot);blend=1-math.exp(-a/20)
 if winter:z=((h-h0)*125+(80+h*140)*(1-math.exp(-a/(85 if y<0 else 120))))*blend-.22
 elif y<0:z=((h-h0)*190+85*(1-math.exp(-a/50)))*blend-.22
 else:z=(-105*(1-math.exp(-a/65))+(h-h0)*65*blend)*blend-.22
 # Actual erosion-scale geometry over the existing source landform. All frequencies
 # are periodic over 4096m so relief and its derivative meet across every section.
 relief=0
 for frequency,amplitude in [(27,7.8),(67,3.9),(139,1.7),(293,.65)]:
  phase=x*math.tau*frequency/4096
  relief+=amplitude*(math.sin(phase+y*.083+math.sin(y*.041)*2.1)*math.cos(y*.057+phase*.0)+.35*math.sin(phase*2-y*.131))
 shelves=3.4*math.sin(y*.26+math.sin(x*math.tau*43/4096)*1.6)
 z+=(relief+shelves)*(1-math.exp(-a/9))*math.exp(-max(0,abs(y)-280)/300)
 # A real valley floor beyond the drop, not two giant triangles stretched to
 # the outer border of a clamped source photograph. Gentle periodic relief
 # closes the backdrop without a raised curtain across the valley.
 outer=max(0,min(1,(abs(y)-(420 if winter or y<0 else 160))/(420 if winter or y<0 else 220)))
 outer=outer*outer*(3-2*outer)
 distant=(-118 if not winter and y>0 else 145)+14*math.sin(x*math.tau*19/4096+y*.009)+9*math.sin(x*math.tau*31/4096-y*.006)
 z=z*(1-outer)+distant*outer
 return z,tuv
def mat(name,path=None,rough=.9):
 m=bpy.data.materials.new(name);m.use_nodes=True;bs=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None) or m.node_tree.nodes.new('ShaderNodeBsdfPrincipled');bs.name='Principled BSDF';m.node_tree.links.new(bs.outputs['BSDF'],next(n for n in m.node_tree.nodes if n.type=='OUTPUT_MATERIAL').inputs['Surface']);bs.inputs['Roughness'].default_value=rough
 if path:
  n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(str(path));m.node_tree.links.new(n.outputs['Color'],bs.inputs['Base Color'])
 return m
terrainmat=mat('Winter source snow and geology' if winter else 'Kubocarte snow removed mineral terrain',out/'terrain-colour.jpg')
roadmat=mat('Asphalt PBR',root/'public/textures/asphalt_01_diff_4k.jpg',.85)
for key,file in [('Normal','asphalt_01_nor_gl_2k.jpg'),('Roughness','asphalt_01_rough_2k.jpg')]:
 n=roadmat.node_tree.nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(str(root/'public/textures'/file));n.image.colorspace_settings.name='Non-Color'
 if key=='Normal':
  nn=roadmat.node_tree.nodes.new('ShaderNodeNormalMap');nn.inputs['Strength'].default_value=.35;roadmat.node_tree.links.new(n.outputs['Color'],nn.inputs['Color']);roadmat.node_tree.links.new(nn.outputs['Normal'],roadmat.node_tree.nodes.get('Principled BSDF').inputs[key])
 else:roadmat.node_tree.links.new(n.outputs['Color'],roadmat.node_tree.nodes.get('Principled BSDF').inputs[key])
paint=mat('Matte road paint',rough=.85);paint.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.68,.68,.61,1)
steel=mat('Galvanised safety barrier',rough=.45);steel.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.44,.48,.50,1);steel.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=.78
for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
def mesh(name,vs,fs,uvs,material):
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);me.materials.append(material);layer=me.uv_layers.new()
 for p in me.polygons:
  p.use_smooth=True
  for i in p.loop_indices:layer.data[i].uv=uvs[me.loops[i].vertex_index]
 return o
near_y=sorted(set([-2000,-900,-500,-420,-340,-270,-210,-160,-120,-90,-65,-48,-35,-25,-18,-13,-9,-6,-4.2,4.2,6,9,13,18,25,35,48,65,90,120,160,210,270,340,420,500,900,2000]+[s*i for s in [-1,1] for i in range(5,101,2)]+[s*i for s in [-1,1] for i in range(104,241,8)]+[s*i for s in [-1,1] for i in range(272,1201,64)]))
far_y=[-2000,-900,-500,-340,-210,-120,-65,-35,-18,-9,-4.2,4.2,9,18,35,65,120,210,340,500,900,2000]
terrain_objects=[];ground_bvhs={}
for variant in range(16):
 for lod,ys,step in [('near',near_y,2),('far',far_y,16)]:
  xs=[variant*256-1024+i for i in range(0,257,step)];vs=[];uvs=[];fs=[]
  for x in xs:
   for y in ys:
    z,tuv=terrain(x,y);vs.append((x-(variant*256-896),y,z));uvs.append(tuv)
  for i in range(len(xs)-1):
   for j in range(len(ys)-1):
    a=i*len(ys)+j;fs.append((a,a+len(ys),a+len(ys)+1,a+1))
  o=mesh('Terrain_'+str(variant)+'_'+lod,vs,fs,uvs,terrainmat);terrain_objects.append(o)
  if lod=='near':ground_bvhs[variant]=BVHTree.FromPolygons([Vector(p) for p in vs],fs)
  normals=[]
  for vi,p in enumerate(vs):
   if abs(abs(p[0])-128)<.001:
    x=p[0]+variant*256-896;y=p[1];dx=terrain(x+.5,y)[0]-terrain(x-.5,y)[0];dy=terrain(x,y+.5)[0]-terrain(x,y-.5)[0];normals.append(tuple(Vector((-dx,-dy,1)).normalized()))
   else:normals.append(tuple(o.data.vertices[vi].normal))
  o.data.normals_split_custom_set_from_vertices(normals)
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True)
  bpy.ops.export_scene.gltf(filepath=str(out/(f'terrain-{variant}-{lod}.glb')),export_format='GLB',use_selection=True,export_materials='NONE',export_normals=True)
  o.hide_render=lod=='far';o.hide_viewport=lod=='far';o.location.x=variant*256-896
  print('CHUNK',kind,variant,lod,len(vs),flush=True)
# Shared one-kilometre road, repeated by the runtime. No physical seam/grade changes.
o=mesh('Straight road', [(-1024,-3.8,.007),(3072,-3.8,.007),(3072,3.8,.007),(-1024,3.8,.007)],[(0,1,2,3)],[(-1024/2.08,-3.8/2.08),(3072/2.08,-3.8/2.08),(3072/2.08,3.8/2.08),(-1024/2.08,3.8/2.08)],roadmat)
# Blender source contains the final straight corridor plus full terrain and physical daylight rig.
s=bpy.context.scene;s.world=bpy.data.worlds.new('Clouded winter night' if winter else 'Clouded mountain morning');s.world.use_nodes=True;wn=s.world.node_tree.nodes;wl=s.world.node_tree.links;bg=next(n for n in wn if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.018,.035,.065,1) if winter else (.52,.61,.72,1);bg.inputs['Strength'].default_value=.65
coord=wn.new('ShaderNodeTexCoord');noise=wn.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=3.5;noise.inputs['Detail'].default_value=3;wl.new(coord.outputs['Normal'],noise.inputs['Vector']);cloud=wn.new('ShaderNodeMixRGB');cloud.inputs[1].default_value=(.018,.035,.065,1) if winter else (.32,.52,.75,1);cloud.inputs[2].default_value=(.12,.16,.22,1) if winter else (.85,.90,.94,1);wl.new(noise.outputs['Fac'],cloud.inputs[0]);wl.new(cloud.outputs[0],bg.inputs['Color'])
bpy.ops.object.light_add(type='SUN',location=(0,0,100));sun=bpy.context.object;sun.name='Cold moonlight' if winter else 'Cool early morning sun';sun.data.energy=.66 if winter else 2;sun.data.color=(.64,.77,1) if winter else (1,.93,.85);sun.data.angle=.08 if winter else .07;sun.rotation_euler=(.55,-.6,-.7)
bpy.ops.object.camera_add(location=(9,-2,3));camera=bpy.context.object;camera.rotation_euler=(Vector((-70,0,0))-camera.location).to_track_quat('-Z','Y').to_euler();s.camera=camera
s.render.engine='CYCLES';s.cycles.samples=32
folder=root/'tools/generated'/('winter-road' if winter else 'mountain-road');folder.mkdir(exist_ok=True,parents=True)
bpy.ops.wm.save_as_mainfile(filepath=str(folder/'environment.blend'))
scatter=[]
for variant in range(16):
 points=[]
 for j in range(7):
  x=variant*256-1024+23+j*32+math.sin(variant*9+j*3)*11
  y=-max(6.5,[6.7,9,13,23][j]+1.3*math.sin(variant+j)) if j<4 else [26,55,85][j-4]+math.sin(variant*3)*8
  z,_=terrain(x,y)
  hit,_,_,_=ground_bvhs[variant].ray_cast(Vector((x-(variant*256-896),y,1000)),Vector((0,0,-1)))
  if hit is not None:z=hit.z
  points.append([x-(variant*256-896),z,-y,.55+.22*(1+math.sin(variant*5+j))])
 scatter.append(points)
(out/'scene.json').write_text(json.dumps({'kind':kind,'period':4096,'chunk':256,'variants':16,'roadLevel':.007,'source':source_name,'roadWidth':7.6,'nearVertices':len(near_y)*129,'farVertices':len(far_y)*17,'scatter':scatter},indent=2))



