"""Koenigsegg Jesko Attack (ddiaz-design, Sketchfab; a Racing Master game model): bring the model to the site's scale and
axes (metres, front -x, driver -y) and rig its wheel and door groups. The source is the glTF as imported into Blender
(blender-cars/backups/jesko-original.blend): a 1:100 FBX hierarchy with the length along y, front at -y and the driver's
(left-hand drive) side at +x; every part is a mesh under an empty named after the game's part and material slot
(Attack:SM_Body_101..., SK_Door_FL_101..., Ani_Wheel_FL133...).
Usage: blender -b --disable-autoexec blender-cars/backups/jesko-original.blend --python tools/prepare-jesko-model.py -- <out.glb> [<rigged.blend>]
(the source as downloaded; blender-cars/jesko.blend is the animated result)"""
import bpy,bmesh,sys,math,os,re
from mathutils import Matrix,Vector,Color
from mathutils.bvhtree import BVHTree
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
OUT=args[0];RIGGED=args[1] if len(args)>1 else None
ASSETS=os.path.join(os.path.dirname(os.path.abspath(__file__)),'source-assets','cars')
scene=bpy.context.scene
# site axes: source -y (front) -> -x, source +x (driver) -> -y; the model is built in centimetres at 1:100 of a metre
R=Matrix.Rotation(-math.pi/2,4,'Z')
bpy.context.view_layer.update()
baked=[]
for o in [o for o in bpy.data.objects if o.type=='MESH']:
 me=o.data.copy();me.transform(o.matrix_world);baked.append((o.name,o.parent.name if o.parent else '',me))
for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
lo=Vector((1e9,)*3);hi=Vector((-1e9,)*3)
for _,_,me in baked:
 for v in me.vertices:
  for i in range(3):lo[i]=min(lo[i],v.co[i]);hi[i]=max(hi[i],v.co[i])
S=100.0
centre=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
place=R@Matrix.Scale(S,4)@Matrix.Translation(-centre)
print('PREP source bounds',tuple(round(v*S,3) for v in lo),tuple(round(v*S,3) for v in hi))
root=bpy.data.objects.new('Koenigsegg Jesko',None);scene.collection.objects.link(root)
def short(name):
 """'Attack:SK_Door_FL_101_SK_Door_FL_101_MI_Glass_In4_Attack:MI_1361040001_002_0' -> 'Door_FL_In4__MI_1361040001_002'"""
 m=re.match(r'Attack:(?:SK|SM)_(\w+?)_101_(?:SK|SM)_\1_101_(?:MI_)?(\w+?)_Attack:(.+)_0$',name)
 if m:return '%s_%s__%s'%(m.group(1),m.group(2),m.group(3))
 m=re.match(r'Attack:Ani_(\w+?)_Attack:(.+)_0$',name)
 return 'Ani_%s__%s'%(m.group(1),m.group(2)) if m else name
parts={}
for name,parent,me in baked:
 me.transform(place)
 o=bpy.data.objects.new('Jesko__'+short(name),me);scene.collection.objects.link(o);o.parent=root;parts[o.name]=o
print('PREP parts',len(parts),'faces',sum(len(o.data.polygons) for o in parts.values()))
bpy.context.view_layer.update()
def find(pattern):
 return [o for n,o in parts.items() if re.search(pattern,n)]
def group(name,point):
 o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.parent=root;o.location=point;return o
def move(o,target):
 M=o.matrix_world.copy();o.parent=target;o.matrix_parent_inverse=target.matrix_world.inverted();o.matrix_world=M
def bounds(objs):
 vs=[o.matrix_world@v.co for o in objs for v in o.data.vertices]
 return Vector([min(v[i] for v in vs) for i in range(3)]),Vector([max(v[i] for v in vs) for i in range(3)])
# Wheels: one group per wheel at its centre (the tyre's middle); tyre, rim, carbon wheel and brake disc turn with it, the
# calipers stay with the body. Site order: 0,1 front, 2,3 rear; within an axle the driver's side (-y) first.
# (the game's wheel nodes: Ani_Wheel_FL133, Ani_Disc_Scale_FR9 (the front right), SK_Rim_101 (the rear left), Ani_Wheel_BR152)
WHEELS=[r'^Jesko__Ani_Wheel_FL133__',r'^Jesko__Ani_Disc_Scale_FR9__',r'^Jesko__Rim_ChangeA_Rim3__',r'^Jesko__Ani_Wheel_BR152__']
wheels=[]
for i,pat in enumerate(WHEELS):
 objs=find(pat);tyre=[o for o in objs if o.data.materials[0].name.endswith('Tyre1')]
 a,b=bounds(tyre);c=(a+b)/2
 g=group('Jesko wheel %d'%i,c);wheels.append(g)
 bpy.context.view_layer.update()
 for o in objs:move(o,g)
 print('PREP wheel',i,tuple(round(v,4) for v in c),'parts',len(objs),'tyre width',round(b.y-a.y,3),'diameter',round(b.z-a.z,3))
bpy.context.view_layer.update()
# Doors: Koenigsegg's dihedral synchro-helix doors. Opening, the real door swings out about a near-vertical hinge and
# turns up about an axis across it at the same time; the two quarter turns compose into one turn of about 115 degrees
# about a diagonal axis that leans forward, outward and down from the A-pillar root. That is how the door is rigged:
# 'Jesko door L/R' at HINGE turns about HINGE_AXIS (the driver's side; mirrored for the other), and the open door stands
# upright beside the front wheel arch, its skin turned to face forward. The axis was found by sweeping candidates
# through the door's whole path against the body (no part of the door, mirror or glass passes into the body more than
# 12 cm from the hinge). Each door takes its skin, carbon shell, card, glass, mirror (the mirror stands on the door's
# top front corner) and the game's hinge arm inside its front; the game's clevis and pin on the A-pillar (built for a
# two-joint rig the model never animated) go, and tools/blender-hinges/build_jesko_hinges.py builds the hinge on the
# real axis. app/three/jesko.ts turns the doors (OPEN there).
HINGE=Vector((-0.72,-0.91,0.65));HINGE_AXIS=Vector((-0.505,-0.539,-0.674)).normalized();OPEN=math.radians(115)
def islands(o):
 bm=bmesh.new();bm.from_mesh(o.data);bm.faces.ensure_lookup_table();seen=set();out=[]
 for f in bm.faces:
  if f.index in seen:continue
  st=[f];comp=[];seen.add(f.index)
  while st:
   x=st.pop();comp.append(x.index)
   for e in x.edges:
    for y in e.link_faces:
     if y.index not in seen:seen.add(y.index);st.append(y)
  out.append(comp)
 bm.free();return out
def drop_faces(o,faces):
 sel=set(faces);bm=bmesh.new();bm.from_mesh(o.data);bm.faces.ensure_lookup_table()
 bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index in sel],context='FACES')
 bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(o.data);bm.free()
# the clevis: the plate on the A-pillar's shut face, its lugs, pin and washers (small islands of the body's interior
# mesh wholly inside the box round the old pin, both sides)
shell=find(r'^Jesko__Body_Dashboard_002__')[0];M=shell.matrix_world;gone=[]
for comp in islands(shell):
 if len(comp)>400:continue
 vs=[M@shell.data.vertices[i].co for p in comp for i in shell.data.polygons[p].vertices]
 if all(-.80<v.x<-.66 and .70<abs(v.y)<.90 and .35<v.z<.54 for v in vs):gone+=comp
drop_faces(shell,gone);print('PREP clevis faces removed',len(gone))
doors={}
for side,tag,game,mech in ((-1,'L','FL',r'^Jesko__Ani_Door_Lifting_FL_114__'),(1,'R','FR',r'^Jesko__Door_FR_Exhaust_016__')):
 m=lambda v:Vector((v.x,v.y*-side,v.z))  # the driver's (L, -y) numbers mirrored to this side
 door=group('Jesko door '+tag,m(HINGE));door.rotation_mode='QUATERNION';doors[tag]=door
 # (matrix_world must be current before re-parenting, or the parts land offset)
 bpy.context.view_layer.update()
 pieces=list(dict.fromkeys([o for o in parts.values() if re.search(r"^Jesko__(Door_%s_|Ani_Carwindow_%s|SideMirror_%s_)"%(game,game,tag),o.name)]+find(mech)))
 for o in pieces:move(o,door)
 print('PREP door',tag,'hinge',tuple(round(v,4) for v in m(HINGE)),'pieces',len(pieces),'faces',sum(len(o.data.polygons) for o in pieces))
bpy.context.view_layer.update()
# ---------------------------------------------------------------------------------------------------------------------
# Materials. The game's materials keep their names where the site finds nothing of its own in them; the ones the site
# drives get names of their own (app/three/jesko.ts):
#  - 'Jesko paint' (the game's MI_1361040001_002, the orange body colour; the site swaps in its own paint) and
#    'Jesko pinstripe' (MI_Paint1, the silver lines either side of the black centre stripe: the second paint);
#  - the lamps share one atlas (MI_Light1): its faces become 'Jesko head lamp' (front clusters), 'Jesko tail lamp'
#    (rear clusters, the reversing lamp and the third brake light under the wing) and 'Jesko mirror indicator';
#  - glass: 'Jesko glass' (windows), 'Jesko lamp glass' (lamp and indicator covers), 'Jesko mirror glass';
#  - calipers get 'Jesko caliper' (the configurator colours them; the discs keep the game's brake material), the
#    wheels' carbon 'Jesko wheel carbon';
#  - leather: the game colours its leathers (MI_Cabin_Leather_A1/B1) from a swatch of the cabin atlas; here they are one
#    plain 'Jesko leather' that the upholstery colour sets (its grain and the embossed crests come from the normal map).
def mat_named(name):return bpy.data.materials[name]
def bsdf(m):return next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
def rename(old,new):
 m=bpy.data.materials.get(old)
 if m:m.name=new
 return m
def material_for(objs,old,new):
 """A copy of material old called new, given to these objects' slots that use old."""
 src=bpy.data.materials[old];m=bpy.data.materials.get(new) or src.copy();m.name=new
 for o in objs:
  for i,s in enumerate(o.data.materials):
   if s==src:o.data.materials[i]=m
 return m
def unlink(m,socket):
 b=bsdf(m)
 for l in list(b.inputs[socket].links):m.node_tree.links.remove(l)
 return b
def srgb(h):return (*Color([int(h[i:i+2],16)/255 for i in (1,3,5)]).from_srgb_to_scene_linear(),1)
meshes=lambda:[o for o in bpy.data.objects if o.type=='MESH']
rename('AttackMI_1361040001_002','Jesko paint');rename('AttackMI_Paint1','Jesko pinstripe')
rename('AttackMI_Glass1','Jesko glass');rename('AttackMI_Glass_Light1','Jesko lamp glass');rename('AttackMI_Mirror1','Jesko mirror glass')
material_for([o for o in meshes() if 'Light_F_' in o.name],'AttackMI_Light1','Jesko head lamp')
material_for([o for o in meshes() if 'SideMirror' in o.name],'AttackMI_Light1','Jesko mirror indicator')
rename('AttackMI_Light1','Jesko tail lamp')
material_for([o for o in meshes() if 'Caliper' in o.name or 'Brake_Change_Brake1' in o.name],'AttackMI_Change_Brake1','Jesko caliper')
material_for([o for o in meshes() if o.parent and o.parent.name.startswith('Jesko wheel')],'AttackMI_Carbon_A1','Jesko wheel carbon')
leather=rename('AttackMI_Cabin_Leather_A1','Jesko leather')
for o in meshes():
 for i,s in enumerate(o.data.materials):
  if s and s.name=='AttackMI_Cabin_Leather_B1':o.data.materials[i]=leather
unlink(leather,'Base Color').inputs['Base Color'].default_value=srgb('#d9681c')
# No glare in the cabin: the game's cabin materials run metallic .3-.94 with mirror-like roughness. Leather, suede,
# plastics, the switch atlas, stitching and grilles become dielectric and matte; the screens a soft glass; the cabin's
# carbon (the tub, dash, wheel and the doors' inner shells) a satin 'Jesko cabin carbon', while the body's carbon keeps
# its clear coat.
cabin_carbon=material_for([o for o in meshes() if re.search(r'Body_Dashboard_00[45]__|Body_Bones_Cabin__|Door_FL_Glass_In6__|Door_FR_Exhaust_015__',o.name)],'AttackMI_Carbon_A1','Jesko cabin carbon')
MATTE={'Jesko leather':.68,'AttackMI_Cabin_Leather_C1':.66,'AttackMI_Cabin_Suede_A1':.92,'AttackMI_Cabin_Plastic_A1':.62,'AttackMI_Cabin1':.6,
 'AttackMI_Cabin_A1':.6,'AttackMI_Cabin_Grid_A1':.7,'AttackStitch':.7,'Jesko cabin carbon':.45,'AttackMI_Dashboard1':.35}
for name,r in MATTE.items():
 b=bsdf(mat_named(name));b.inputs['Metallic'].default_value=0
 if not b.inputs['Roughness'].is_linked:b.inputs['Roughness'].default_value=max(r,b.inputs['Roughness'].default_value)
# The cabin atlas (MI_Cabin1) colours trims, switches and panels from flat swatches: its light grey swatches are the
# cabin's aluminium (vent surrounds, the door pulls, the console's frame). Faces lying wholly on a light, neutral swatch
# move to a satin 'Jesko cabin aluminium'; the rest of the atlas (dark panels, labels, logos) stays a matte dielectric.
import numpy as np
_img=next(n.image for n in mat_named('AttackMI_Cabin1').node_tree.nodes if n.type=='TEX_IMAGE' and n.image and 'baseColor' in n.image.name)
_px=np.array(_img.pixels[:]).reshape(_img.size[1],_img.size[0],_img.channels)[:,:,:3];_W,_H=_img.size
alu=bpy.data.materials.new('Jesko cabin aluminium');alu.use_nodes=True;_t=alu.node_tree;_t.nodes.clear()
_b=_t.nodes.new('ShaderNodeBsdfPrincipled');_t.links.new(_b.outputs[0],_t.nodes.new('ShaderNodeOutputMaterial').inputs[0])
_b.inputs['Base Color'].default_value=srgb('#666a6f');_b.inputs['Metallic'].default_value=.7;_b.inputs['Roughness'].default_value=.58
moved=0
for o in meshes():
 me=o.data;names=[m.name if m else '' for m in me.materials]
 if 'AttackMI_Cabin1' not in names:continue
 k=names.index('AttackMI_Cabin1');uv=me.uv_layers[0].data;sel=[]
 for p in me.polygons:
  if p.material_index!=k:continue
  us=[uv[i].uv for i in p.loop_indices];c=sum((Vector((q.x,q.y)) for q in us),Vector((0,0)))/len(us)
  ok=True
  for q in [c]+[c+(Vector((q.x,q.y))-c)*.8 for q in us]:
   r,g,b=_px[min(_H-1,max(0,int((q.y%1)*_H))),min(_W-1,max(0,int((q.x%1)*_W)))]
   if not (.18<(r+g+b)/3 and max(r,g,b)-min(r,g,b)<.04):ok=False;break
  if ok:sel.append(p)
 if sel:
  me.materials.append(alu);j=len(me.materials)-1
  for p in sel:p.material_index=j
  moved+=len(sel)
print('PREP cabin aluminium faces',moved)
# Textures: every game texture the cameras see close is replaced by the project's own high-resolution version
# (tools/jesko-hd-textures.mjs: a 2048 px carbon twill, the cabin, label, badge, lamp, tyre and brake atlases upscaled 4x;
# the screen atlas redrawn at 4096 px in the game atlas's layout, its interface in Russian), swapped in by image name.
HD=os.path.join(ASSETS,'jesko-hd');swapped=[]
for img in list(bpy.data.images):
 p=os.path.join(HD,img.name)
 if os.path.exists(p):
  new=bpy.data.images.load(p);new.alpha_mode=img.alpha_mode;new.colorspace_settings.name=img.colorspace_settings.name;new.pack();img.user_remap(new);swapped.append(img.name)
print('PREP hd textures',len(swapped))
# Lining. The game's body is a skin: from the seats, through the gaps between the headliner's leather ribs and round
# the window frames, the cabin sees the back of the roof's and pillars' paint (one-sided on the site: a slit of sky).
# Every paint face whose back a cabin eye sees unobstructed (rays from the seats at two heights and the cabin's middle)
# is lined 3 mm behind itself with a dark matte 'Jesko cabin liner', facing the cabin. Door linings ride with their doors.
liner=bpy.data.materials.new('Jesko cabin liner');liner.use_nodes=True;_t=liner.node_tree;_t.nodes.clear()
_l=_t.nodes.new('ShaderNodeBsdfPrincipled');_t.links.new(_l.outputs[0],_t.nodes.new('ShaderNodeOutputMaterial').inputs[0])
_l.inputs['Base Color'].default_value=srgb('#0d0e0f');_l.inputs['Roughness'].default_value=.85;_l.inputs['Metallic'].default_value=0
# (glass and the cut-out atlases do not block: the stitching runs in the ribs' grooves as a strip of thread on a
# transparent quad, and the paint showed through it)
GLASS={'Jesko glass','Jesko lamp glass','AttackStitch','AttackMI_Cabin_A1','AttackMI_Logo1','AttackMI_Engine_A1','Attackgruid_alt','AttackMI_Engine_Grid_A1','AttackMI_Engine_Grid_B1','AttackMI_Engine_Grid_C1'}
def occluders():
 vs=[];ps=[]
 for o in meshes():
  M=o.matrix_world;b=len(vs);names=[m.name if m else '' for m in o.data.materials];vs+=[M@v.co for v in o.data.vertices]
  ps+=[[b+i for i in p.vertices] for p in o.data.polygons if not (names and names[p.material_index] in GLASS)]
 return BVHTree.FromPolygons(vs,ps)
EYES=[Vector(p) for p in ((.12,-.31,.98),(.12,.31,.98),(.12,-.31,.80),(.12,.31,.80),(-.1,0,.95),(.4,0,.9),(-.35,0,.75),(.3,-.3,1.02),(.3,.3,1.02))]
occ=occluders();lined=0
# (the paint and the silver pinstripes beside the roof's black centre stripe)
for o in [o for o in meshes() if {'Jesko paint','Jesko pinstripe'}&{m.name for m in o.data.materials if m}]:
 M=o.matrix_world;N=M.to_3x3();names=[m.name if m else '' for m in o.data.materials];ks={i for i,nm in enumerate(names) if nm in ('Jesko paint','Jesko pinstripe')};keep=[]
 # (a face is tested at its centre and at points spread over it: big roof faces show only through slits between ribs)
 W=[(1/3,1/3,1/3)]+[(u,v,1-u-v) for u in (.08,.3,.55,.8) for v in (.08,.3,.55,.8) if u+v<=.92]
 for p in o.data.polygons:
  if p.material_index not in ks:continue
  c=M@p.center;n=(N@p.normal).normalized()
  if not (-1.4<c.x<1.6 and abs(c.y)<1.0 and c.z>.3):continue
  vs=[M@o.data.vertices[i].co for i in p.vertices];pts=[]
  for t in range(1,len(vs)-1):pts+=[vs[0]*w0+vs[t]*w1+vs[t+1]*w2 for w0,w1,w2 in W]
  # (the roof panel over the headliner is lined whole: its ribs's grooves open onto it at every angle)
  hit='Roof_' in o.name and c.z>1.0 and n.z>.3
  for q in ([] if hit else pts):
   for e in EYES:
    d=e-q
    if d.dot(n)>=-1e-4:continue
    L=d.length
    if occ.ray_cast(q-n*.0015,d/L,L-.01)[0] is None:hit=True;break
   if hit:break
  if hit:keep.append(p.index)
 if not keep:continue
 bm=bmesh.new();bm.from_mesh(o.data);bm.faces.ensure_lookup_table();ks=set(keep)
 bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index not in ks],context='FACES');bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
 bm.transform(M);bm.normal_update()
 for v in bm.verts:v.co-=v.normal*.003
 bmesh.ops.reverse_faces(bm,faces=bm.faces[:])
 for f in bm.faces:f.material_index=0;f.smooth=True
 grp=o.parent if o.parent and o.parent.name.startswith('Jesko door') else root
 bm.transform(grp.matrix_world.inverted())
 lm=bpy.data.meshes.new(o.name+' liner');bm.to_mesh(lm);bm.free();lm.materials.clear();lm.materials.append(liner)
 lo=bpy.data.objects.new(o.name.replace('Jesko__','Jesko__liner_'),lm);scene.collection.objects.link(lo);lo.parent=grp;lo.matrix_parent_inverse=Matrix.Identity(4)
 lined+=len(keep)
print('PREP lining faces',lined)
# every material two-sided: the game's materials are one-sided, and any part seen from behind (a trim's edge, the inside
# of a panel through a gap) would be a hole
for _m in bpy.data.materials:_m.use_backface_culling=False
print('PREP materials',len(bpy.data.materials),sorted(m.name for m in bpy.data.materials if m.users))
if RIGGED:bpy.ops.wm.save_as_mainfile(filepath=RIGGED)
bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',export_draco_mesh_compression_enable=False,export_animations=False,export_skins=False)
print('PREP exported',OUT)
