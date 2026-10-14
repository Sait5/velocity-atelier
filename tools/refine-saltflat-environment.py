"""Refine the existing Blender salt-flat project and export reusable road sections.

The car/controls are owned by the web app and are never touched here. Shore depth,
wetness and the editable Blender materials use the same baked geographic field.
"""
import bpy, math, json, os, shutil
import numpy as np
from mathutils import Vector

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC=os.path.join(ROOT,'tools/generated/saltflat')
OUT=os.path.join(ROOT,'public/models/saltflat')
TEX=os.path.join(ROOT,'public/textures')
SOURCE=os.path.join(SRC,'saltflat-speed-test.blend')
BACKUP=os.path.join(SRC,'saltflat-before-environment-pass.blend')
if not os.path.exists(BACKUP):shutil.copy2(SOURCE,BACKUP)
bpy.ops.wm.open_mainfile(filepath=SOURCE)
scene=bpy.context.scene
LEVEL=8.287; WATER=LEVEL-.55; PERIOD=1280; TILE=160; HALF=160
# Remove only generated environment objects. Preserve the project's cameras/lights.
for obj in list(bpy.data.objects):
 if obj.type=='MESH' and obj.name.startswith(('Road_','Salt_','Shoulder_','Water_','OuterTerrain_','Edge_line_','Centre_lines_','Terrain_','Markings_','Horizon_','Guardrail_')):
  bpy.data.objects.remove(obj,do_unlink=True)
for c in list(bpy.data.collections):
 if c.name.startswith(('Linked road preview','Saltflat sections')):bpy.data.collections.remove(c)

def smooth(a,b,v):
 t=np.clip((v-a)/(b-a),0,1);return t*t*(3-2*t)

def noise(x,y,sx,sy,seed=0):
 """C2 continuous, periodic in x; scalar and vectorized paths are identical."""
 px=np.asarray(x,dtype=np.float64)/sx;py=np.asarray(y,dtype=np.float64)/sy;ix=np.floor(px);iy=np.floor(py);fx=px-ix;fy=py-iy
 fx=fx*fx*fx*(fx*(fx*6-15)+10);fy=fy*fy*fy*(fy*(fy*6-15)+10)
 def h(a,b):
  v=np.sin(np.mod(a,PERIOD/sx)*127.1+b*311.7+seed*73.19)*43758.5453
  return v-np.floor(v)
 return (h(ix,iy)*(1-fx)+h(ix+1,iy)*fx)*(1-fy)+(h(ix,iy+1)*(1-fx)+h(ix+1,iy+1)*fx)*fy

def right_field(x,y):
 inner=5.4+3.8*noise(x,0,40,1,12)+2.4*(noise(x,0,10,1,33)-.5)
 warp=9*(noise(x,y,80,24,5)-.5)
 broad=.67*noise(x+0,y+warp,160,30,8)+.25*noise(x,y+warp,40,10,24)+.08*noise(x,y,10,3,21)
 islands=1-smooth(.54,.70,broad)
 # Long, asymmetric salt tongues, not repeated ellipses along every section.
 tongue=0
 for cx,cy,rx,ry in [(175,49,61,25),(540,77,74,32),(930,34,43,19)]:
  dx=(np.mod(x-cx+PERIOD/2,PERIOD)-PERIOD/2)/rx
  dy=(y-cy+7*(noise(x,y,40,20,10)-.5))/ry
  tongue=np.maximum(tongue,1-smooth(.65,1.15,np.sqrt(dx*dx+dy*dy)))
 islands*=1-tongue
 outer=99+13*noise(x,0,160,1,11)
 shoreline=inner+1.2*(noise(x,y,5,2,14)-.5)
 depth=.235*smooth(shoreline,shoreline+2.2,y)*(1-smooth(outer-13,outer,y))*islands
 depth*=.7+.3*noise(x,y,80,24,4)
 return np.where(y>0,depth,0)

def field(x,y):
 # Independent left basins: shifted phase, wider dry coves and different islands.
 left=right_field(x+360,-y)*(.68+.32*noise(x,-y,80,24,97))
 left*=smooth(.22,.52,noise(x,-y,160,30,94))
 return np.where(y<0,left,right_field(x,y))

def save_image(name,array,colour=False):
 h,w=array.shape[:2];im=bpy.data.images.get(name)
 if im:bpy.data.images.remove(im)
 im=bpy.data.images.new(name,width=w,height=h,alpha=False)
 im.colorspace_settings.name='sRGB' if colour else 'Non-Color'
 rgba=np.ones((h,w,4),np.float32)
 if array.ndim==2:rgba[:,:,:3]=array[:,:,None]
 else:rgba[:,:,:3]=array
 im.pixels.foreach_set(rgba.ravel());im.filepath_raw=os.path.join(TEX,name);im.file_format='PNG';im.save()
 return im

# Geographic atlas: metre-scale bank detail, 1.28 km before any coastline repeats.
x=(np.arange(4096,dtype=np.float32)+.5)[None,:]/4096*PERIOD-80
y=(np.arange(512,dtype=np.float32)+.5)[:,None]/512*120
depth=field(x,y)
atlas=np.stack([depth/.24,np.broadcast_to(noise(x,y,160,35,27),depth.shape),np.broadcast_to(noise(x,y,20,8,31),depth.shape)],axis=-1)
save_image('saltflat-shore-field.png',atlas)
left_depth=field(x,-y)
left_atlas=np.stack([left_depth/.24,np.broadcast_to(noise(x+360,y,160,35,27),depth.shape),np.broadcast_to(noise(x+360,y,20,8,31),depth.shape)],axis=-1)
save_image('saltflat-shore-left.png',left_atlas)

# Sparse, soft high cloud coverage, baked once rather than evaluated every frame.
cu,cv=np.meshgrid(np.arange(2048)/2048*PERIOD,np.arange(512)/512*320)
warp=35*(noise(cu,cv,160,40,83)-.5)
cloud=.55*noise(cu,cv+warp,160,24,80)+.28*noise(cu,cv+warp,40,12,81)+.17*noise(cu,cv,10,4,82)
cloud=smooth(.53,.75,cloud)*smooth(172,195,cv)*(1-smooth(265,310,cv))
save_image('saltflat-high-clouds.png',cloud)

# Subtle raised salt rims and granular crystals: no deep clay fissures.
size=2048;rng=np.random.default_rng(7107)
u,v=np.meshgrid(np.arange(size,dtype=np.float32)/size,np.arange(size,dtype=np.float32)/size)
cells=16;gx=u*cells;gy=v*cells;ix=np.floor(gx).astype(int);iy=np.floor(gy).astype(int)
offsets=rng.uniform(.15,.85,(cells,cells,2));nearest=np.full_like(u,100);second=np.full_like(u,100)
for dx in [-1,0,1]:
 for dy in [-1,0,1]:
  seed=offsets[(iy+dy)%cells,(ix+dx)%cells]
  d=(ix+dx+seed[:,:,0]-gx)**2+(iy+dy+seed[:,:,1]-gy)**2
  second=np.minimum(second,np.maximum(nearest,d));nearest=np.minimum(nearest,d)
rim=np.exp(-np.maximum(np.sqrt(second)-np.sqrt(nearest),0)*95)
grain=rng.normal(0,1,(size,size)).astype(np.float32)
grain=(grain+np.roll(grain,1,0)+np.roll(grain,1,1))/3
patch=2*noise(u*PERIOD,v*PERIOD,256,256,49)-1
height=.00019*rim+.00006*grain+.0012*patch
step=1.28/size
nx=-(np.roll(height,-1,1)-np.roll(height,1,1))/(2*step)
ny=-(np.roll(height,-1,0)-np.roll(height,1,0))/(2*step)
normal=np.stack([nx,ny,np.ones_like(nx)],axis=-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
base=.67+.015*patch+.018*rim+.009*grain
colour=np.stack([base*1.025,base*1.027,base*1.022],axis=-1)
save_image('saltflat-crystal-colour.png',np.clip(colour,0,1),True)
save_image('saltflat-crystal-normal.png',normal*.5+.5)
save_image('saltflat-crystal-roughness.png',np.clip(.87+.025*patch-.035*rim,.78,.96))

def image(name,nc=False):
 path=os.path.join(TEX,name);im=bpy.data.images.load(path,check_existing=True)
 if nc:im.colorspace_settings.name='Non-Color'
 return im

def material(name):
 mat=bpy.data.materials.get(name) or bpy.data.materials.new(name);mat.use_nodes=True
 mat.node_tree.nodes.clear();n=mat.node_tree.nodes;l=mat.node_tree.links
 out=n.new('ShaderNodeOutputMaterial');bs=n.new('ShaderNodeBsdfPrincipled');l.new(bs.outputs[0],out.inputs['Surface'])
 return mat,n,l,bs

terrain,n,l,bs=material('Saltflat unified asphalt and mineral')
uv=n.new('ShaderNodeUVMap');uv.uv_map='UVMap'
coord=n.new('ShaderNodeTexCoord');sep=n.new('ShaderNodeSeparateXYZ');l.new(coord.outputs['Object'],sep.inputs[0])
absolute=n.new('ShaderNodeMath');absolute.operation='ABSOLUTE';l.new(sep.outputs['Y'],absolute.inputs[0])
edge=n.new('ShaderNodeMapRange');edge.inputs['From Min'].default_value=3.65;edge.inputs['From Max'].default_value=3.9;edge.clamp=True;l.new(absolute.outputs[0],edge.inputs[0])
def texture(nodes,links,name,nc=False,scale=1):
 t=nodes.new('ShaderNodeTexImage');t.image=image(name,nc)
 if scale!=1:
  m=nodes.new('ShaderNodeVectorMath');m.operation='SCALE';m.inputs[3].default_value=scale;links.new(uv.outputs[0],m.inputs[0]);links.new(m.outputs[0],t.inputs['Vector'])
 else:links.new(uv.outputs[0],t.inputs['Vector'])
 return t
road=texture(n,l,'asphalt_01_diff_4k.jpg');salt=texture(n,l,'saltflat-scan-albedo.jpg',False,1.25/2.4)
bankmask=n.new('ShaderNodeMapRange');bankmask.clamp=True;bankmask.inputs['From Min'].default_value=4.3;bankmask.inputs['From Max'].default_value=5.65;bankmask.inputs['To Min'].default_value=.88;bankmask.inputs['To Max'].default_value=0;l.new(absolute.outputs[0],bankmask.inputs[0])
bank=texture(n,l,'sand_01_diff_4k.jpg',False,.625)
tint=n.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1;tint.inputs[2].default_value=(.83,.56,.33,1);l.new(bank.outputs[0],tint.inputs[1])
mineral=n.new('ShaderNodeMixRGB');l.new(bankmask.outputs[0],mineral.inputs[0]);l.new(salt.outputs[0],mineral.inputs[1]);l.new(tint.outputs[0],mineral.inputs[2])
mix=n.new('ShaderNodeMixRGB');l.new(edge.outputs[0],mix.inputs[0]);l.new(road.outputs[0],mix.inputs[1]);l.new(mineral.outputs[0],mix.inputs[2]);l.new(mix.outputs[0],bs.inputs['Base Color'])
rn=texture(n,l,'asphalt_01_nor_gl_2k.jpg',True);sn=texture(n,l,'saltflat-scan-normal.jpg',True,1.25/2.4)
nmix=n.new('ShaderNodeMixRGB');l.new(edge.outputs[0],nmix.inputs[0]);l.new(rn.outputs[0],nmix.inputs[1]);l.new(sn.outputs[0],nmix.inputs[2])
nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.35;l.new(nmix.outputs[0],nm.inputs['Color']);l.new(nm.outputs[0],bs.inputs['Normal'])
rr=texture(n,l,'asphalt_01_rough_2k.jpg',True);sr=texture(n,l,'saltflat-scan-roughness.jpg',True,1.25/2.4)
rmix=n.new('ShaderNodeMixRGB');l.new(edge.outputs[0],rmix.inputs[0]);l.new(rr.outputs[0],rmix.inputs[1]);l.new(sr.outputs[0],rmix.inputs[2]);l.new(rmix.outputs[0],bs.inputs['Roughness'])

paint,n,l,bs=material('Road marking');bs.inputs['Base Color'].default_value=(.62,.60,.52,1);bs.inputs['Roughness'].default_value=.88
rail,n,l,bs=material('Weathered galvanized guardrail');bs.inputs['Base Color'].default_value=(.35,.38,.39,1);bs.inputs['Metallic'].default_value=.72;bs.inputs['Roughness'].default_value=.42
water,n,l,bs=material('Salt lake water');bs.inputs['Base Color'].default_value=(.12,.47,.55,1);bs.inputs['Roughness'].default_value=.17;bs.inputs['Transmission Weight'].default_value=.38;bs.inputs['IOR'].default_value=1.333
uv=n.new('ShaderNodeUVMap');uv.uv_map='CoastUV';fieldtex=texture(n,l,'saltflat-shore-field.png',True)
absuv=n.new('ShaderNodeVectorMath');absuv.operation='ABSOLUTE';l.new(uv.outputs[0],absuv.inputs[0])
lefttex=n.new('ShaderNodeTexImage');lefttex.image=image('saltflat-shore-left.png',True)
l.new(absuv.outputs[0],fieldtex.inputs['Vector']);l.new(absuv.outputs[0],lefttex.inputs['Vector'])
sideuv=n.new('ShaderNodeSeparateXYZ');l.new(uv.outputs[0],sideuv.inputs[0])
leftmask=n.new('ShaderNodeMath');leftmask.operation='LESS_THAN';leftmask.inputs[1].default_value=0;l.new(sideuv.outputs['Y'],leftmask.inputs[0])
coastmix=n.new('ShaderNodeMixRGB');l.new(leftmask.outputs[0],coastmix.inputs[0]);l.new(fieldtex.outputs[0],coastmix.inputs[1]);l.new(lefttex.outputs[0],coastmix.inputs[2])
sep=n.new('ShaderNodeSeparateColor');l.new(coastmix.outputs[0],sep.inputs[0]);alpha=n.new('ShaderNodeMapRange');alpha.clamp=True;alpha.inputs['From Min'].default_value=.028/.24;alpha.inputs['From Max'].default_value=.05/.24;l.new(sep.outputs['Red'],alpha.inputs[0])
trans=n.new('ShaderNodeBsdfTransparent');mix=n.new('ShaderNodeMixShader');l.new(alpha.outputs[0],mix.inputs[0]);l.new(trans.outputs[0],mix.inputs[1]);l.new(bs.outputs[0],mix.inputs[2]);l.new(mix.outputs[0],next(o for o in n if o.type=='OUTPUT_MATERIAL').inputs['Surface'])
wn=texture(n,l,'salt-lake-water-normal.jpg',True,120/6);nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.025;l.new(wn.outputs[0],nm.inputs['Color']);l.new(nm.outputs[0],bs.inputs['Normal'])

near=[];far=[];source_collection=bpy.data.collections.new('Saltflat sections');scene.collection.children.link(source_collection)
def mesh(name,verts,faces,uvs,mat,collection,variant=0):
 data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update();obj=bpy.data.objects.new(name,data);source_collection.objects.link(obj);data.materials.append(mat);obj.location.x=variant*TILE
 uv=data.uv_layers.new(name='UVMap');coast=data.uv_layers.new(name='CoastUV')
 for poly in data.polygons:
  poly.use_smooth=True
  for idx in poly.loop_indices:
   vi=data.loops[idx].vertex_index;uv.data[idx].uv=uvs[vi];pos=verts[vi];coast.data[idx].uv=((pos[0]+variant*TILE+80)/PERIOD,pos[1]/120)
 collection.append(obj);return obj

near_y=np.array([-120,-96,-72,-48,-36,-26,-18,-12,-8,-6,-4.6,-4.1,-3.9,-3.7,-3.5,0,3.5,3.7,3.9,4.1,4.6,5.2,6,7,8,10,12,15,19,24,30,38,48,62,78,96,112,120])
far_y=np.array([-120,-72,-36,-12,-4.6,-3.9,-3.7,0,3.7,3.9,4.6,7,12,24,38,62,90,112,120])
near_y=np.unique(np.concatenate([near_y,np.arange(-24,-4,1.0),np.arange(5,25,1.0)]))
for variant in range(8):
 for lod,objects,nx,ys in [('near',near,160,near_y),('far',far,20,far_y)]:
  xs=np.linspace(-80,80,nx+1);xx,yy=np.meshgrid(xs,ys,indexing='ij');globalx=xx+variant*TILE
  basin=field(globalx,yy)
  # Low salt hummocks, shallow depressions and irregular crust ridges; road and water bed remain clear.
  relief=.12*(noise(globalx,yy,10,3,61)-.5)+.055*(noise(globalx,yy,40,12,62)-.5)
  crust=np.maximum(0,1-np.abs(noise(globalx,yy,5,2,71)-.5)*9)
  relief+=.19*crust**3*smooth(.35,.7,noise(globalx,yy,40,12,82))
  relief*=smooth(4.6,8,np.abs(yy))*(1-smooth(80,120,np.abs(yy)))*(1-smooth(0,.005,basin))
  bank_end=6.0+.3*np.sin(globalx/PERIOD*math.tau*16)
  ramp=smooth(3.7,bank_end,np.abs(yy));zz=LEVEL-ramp*(.522+basin)+relief
  # Cross-road geometry is continuous; the boundary is entirely a material mask.
  verts=list(zip(xx.ravel(),yy.ravel(),zz.ravel()));uvs=list(zip((globalx/1.25).ravel(),(yy/1.25).ravel()));faces=[];ny=len(ys)
  for i in range(nx):
   for j in range(ny-1):
    k=i*ny+j;faces.append((k,k+ny,k+ny+1,k+1))
  mesh('Terrain_%d_%s'%(variant,lod),verts,faces,uvs,terrain,objects,variant)
  verts=[];faces=[];uvs=[]
  def quad(x0,x1,y0,y1):
   k=len(verts);verts.extend([(x0,y0,LEVEL+.003),(x1,y0,LEVEL+.003),(x1,y1,LEVEL+.003),(x0,y1,LEVEL+.003)]);faces.append((k,k+1,k+2,k+3));uvs.extend([((x+variant*TILE)/1.25,y/1.25) for x,y in [(x0,y0),(x1,y0),(x1,y1),(x0,y1)]])
  for side in [-1,1]:quad(-80,80,side*3.29-.055,side*3.29+.055)
  for i in range(16):quad(-80+i*10,-77+i*10,-.06,.06)
  mesh('Markings_%d_%s'%(variant,lod),verts,faces,uvs,paint,objects,variant)
  verts=[];faces=[];uvs=[]
  def box(x0,x1,y0,y1,z0,z1):
   k=len(verts);verts.extend([(x,y,z) for z in [z0,z1] for y in [y0,y1] for x in [x0,x1]])
   uvs.extend([(0,0)]*8)
   faces.extend([tuple(k+i for i in f) for f in [(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)]])
  for side in [-1,1]:
   y=side*4.18
   for x in range(-78,80,4):box(x-.055,x+.055,y-.055,y+.055,LEVEL-.12,LEVEL+.74)
   if lod=='near':
    for x in range(-78,80,4):
     box(x-.13,x+.13,y-.065,y+.065,LEVEL+.58,LEVEL+.71)
     # Small bolt heads and mounting brackets, restricted to the nearest LOD.
     for z in [.61,.68]:box(x-.022,x+.022,y-.078,y+.078,LEVEL+z-.018,LEVEL+z+.018)
   # Folded W-section, small geometry cost and a real metallic silhouette.
   # Closed steel W-beam: two ridges, a centre trough and a returned rear face.
   profile=[(-.06,.50),(-.025,.52),(.065,.565),(.075,.595),(.015,.635),(-.035,.66),(.015,.685),(.075,.725),(.065,.755),(-.025,.80),(-.06,.82)]
   profile+= [(dy-.007,z) for dy,z in reversed(profile)]
   k=len(verts)
   for x in [-80,80]:
    for dy,z in profile:verts.append((x,y+dy,LEVEL+z));uvs.append((x/2,z))
   count=len(profile)
   for j in range(count):faces.append((k+j,k+count+j,k+count+(j+1)%count,k+(j+1)%count))
   faces.append(tuple(k+j for j in range(count-1,-1,-1)));faces.append(tuple(k+count+j for j in range(count)))
  mesh('Guardrail_%d_%s'%(variant,lod),verts,faces,uvs,rail,objects,variant)
  waterpoints=[(-80,4.1),(80,4.1),(80,120),(-80,120),(-80,-120),(80,-120),(80,-4.1),(-80,-4.1)]
  mesh('Water_%d_%s'%(variant,lod),[(x,y,WATER) for x,y in waterpoints],[(0,1,2,3),(4,5,6,7)],[((x+variant*TILE)/1.25,y/1.25) for x,y in waterpoints],water,objects,variant)
# A single low-poly lateral continuation; it has no normal or texture samples in the browser.
outerverts=[];outerfaces=[];outeruv=[]
for side in [-1,1]:
 k=len(outerverts)
 for x,y in [(-80,120*side),(80,120*side),(80,HALF*side),(-80,HALF*side)]:outerverts.append((x,y,LEVEL-.522));outeruv.append((x/1.25,y/1.25))
 outerfaces.append((k,k+1,k+2,k+3) if side>0 else (k+3,k+2,k+1,k))
mesh('Horizon_0_far',outerverts,outerfaces,outeruv,terrain,far)

# Source preview uses linked geometry. Export only the eight source variants.
preview=bpy.data.collections.new('Linked road preview — not exported');scene.collection.children.link(preview)
for obj in near+far:obj.hide_render=True
for tile in range(-4,5):
 variant=tile%8;lod=near if abs(tile)<2 else far
 for source in [o for o in lod if o.name.endswith('_near' if abs(tile)<2 else '_far') and o.name.split('_')[1]==str(variant)]+[o for o in far if o.name.startswith('Horizon_')]:
  inst=source.copy();inst.data=source.data;inst.location.x=tile*TILE;inst.hide_render=False;preview.objects.link(inst)
sun=next((o for o in bpy.data.objects if o.type=='LIGHT' and o.data.type=='SUN'),None)
if sun:
 sun.data.energy=3.2;sun.data.angle=math.radians(2);sun.rotation_euler=Vector((-.590,.429,-.683)).to_track_quat('-Z','Y').to_euler()
world=scene.world;world.use_nodes=True
world.node_tree.nodes.clear();n=world.node_tree.nodes;l=world.node_tree.links
env=n.new('ShaderNodeTexEnvironment');env.image=image('saltflat-clear-sky-2k.hdr')
cap=n.new('ShaderNodeVectorMath');cap.operation='MINIMUM';cap.inputs[1].default_value=(6,6,6);l.new(env.outputs['Color'],cap.inputs[0])
bg=n.new('ShaderNodeBackground');bg.inputs['Strength'].default_value=.55;l.new(cap.outputs['Vector'],bg.inputs['Color'])
out=n.new('ShaderNodeOutputWorld');l.new(bg.outputs[0],out.inputs['Surface'])
scene.render.engine='CYCLES';scene.cycles.samples=32
bpy.ops.wm.save_as_mainfile(filepath=SOURCE)
def export(objects,name):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name),export_format='GLB',use_selection=True,export_materials='NONE',export_yup=True,export_cameras=False,export_lights=False)
export(near,'road-banks-near.glb');export(far,'road-banks-far.glb')
report=dict(tileLength=TILE,patternLength=PERIOD,variants=8,roadLevel=LEVEL,waterLevel=WATER,roadWidth=7.4,saltPlainHalfWidth=HALF,highDetailHalfWidth=48,nearTrianglesPerTile=sum(len(o.data.polygons)*2 for o in near)//8,farTrianglesPerTile=sum(len(o.data.polygons)*2 for o in far)//8,waterTrianglesPerTile=4,mountainTriangles=0,waterSide='asymmetric both',source='tools/generated/saltflat/saltflat-speed-test.blend',builder='tools/refine-saltflat-environment.py')
with open(os.path.join(OUT,'scene.json'),'w') as f:json.dump(report,f,indent=2)
print('REFINED_EXISTING_SALTFLAT',json.dumps(report))
