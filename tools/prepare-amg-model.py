"""Mercedes-AMG GT 63 S 4-Door (mohamedouartassi, Sketchfab, CC BY): bring the model to the site's scale and axes
(metres, front -x, driver -y) and rig its wheel and door groups. The source is a subdivision model built at about 1:1.9
with front -y and the driver's (left) side +x; its halves come from mirror modifiers and its curves from subdivision.
Every modifier is applied, subdivision one level lighter than the viewport's (the shape holds; the web model would be
four times heavier otherwise), the author's plate lettering is dropped (the site fits its own plates). Its cabin is a
placeholder and is replaced by the W213 E 63 S cabin (tools/extract-amg-interior.py -> source-assets/cars/amg-interior.glb).
Usage: blender -b --disable-autoexec blender-cars/backups/amg-original.blend --python tools/prepare-amg-model.py -- <out.glb> [<rigged.blend>]
(the source as downloaded; blender-cars/amg.blend is the animated result)"""
import bpy,bmesh,sys,math,os
from mathutils import Matrix,Vector,Color
from mathutils.bvhtree import BVHTree
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
OUT=args[0];RIGGED=args[1] if len(args)>1 else None
INTERIOR=os.path.join(os.path.dirname(os.path.abspath(__file__)),'source-assets','cars','amg-interior.glb')
LENGTH=5.054
R=Matrix.Rotation(-math.pi/2,4,'Z')
scene=bpy.context.scene
for o in [o for o in bpy.data.objects if o.type=='FONT']:bpy.data.objects.remove(o,do_unlink=True)
for o in bpy.data.objects:
 for m in o.modifiers:
  if m.type=='SUBSURF':m.levels=max(1,m.levels-1) if m.levels>1 else m.levels
  # brake discs and calipers sit behind the spokes: their cages are enough
  if m.type=='SUBSURF' and o.name.startswith('brake'):m.levels=0
 # the tyres come as 61k-face meshes with no subdivision: a quarter of that keeps the tread and lettering readable
 if o.type=='MESH' and o.name in ('Plane.006','Plane.008','Plane.009','Plane.010'):
  d=o.modifiers.new('lighter','DECIMATE');d.ratio=.3
dg=bpy.context.evaluated_depsgraph_get()
baked=[]
for o in [o for o in bpy.data.objects if o.type=='MESH']:
 ev=o.evaluated_get(dg);me=bpy.data.meshes.new_from_object(ev,preserve_all_data_layers=True,depsgraph=dg)
 me.transform(o.matrix_world);baked.append((o.name,me,[m for m in me.materials]))
for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
lo=Vector((1e9,)*3);hi=Vector((-1e9,)*3)
for _,me,_ in baked:
 for v in me.vertices:
  for i in range(3):lo[i]=min(lo[i],v.co[i]);hi[i]=max(hi[i],v.co[i])
S=LENGTH/(hi.y-lo.y)
centre=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
place=Matrix.Scale(S,4)@R@Matrix.Translation(-centre)
print('PREP source bounds',tuple(round(v,3) for v in lo),tuple(round(v,3) for v in hi),'scale %.4f'%S)
root=bpy.data.objects.new('Mercedes-AMG GT 63',None);scene.collection.objects.link(root)
parts=[]
for name,me,_ in baked:
 me.transform(place)
 o=bpy.data.objects.new('AMG__'+name,me);scene.collection.objects.link(o);o.parent=root;parts.append(o)
tot=sum(len(o.data.polygons) for o in parts)
print('PREP parts',len(parts),'faces',tot)
part=lambda name:bpy.data.objects['AMG__'+name]
bpy.context.view_layer.update()
def group(name,point):
 o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.parent=root;o.location=point;return o
def centre_of(o):
 vs=[v.co for v in o.data.vertices];lo=Vector((min(v.x for v in vs),min(v.y for v in vs),min(v.z for v in vs)));hi=Vector((max(v.x for v in vs),max(v.y for v in vs),max(v.z for v in vs)))
 return (lo+hi)/2
# Wheels: one group per tyre at its centre; tyre, rim and brake disc turn with it, the calipers stay with the body.
# Site order: 0,1 front, 2,3 rear; within an axle the driver's side (-y) first.
TYRES=['Plane.006','Plane.009','Plane.008','Plane.010'];RIMS=['in whell','in whell.002','in whell.001','in whell.003'];DISCS=['brake','brake.004','brake.001','brake.006']
centres=[centre_of(part(n)) for n in TYRES]
wheels=[group('AMG wheel %d'%i,c) for i,c in enumerate(centres)]
bpy.context.view_layer.update()
def move(o,target):
 M=o.matrix_world.copy();o.parent=target;o.matrix_parent_inverse=target.matrix_world.inverted();o.matrix_world=M
for i,w in enumerate(wheels):
 for n in (TYRES[i],RIMS[i],DISCS[i]):move(part(n),w)
print('PREP wheels',[tuple(round(v,3) for v in w.location) for w in wheels])
# Doors: four, hinged at their front edges. Each door is gathered from its skin, glass, beltline chrome, the mirror and
# its sail (front doors) and its share of the cabin shell's side wall (the door card), cut at the door's outline.
SEAM=.15
def split(o,keep):
 """Faces of o for which keep(centre) holds go to a new object; returns it (or None)."""
 me=o.data;M=o.matrix_world;sel={p.index for p in me.polygons if keep(M@p.center)}
 if not sel:return None
 new=o.copy();new.data=me.copy();scene.collection.objects.link(new)
 for ob,drop in ((new,lambda i:i not in sel),(o,lambda i:i in sel)):
  bm=bmesh.new();bm.from_mesh(ob.data);bm.faces.ensure_lookup_table()
  bmesh.ops.delete(bm,geom=[f for f in bm.faces if drop(f.index)],context='FACES')
  bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(ob.data);bm.free()
 return new
# The cabin. The free model's own is a placeholder (a moulded dash and seat blocks): it goes, and the W213 E 63 S cabin
# comes in (tools/extract-amg-interior.py -> amg-interior.glb; the same platform: same wheelbase, door cut and floor),
# fitted under this body's lower, faster roof and inside its glass: above the waist each cabin point is drawn towards
# the car's centre, in proportion, until the W213's headliner and pillar trims clear the AMG's roof, glass and pillars.
for o in [o for o in bpy.data.objects if o.name.startswith('AMG__interior')]:bpy.data.objects.remove(o,do_unlink=True)
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=INTERIOR)
for o in [o for o in bpy.data.objects if o not in before and o.type!='MESH']:bpy.data.objects.remove(o,do_unlink=True)
cabin=[o for o in bpy.data.objects if o not in before]
for o in cabin:move(o,root)
bpy.context.view_layer.update()
def tree(objs,keep=lambda c,n:True):
 vs=[];fs=[]
 for o in objs:
  M=o.matrix_world;N=M.to_3x3();base=len(vs);vs+=[M@v.co for v in o.data.vertices]
  fs+=[[base+i for i in p.vertices] for p in o.data.polygons if keep(M@p.center,(N@p.normal).normalized())]
 return BVHTree.FromPolygons(vs,fs)
body=tree([o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('AMG__')])
skins=tree([part('door'),part('door.001')])
WAIST,CORE,GAP=1.0,.45,.012
isdoor=lambda o:o.name.startswith('W213 door')
# the W213 doors are framed, the AMG's glass frameless: the door pieces are cut straight across at the waist (their
# torn base panel is not taken at all: tools/extract-amg-interior.py; each door gets a whole inner panel further down)
for o in [o for o in cabin if isdoor(o)]:
 bm=bmesh.new();bm.from_mesh(o.data);M=o.matrix_world;Mi=M.inverted()
 bmesh.ops.bisect_plane(bm,geom=bm.verts[:]+bm.edges[:]+bm.faces[:],plane_co=Mi@Vector((0,0,WAIST)),plane_no=(M.to_3x3().transposed()@Vector((0,0,1))).normalized(),clear_outer=True)
 bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(o.data);bm.free()
 if not o.data.polygons:cabin.remove(o);bpy.data.objects.remove(o,do_unlink=True)
trim=[o for o in cabin if not isdoor(o)]
ceiling=tree(trim,lambda c,n:n.z<-.5 and c.z>1.2)
sides=tree(trim,lambda c,n:abs(c.y)>.5 and c.z>.95 and n.y*c.y<-.5*abs(c.y))
def hit(t,o,d):return t.ray_cast(Vector(o),Vector(d),3.0)[0]
def outside(p):
 """True when a ray from the centre line (same x, y 0, z .85) meets the shell before reaching p."""
 c=Vector((min(max(p.x,-1.0),1.4),0,.85));d=p-c;L=d.length
 h=body.ray_cast(c,d/L,L) if L>1e-4 else (None,)
 return h[0] is not None and h[3]<L-.003
moved=snapped=0
for o in cabin:
 M=o.matrix_world;Mi=M.inverted();door=isdoor(o)
 for v in o.data.vertices:
  p=M@v.co;q=p.copy()
  if p.z>WAIST and not door:
   a=hit(body,(p.x,p.y,WAIST),(0,0,1));d=hit(ceiling,(p.x,p.y,WAIST),(0,0,1))
   if a:
    if d and d.z>a.z-GAP:q.z=WAIST+(p.z-WAIST)*(a.z-GAP-WAIST)/(d.z-WAIST)
    q.z=min(q.z,a.z-.004)
  if p.z>.36 and abs(p.y)>CORE:
   s=1 if p.y>0 else -1
   a=hit(skins if door else body,(p.x,s*CORE,p.z),(0,s,0));d=hit(sides,(p.x,s*CORE,p.z),(0,s,0)) if p.z>.95 and not door else None
   if a:
    if d and abs(d.y)>abs(a.y)-GAP:q.y=s*(CORE+(abs(p.y)-CORE)*(abs(a.y)-GAP-CORE)/(abs(d.y)-CORE))
    q.y=s*min(abs(q.y),abs(a.y)-.004)
  # door pieces that still reach past the AMG's skin are drawn back onto it (cutting faces off them saws their edges)
  if door and outside(q):
   n=skins.find_nearest(q)[0]
   if n is not None:q=n+(Vector((q.x,0,.85))-n).normalized()*.003;snapped+=1
  if (q-p).length>1e-5:v.co=Mi@q;moved+=1
# what of the rest still reaches outside the body (the underbody pan at the arches) goes
out=0
for o in trim:
 bm=bmesh.new();bm.from_mesh(o.data);M=o.matrix_world
 drop=[f for f in bm.faces if outside(M@f.calc_center_median())]
 bmesh.ops.delete(bm,geom=drop,context='FACES');bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(o.data);bm.free();out+=len(drop)
print('PREP cabin',len(cabin),'objects',sum(len(o.data.polygons) for o in cabin),'faces; fitted vertices',moved,'door vertices onto the skin',snapped,'outside faces dropped',out)
# No glare in the cabin: the W213's game materials run from mirror gloss (roughness 0) to plastic. Here the gloss-black
# trims and carbon are satin, chrome is a dark brushed aluminium (bright chrome on the wheel spokes and seat frames
# caught every light), the screens a soft glass, the leather and the rest matte; only the chrome stays metallic.
used_body={m for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('AMG__') for m in o.data.materials if m}
for m in {m for o in cabin for m in o.data.materials if m and m not in used_body}:
 n=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None) if m.use_nodes else None
 if not n or n.inputs['Roughness'].is_linked:continue
 name=m.name.lower();r=n.inputs['Roughness']
 if 'chrome' in name:
  n.inputs['Metallic'].default_value=1;r.default_value=max(r.default_value,.5)
  if not n.inputs['Base Color'].is_linked:n.inputs['Base Color'].default_value=(.32,.33,.34,1)
 else:n.inputs['Metallic'].default_value=0;r.default_value=max(r.default_value,{'gloss_black':.45,'mesheschassis0311_diff':.5,'speedmtr':.5,'amg leather':.72,'amg fabric':.95}.get(name,.6))
 # the game's untextured '...Mat' parts (pockets, bezels, small trims) came as a flat light grey that read as white
 # patches on the door cards and dash: they are a dark trim like their surroundings
 if name.endswith('mat') and 'chrome' not in name and not n.inputs['Base Color'].is_linked:n.inputs['Base Color'].default_value=(.022,.023,.025,1)
 # the plain blacks (the dash, console and wheel plastics, the door cards' piano-black trims) came as pure black and
 # read as holes in the site's dark scenes: a deep charcoal, the piano black a shade darker
 lift={'black':'#1b1c1e','gloss_black':'#0f1011','mesheschassis0281_diff':'#1c1d1f'}.get(name)
 if lift:
  # (the console's plastic links a 256 px near-black game texture the site never showed: it goes)
  for l in list(n.inputs['Base Color'].links):m.node_tree.links.remove(l)
  n.inputs['Base Color'].default_value=(*Color([int(lift[i:i+2],16)/255 for i in (1,3,5)]).from_srgb_to_scene_linear(),1)
# The inside mirror's glass is the W213's 'Chrome': brushed, it read as a flat grey slab under the roof. It gets a dark
# mirror glass of its own (faces of the chrome facing the cabin, at the mirror).
mglass=bpy.data.materials.new('AMG mirror glass');mglass.use_nodes=True;_t=mglass.node_tree;_t.nodes.clear()
_m=_t.nodes.new('ShaderNodeBsdfPrincipled');_t.links.new(_m.outputs[0],_t.nodes.new('ShaderNodeOutputMaterial').inputs[0])
_m.inputs['Base Color'].default_value=(.01,.011,.012,1);_m.inputs['Roughness'].default_value=.55;_m.inputs['Metallic'].default_value=0;_m.inputs['Specular IOR Level'].default_value=.2
for o in cabin:
 me=o.data;M=o.matrix_world;N=M.to_3x3();slots=[m.name.lower() if m else '' for m in me.materials]
 sel=[p for p in me.polygons if slots and 'chrome' in slots[p.material_index] and -.5<(M@p.center).x<-.25 and abs((M@p.center).y)<.16 and 1.15<(M@p.center).z<1.34 and (N@p.normal).normalized().x>.5]
 if sel:
  me.materials.append(mglass);k=len(me.materials)-1
  for p in sel:p.material_index=k
  print('PREP mirror glass',o.name,len(sel))
# Cabin details the game textures and meshes left coarse:
#  - the instrument cluster: the W213's 512 x 256 picture is replaced by a 2048 x 1024 one in the same layout (AMG dials,
#    drawn for the project: tools/source-assets/cars/amg-cabin-cluster.png, stored upside down like the original);
#  - the media screen: in the W213 a black panel strewn with switch labels; here an MBUX-style screen (map, route,
#    music, dock: amg-cabin-media.png) on the right half of the widescreen glass, the labels under it removed;
#  - the carbon trim: a 128 px tile replaced by a 1024 px 2x2 twill (amg-cabin-carbon.png), same UVs; the fabric of the
#    dash top, floor, pillars and wheel grips (a blotchy 512 px game tile) by an even microfibre (amg-cabin-fabric.png);
#  - the steering wheel rim: the game's rim is a loose mesh of triangles (black leather at the sides, microfibre top and
#    bottom, a carbon band at twelve o'clock) and read polygonal. It is rebuilt as a smooth tube on the same ring: the
#    wheel's plane and centre fitted to the rim, the outer radius measured every 2 degrees (the ring is slightly
#    D-shaped), a 39 x 40 mm section, 180 x 24 quads, the same three materials in the same places; the old rim faces
#    inside the tube go;
#  - every game texture the cabin shows up close is at least 2048 px (tools/amg-hd-textures.mjs): the label atlases and
#    door inserts upscaled with their outlines kept smooth, the leather, the door leatherette and the microfibre redrawn
#    with normal maps (the grain shows in the light instead of as printed pixels).
ASSETS=os.path.join(os.path.dirname(os.path.abspath(__file__)),'source-assets','cars')
def packed(name):
 i=bpy.data.images.load(os.path.join(ASSETS,name));i.pack();return i
cluster_img,media_img,carbon_img,fabric_img=packed('amg-cabin-cluster.png'),packed('amg-cabin-media.png'),packed('amg-cabin-carbon.png'),packed('amg-cabin-fabric.png')
leather_img=packed('amg-cabin-leather.png')
for mname,img in (('Mesheschassis0311_diff',carbon_img),('AMG fabric',fabric_img),('AMG leather',leather_img)):
 for n in bpy.data.materials[mname].node_tree.nodes:
  if n.type=='TEX_IMAGE':n.image=img
HD=os.path.join(ASSETS,'amg-hd');swapped=[]
for img in list(bpy.data.images):
 p=os.path.join(HD,img.name+'.png')
 if img.name.endswith('_baseColor') and os.path.exists(p):
  new=bpy.data.images.load(p);new.alpha_mode=img.alpha_mode;new.pack();img.user_remap(new);swapped.append(img.name)
print('PREP hd textures',len(swapped))
def add_normal(mat,name,strength):
 """A tangent-space normal map on the material's Principled BSDF, on the same UVs as its colour texture."""
 t=mat.node_tree;b=next(n for n in t.nodes if n.type=='BSDF_PRINCIPLED');base=next((n for n in t.nodes if n.type=='TEX_IMAGE'),None)
 tx=t.nodes.new('ShaderNodeTexImage');tx.image=packed(name);tx.image.colorspace_settings.name='Non-Color'
 if base and base.inputs['Vector'].is_linked:t.links.new(base.inputs['Vector'].links[0].from_socket,tx.inputs['Vector'])
 nm=t.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=strength
 t.links.new(tx.outputs['Color'],nm.inputs['Color']);t.links.new(nm.outputs['Normal'],b.inputs['Normal'])
add_normal(bpy.data.materials['AMG leather'],'amg-cabin-leather-normal.png',.7)
add_normal(bpy.data.materials['AMG fabric'],'amg-cabin-fabric-normal.png',.4)
def screen_material(name,img):
 m=bpy.data.materials.new(name);m.use_nodes=True;t=m.node_tree;t.nodes.clear()
 p=t.nodes.new('ShaderNodeBsdfPrincipled');t.links.new(p.outputs[0],t.nodes.new('ShaderNodeOutputMaterial').inputs[0])
 tx=t.nodes.new('ShaderNodeTexImage');tx.image=img
 p.inputs['Base Color'].default_value=(0,0,0,1);p.inputs['Roughness'].default_value=.5
 t.links.new(tx.outputs['Color'],p.inputs['Emission Color']);p.inputs['Emission Strength'].default_value=1.0
 return m
# the widescreen glass leans back (x falls 0.29 m per metre of height); the screens stand 4 mm proud of it
xg=lambda z:-.779-.29*(z-.955)
def glass_quad(name,mat,y0,y1,zb,zt,proud):
 me=bpy.data.meshes.new(name);b=bmesh.new();uvl=b.loops.layers.uv.new('UVMap')
 q=[b.verts.new((xg(z)+proud,y,z)) for y,z in ((y0,zb),(y1,zb),(y1,zt),(y0,zt))]
 f=b.faces.new((q[0],q[3],q[2],q[1]))
 for l in f.loops:l[uvl].uv=((l.vert.co.y-y0)/(y1-y0),(l.vert.co.z-zb)/(zt-zb))
 b.normal_update();b.to_mesh(me);b.free();me.materials.append(mat)
 o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);o.parent=root;return o
media=screen_material('AMG media screen',media_img)
Y0,Y1,ZB,ZT=-.175,.125,.893,.983
so=glass_quad('W213 media screen',media,Y0,Y1,ZB,ZT,.004)
# the instrument cluster: the W213's own screen (12 curved faces whose picture filled only their middle half, black
# above and below, so the dials sat small in a wide black frame) goes; a screen of the media screen's height fills the
# cluster's half of the glass (amg-cabin-cluster.png, 4096 x 1326, upright)
_old=bpy.data.objects['W213 Object_305'];cabin.remove(_old);bpy.data.objects.remove(_old,do_unlink=True)
glass_quad('W213 cluster screen',screen_material('AMG cluster screen',cluster_img),-.484,-.206,ZB,ZT,.004)
# one dark glass behind both screens (2 mm proud of the old panel), so the pair reads as one widescreen: a thin border
# round them and a 3 cm bridge between
sg=bpy.data.materials.new('AMG screen glass');sg.use_nodes=True;_t=sg.node_tree;_t.nodes.clear()
_g=_t.nodes.new('ShaderNodeBsdfPrincipled');_t.links.new(_g.outputs[0],_t.nodes.new('ShaderNodeOutputMaterial').inputs[0])
_g.inputs['Base Color'].default_value=(.0025,.003,.0038,1);_g.inputs['Roughness'].default_value=.35;_g.inputs['Metallic'].default_value=0
glass_quad('W213 screen glass',sg,-.491,.132,ZB-.006,ZT+.006,.002)
labels=bpy.data.objects['W213 Object_259'];bm=bmesh.new();bm.from_mesh(labels.data);M=labels.matrix_world;N=M.to_3x3()
gone=[f for f in bm.faces if (N@f.normal).normalized().x>.6 and -.82<(M@f.calc_center_median()).x<-.7 and Y0-.01<(M@f.calc_center_median()).y<Y1+.01 and ZB-.01<(M@f.calc_center_median()).z<ZT+.01]
bmesh.ops.delete(bm,geom=gone,context='FACES');bm.to_mesh(labels.data);bm.free()
print('PREP media screen; labels removed',len(gone))
import numpy as np
def fit_wheel():
 objs=[bpy.data.objects[n] for n in ('W213 Object_13','W213 Object_79','W213 Object_83')]
 V=np.array([list(o.matrix_world@v.co) for o in objs[:1] for v in o.data.vertices])
 c=np.array([-0.47,-0.37,0.925]);n=np.array([0.947,0.0,0.32]);n/=np.linalg.norm(n)
 for _ in range(6):
  d=V-c;h=d@n;r=np.linalg.norm(d-np.outer(h,n),axis=1);P=V[(r>.15)&(r<.23)&(np.abs(h)<.045)]
  mu=P.mean(0);n2=np.linalg.svd(P-mu,full_matrices=False)[2][2];n=(n2 if n2@n>0 else -n2)/np.linalg.norm(n2)
  e1=np.cross(n,[0,0,1.0]);e1/=np.linalg.norm(e1);e2=np.cross(n,e1)
  u=(P-mu)@e1;w=(P-mu)@e2;D,E,F=np.linalg.lstsq(np.c_[u,w,np.ones_like(u)],-(u*u+w*w),rcond=None)[0]
  c=mu-D/2*e1-E/2*e2
 # outer radius by angle over all three parts, smoothed round the ring
 W=np.array([list(o.matrix_world@v.co) for o in objs for v in o.data.vertices])
 d=W-c;h=d@n;ip=d-np.outer(h,n);r=np.linalg.norm(ip,axis=1);t=np.degrees(np.arctan2(ip@e2,ip@e1))%360
 s=(r>.14)&(r<.215)&(np.abs(h)<.03)
 rmax=np.zeros(180)
 for k in range(180):
  m=s&(np.abs(((t-k*2+180)%360)-180)<3)
  rmax[k]=r[m].max() if m.any() else np.nan
 for k in range(180):
  if np.isnan(rmax[k]):rmax[k]=np.nanmean(rmax)
 # (twice over +-16 degrees: narrower, the measured radius wobbled the rim in and out along its length)
 sm=rmax
 for _ in range(2):sm=np.array([np.mean([sm[(k+j)%180] for j in range(-8,9)]) for k in range(180)])
 return c,n,e1,e2,sm
wc,wn,we1,we2,wr=fit_wheel()
RA,RB,HC=.0195,.020,.001
leather=bpy.data.materials['Black'];fabric=bpy.data.materials['AMG fabric'];carbonm=bpy.data.materials['Mesheschassis0311_diff']
def rim_material(deg):
 if 266<=deg<=274:return 2
 if 32<=deg<=133 or 207<=deg<=333:return 1
 return 0
# take the old rim out: faces of the three parts whose centre lies inside the tube grown by 1 cm (4 mm left shards of the
# game's thicker, D-shaped rim sticking out of the new one)
gone=0
for name in ('W213 Object_13','W213 Object_79','W213 Object_83'):
 o=bpy.data.objects[name];bm=bmesh.new();bm.from_mesh(o.data);M=o.matrix_world;drop=[]
 for f in bm.faces:
  q=np.array(list(M@f.calc_center_median()));d=q-wc;h=d@wn;ip=d-h*wn;r=np.linalg.norm(ip);deg=math.degrees(math.atan2(ip@we2,ip@we1))%360
  rc=wr[int(deg//2)%180]-RA
  if ((r-rc)/(RA+.010))**2+((h-HC)/(RB+.010))**2<1.0:drop.append(f)
 bmesh.ops.delete(bm,geom=drop,context='FACES');bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
 bm.to_mesh(o.data);bm.free();gone+=len(drop)
NT,NS=180,24
rb=bmesh.new();uvl=rb.loops.layers.uv.new('UVMap');ring=[]
for k in range(NT):
 th=math.radians(k*2);dirv=math.cos(th)*we1+math.sin(th)*we2;rc=wr[k]-RA
 ring.append([rb.verts.new(Vector(list(wc+(rc+RA*math.cos(2*math.pi*j/NS))*dirv+(HC+RB*math.sin(2*math.pi*j/NS))*wn))) for j in range(NS)])
TILE=.05
for k in range(NT):
 for j in range(NS):
  a,b,c2,d2=ring[k][j],ring[(k+1)%NT][j],ring[(k+1)%NT][(j+1)%NS],ring[k][(j+1)%NS]
  f=rb.faces.new((a,b,c2,d2));f.smooth=True;f.material_index=rim_material(k*2+1)
  for l,(uk,uj) in zip(f.loops,((k,j),(k+1,j),(k+1,j+1),(k,j+1))):l[uvl].uv=(uk*math.radians(2)*.175/TILE,uj/NS*.125/TILE)
rb.normal_update()
rim_me=bpy.data.meshes.new('W213 wheel rim');rb.to_mesh(rim_me);rb.free()
for m in (leather,fabric,carbonm):rim_me.materials.append(m)
rim_ob=bpy.data.objects.new('W213 wheel rim',rim_me);scene.collection.objects.link(rim_ob);rim_ob.parent=root
# faces point out of the tube
rim_me.validate();rim_me.update()
cen=[Vector(list(wc+(wr[k]-RA)*(math.cos(math.radians(k*2))*we1+math.sin(math.radians(k*2))*we2)+HC*wn)) for k in range(NT)]
flip=sum(1 for p in rim_me.polygons if p.normal.dot(p.center-cen[min(range(NT),key=lambda k:(cen[k]-p.center).length)])<0)
if flip>len(rim_me.polygons)/2:rim_me.flip_normals()
print('PREP steering wheel: centre',tuple(round(float(v),3) for v in wc),'old rim faces',gone,'new rim',len(rim_me.polygons))
# the wheel's hub, airbag cover and spokes (with the rest of the plain black trim) came flat-shaded: smooth by angle
hub=bpy.data.objects['W213 Object_13']
with bpy.context.temp_override(object=hub,active_object=hub,selected_objects=[hub],selected_editable_objects=[hub]):
 bpy.ops.mesh.customdata_custom_splitnormals_clear()
hub.data.shade_smooth();hub.data.set_sharp_from_angle(angle=math.radians(45))
# Console and wheel pieces the game left coarse:
#  - the airbag cover and hub (one 169-triangle island of Object_13 and its small neighbours) read as facets: separated
#    and given two levels of subdivision;
#  - the chrome ring round the controller's rotary knob (31 triangles) is rebuilt as a 96-segment ring with rounded
#    edges on the same circle (plane, centre, radii and height fitted to the old one);
#  - the hazard switch's red triangle was half buried in the knob (it read as a red chevron): the old mark goes and a
#    clean triangle outline, glowing like the light strips, sits on the knob's face.
def islands_of(o):
 bm=bmesh.new();bm.from_mesh(o.data);seen=set();out=[]
 for f in bm.faces:
  if f.index in seen:continue
  st=[f];cur=[]
  while st:
   g=st.pop()
   if g.index in seen:continue
   seen.add(g.index);cur.append(g.index)
   for e in g.edges:
    for h in e.link_faces:
     if h.index not in seen:st.append(h)
  out.append(cur)
 bm.free();return out
def split_faces(o,faces,name):
 """Move the given faces of o into a new object (same materials, world-space mesh under root)."""
 keep=set(faces);me=o.data.copy();bm=bmesh.new();bm.from_mesh(me);bm.faces.ensure_lookup_table()
 bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index not in keep],context='FACES');bm.to_mesh(me);bm.free()
 me.transform(o.matrix_world);me.name=name
 n=bpy.data.objects.new(name,me);scene.collection.objects.link(n);n.parent=root;n.matrix_parent_inverse=root.matrix_world.inverted()
 bm=bmesh.new();bm.from_mesh(o.data);bm.faces.ensure_lookup_table();bmesh.ops.delete(bm,geom=[bm.faces[i] for i in keep],context='FACES')
 bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(o.data);bm.free()
 return n
def centre_of(o,faces):
 M=o.matrix_world;ps=[M@o.data.polygons[i].center for i in faces];return sum(ps,Vector())/len(ps)
HUBC=Vector((-.476,-.372,.891))
hub_faces=[i for isl in islands_of(hub) if (centre_of(hub,isl)-HUBC).length<.1 and len(isl)>=10 for i in isl]
airbag=split_faces(hub,hub_faces,'W213 wheel hub')
sub=airbag.modifiers.new('sub','SUBSURF');sub.levels=sub.render_levels=2
with bpy.context.temp_override(object=airbag,active_object=airbag,selected_objects=[airbag],selected_editable_objects=[airbag]):
 bpy.ops.object.modifier_apply(modifier='sub')
airbag.data.shade_smooth();airbag.data.set_sharp_from_angle(angle=math.radians(60))
print('PREP wheel hub subdivided',len(hub_faces),'->',len(airbag.data.polygons))
chrome_o=bpy.data.objects['W213 Object_123'];CTRL=Vector((-.395,0,.642))
# the wheel's silver spokes (Object_123's chrome round the hub, its triangles loose: every face its own island) are
# welded into one surface, then subdivided once and smoothed like the hub
spoke_faces=[i for isl in islands_of(chrome_o) if (centre_of(chrome_o,isl)-HUBC).length<.17 for i in isl]
spokes=split_faces(chrome_o,spoke_faces,'W213 wheel spokes')
bm=bmesh.new();bm.from_mesh(spokes.data);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.0004);bm.to_mesh(spokes.data);bm.free()
with bpy.context.temp_override(object=spokes,active_object=spokes,selected_objects=[spokes],selected_editable_objects=[spokes]):
 bpy.ops.mesh.customdata_custom_splitnormals_clear()
 sub=spokes.modifiers.new('sub','SUBSURF');sub.levels=sub.render_levels=1
 bpy.ops.object.modifier_apply(modifier='sub')
spokes.data.shade_smooth();spokes.data.set_sharp_from_angle(angle=math.radians(50))
print('PREP wheel spokes welded and subdivided',len(spoke_faces),'->',len(spokes.data.polygons))
ring_isl=min((isl for isl in islands_of(chrome_o) if len(isl)>=20),key=lambda isl:(centre_of(chrome_o,isl)-CTRL).length)
M=chrome_o.matrix_world;P=np.array([list(M@chrome_o.data.vertices[v].co) for i in ring_isl for v in chrome_o.data.polygons[i].vertices])
mu=P.mean(0);rn=np.linalg.svd(P-mu,full_matrices=False)[2][2];rn=rn if rn[2]>0 else -rn
e1=np.cross(rn,[0,1.0,0]);e1/=np.linalg.norm(e1);e2=np.cross(rn,e1)
u=(P-mu)@e1;w=(P-mu)@e2;D,E,F=np.linalg.lstsq(np.c_[u,w,np.ones_like(u)],-(u*u+w*w),rcond=None)[0];rc=mu-D/2*e1-E/2*e2
d=P-rc;hh=d@rn;rr_=np.linalg.norm(d-np.outer(hh,rn),axis=1)
rin,rout,h0,h1=float(rr_.min()),float(rr_.max()),float(hh.min()),float(hh.max())
ring_mat=chrome_o.data.polygons[ring_isl[0]].material_index
bm=bmesh.new();bm.from_mesh(chrome_o.data);bm.faces.ensure_lookup_table();bmesh.ops.delete(bm,geom=[bm.faces[i] for i in ring_isl],context='FACES')
bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(chrome_o.data);bm.free()
b=min(.0025,(rout-rin)/3,(h1-h0)/2)
prof=[(rin,h0),(rin,h1-b),(rin+b*.29,h1-b*.29),(rin+b,h1),(rout-b,h1),(rout-b*.29,h1-b*.29),(rout,h1-b),(rout,h0)]
NR=96;rb=bmesh.new();rings=[]
for k in range(NR):
 a=2*math.pi*k/NR;dv=math.cos(a)*e1+math.sin(a)*e2
 rings.append([rb.verts.new(Vector(list(rc+r*dv+h*rn))) for r,h in prof])
for k in range(NR):
 for j in range(len(prof)-1):
  q=(rings[k][j],rings[(k+1)%NR][j],rings[(k+1)%NR][j+1],rings[k][j+1]);f=rb.faces.new(q);f.smooth=True
rb.normal_update()
# faces point away from the section's middle
RC,RN,rmid,hmid=Vector(list(rc)),Vector(list(rn)),(rin+rout)/2,(h0+h1)/2
for f in rb.faces:
 c=f.calc_center_median();rad=(c-RC)-RN*(c-RC).dot(RN);rad.normalize()
 if f.normal.dot(c-(RC+rad*rmid+RN*hmid))<0:f.normal_flip()
ring_me=bpy.data.meshes.new('W213 controller ring');rb.to_mesh(ring_me);rb.free();ring_me.materials.append(chrome_o.data.materials[ring_mat])
ring_me.shade_smooth();ring_me.set_sharp_from_angle(angle=math.radians(50))
ring_ob=bpy.data.objects.new('W213 controller ring',ring_me);scene.collection.objects.link(ring_ob);ring_ob.parent=root;ring_ob.matrix_parent_inverse=root.matrix_world.inverted()
print('PREP controller ring: centre',tuple(round(float(v),3) for v in rc),'radii',round(rin,4),round(rout,4),'height',round(h1-h0,4),'old faces',len(ring_isl))
# hazard switch: knob face at the console's top, facing up and back
KNOB,KN=Vector((-.6045,0,.7095)),Vector((.73,0,.68)).normalized()
strip_o=bpy.data.objects['W213 Object_233'];M=strip_o.matrix_world
bm=bmesh.new();bm.from_mesh(strip_o.data);old=[f for f in bm.faces if (M@f.calc_center_median()-KNOB).length<.025]
bmesh.ops.delete(bm,geom=old,context='FACES');bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(strip_o.data);bm.free()
up=Vector((-KN.z,0,KN.x)).normalized();side_v=KN.cross(up).normalized();RO,WL=.0105,.0021
corners=[up*math.cos(a)+side_v*math.sin(a) for a in (0,2*math.pi/3,4*math.pi/3)]
hb=bmesh.new();outer=[hb.verts.new(KNOB+KN*.0007+c*RO) for c in corners];inner=[hb.verts.new(KNOB+KN*.0007+c*(RO-2*WL)) for c in corners]
for k in range(3):
 f=hb.faces.new((outer[k],outer[(k+1)%3],inner[(k+1)%3],inner[k]))
 if f.normal.dot(KN)<0:f.normal_flip()
hz=bpy.data.meshes.new('W213 hazard mark');hb.to_mesh(hz);hb.free();hz.materials.append(strip_o.data.materials[0])
hz_ob=bpy.data.objects.new('W213 hazard mark',hz);scene.collection.objects.link(hz_ob);hz_ob.parent=root;hz_ob.matrix_parent_inverse=root.matrix_world.inverted()
print('PREP hazard mark: old faces',len(old))
doors={}
for side,tag in ((-1,'L'),(1,'R')):
 on=lambda c,s=side:c.y*s>0
 for which,skin,glass,lo_x,hi_x in (('front','door.001','Plane.001',-1.0,SEAM),('rear','door','Plane.003',SEAM,1.30)):
  sk=split(part(skin),on)
  vs=[sk.matrix_world@v.co for v in sk.data.vertices]
  front=min(v.x for v in vs);outer=max(abs(v.y) for v in vs)
  # (the rear door bulges over the arch: its axis is set by the width at its own front edge; the front door's widest
  # point is its front edge, and an axis any further in swings its front corner into the wing)
  if which=='rear':outer=max(abs(v.y) for v in vs if v.x<front+.03 and .35<v.z<.95)
  # the hinge axis stands where the real one does, in the gap just ahead of the door's front edge, near its outer skin:
  # the door's front swings out and back, clear of the wing and pillar
  hinge=Vector((front-.005,side*(outer-.025),.62))
  g=group('AMG door %s %s'%(tag,which),hinge);doors[(tag,which)]=g
  bpy.context.view_layer.update()
  pieces=[('skin',sk)]
  pieces.append(('glass',split(part(glass),lambda c,s=side:c.y*s>0 and lo_x<c.x<hi_x)))
  pieces.append(('belt',split(part('door.002'),lambda c,s=side:c.y*s>0 and lo_x<c.x<hi_x)))
  if which=='front':
   pieces.append(('mirror',split(part('mirrow'),on)));pieces.append(('sail',split(part('Plane.005'),on)))
  # the door card: the W213 door's own pieces (card, armrest, handle, pocket, speaker), whole, by where they sit
  for o in [o for o in cabin if o.name.startswith('W213 door')]:
   c=sum((o.matrix_world@v.co for v in o.data.vertices),Vector())/len(o.data.vertices)
   if c.y*side>0 and lo_x<c.x<hi_x:pieces.append((('base' if 'door base' in o.name else 'card')+'%d'%len(pieces),o))
  for role,p in pieces:
   if p:move(p,g);p.name='AMG_door_%s_%s__%s'%(tag,which,role)
  print('PREP door',tag,which,'hinge',tuple(round(v,3) for v in hinge),'pieces',[r+':%d'%len(p.data.polygons) for r,p in pieces if p])
# The AMG's doors are single skins; the W213 door card stands 12-20 cm inside them. Its decorative pieces (panel,
# trims, armrest, handle, switches, speaker, light strip) are clean; its plain black base panel is not: the game never
# opened the door, so the base's edges are a saw of half triangles running out to the W213's own skin. Each door is
# made one clean shell:
#  - the base panel is rebuilt: its cabin-facing surface is sampled by rays on an 8 mm grid, carried out to the AMG
#    door's outline (traced from the paint skin, 8 mm in, relaxed; the uncovered part filled harmonically), smoothed, kept behind the
#    decorative pieces and 2 cm inside the skin, and laid as a regular 12 mm quad mesh in the base's own material;
#    the old base goes;
#  - the decorative pieces are cut straight (planes, so no edge is sawn) where they reach past the AMG door's front
#    or rear edge (the W213's door is longer at the B-pillar) or within 2 cm of the skin;
#  - a shut face round the front, bottom and rear, from the new panel's edge out to 3 mm inside the skin: a rubber seal
#    along the card's edge, the rest painted like the body (the panel itself in a grained trim);
#  - a window ledge on top from the innermost card point at the waist to the skin's top lip, smoothed along the door;
#  - the card's lower half, which the W213 kept in its torn base: speaker, door pocket and carpet strip (below).
CELL,FC,MC=.004,.008,.012
def flat_material(name,rgb,rough):
 m=bpy.data.materials.new(name);m.use_nodes=True;t=m.node_tree;t.nodes.clear()
 b=t.nodes.new('ShaderNodeBsdfPrincipled');t.links.new(b.outputs[0],t.nodes.new('ShaderNodeOutputMaterial').inputs[0])
 b.inputs['Base Color'].default_value=(*rgb,1);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=0
 return m
shut=flat_material('AMG door shut',(.012,.013,.013),.8)
seal=flat_material('AMG door seal',(.006,.006,.007),.9)
# the shut faces and hinge pillars: the body colour as a satin paint (shut areas are not polished; the clear coat
# threw a hot spot from the cabin lights there). The site keeps its colour the body's (app/three/amg.ts).
shut_paint=flat_material('AMG shut paint',(.0080,.0091,.0103),.45)
next(n for n in shut_paint.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Metallic'].default_value=.3
def textured(name,image,rough,metal=0.0):
 m=bpy.data.materials.new(name);m.use_nodes=True;t=m.node_tree;t.nodes.clear()
 b=t.nodes.new('ShaderNodeBsdfPrincipled');t.links.new(b.outputs[0],t.nodes.new('ShaderNodeOutputMaterial').inputs[0])
 tx=t.nodes.new('ShaderNodeTexImage');tx.image=bpy.data.images.load(os.path.join(os.path.dirname(os.path.abspath(__file__)),'source-assets','cars',image));tx.image.pack()
 t.links.new(tx.outputs['Color'],b.inputs['Base Color']);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal
 return m
trim=textured('AMG door trim','amg-cabin-grain.png',.72);add_normal(trim,'amg-cabin-grain-normal.png',.8)
grillem=textured('AMG speaker grille','amg-cabin-grille.png',.38,.85)
# the speaker's ring and the pocket's lip: a light satin aluminium (the W213's 'Chrome' is a dark brushed one)
alu=flat_material('AMG door aluminium',(.42,.43,.45),.32);next(n for n in alu.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Metallic'].default_value=1
def tris_of(objs,keep=lambda name,c:True):
 vs=[];ps=[]
 for o in objs:
  M=o.matrix_world;me=o.data;names=[m.name if m else '' for m in me.materials]
  for p in me.polygons:
   c=M@p.center
   if not keep(names[p.material_index] if names else '',c):continue
   ring=[]
   for i in p.vertices:ring.append(len(vs));vs.append(M@me.vertices[i].co)
   ps.append(ring)
 return vs,ps
def cut(o,co,no):
 """Remove the part of o on the side the plane normal points to (world coordinates)."""
 M=o.matrix_world;Mi=M.inverted()
 bm=bmesh.new();bm.from_mesh(o.data)
 bmesh.ops.bisect_plane(bm,geom=bm.verts[:]+bm.edges[:]+bm.faces[:],plane_co=Mi@Vector(co),plane_no=(M.to_3x3().transposed()@Vector(no)).normalized(),clear_outer=True)
 bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(o.data);bm.free()
def build_door_shell(group,side):
 ch=[o for o in group.children if o.type=='MESH']
 sv,sp=tris_of([o for o in ch if o.name.endswith('__skin')],lambda n,c:n=='body')
 skinT=BVHTree.FromPolygons(sv,sp)
 base=[o for o in ch if '__base' in o.name];deco=[o for o in ch if '__card' in o.name];base_mat=bpy.data.materials['Black']
 xs=[v.x for v in sv];zs=[v.z for v in sv];x0,z0=min(xs)-.01,min(zs)-.01;nx=int((max(xs)-x0)/CELL)+3;nz=int((max(zs)-z0)/CELL)+3
 occ=bytearray(nx*nz)
 for ring in sp:
  P=[sv[i] for i in ring]
  for k in range(1,len(P)-1):
   a,b,c=P[0],P[k],P[k+1]
   d=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z)
   if abs(d)<1e-12:continue
   for i in range(int((min(a.x,b.x,c.x)-x0)/CELL),int((max(a.x,b.x,c.x)-x0)/CELL)+2):
    px=x0+(i+.5)*CELL
    for j in range(int((min(a.z,b.z,c.z)-z0)/CELL),int((max(a.z,b.z,c.z)-z0)/CELL)+2):
     pz=z0+(j+.5)*CELL;l1=((b.z-c.z)*(px-c.x)+(c.x-b.x)*(pz-c.z))/d;l2=((c.z-a.z)*(px-c.x)+(a.x-c.x)*(pz-c.z))/d
     if l1>=-.02 and l2>=-.02 and 1-l1-l2>=-.02 and 0<=i<nx and 0<=j<nz:occ[i*nz+j]=1
 at=lambda i,j:0<=i<nx and 0<=j<nz and occ[i*nz+j]
 def within(x,z):
  """Inside the skin's side-view outline by 8 mm, below the waist."""
  i,j=int((x-x0)/CELL),int((z-z0)/CELL)
  return z<=WAIST-.002 and all(at(i+di,j+dj) for di in (-2,0,2) for dj in (-2,0,2))
 def skin_at(x,z):
  h=skinT.ray_cast(Vector((x,side*1.4,z)),Vector((0,-side,0)),1.2)
  return abs(h[0].y) if h[0] is not None else None
 # cut planes for the decorative pieces: the door's front and rear edges (fitted to the outline between 0.40 and
 # 0.95 m, 8 mm in) and a plane 2 cm inside the skin (fitted |y| = a + b z + c x)
 ends=[]
 for which,pick in (('front',min),('rear',max)):
  pts=[]
  for j in range(nz):
   zc=z0+(j+.5)*CELL
   if not .40<=zc<=.95:continue
   row=[i for i in range(nx) if at(i,j)]
   if row:pts.append((x0+(pick(row)+.5)*CELL,zc))
  m=len(pts);Mz=sum(p[1] for p in pts)/m;Mx=sum(p[0] for p in pts)/m
  e1=sum((p[1]-Mz)*(p[0]-Mx) for p in pts)/max(1e-9,sum((p[1]-Mz)**2 for p in pts));e0=Mx-e1*Mz
  ends.append((Vector((e0+(.008 if which=='front' else -.008)+e1*.6,0,.6)),Vector((-1,0,e1)) if which=='front' else Vector((1,0,-e1))))
 smp=[]
 for i in range(0,nx,12):
  for j in range(0,nz,12):
   x,z=x0+(i+.5)*CELL,z0+(j+.5)*CELL
   if within(x,z):
    s=skin_at(x,z)
    if s:smp.append((x,z,s))
 n=len(smp);A=Matrix(((n,sum(s[1] for s in smp),sum(s[0] for s in smp)),(sum(s[1] for s in smp),sum(s[1]**2 for s in smp),sum(s[0]*s[1] for s in smp)),(sum(s[0] for s in smp),sum(s[0]*s[1] for s in smp),sum(s[0]**2 for s in smp))))
 pa,pb,pc=A.inverted()@Vector((sum(s[2] for s in smp),sum(s[1]*s[2] for s in smp),sum(s[0]*s[2] for s in smp)))
 off=max(pa+pb*s[1]+pc*s[0]-s[2] for s in smp)+.02
 plane=lambda x,z:pa-off+pb*z+pc*x
 xm=sum(s[0] for s in smp)/n;zm=sum(s[1] for s in smp)/n
 for o in deco:
  cut(o,Vector((xm,side*plane(xm,zm),zm)),Vector((-pc,side,-pb)))
  for co,no in ends:cut(o,co,no)
 for o in [o for o in deco if not o.data.polygons]:deco.remove(o);bpy.data.objects.remove(o,do_unlink=True)
 baseT=tree(base,lambda c,nn:nn.y*side<-.3) if base else None
 decoT=tree(deco) if deco else None
 # the field: depth of the base's cabin face on an 8 mm grid, the decorative pieces' backs as a floor
 gx0,gz0=min(xs),min(zs);gnx=int((max(xs)-gx0)/FC)+2;gnz=int((WAIST-gz0)/FC)+2
 gx=lambda i:gx0+(i+.5)*FC;gz=lambda j:gz0+(j+.5)*FC
 cells=[(i,j) for i in range(gnx) for j in range(gnz) if within(gx(i),gz(j)) or any(within(gx(i)+dx,gz(j)+dz) for dx in (-FC,0,FC) for dz in (-FC,0,FC))]
 field={};floor={};cap={}
 for i,j in cells:
  x,z=gx(i),gz(j);sk=skin_at(x,z);cap[(i,j)]=(sk if sk else plane(x,z)+.02)-.02
  if baseT:
   h=baseT.ray_cast(Vector((x,side*.3,z)),Vector((0,side,0)),1.0)
   if h[0] is not None and abs(h[0].y)<cap[(i,j)]:field[(i,j)]=abs(h[0].y)
  if decoT:
   o=Vector((x,side*.3,z));far=None
   for _ in range(10):
    h=decoT.ray_cast(o,Vector((0,side,0)),1.0)
    if h[0] is None or abs(h[0].y)>cap[(i,j)]:break
    far=abs(h[0].y);o=h[0]+Vector((0,side*.0005,0))
   if far:floor[(i,j)]=far+.006
 # cells the base does not cover are filled harmonically (each the mean of its neighbours, the sampled cells held),
 # so the fill runs on smoothly from the base instead of in steps; then a light smoothing over all
 sampled=set(field);todo=[c for c in cells if c not in field]
 for _ in range(600):
  if not todo:break
  left=[]
  for i,j in todo:
   ns=[field[(i+di,j+dj)] for di,dj in ((1,0),(-1,0),(0,1),(0,-1)) if (i+di,j+dj) in field]
   if ns:field[(i,j)]=sum(ns)/len(ns)
   else:left.append((i,j))
  todo=left
 for c in todo:field[c]=plane(gx(c[0]),gz(c[1]))
 free=[c for c in field if c not in sampled]
 for _ in range(400):
  for i,j in free:
   ns=[field[(i+di,j+dj)] for di,dj in ((1,0),(-1,0),(0,1),(0,-1)) if (i+di,j+dj) in field]
   field[(i,j)]=min(max(sum(ns)/len(ns),floor.get((i,j),0)),cap[(i,j)])
 for _ in range(4):
  field={(i,j):sum(field.get((i+di,j+dj),field[(i,j)]) for di in (-1,0,1) for dj in (-1,0,1))/9 for i,j in field}
  for c in field:field[c]=min(max(field[c],floor.get(c,0)),cap[c])
 def depth(x,z):
  fi,fj=(x-gx0)/FC-.5,(z-gz0)/FC-.5;i,j=int(math.floor(fi)),int(math.floor(fj));u,v=fi-i,fj-j;acc=wsum=0
  for di,dj,w in ((0,0,(1-u)*(1-v)),(1,0,u*(1-v)),(0,1,(1-u)*v),(1,1,u*v)):
   c=(i+di,j+dj)
   if c in field:acc+=field[c]*w;wsum+=w
  if wsum>1e-6:return acc/wsum
  c=min(field,key=lambda c:(gx(c[0])-x)**2+(gz(c[1])-z)**2);return field[c]
 # the panel: 12 mm quads whose corners all lie inside the outline; its stepped edge relaxed in the side view
 bm=bmesh.new();vert={};mx0=min(xs);mz0=min(zs)
 def corner(i,j):
  if (i,j) not in vert:vert[(i,j)]=bm.verts.new(Vector((mx0+i*MC,0,mz0+j*MC)))
  return vert[(i,j)]
 for i in range(int((max(xs)-mx0)/MC)+1):
  for j in range(int((WAIST-mz0)/MC)+1):
   if all(within(mx0+(i+di)*MC,mz0+(j+dj)*MC) for di in (0,1) for dj in (0,1)):
    q=(corner(i,j),corner(i+1,j),corner(i+1,j+1),corner(i,j+1));bm.faces.new(q if side<0 else q[::-1])
 # drop corner-only joins (a vertex shared by two faces touching only there) so the outline is one clean loop
 edge_v=[v for v in bm.verts if v.is_boundary]
 for _ in range(10):
  new={}
  for v in edge_v:
   nb=[e.other_vert(v) for e in v.link_edges if e.is_boundary]
   if len(nb)==2:new[v]=(v.co.x*.5+(nb[0].co.x+nb[1].co.x)*.25,v.co.z*.5+(nb[0].co.z+nb[1].co.z)*.25)
  for v,(x,z) in new.items():v.co.x,v.co.z=x,z
 for v in bm.verts:v.co.y=side*depth(v.co.x,v.co.z)
 uvp=bm.loops.layers.uv.new('UVMap')
 for f in bm.faces:
  f.material_index=0;f.smooth=True
  for l in f.loops:l[uvp].uv=(l.vert.co.x/.25,l.vert.co.z/.25)
 # shut face: panel edge (below the top band) out to the skin
 top=WAIST-1.5*MC;walls=0;outv={};inv_=Vector((0,-side,0))
 # the outer edge's depth (3 mm inside the skin) is taken along the outline: where the ray misses the skin (the door's
 # rounded corners) it comes from its neighbours (a fixed 6 cm there stood out as flaps), then it is smoothed along
 # the outline and kept inside the skin and at least 12 mm out from the card
 bedges=[e for e in bm.edges if e.is_boundary and not (e.verts[0].co.z>top and e.verts[1].co.z>top)]
 nbr={}
 for e in bedges:
  a,b=e.verts;nbr.setdefault(a,[]).append(b);nbr.setdefault(b,[]).append(a)
 raw={}
 for v in nbr:
  sk=skin_at(v.co.x,v.co.z);raw[v]=(sk-.003) if sk else None
 od=dict(raw)
 for _ in range(300):
  miss=[v for v in od if od[v] is None]
  if not miss:break
  for v in miss:
   k=[od[n] for n in nbr[v] if od[n] is not None]
   if k:od[v]=sum(k)/len(k)
 for v in od:
  if od[v] is None:od[v]=abs(v.co.y)+.03
 for _ in range(10):od={v:(od[v]*2+sum(od[n] for n in nbr[v]))/(2+len(nbr[v])) for v in od}
 for v in od:
  if raw[v] is not None:od[v]=min(od[v],raw[v])
  od[v]=max(od[v],abs(v.co.y)+.012)
 def skin_pt(v):
  if v not in outv:outv[v]=bm.verts.new(Vector((v.co.x,side*od[v],v.co.z)))
  return outv[v]
 cxm=sum(v.co.x for v in vert.values())/len(vert);czm=sum(v.co.z for v in vert.values())/len(vert)
 sealv={}
 def seal_pt(v):
  if v not in sealv:
   o=skin_pt(v).co;w=abs(o.y)-abs(v.co.y);d=min(.012,max(0,w)*.4)
   sealv[v]=bm.verts.new(Vector((v.co.x,side*(abs(v.co.y)+d),v.co.z)))
  return sealv[v]
 for e in bedges:
  a,b=e.verts
  la=[l for l in e.link_faces[0].loops if l.vert==a][0]
  first,second=(a,b) if la.link_loop_next.vert==b else (b,a)
  # painted shut face, a rubber seal along the card's edge
  sa,sb_=seal_pt(first),seal_pt(second)
  f=bm.faces.new((second,first,sa,sb_));f.material_index=2;walls+=1
  f=bm.faces.new((sb_,sa,skin_pt(first),skin_pt(second)));f.material_index=1
 for f in bm.faces:
  if f.material_index in (1,2):
   c=f.calc_center_median()
   if f.normal.x*(c.x-cxm)+f.normal.z*(c.z-czm)<0:f.normal_flip()
   f.smooth=True
 # the door's rubber seal: a 13 mm tube along the card's outline (front, bottom, rear), in the corner between the card
 # and the shut face, swept along the outline smoothed over a few centimetres
 ends_=[v for v in nbr if len(nbr[v])==1];cur=ends_[0] if ends_ else next(iter(nbr));chain=[cur];prev_=None
 while True:
  nx_=[n for n in nbr[cur] if n is not prev_ and n not in chain]
  if not nx_:break
  prev_,cur=cur,nx_[0];chain.append(cur)
 path=[Vector((v.co.x,side*(abs(v.co.y)+.007),v.co.z)) for v in chain]
 for _ in range(6):path=[path[0]]+[(path[k-1]+path[k]*2+path[k+1])/4 for k in range(1,len(path)-1)]+[path[-1]]
 NSG=16;rings_=[]
 for k,p in enumerate(path):
  t=(path[min(k+1,len(path)-1)]-path[max(k-1,0)]).normalized();n1=Vector((0,side,0));n2=t.cross(n1).normalized();n1=n2.cross(t).normalized()
  rings_.append([bm.verts.new(p+.0065*(math.cos(2*math.pi*j/NSG)*n1+math.sin(2*math.pi*j/NSG)*n2)) for j in range(NSG)])
 for k in range(len(rings_)-1):
  for j in range(NSG):
   f=bm.faces.new((rings_[k][j],rings_[k+1][j],rings_[k+1][(j+1)%NSG],rings_[k][(j+1)%NSG]));f.material_index=2;f.smooth=True;f.normal_update()
   c=f.calc_center_median();ax=(path[k]+path[k+1])/2
   if f.normal.dot(c-ax)<0:f.normal_flip()
 # a leather pad over the bare strip between the W213 card's front end and the AMG door's front edge (the AMG door is
 # longer there): per 1 cm of height, from 6 mm inside the front edge to 4 mm under the card's front-most piece, 5 mm
 # proud with rounded borders
 dpts=[o.matrix_world@v.co for o in deco for v in o.data.vertices]
 front_min=('front' in group.name) or True
 pad_rows=[];zz=.56
 while zz<WAIST-.03:
  xe=None;x=min(xs)
  while x<max(xs):
   if within(x,zz):xe=x;break
   x+=.002
  near=[p.x for p in dpts if abs(p.z-zz)<.008 and abs(p.y)<depth(p.x,zz)+.004]
  if xe is not None and near:
   xc=min(near)
   if xc-xe>.02:pad_rows.append((zz,xe+.006,xc+.004))
  zz+=.01
 pads=0
 if len(pad_rows)>2:
  # rows smoothed so the pad's edges run as curves
  for _ in range(3):pad_rows=[pad_rows[0]]+[(pad_rows[k][0],(pad_rows[k-1][1]+pad_rows[k][1]*2+pad_rows[k+1][1])/4,(pad_rows[k-1][2]+pad_rows[k][2]*2+pad_rows[k+1][2])/4) for k in range(1,len(pad_rows)-1)]+[pad_rows[-1]]
  NP=8;grid_=[]
  for zz,px0,px1 in pad_rows:
   row=[]
   for q in range(NP+1):
    u=q/NP;x=px0+(px1-px0)*u;e=min(u*(px1-px0),(1-u)*(px1-px0));o=.005*(e/.01 if e<.01 else 1)**.5
    row.append(bm.verts.new(Vector((x,side*(depth(x,zz)-o),zz))))
   grid_.append(row)
  for r in range(len(grid_)-1):
   for q in range(NP):
    qd=(grid_[r][q],grid_[r][q+1],grid_[r+1][q+1],grid_[r+1][q]);f=bm.faces.new(qd if side<0 else qd[::-1]);f.material_index=3;f.smooth=True;pads+=1
    for l in f.loops:l[uvp].uv=(l.vert.co.x/.18,l.vert.co.z/.18)
 inv=group.matrix_world.inverted()
 for v in bm.verts:v.co=inv@v.co
 me=bpy.data.meshes.new(group.name+' shell');bm.normal_update();bm.to_mesh(me);bm.free()
 me.materials.append(trim);me.materials.append(shut_paint);me.materials.append(seal);me.materials.append(bpy.data.materials['AMG leather'])
 # smooth shading, the panel/shut-face crease kept sharp
 me.shade_smooth();me.set_sharp_from_angle(angle=math.radians(40))
 ob=bpy.data.objects.new(group.name.replace('AMG door ','AMG_door_').replace(' ','_')+'__inner',me);scene.collection.objects.link(ob);ob.parent=group
 for o in base:bpy.data.objects.remove(o,do_unlink=True)
 # window ledge: from the innermost card point at the waist (or the panel's top) out to the skin's top lip
 cardpts=[o.matrix_world@v.co for o in deco for v in o.data.vertices]
 # (only as long as the panel is at the top: it ran out past the door's front edge into the hinge gap)
 tx=[x for x in [min(xs)+k*.002 for k in range(int((max(xs)-min(xs))/.002)+1)] if within(x,WAIST-.02)]
 xa=min(tx)+.004;xb=max(tx)-.004;rows=[];xsamp=[xa+(xb-xa)*k/int((xb-xa)/.01) for k in range(int((xb-xa)/.01)+1)]
 gpts=[o.matrix_world@v.co for o in group.children if o.type=='MESH' and o.name.endswith('__glass') for v in o.data.vertices]
 for x in xsamp:
  sk=[p for p in sv if abs(p.x-x)<.012];cd=[abs(p.y) for p in cardpts if abs(p.x-x)<.012 and p.z>WAIST-.015]
  if not sk:rows.append(None);continue
  t=max(sk,key=lambda p:p.z);gy=[abs(p.y) for p in gpts if abs(p.x-x)<.02 and abs(p.z-t.z)<.05]
  yo=abs(t.y)-.003;yg=(sum(gy)/len(gy)) if gy else yo-.012
  rows.append((min(cd+[depth(x,WAIST-.004)])-.002,yo,t.z-.003,min(yg,yo-.008)))
 known=[k for k,r in enumerate(rows) if r]
 for k,r in enumerate(rows):
  if r is None:rows[k]=rows[min(known,key=lambda q:abs(q-k))]
 # smoothed along the door twice over 13 cm (the card's top points step from piece to piece)
 sm=rows
 for _ in range(2):sm=[tuple(sum(r[c2] for r in sm[max(0,k-6):k+7])/len(sm[max(0,k-6):k+7]) for c2 in range(4)) for k in range(len(sm))]
 lb=bmesh.new();luv=lb.loops.layers.uv.new('UVMap');cols_=[]
 for x,(yi,yo,zo,yg) in zip(xsamp,sm):
  ztop=max(WAIST+.012,zo-.004);ys=yg-.006
  prof=[(yi,WAIST-.002,0),(yi+.003,WAIST+.006,0),(yi+.009,ztop-.001,0),(yi+.018,ztop,0),(ys-.008,ztop,0),(ys-.003,ztop+.003,1),(ys,ztop-.004,1),(ys,ztop-.016,1)]
  cols_.append([(lb.verts.new(inv@Vector((x,side*py,pz))),m) for py,pz,m in prof]+[(lb.verts.new(inv@Vector((x,side*(yg+.006),zo-.012))),1),(lb.verts.new(inv@Vector((x,side*(yg+.006),zo+.001))),1),(lb.verts.new(inv@Vector((x,side*yo,zo))),1)])
 for k in range(len(cols_)-1):
  a_,b_=cols_[k],cols_[k+1]
  for j in range(len(a_)-1):
   if j==len(prof)-1:continue
   q=(a_[j][0],a_[j+1][0],b_[j+1][0],b_[j][0]);f=lb.faces.new(q);f.material_index=a_[j+1][1] if j>=4 else a_[j][1];f.smooth=True
   # every face turned towards a point above the sill on the cabin side (where it is seen from)
   f.normal_update();c=f.calc_center_median();R=inv@Vector((xsamp[k],side*(sm[k][0]-.05),WAIST+.10))
   if f.normal.dot(R-c)<0:f.normal_flip()
 # end caps in leather (the profile closed back to its first point)
 for cap in (cols_[0],cols_[-1]):
  vs_=[c[0] for c in cap[:len(prof)]]
  try:
   f=lb.faces.new(vs_);f.material_index=0;f.normal_update()
   mid=sum((c[0].co for c in cols_[len(cols_)//2][:len(prof)]),Vector())/len(prof);c=f.calc_center_median()
   if f.normal.dot(mid-c)>0:f.normal_flip()
  except ValueError:pass
 lb.normal_update()
 for f in lb.faces:
  for l in f.loops:l[luv].uv=(l.vert.co.x/.18,l.vert.co.y/.18)
 lme=bpy.data.meshes.new(group.name+' ledge');lb.to_mesh(lme);lb.free();lme.materials.append(bpy.data.materials['AMG leather']);lme.materials.append(seal)
 lme.shade_smooth();lme.set_sharp_from_angle(angle=math.radians(55))
 lo=bpy.data.objects.new(group.name.replace('AMG door ','AMG_door_').replace(' ','_')+'__ledge',lme);scene.collection.objects.link(lo);lo.parent=group
 # the card's lower half (the W213's pocket and speaker were in its torn base): a carpet strip along the bottom, a
 # round Burmester speaker low at the front, and a door pocket under the armrest that rises out of the panel and
 # tapers back into it at both ends; all laid on the panel's surface
 fb=bmesh.new();fuv=fb.loops.layers.uv.new('UVMap')
 def on(x,z,off):return Vector((x,side*(depth(x,z)-off),z))
 def zlow(x):
  z=min(zs)
  while z<WAIST and not within(x,z):z+=.002
  return z
 front_door='front' in group.name
 colx=[mx0+i*MC for i in range(int((max(xs)-mx0)/MC)+1)]
 colx=[x for x in colx if any(within(x,mz0+j*MC) for j in range(int((WAIST-mz0)/MC)+1))]
 xf,xr=min(colx),max(colx)
 # speaker: low at the front, below the armrest's nose (which comes down to about 0.53 m)
 sx,sz,rx,rz=(xf+.28,.44,.082,.078) if front_door else (xf+.19,.45,.072,.068)
 # carpet strip, 4 cm tall, broken round the speaker
 cols=[];x=xf+.006
 while x<xr-.006:
  zl=zlow(x)
  cols.append((x,zl+.004) if zl<WAIST-.2 and within(x,zl+.04) and abs(x-sx)>rx*1.3 else None)
  x+=.02
 strips=0
 for k in range(len(cols)-1):
  a,b=cols[k],cols[k+1]
  if not a or not b:continue
  q=[on(a[0],a[1],.002),on(b[0],b[1],.002),on(b[0],b[1]+.04,.002),on(a[0],a[1]+.04,.002)]
  vs=[fb.verts.new(p) for p in q];f=fb.faces.new(vs if side<0 else vs[::-1]);f.material_index=1;f.smooth=True;strips+=1
  for l in f.loops:l[fuv].uv=(l.vert.co.x/.12,l.vert.co.z/.12)
 ok=all(within(sx+rx*math.cos(t)*1.2,sz+rz*math.sin(t)*1.2) for t in [k*math.pi/8 for k in range(16)])
 if ok:
  # the grille and the bezel's inner rings lie on a plane (fitted to the panel there, moved out to clear it), so the
  # speaker is round however the card curves; the bezel's foot comes down onto the panel
  gxp=(depth(sx+rx,sz)-depth(sx-rx,sz))/(2*rx);gzp=(depth(sx,sz+rz)-depth(sx,sz-rz))/(2*rz)
  pd=lambda x,z:depth(sx,sz)+gxp*(x-sx)+gzp*(z-sz)
  ring_pts=[(sx+rx*r*math.cos(2*math.pi*k/64),sz+rz*r*math.sin(2*math.pi*k/64)) for r in (.5,1.0,1.12) for k in range(64)]
  pd0=min(0,min(depth(x,z)-pd(x,z) for x,z in ring_pts))
  def onp(x,z,off,w=1.0):return Vector((x,side*((pd(x,z)+pd0)*w+depth(x,z)*(1-w)-off),z))
  rings=[[fb.verts.new(onp(sx+rx*r*math.cos(2*math.pi*k/64),sz+rz*r*math.sin(2*math.pi*k/64),.004+.003*(1-r*r))) for k in range(64)] for r in [i/10 for i in range(1,11)]]
  ctr=fb.verts.new(onp(sx,sz,.007))
  def suv(v):
   return (.5+.488*side*(v.co.x-sx)/rx,.5+.488*(v.co.z-sz)/rz)
  for k in range(64):
   f=fb.faces.new((ctr,rings[0][k],rings[0][(k+1)%64]) if side<0 else (ctr,rings[0][(k+1)%64],rings[0][k]));f.material_index=2;f.smooth=True
   for l in f.loops:l[fuv].uv=suv(l.vert)
   for i in range(9):
    q=(rings[i][k],rings[i+1][k],rings[i+1][(k+1)%64],rings[i][(k+1)%64])
    f=fb.faces.new(q if side<0 else q[::-1]);f.material_index=2;f.smooth=True
    for l in f.loops:l[fuv].uv=suv(l.vert)
  # a slim bezel round it, standing 9 mm proud
  bez=[[fb.verts.new(onp(sx+rx*r*math.cos(2*math.pi*k/64),sz+rz*r*math.sin(2*math.pi*k/64),o,w)) for k in range(64)] for r,o,w in ((1.0,.004,1),(1.06,.009,1),(1.12,.004,.6),(1.18,0.0,0))]
  for i in range(3):
   for k in range(64):
    q=(bez[i][k],bez[i+1][k],bez[i+1][(k+1)%64],bez[i][(k+1)%64]);f=fb.faces.new(q if side<0 else q[::-1]);f.material_index=4 if i<2 else 0;f.smooth=True
    for l in f.loops:l[fuv].uv=(l.vert.co.x/.25,l.vert.co.z/.25)
 # pocket: profile (height, standoff) lofted along the door, tapering into the panel over 4 cm at each end
 pa,pb=(xf+.41,xr-.12) if front_door else (xf+.31,xr-.32)
 za,zt=.40,.53
 prof=[(za,0.0),(za+.018,.024),(za+.035,.031),(zt-.012,.033),(zt-.002,.029),(zt+.004,.021),(zt,.013),(zt-.045,.004)]
 # (the lip's 1 cm front band in satin aluminium, a thin light line just inside its top, like the cabin's strips)
 mats=[0,0,0,4,0,5,3]
 xsq=[];x=pa
 while x<=pb+1e-6:
  if all(within(x,z) for z in (za-.01,zt+.012)):xsq.append(x)
  x+=.015
 pocket=0
 if len(xsq)>6:
  pa,pb=xsq[0],xsq[-1]
  def taper(x):
   t=lambda e0,e1,v:max(0,min(1,(v-e0)/(e1-e0)))
   s1=t(pa,pa+.04,x);s2=t(pb,pb-.04,x);s1=s1*s1*(3-2*s1);s2=s2*s2*(3-2*s2);return s1*s2
  grid=[[fb.verts.new(on(x,z,o*taper(x))) for z,o in prof] for x in xsq]
  for i in range(len(xsq)-1):
   for j in range(len(prof)-1):
    q=(grid[i][j],grid[i+1][j],grid[i+1][j+1],grid[i][j+1]);f=fb.faces.new(q if side<0 else q[::-1]);f.material_index=mats[j];f.smooth=True;pocket+=1
    for l in f.loops:l[fuv].uv=(l.vert.co.x/.25,l.vert.co.z/.25)
 fb.normal_update()
 for v in fb.verts:v.co=inv@v.co
 lme2=bpy.data.meshes.new(group.name+' lower');fb.to_mesh(lme2);fb.free()
 for m in (trim,bpy.data.materials['AMG fabric'],grillem,shut,alu,bpy.data.materials['New_Material_2']):lme2.materials.append(m)
 lme2.shade_smooth();lme2.set_sharp_from_angle(angle=math.radians(50))
 lo2=bpy.data.objects.new(group.name.replace('AMG door ','AMG_door_').replace(' ','_')+'__lower',lme2);scene.collection.objects.link(lo2);lo2.parent=group
 return len(field),len(me.polygons),walls,len(lme.polygons),"lower",strips,pocket,"speaker",ok,round(sx,3),round(sz,3),"pad",pads,"seal",len(path)
for (tag,which),g in doors.items():print('PREP door shell',g.name,'field cells, faces, shut faces, ledge',build_door_shell(g,-1 if tag=='L' else 1))
# Hinge pillars. The free model's body is a skin only: behind the wing (front doors) and under the front door's tail (rear
# doors) there is nothing for a hinge to sit on, and an open door showed the hollow there. Each door gets a dark pillar
# face 3 cm ahead of its hinge axis, from the sill to the waist, from 8 cm inboard of the axis to just inside the skin
# (tools/blender-hinges/build_amg_hinges.py fits the hinges and check straps to it).
# Each pillar is a painted face with the body's aperture flange along its inboard edge, turned towards the door
# opening, and the door's rubber seal (a 14 mm tube) in the corner between them; the A-pillar face looks back into
# the opening, the B-pillar face (the rear door's, which stays shut) forward into the front door's.
for (tag,which),g in doors.items():
 side=-1 if tag=='L' else 1;p=g.matrix_world.translation;x=p.x-.03;a,b=abs(p.y)-.08,abs(p.y)+.004;dx=1 if which=='front' else -1
 Z0,Z1=.27,.95;bm=bmesh.new()
 prof=[(x,b),(x,a+.004),(x+dx*.004,a),(x+dx*.018,a)]
 rows=[[bm.verts.new(Vector((px,side*py,z))) for px,py in prof] for z in (Z0,Z1)]
 ref=Vector((x+dx*.3,side*(abs(p.y)-.02),.6))
 for i in range(len(prof)-1):
  f=bm.faces.new((rows[0][i],rows[0][i+1],rows[1][i+1],rows[1][i]));f.normal_update();f.smooth=True
  if f.normal.dot(ref-f.calc_center_median())<0:f.normal_flip()
 sc_=Vector((x+dx*.009,0,0));sr=.007;NS=14;ring=[]
 for zz in [Z0+(Z1-Z0)*k/16 for k in range(17)]:
  ring.append([bm.verts.new(Vector((x+dx*.009+sr*math.cos(2*math.pi*j/NS),side*(a+.008+sr*math.sin(2*math.pi*j/NS)),zz))) for j in range(NS)])
 for k in range(16):
  for j in range(NS):
   f=bm.faces.new((ring[k][j],ring[k][(j+1)%NS],ring[k+1][(j+1)%NS],ring[k+1][j]));f.material_index=1;f.smooth=True;f.normal_update()
   c=f.calc_center_median();ax=Vector((x+dx*.009,side*(a+.008),c.z))
   if f.normal.dot(c-ax)<0:f.normal_flip()
 me=bpy.data.meshes.new('AMG__jamb %s %s'%(tag,which));bm.to_mesh(me);bm.free();me.materials.append(shut_paint);me.materials.append(seal)
 me.shade_smooth();me.set_sharp_from_angle(angle=math.radians(50))
 ob=bpy.data.objects.new('AMG__jamb %s %s'%(tag,which),me);scene.collection.objects.link(ob);ob.parent=root
# ---------------------------------------------------------------------------------------------------------------------
# Inside, the free model is a bare skin: wherever the W213 cabin does not cover it, the seats saw the skin's back (the
# site draws the paint one-sided: a hole to the outside there, elsewhere bare inner skin). Three closures:
#  - lining: every exterior face whose cabin side is seen from a seat, from outside through the glass or from an open
#    front door's opening (rays from those eyes, the cabin and the body as occluders, the glass not; the body's faces
#    with the front doors taken away, the doors' faces with them shut and open) is lined 3 mm inside it, a dark matte
#    trim, above the side windows' top (z > 1.2) the headliner microfibre; faces the free model has flipped (parts of
#    the bonnet and boot) are lined on their cabin side all the same. The doors' linings ride with the doors;
#  - door sills: between the cabin floor's edge (|y| 0.80) and the body's outer sill there was nothing, a hole to the
#    ground: a satin aluminium scuff plate runs along each side's door openings, 15 mm under the doors' bottoms;
#  - door glass: see below.
import re as _re
GLASSN={'windows','glass','glass.001','AMG window glass','AMG mirror glass'}
def build_occ(skip):
 vs=[];ps=[]
 for o in [o for o in scene.objects if o.type=='MESH']:
  if o.name.endswith('__glass') or o in skip:continue
  M=o.matrix_world;b=len(vs);names=[m.name if m else '' for m in o.data.materials]
  vs.extend(M@v.co for v in o.data.vertices)
  for p in o.data.polygons:
   if names and names[p.material_index] in GLASSN:continue
   ps.append([b+i for i in p.vertices])
 return BVHTree.FromPolygons(vs,ps)
# eyes: the four seats, the cabin's middle at three heights, outside looking in through the glass, and in the front
# door openings (the doors open there)
EYES=[Vector(p) for p in ((.08,-.37,1.13),(.08,.37,1.13),(.9,-.35,1.05),(.9,.35,1.05),(-.1,0,1.1),(.5,0,1.15),(.08,-.37,.85),(.08,.37,.85),
 (.3,0,1.1),(-.3,0,1.15),(.1,0,1.27),(1.0,0,1.2),(.6,0,.8),(0,-2.4,1.1),(0,2.4,1.1),(-3.2,0,1.3),(3.6,0,1.3),(.4,-2.0,1.6),(.4,2.0,1.6),(.6,-2.1,1.0),(.6,2.1,1.0))]
EYES_OPEN=EYES+[Vector((x,s*y,z)) for s in (-1,1) for x,y,z in ((-.3,1.6,.9),(.4,1.7,.8),(-.6,1.4,.5),(.2,1.25,.6),(-.5,1.2,1.0))]
lin=flat_material('AMG cabin liner',(.0105,.011,.0115),.85)
headm=bpy.data.materials['AMG fabric']
def exterior(o):
 n=o.name
 return (n.startswith('AMG__') and not n.startswith('AMG__jamb')) or _re.search(r'__(skin|belt|sail)$',n) is not None
def visible_faces(o,occ,eyes,keep):
 """Faces of o whose cabin-facing side some eye sees: index -> +1 (the face's normal points away from the cabin) or -1
 (the model has it flipped)."""
 M=o.matrix_world;N=M.to_3x3();names=[m.name if m else '' for m in o.data.materials]
 for p in o.data.polygons:
  if p.index in keep or (names and names[p.material_index] in GLASSN):continue
  c=M@p.center
  if not (-1.35<c.x<1.95 and abs(c.y)<1.05 and .15<c.z<1.55):continue
  n=(N@p.normal).normalized();ax=Vector((min(1.3,max(-.9,c.x)),0,.85));sg=1 if n.dot(c-ax)>0 else -1;n=n*sg
  # (the centre and the corners pulled 15 % in: a big face half hidden behind a trim still shows its edge)
  pts=[c]+[c+(M@o.data.vertices[i].co-c)*.85 for i in p.vertices];seen=False
  for q in pts:
   s=q-n*.0015
   for e in eyes:
    d=e-s
    if d.dot(n)>=0:continue
    dist=d.length;h=occ.ray_cast(s,d/dist,dist-.01)
    if h[0] is None:seen=True;break
   if seen:break
  if seen:keep[p.index]=sg
door_objs={g.name:g for g in scene.objects if g.name.startswith('AMG door ')}
fronts=[door_objs['AMG door L front'],door_objs['AMG door R front']]
front_kids={c for g in fronts for c in g.children_recursive}
ext=[o for o in scene.objects if o.type=='MESH' and exterior(o)]
keeps={o:{} for o in ext}
occA=build_occ(front_kids)
for o in ext:
 if not (o.parent and o.parent.name.startswith('AMG door ')):visible_faces(o,occA,EYES_OPEN,keeps[o])
occB=build_occ(set())
for o in ext:
 if o.parent and o.parent.name.startswith('AMG door '):visible_faces(o,occB,EYES,keeps[o])
for g in fronts:g.rotation_euler.z=1.12*(-1 if ' L ' in g.name else 1)
bpy.context.view_layer.update();occC=build_occ(set())
for o in ext:
 if o.parent in fronts:visible_faces(o,occC,EYES_OPEN,keeps[o])
for g in fronts:g.rotation_euler.z=0
bpy.context.view_layer.update()
lined=0;liners=[]
for o in ext:
 keep=keeps[o]
 if not keep:continue
 M=o.matrix_world;me=o.data.copy();bm=bmesh.new();bm.from_mesh(me);bm.faces.ensure_lookup_table()
 flip=[bm.faces[i] for i,sg in keep.items() if sg<0]
 bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index not in keep],context='FACES')
 if flip:bmesh.ops.reverse_faces(bm,faces=[f for f in flip if f.is_valid])
 bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
 bm.transform(M);bm.normal_update()
 for v in bm.verts:v.co-=v.normal*.003
 bmesh.ops.reverse_faces(bm,faces=bm.faces[:])
 uvl=bm.loops.layers.uv.active or bm.loops.layers.uv.new('UVMap')
 for f in bm.faces:
  f.material_index=1 if f.calc_center_median().z>1.2 else 0;f.smooth=True
  for l in f.loops:l[uvl].uv=(l.vert.co.x/.12,l.vert.co.y/.12)
 grp=o.parent if o.parent and o.parent.name.startswith('AMG door ') else None
 if grp:bm.transform(grp.matrix_world.inverted())
 lm=bpy.data.meshes.new(o.name+' liner');bm.to_mesh(lm);bm.free();lm.materials.clear();lm.materials.append(lin);lm.materials.append(headm)
 lo=bpy.data.objects.new('W213 liner '+o.name,lm);scene.collection.objects.link(lo)
 if grp:lo.name=grp.name.replace('AMG door ','AMG_door_').replace(' ','_')+'__liner_'+o.name.split('__')[-1];lo.parent=grp
 else:lo.parent=root;lo.matrix_parent_inverse=root.matrix_world.inverted()
 lined+=len(keep);liners.append(lo.name)
print('PREP lining faces',lined,'(flipped in the model',sum(1 for o in ext for s in keeps[o].values() if s<0),') objects',len(liners))
# door sills: per side, along both door openings, from the cabin floor's edge out to the body's outer sill
plates=0
for side in (-1,1):
 tag='L' if side<0 else 'R'
 sk=[v for wh in ('front','rear') for o in bpy.data.objects[f'AMG door {tag} {wh}'].children if o.type=='MESH' and o.name.endswith('__skin') for v in [o.matrix_world@q.co for q in o.data.vertices]]
 # (from the hinge pillar's foot to the rear opening's end)
 x0_=min(v.x for v in sk)-.04;x1_=max(v.x for v in sk)+.01;xs_=[x0_+(x1_-x0_)*k/124 for k in range(125)]
 bottom=[]
 for x in xs_:
  zz=[v.z for v in sk if abs(v.x-x)<.02];bottom.append(min(zz) if zz else (bottom[-1] if bottom else .33))
 for _ in range(4):bottom=[bottom[0]]+[(bottom[k-1]+bottom[k]*2+bottom[k+1])/4 for k in range(1,len(bottom)-1)]+[bottom[-1]]
 bm=bmesh.new();uvl=bm.loops.layers.uv.new('UVMap');cols=[]
 for x,zb in zip(xs_,bottom):
  zp=min(.33,zb)-.015
  prof=[(.785,zp-.012),(.79,zp-.001),(.80,zp),(.905,zp),(.92,zp-.006),(.935,zp-.03),(.945,zp-.09)]
  cols.append([bm.verts.new(Vector((x,side*py,pz))) for py,pz in prof])
 for k in range(len(cols)-1):
  for j in range(len(cols[k])-1):
   q=(cols[k][j],cols[k+1][j],cols[k+1][j+1],cols[k][j+1]);f=bm.faces.new(q);f.smooth=True;f.normal_update()
   c=f.calc_center_median()
   if f.normal.dot(Vector((0,side*-.4,1)))<0:f.normal_flip()
   for l in f.loops:l[uvl].uv=(l.vert.co.x/.2,l.vert.co.y/.2)
   plates+=1
 pm=bpy.data.meshes.new(f'AMG sill plate {tag}');bm.to_mesh(pm);bm.free();pm.materials.append(alu);pm.shade_smooth();pm.set_sharp_from_angle(angle=math.radians(40))
 po=bpy.data.objects.new(f'W213 sill plate {tag}',pm);scene.collection.objects.link(po);po.parent=root;po.matrix_parent_inverse=root.matrix_world.inverted()
print('PREP sill plates faces',plates)
# kick panels: in front of each front door opening, inboard of the hinge pillar, the footwell's side was open down into
# the front wheel arch: a lined panel closes it, from the pillar's inboard edge to the footwell, sill to under the dash
for side in (-1,1):
 g=bpy.data.objects['AMG door %s front'%('L' if side<0 else 'R')];p=g.matrix_world.translation;x=p.x-.031
 bm=bmesh.new();q=[bm.verts.new(Vector((x,side*yy,zz))) for yy,zz in ((.70,.27),(abs(p.y)-.078,.27),(abs(p.y)-.078,.62),(.70,.62))]
 f=bm.faces.new(q);f.normal_update()
 if f.normal.x<0:f.normal_flip()
 km=bpy.data.meshes.new('AMG kick panel');bm.to_mesh(km);bm.free();km.materials.append(lin)
 ko=bpy.data.objects.new('W213 kick panel %s'%('L' if side<0 else 'R'),km);scene.collection.objects.link(ko);ko.parent=root;ko.matrix_parent_inverse=root.matrix_world.inverted()
# parcel shelf: the AMG is a liftback and the W213 a saloon, so behind the rear seats' backs (x 1.36, z 0.99) there was
# nothing down to the boot floor under the rear window: the cabin looked into an empty boot. A carpeted shelf runs
# from the seats' top back to just under the rear window's lower edge, wall to wall (found by rays at each station)
bpy.context.view_layer.update();dg_=bpy.context.evaluated_depsgraph_get()
def wall(x,z,side):
 o_=Vector((x,0,z))
 for _ in range(6):
  ok_,loc,nrm,idx,ob,mx=scene.ray_cast(dg_,o_,Vector((0,side,0)))
  if not ok_:return .56
  mn=ob.data.materials[ob.data.polygons[idx].material_index].name if ob.data.materials else ''
  if mn in GLASSN or ob.name.endswith('__glass'):o_=loc+Vector((0,side*.002,0));continue
  return abs(loc.y)-.004
 return .56
SX0,SX1,SZ0,SZ1=1.36,2.055,.99,1.064
bm=bmesh.new();uvl=bm.loops.layers.uv.new('UVMap');rows_=[]
for k in range(35):
 x=SX0+(SX1-SX0)*k/34;z=SZ0+(SZ1-SZ0)*k/34;hw=min(wall(x,z,1),wall(x,z,-1),.56)
 rows_.append([bm.verts.new(Vector((x,hw*(2*j/16-1),z))) for j in range(17)])
for k in range(34):
 for j in range(16):
  f=bm.faces.new((rows_[k][j],rows_[k][j+1],rows_[k+1][j+1],rows_[k+1][j]));f.normal_update()
  if f.normal.z<0:f.normal_flip()
  for l in f.loops:l[uvl].uv=(l.vert.co.x/.12,l.vert.co.y/.12)
sm_=bpy.data.meshes.new('AMG parcel shelf');bm.to_mesh(sm_);bm.free();sm_.materials.append(bpy.data.materials['AMG fabric']);sm_.shade_smooth()
so_=bpy.data.objects.new('W213 parcel shelf',sm_);scene.collection.objects.link(so_);so_.parent=root;so_.matrix_parent_inverse=root.matrix_world.inverted()
print('PREP parcel shelf, half widths',round(min(abs(v.co.y) for v in sm_.vertices),3),round(max(abs(v.co.y) for v in sm_.vertices),3))
# door glass: the free model's panes are flat (only leaning in), their lower edge 1 cm under the belt; lowered straight
# down their in-leaning top came out through the card. Each pane is bent (in section) onto the arc through its top
# edge, its bottom edge at the belt slot and a point inside the door, half way between the card and the skin, a pane's
# height under the belt; its origin goes to the arc's centre, so the site lowers it by turning it about that centre:
# it slides along its own arc through the slot into the door (the visible pane moves by millimetres)
door_objs={g.name:g for g in scene.objects if g.name.startswith('AMG door ')}
for gname,g in door_objs.items():
 for o in [o for o in g.children if o.type=='MESH' and o.name.endswith('__glass')]:
  M=o.matrix_world;Mi=M.inverted();W=[M@v.co for v in o.data.vertices];side=1 if sum(p.y for p in W)>0 else -1
  xm_=sorted(p.x for p in W)[len(W)//2];sec=[p for p in W if abs(p.x-xm_)<.03]
  Tp=max(sec,key=lambda p:p.z);Sp=min(sec,key=lambda p:p.z)
  T2=Vector((abs(Tp.y),Tp.z));S2=Vector((abs(Sp.y),Sp.z));H=T2.y-S2.y
  zL=S2.y-H-.02
  shell=[c for c in g.children if c.type=='MESH' and c.name.endswith('__inner')];skin=[c for c in g.children if c.type=='MESH' and c.name.endswith('__skin')]
  def first_hit(objs,orig,dirv):
   best=None
   for c in objs:
    Mi_=c.matrix_world.inverted();ok_,loc,nrm,_=c.ray_cast(Mi_@orig,(Mi_.to_3x3()@dirv).normalized(),distance=2.0)
    if ok_:
     wl=c.matrix_world@loc
     if best is None or (wl-orig).length<(best-orig).length:best=wl
   return best
  hc=first_hit(shell,Vector((xm_,0,zL)),Vector((0,side,0)));hs=first_hit(skin,Vector((xm_,side*1.6,zL)),Vector((0,-side,0)))
  uc_=abs(hc.y) if hc else S2.x;us_=abs(hs.y) if hs else S2.x+.08
  L2=Vector(((uc_+us_)/2,zL))
  # circle through T2, S2, L2
  ax_,ay_=T2;bx_,by_=S2;cx_,cy_=L2;dd=2*(ax_*(by_-cy_)+bx_*(cy_-ay_)+cx_*(ay_-by_))
  ux=((ax_*ax_+ay_*ay_)*(by_-cy_)+(bx_*bx_+by_*by_)*(cy_-ay_)+(cx_*cx_+cy_*cy_)*(ay_-by_))/dd
  uy=((ax_*ax_+ay_*ay_)*(cx_-bx_)+(bx_*bx_+by_*by_)*(ax_-cx_)+(cx_*cx_+cy_*cy_)*(bx_-ax_))/dd
  C2=Vector((ux,uy));R_=(T2-C2).length
  aS=math.atan2(S2.y-C2.y,S2.x-C2.x);aT=math.atan2(T2.y-C2.y,T2.x-C2.x)
  # bend: a vertex at height z keeps its offset from the pane's (straight) section line, laid onto the arc
  for v in o.data.vertices:
   p=M@v.co;t=(p.z-S2.y)/H;lu=S2.x+(T2.x-S2.x)*t;du=abs(p.y)-lu
   a_=aS+(aT-aS)*t;q=C2+R_*Vector((math.cos(a_),math.sin(a_)))
   v.co=Mi@Vector((p.x,side*(q.x+du),q.y))
  o.data.update()
  cw=Vector((xm_,side*C2.x,C2.y));cl=o.matrix_world.inverted()@cw
  o.data.transform(Matrix.Translation(-cl));o.matrix_world=o.matrix_world@Matrix.Translation(cl)
  print('PREP glass arc',o.name,'centre',tuple(round(v,3) for v in cw),'radius',round(R_,3),'slot',tuple(round(v,3) for v in S2),'deep point',tuple(round(v,3) for v in L2),'card/skin',round(uc_,3),round(us_,3))
# The source's colours where they read wrong: its rubber is a light brown (a procedural dust mix the glTF export flattens
# to its dust layer), the mirror indicators and bumper side markers glowing orange glass even when off (smoked amber
# lenses here). Each becomes one plain Principled surface. (The cabin's leather, 'AMG leather', comes with the W213 cabin.)
def finish(name,srgb,rough,metal=0.0):
 m=bpy.data.materials[name];t=m.node_tree;t.nodes.clear()
 n=t.nodes.new('ShaderNodeBsdfPrincipled');t.links.new(n.outputs[0],t.nodes.new('ShaderNodeOutputMaterial').inputs['Surface'])
 n.inputs['Base Color'].default_value=(*Color([int(srgb[i:i+2],16)/255 for i in (1,3,5)]).from_srgb_to_scene_linear(),1)
 n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal
for name,srgb,rough in (('Front Tire','#141415',.9),('Front Tire.001','#2b2b2c',.82),('mirror','#3a1d0b',.12),('headlight.002','#3a1d0b',.12)):finish(name,srgb,rough)
# the side skirts' chrome insert, a mirror right over the floor, ran as a white line along the sills: satin aluminium
sill=flat_material('AMG sill trim',(.42,.43,.44),.38);_sb=next(n for n in sill.node_tree.nodes if n.type=='BSDF_PRINCIPLED');_sb.inputs['Metallic'].default_value=1
for i,m in enumerate(part('side.001').data.materials):
 if m and m.name=='chrome':part('side.001').data.materials[i]=sill
# every material two-sided: the W213 cabin came from a game with its materials one-sided, so on the site any cabin part
# seen from behind (a trim's edge, the dash's underside, a door piece from the hinge side) was a hole
for _m in bpy.data.materials:_m.use_backface_culling=False
if RIGGED:bpy.ops.wm.save_as_mainfile(filepath=RIGGED)
bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',export_draco_mesh_compression_enable=False,export_animations=False,export_skins=False)
print('PREP exported',OUT)
