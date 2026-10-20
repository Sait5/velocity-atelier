"""Aston Martin Valhalla (Ddiaz Design, Sketchfab): bring the model to the site's scale and axes (metres, front -x,
driver -y) and rig independent door and wheel groups. The source is modelled at 1:100 with front -y and the driver's
(left) side +x. Its body panels are separate pieces, so each door is gathered from whole pieces, listed in
tools/source-assets/cars/valhalla-door-pieces.json (made by tools/match-valhalla-doors.py against the door and body
meshes of the "Aston Martin Valhalla" BeamNG mod by S7471C, whose doors open in the game): the side skin, the door's
half of the roof (the Valhalla's dihedral doors cut into the roof), the door card, glass and mirror. The hinge axis
runs through the mod's two hinge nodes at the door's front top corner.
Usage: blender -b blender-cars/backups/valhalla-original.blend --python tools/prepare-valhalla-model.py -- <out.glb> [<rigged.blend>]
(the source as imported from the glb; blender-cars/valhalla.blend is the animated result)"""
import bpy,bmesh,sys,math
from mathutils import Matrix,Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
OUT=args[0];RIGGED=args[1] if len(args)>1 else None
S=100
R=Matrix.Rotation(-math.pi/2,4,'Z')
# the mod's hinge nodes (source axes); the door group sits on the first, app/three/valhalla.ts turns it about the line
# through both
HINGE=Vector((.742,-1.0631,.7768));HINGE_B=Vector((.8351,-1.0777,.6916))
import json,os
PIECES=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'source-assets','cars','valhalla-door-pieces.json')))
WHEEL_PART=('polySurface','SM_Hub_','SM_Disk_')
CALIPER='SM_Brake_'
sources=[o for o in bpy.context.scene.objects if o.type=='MESH']
worlds={o.name:Matrix.Scale(S,4)@o.matrix_world for o in sources}
def components(o):
 """Faces of o grouped into vertex-connected pieces, with each piece's world bounds (source axes, metres)."""
 me=o.data;parent=list(range(len(me.vertices)))
 def find(a):
  while parent[a]!=a:parent[a]=parent[parent[a]];a=parent[a]
  return a
 for p in me.polygons:
  r=find(p.vertices[0])
  for v in p.vertices[1:]:
   q=find(v)
   if q!=r:parent[q]=r
 M=worlds[o.name];world=[M@v.co for v in me.vertices];groups={}
 for p in me.polygons:
  g=groups.setdefault(find(p.vertices[0]),[[],Vector((99,99,99)),Vector((-99,-99,-99))])
  g[0].append(p.index)
  for v in p.vertices:
   w=world[v]
   for i in range(3):g[1][i]=min(g[1][i],w[i]);g[2][i]=max(g[2][i],w[i])
 return list(groups.values())
def needle(o,faces,lo,hi):
 M=worlds[o.name];me=o.data;area=0
 for f in faces:
  P=[M@me.vertices[v].co for v in me.polygons[f].vertices]
  for k in range(1,len(P)-1):area+=(P[k]-P[0]).cross(P[k+1]-P[0]).length/2
 L=(hi-lo).length
 return L>.06 and area/L<.0012
# The lamps share one material front and rear, and the headlamp covers share the windows' tinted glass: both are split
# by position so the runtime can light the tail apart from the front and keep the lamp covers clear.
def split_material(o,name,new_name,keep):
 me=o.data;names=[m.name if m else '' for m in me.materials]
 if name not in names:return
 k=names.index(name);M=worlds[o.name];faces=[p for p in me.polygons if p.material_index==k and keep(M@p.center)]
 if not faces:return
 mat=bpy.data.materials.get(new_name) or me.materials[k].copy()
 mat.name=new_name
 if new_name not in [m.name for m in me.materials if m]:me.materials.append(mat)
 j=[m.name if m else '' for m in me.materials].index(new_name)
 for p in faces:p.material_index=j
for o in sources:
 split_material(o,'AMAT_Light1','Valhalla tail lamp',lambda c:c.y>0)
 split_material(o,'AMAT_Glass_005','Valhalla lamp glass',lambda c:c.y<-1.5)
# wheel centres from the tyres
centres=[]
corner=lambda c:(c.y<0,c.x>0)
spans={}
for o in sources:
 if 'polySurface' not in o.name:continue
 for faces,lo,hi in components(o):
  c=(lo+hi)/2;k=corner(c);s=spans.setdefault(k,[Vector((99,99,99)),Vector((-99,-99,-99))])
  for i in range(3):s[0][i]=min(s[0][i],lo[i]);s[1][i]=max(s[1][i],hi[i])
# site order: 0,1 front, 2,3 rear; within an axle the driver's side (source +x) first
for front in (True,False):
 for left in (True,False):
  lo,hi=spans[(front,left)];centres.append((lo+hi)/2)
root=bpy.data.objects.new('Aston Martin Valhalla',None);bpy.context.scene.collection.objects.link(root)
def group(name,point):
 o=bpy.data.objects.new(name,None);bpy.context.scene.collection.objects.link(o);o.parent=root;o.location=point;return o
wheels=[group('Valhalla wheel '+str(i),(R@c).to_3d()) for i,c in enumerate(centres)]
# The wheels sit with the authored camber, 1.5 degrees in front and 1.0 at the rear (tyre, rim and the flat brake-disc
# faces all agree; no toe): each group is turned onto its true axle (its y axis here, z in three.js), so it spins true.
# The tread-edge fit in app/three/wheelAxis.ts reads this tyre's asymmetric tread as 0.5 and 0.2 degrees, so the site
# skips it for this car.
for i,w in enumerate(wheels):
 w.rotation_euler=(math.radians(1.5 if i<2 else 1.0)*(1 if w.location.y>0 else -1),0,0)
bpy.context.view_layer.update()
mirror=lambda v,side:Vector((v.x*side,v.y,v.z))
doors={side:group('Valhalla door '+('L' if side>0 else 'R'),(R@mirror(HINGE,side)).to_3d()) for side in (1,-1)}
# the parts are baked into their group's frame below: the groups' world matrices must be current
bpy.context.view_layer.update()
counts={}
for source in sources:
 world=worlds[source.name];partitions={}
 for faces,lo,hi in components(source):
  c=(lo+hi)/2
  # a piece is known by its source object and its lowest vertex index
  door=PIECES.get(source.name,{}).get(str(min(v for f in faces for v in source.data.polygons[f].vertices)))
  if any(k in source.name for k in WHEEL_PART):target=wheels[min(range(4),key=lambda i:(centres[i]-c).length)]
  elif CALIPER in source.name:target=root
  # the door's inner lower edge ends in the same kind of loose hem triangles: dropped too
  elif door and len(faces)<=8 and c.z<.5 and abs(c.x)<.8:continue
  elif door:target=doors[1 if door=='L' else -1]
  # the sill's lower edge under the door ends in a row of loose triangles (the game's hem), covered by the door's
  # bottom panel while it is shut and a saw-tooth once it rises: dropped
  elif len(faces)<=4 and -1.05<c.y<.45 and .6<abs(c.x)<.85 and c.z<.26:continue
  # lone needle triangles (up to 18 cm long, under a millimetre wide) hang in the air as hairlines: dropped
  elif len(faces)<=2 and needle(source,faces,lo,hi):continue
  else:target=root
  partitions.setdefault(target,[]).extend(faces)
 for target,faces in partitions.items():
  data=source.data.copy()
  original=[n.vector.copy() for n in source.data.corner_normals]
  if len(faces)<len(source.data.polygons):
   ids=data.attributes.new('source_loop','INT','CORNER')
   for i,item in enumerate(ids.data):item.value=i
   bm=bmesh.new();bm.from_mesh(data);keep=set(faces);bm.faces.ensure_lookup_table()
   bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index not in keep],context='FACES')
   bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(data);bm.free()
   loops=[item.value for item in data.attributes['source_loop'].data]
   data.attributes.remove(data.attributes['source_loop'])
  else:loops=list(range(len(original)))
  bake=(target.matrix_world.inverted() if target is not root else Matrix())@R@world
  data.transform(bake)
  normal_matrix=bake.to_3x3().inverted().transposed()
  data.normals_split_custom_set([(normal_matrix@original[i]).normalized() for i in loops])
  name='Valhalla__'+source.name.replace('A:SM_','').split('_0000_001')[0]
  if target is not root:name=target.name.replace(' ','_')+'__'+name
  o=bpy.data.objects.new(name,data);bpy.context.scene.collection.objects.link(o);o.parent=target
  counts[target.name]=counts.get(target.name,0)+len(data.polygons)
 bpy.data.objects.remove(source,do_unlink=True)
for o in list(bpy.data.objects):
 if o.type=='EMPTY' and o!=root and o.parent is None:bpy.data.objects.remove(o,do_unlink=True)
bpy.context.view_layer.update()
# One object per group and material set (the door glass stays apart: the windows move it).
batches={}
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 mats=tuple(m.name if m else '' for m in o.data.materials)
 glass=o.parent in doors.values() and mats==('AMAT_Glass_005',)
 batches.setdefault((o.parent.name,mats,glass),[]).append(o)
for (parent,mats,glass),parts in batches.items():
 if len(parts)>1:
  with bpy.context.temp_override(active_object=parts[0],selected_editable_objects=parts,object=parts[0]):bpy.ops.object.join()
 parts[0].name=(parent.replace(' ','_')+('__glass' if glass else '__'+'_'.join(m.replace('AMAT_','').replace('Aston_Martin_Valhalla_','') for m in mats)))[:60]
print('RIG objects',len([o for o in bpy.context.scene.objects if o.type=='MESH']))
# The game never opens these doors, so the hinge corner is unfinished. Two passes, both on what the shut door hides
# (at most two of 26 viewpoints round the car see it, through a panel gap):
#  - the door's own hinge-corner pieces that cut into the wing and the A-pillar root as the door rises are dropped;
#  - the hinge pocket's faces (the wing's raw inner flange, green, and loose trim) take one dark matte finish, so the
#    pocket reads as a dark recess once the door is up instead of green and black shards. The finish is matte black
#    (app/three/valhalla.ts also turns its reflections off): any lighter tone showed the game's rough triangles there.
from mathutils.bvhtree import BVHTree
OPEN=1.15
def world_tris(objs):
 V=[];T=[]
 for o in objs:
  M=o.matrix_world;b=len(V);V+=[M@v.co for v in o.data.vertices];T+=[[b+i for i in p.vertices] for p in o.data.polygons]
 return V,T
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
body_objs=[o for o in meshes if o.parent==root];door_objs={s:[o for o in meshes if o.parent==g] for s,g in doors.items()}
V,T=world_tris(body_objs);body_tree=BVHTree.FromPolygons(V,T)
V,T=world_tris(meshes);all_tree=BVHTree.FromPolygons(V,T)
views=[Vector((math.cos(a)*6,math.sin(a)*6,h)) for a in [i*2*math.pi/13 for i in range(13)] for h in (.6,2.5)]
def hidden(points,need=3):
 # seen through a panel gap from one or two viewpoints (need-1) still counts as hidden
 for p in points:
  seen=0
  for v in views:
   d=v-p;L=d.length;d.normalize()
   if all_tree.ray_cast(p+d*.002,d,L)[0] is None:
    seen+=1
    if seen>=need:return False
 return True
pocket=bpy.data.materials.new('Valhalla hinge pocket');pocket.use_nodes=True;_t=pocket.node_tree;_t.nodes.clear()
_b=_t.nodes.new('ShaderNodeBsdfPrincipled');_o=_t.nodes.new('ShaderNodeOutputMaterial');_t.links.new(_b.outputs[0],_o.inputs[0])
_b.inputs['Base Color'].default_value=(.004,.004,.0045,1);_b.inputs['Roughness'].default_value=1;_b.inputs['Metallic'].default_value=0;pocket.diffuse_color=(.004,.004,.0045,1)
dropped=shaded=0
for side,g in doors.items():
 axis=(R.to_3x3()@(mirror(HINGE_B,side)-mirror(HINGE,side))).normalized();pivot=g.matrix_world.translation
 turns=[Matrix.Translation(pivot)@Matrix.Rotation(OPEN*f*side,4,axis)@Matrix.Translation(-pivot) for f in (.2,.4,.6,.8,1.0)]
 for o in door_objs[side]:
  me=o.data;M=o.matrix_world;parent=list(range(len(me.vertices)))
  def find(q):
   while parent[q]!=q:parent[q]=parent[parent[q]];q=parent[q]
   return q
  for e in me.edges:
   a,b=find(e.vertices[0]),find(e.vertices[1])
   if a!=b:parent[a]=b
  comp={}
  for p in me.polygons:comp.setdefault(find(p.vertices[0]),[]).append(p.index)
  W=[M@v.co for v in me.vertices];kill=[];shade=[]
  cuts=lambda polys:any(BVHTree.FromPolygons([t@w for w in W],polys).overlap(body_tree) for t in turns)
  for faces in comp.values():
   centres=[M@me.polygons[f].center for f in faces]
   if sum(c.x for c in centres)/len(centres)<-.7 and hidden(centres[::max(1,len(faces)//24)]):
    if cuts([list(me.polygons[f].vertices) for f in faces]):kill+=faces
    continue
   # a piece the shut door shows (its skin): only its hidden faces at the front edge, face by face; those that cut
   # into the wing go, the rest (the skin's raw inner flange, green from inside) take the pocket's dark finish
   for f,c in zip(faces,centres):
    if c.x>-.85 or not hidden([c]):continue
    if cuts([list(me.polygons[f].vertices)]):kill.append(f)
    else:shade.append(f)
  if shade:
   if 'Valhalla hinge pocket' not in [m.name for m in me.materials if m]:me.materials.append(pocket)
   k=[m.name if m else '' for m in me.materials].index('Valhalla hinge pocket')
   for f in shade:me.polygons[f].material_index=k
  if kill:
   bm=bmesh.new();bm.from_mesh(me);bm.faces.ensure_lookup_table();ks=set(kill)
   bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index in ks],context='FACES');bm.to_mesh(me);bm.free();dropped+=len(kill)
  shaded+=len(shade)
print('RIG hinge corner: door faces dropped',dropped,'darkened',shaded)
dark=0
for o in body_objs:
 me=o.data;M=o.matrix_world;faces=[]
 for p in me.polygons:
  c=M@p.center
  if not(-1.07<c.x<-.75 and .62<abs(c.y)<1.02 and .4<c.z<.86):continue
  # hidden by the shut door, or the wing's shut-line flange that faces back into the opening (dark on the real car too)
  n=(M.to_3x3()@p.normal).normalized();inward=Vector((0,-1 if c.y>0 else 1,0))
  if hidden([c]) or n.x>.45 or n.dot(inward)>.45:faces.append(p)
 if not faces:continue
 if 'Valhalla hinge pocket' not in [m.name for m in me.materials if m]:me.materials.append(pocket)
 k=[m.name if m else '' for m in me.materials].index('Valhalla hinge pocket')
 for p in faces:p.material_index=k
 dark+=len(faces)
print('RIG hinge pocket darkened',dark,'faces')
# The paint skin's turned-in flanges face into the car, so the lining below (pushed back along their normals) ends up
# behind them: from the cabin, with the door up, they showed as green slivers. Hidden while shut, they go dark too.
flanges=0
for side,g in doors.items():
 for o in door_objs[side]:
  me=o.data;names=[m.name if m else '' for m in me.materials]
  if 'AMAT_Aston_Martin_Valhalla_032' not in names:continue
  k=names.index('AMAT_Aston_Martin_Valhalla_032');M=o.matrix_world;N=M.to_3x3()
  # the car's inside is +y from the left door (side 1), -y from the right one
  faces=[p for p in me.polygons if p.material_index==k and (N@p.normal).normalized().y*side>.3 and hidden([M@p.center])]
  if not faces:continue
  if 'Valhalla hinge pocket' not in [m.name for m in me.materials if m]:me.materials.append(pocket)
  j=[m.name if m else '' for m in me.materials].index('Valhalla hinge pocket')
  for p in faces:p.material_index=j
  flanges+=len(faces)
print('RIG door skin flanges darkened',flanges)
# The doors are hollow shells: under the raised door, or past its edges, the green paint skin showed from inside. Each
# door's paint skin gets a dark lining 3 mm inside it, facing inward: from inside the door the lining is what shows;
# from outside it sits behind the skin.
lining=bpy.data.materials.new('Valhalla door lining');lining.use_nodes=True;_t=lining.node_tree;_t.nodes.clear()
_b=_t.nodes.new('ShaderNodeBsdfPrincipled');_o=_t.nodes.new('ShaderNodeOutputMaterial');_t.links.new(_b.outputs[0],_o.inputs[0])
_b.inputs['Base Color'].default_value=(.004,.004,.0045,1);_b.inputs['Roughness'].default_value=1;_b.inputs['Metallic'].default_value=0;lining.diffuse_color=(.004,.004,.0045,1)
lined=0
for side,g in doors.items():
 for o in door_objs[side]:
  names=[m.name if m else '' for m in o.data.materials]
  if 'AMAT_Aston_Martin_Valhalla_032' not in names:continue
  k=names.index('AMAT_Aston_Martin_Valhalla_032')
  bm=bmesh.new();bm.from_mesh(o.data);bm.faces.ensure_lookup_table()
  bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.material_index!=k],context='FACES')
  bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
  bm.normal_update()
  for v in bm.verts:v.co-=v.normal*.003
  bmesh.ops.reverse_faces(bm,faces=bm.faces[:])
  data=bpy.data.meshes.new(g.name.replace(' ','_')+'__lining');bm.to_mesh(data);bm.free()
  data.materials.clear();data.materials.append(lining)
  for p in data.polygons:p.material_index=0
  ob=bpy.data.objects.new(data.name,data);bpy.context.scene.collection.objects.link(ob);ob.parent=g;ob.matrix_world=o.matrix_world.copy()
  lined+=len(data.polygons)
print('RIG door lining',lined,'faces')
# The game never closed the doors' ends: front end, rear end and bottom were open shells with ragged trim inside, and
# raised, the door looked hollow and unattached. The BeamNG mod's doors are built through there (shut faces, the front
# frame with its hinge column, the latch plate; tools/extract-valhalla-door-ends.py): there the Ddiaz pieces that lie
# mostly in those zones out of sight of the shut car make way, whole (cutting them face by face left saw-teeth), and the
# mod's faces the shut car hides come in, in one dark finish, wherever no Ddiaz surface is left within 8 mm.
ENDS=os.path.join(os.path.dirname(os.path.abspath(__file__)),'source-assets','cars','valhalla-door-ends.glb')
def end_zone(s):
 if s.z<.30:return True
 if s.y<-.84 and s.z<.82:return True
 ry=.17+(.39-.17)*(s.z-.235)/(.77-.235) if s.z<.77 else .39+(.43-.39)*(s.z-.77)/(1.10-.77)
 return s.y>ry-.09
source_of=lambda c,side:(lambda s:Vector((s.x*side,s.y,s.z)))(R.inverted()@c)
closure=bpy.data.materials.new('Valhalla door closure');closure.use_nodes=True;_t=closure.node_tree;_t.nodes.clear()
_b=_t.nodes.new('ShaderNodeBsdfPrincipled');_o=_t.nodes.new('ShaderNodeOutputMaterial');_t.links.new(_b.outputs[0],_o.inputs[0])
_b.inputs['Base Color'].default_value=(.004,.004,.0045,1);_b.inputs['Roughness'].default_value=1;_b.inputs['Metallic'].default_value=0;closure.diffuse_color=(.004,.004,.0045,1)
def rebuild_all_tree():
 global all_tree
 V,T=world_tris([o for o in bpy.context.scene.objects if o.type=='MESH']);all_tree=BVHTree.FromPolygons(V,T)
cut=0
for side,g in doors.items():
 for o in [o for o in g.children if o.type=='MESH' and not o.name.endswith('__glass')]:
  me=o.data;M=o.matrix_world;parent=list(range(len(me.vertices)))
  def find(q):
   while parent[q]!=q:parent[q]=parent[parent[q]];q=parent[q]
   return q
  for e in me.edges:
   a,b=find(e.vertices[0]),find(e.vertices[1])
   if a!=b:parent[a]=b
  comp={}
  for p in me.polygons:comp.setdefault(find(p.vertices[0]),[]).append(p.index)
  kill=[]
  for faces in comp.values():
   inside=sum(1 for f in faces if end_zone(source_of(M@me.polygons[f].center,side)) and hidden([M@me.polygons[f].center]))
   if inside>=.7*len(faces):kill+=faces
  if kill:
   bm=bmesh.new();bm.from_mesh(me);bm.faces.ensure_lookup_table();ks=set(kill)
   bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index in ks],context='FACES');bm.to_mesh(me);bm.free();cut+=len(kill)
rebuild_all_tree()
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=ENDS);imported=[o for o in bpy.data.objects if o not in before]
bpy.context.view_layer.update()
added=0
for side,g in doors.items():
 src=next(o for o in imported if o.type=='MESH' and o.name.startswith('door ends '+('L' if side>0 else 'R')))
 me=src.data;M=src.matrix_world;V=[R@(M@v.co) for v in me.vertices]
 V2,T2=world_tris([o for o in g.children if o.type=='MESH']);ddiaz=BVHTree.FromPolygons(V2,T2) if T2 else None
 centre=lambda p:sum((V[i] for i in p.vertices),Vector())/len(p.vertices)
 keep=[list(p.vertices) for p in me.polygons if hidden([centre(p)]) and (ddiaz is None or (ddiaz.find_nearest(centre(p))[3] or 1)>.008)]
 # the mod's front frame was made for its own body: what of it cuts into the wing as the door rises goes
 axis=(R.to_3x3()@(mirror(HINGE_B,side)-mirror(HINGE,side))).normalized();pivot=g.matrix_world.translation;cuts=set()
 for f in [k/20 for k in range(1,21)]:
  t=Matrix.Translation(pivot)@Matrix.Rotation(OPEN*f*side,4,axis)@Matrix.Translation(-pivot)
  cuts|={i for i,j in BVHTree.FromPolygons([t@v for v in V],keep).overlap(body_tree)}
 keep=[k for n,k in enumerate(keep) if n not in cuts]
 used=sorted({i for t in keep for i in t});idx={v:k for k,v in enumerate(used)}
 data=bpy.data.meshes.new(g.name.replace(' ','_')+'__closure');data.from_pydata([V[i] for i in used],[],[[idx[i] for i in t] for t in keep]);data.update()
 data.materials.append(closure)
 # welded (the glb carries the triangles apart) and smooth, with the frame's edges kept sharp: flat triangles read as shards
 bm=bmesh.new();bm.from_mesh(data);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.0003);bm.to_mesh(data);bm.free()
 data.shade_smooth();data.set_sharp_from_angle(angle=math.radians(35))
 ob=bpy.data.objects.new(data.name,data);bpy.context.scene.collection.objects.link(ob);ob.parent=g;ob.matrix_parent_inverse=g.matrix_world.inverted()
 added+=len(keep)
for o in imported:bpy.data.objects.remove(o,do_unlink=True)
print('RIG door ends: Ddiaz faces cut',cut,'mod faces added',added)
# Picking the mod's faces one by one leaves saw-tooth edges: triangles hanging by one edge (two edges free) are taken
# off, round after round, and islands of a few faces with them; only on the mod's ends, the Ddiaz pieces keep their edges.
def erode(o):
 me=o.data;M=o.matrix_world;gone=0
 for _ in range(3):
  bm=bmesh.new();bm.from_mesh(me);bm.faces.ensure_lookup_table()
  ears=[f for f in bm.faces if sum(1 for e in f.edges if len(e.link_faces)==1)>=2]
  seen=set();small=[]
  for f in bm.faces:
   if f.index in seen:continue
   st=[f];seen.add(f.index);isl=[]
   while st:
    x=st.pop();isl.append(x)
    for e in x.edges:
     for y in e.link_faces:
      if y.index not in seen:seen.add(y.index);st.append(y)
   if len(isl)<12:small+=isl
  kill=list({f.index:f for f in ears+small}.values())
  if not kill:bm.free();break
  bmesh.ops.delete(bm,geom=kill,context='FACES');bm.to_mesh(me);bm.free();gone+=len(kill)
 return gone
eroded=0
for side,g in doors.items():
 for o in [o for o in g.children if o.type=='MESH' and o.name.endswith('__closure')]:eroded+=erode(o)
print('RIG door ends: saw-tooth faces taken off',eroded)
# The game never shows the door apertures either: round the openings the Ddiaz body is rough (a stepped sill, angular
# jambs, spikes, the grey underbody showing under the sill). The mod's body is finished there (a smooth sill with the
# seal channel running round the frame, clean jambs; tools/extract-valhalla-apertures.py). Inside each shut door's
# side-view outline, grown by 16 mm, our faces the shut doors hide make way for the mod's (the leather trim and seal,
# glass, calipers and the dark hinge pocket stay), in our carbon, its weave laid on by box projection at the body's own
# scale; a mod face that would sit on one of ours left in place is skipped.
APERTURES=os.path.join(os.path.dirname(os.path.abspath(__file__)),'source-assets','cars','valhalla-apertures.glb')
CELL,GROW,WEAVE=.004,4,84
outline={}
for side,g in doors.items():
 cells=set()
 for o in [o for o in g.children if o.type=='MESH' and not o.name.endswith(('__glass','__Car_Paint3','__Light1'))]:
  W=[o.matrix_world@v.co for v in o.data.vertices]
  for p in o.data.polygons:
   P=[W[i] for i in p.vertices]
   for k in range(1,len(P)-1):
    A,B,C=P[0],P[k],P[k+1];n=max(1,int(max((A-B).length,(B-C).length,(C-A).length)/CELL*2))
    for i in range(n+1):
     for j in range(n+1-i):q=A+(B-A)*(i/n)+(C-A)*(j/n);cells.add((int(q.x//CELL),int(q.z//CELL)))
 outline[side]={(i+di,j+dj) for i,j in cells for di in range(-GROW,GROW+1) for dj in range(-GROW,GROW+1)}
def round_opening(c):
 return -1.0<c.x<.5 and .5<abs(c.y)<1.06 and c.z<1.25 and not(c.x<-.75 and c.z>.4) and (int(c.x//CELL),int(c.z//CELL)) in outline[1 if c.y<0 else -1]
rebuild_all_tree()
swapped=0
for o in [o for o in root.children if o.type=='MESH']:
 me=o.data;M=o.matrix_world;names=[m.name if m else '' for m in me.materials]
 kill={p.index for p in me.polygons if not any(k in names[p.material_index] for k in ('INT1','Glass','Tire','pocket')) and round_opening(M@p.center) and hidden([M@p.center],1)}
 if not kill:continue
 bm=bmesh.new();bm.from_mesh(me);bm.faces.ensure_lookup_table()
 bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index in kill],context='FACES');bm.to_mesh(me);bm.free();swapped+=len(kill)
V2,T2=world_tris([o for o in root.children if o.type=='MESH']);ours=BVHTree.FromPolygons(V2,T2)
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=APERTURES);imported=[o for o in bpy.data.objects if o not in before]
bpy.context.view_layer.update()
src=next(o for o in imported if o.type=='MESH');V=[R@(src.matrix_world@v.co) for v in src.data.vertices]
keep=[]
for p in src.data.polygons:
 c=sum((V[i] for i in p.vertices),Vector())/len(p.vertices)
 if round_opening(c) and hidden([c],1) and (ours.find_nearest(c)[3] or 1)>.003:keep.append(list(p.vertices))
used=sorted({i for t in keep for i in t});idx={v:k for k,v in enumerate(used)}
data=bpy.data.meshes.new('Aston_Martin_Valhalla__aperture');data.from_pydata([V[i] for i in used],[],[[idx[i] for i in t] for t in keep]);data.update()
bm=bmesh.new();bm.from_mesh(data);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.0003);bm.normal_update()
for name in ('UVMap','UVMap.001'):
 uv=bm.loops.layers.uv.new(name)
 for f in bm.faces:
  n=f.normal;a=max(range(3),key=lambda i:abs(n[i]));u,v=[i for i in range(3) if i!=a]
  for l in f.loops:l[uv].uv=(l.vert.co[u]*WEAVE,l.vert.co[v]*WEAVE)
bm.to_mesh(data);bm.free()
data.shade_smooth();data.set_sharp_from_angle(angle=math.radians(35))
data.materials.append(bpy.data.materials['AMAT_Aston_Martin_Valhalla_Carbon1'])
ob=bpy.data.objects.new(data.name,data);bpy.context.scene.collection.objects.link(ob);ob.parent=root
for o in imported:bpy.data.objects.remove(o,do_unlink=True)
print('RIG apertures: our faces swapped out',swapped,'mod faces in',len(keep))
# The jambs and sill round the door apertures end in long, sharp triangles held by one edge (two edges free once
# coincident vertices are welded): with the doors up they hang in the opening as spikes against the floor. Those no
# viewpoint round the shut car sees are taken off, short of the front wheel arch (its liner shows past the arch), twice
# over: taking one can leave the next one hanging.
rebuild_all_tree()
spikes=0
in_aperture=lambda c:-.98<c.x<.55 and .6<abs(c.y)<1.07 and c.z<.8
for o in [o for o in root.children if o.type=='MESH' and 'Tire_Brake' not in o.name]:
 me=o.data;bm=bmesh.new();bm.from_mesh(me);bm.transform(o.matrix_world);src=bm.faces.layers.int.new('src')
 for f in bm.faces:f[src]=f.index
 bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.0001)
 cand=[f for f in bm.faces if len(f.verts)==3 and in_aperture(f.calc_center_median()) and hidden([f.calc_center_median()],1)]
 gone=set()
 for _ in range(2):
  new=set()
  for f in cand:
   if f[src] in gone or sum(1 for e in f.edges if sum(1 for h in e.link_faces if h[src] not in gone)==1)<2:continue
   P=[v.co for v in f.verts]
   if max((P[i]-P[i-1]).length for i in range(3))<.06:continue
   if min(math.degrees((P[(i+1)%3]-P[i]).angle(P[i-1]-P[i],0)) for i in range(3))<30:new.add(f[src])
  if not new:break
  gone|=new
 bm.free()
 if gone:
  bm=bmesh.new();bm.from_mesh(me);bm.faces.ensure_lookup_table()
  bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index in gone],context='FACES');bm.to_mesh(me);bm.free();spikes+=len(gone)
print('RIG aperture spikes taken off',spikes)
# The game model is full of gaps: panel seams, grilles and vents with nothing behind them, slits round the light bar,
# the firewall and the jambs. Against a bright sky every one of them shone through the car. A dark blocker shell goes
# behind them all: the surfaces (glass left out, so the cabin stays open to view) are voxelised at 12 mm, the air round
# the car is flood-filled with the surfaces grown by 2 cells (gaps under ~5 cm are sealed) and grown back by 5 cells, so
# the region's boundary runs 3 cells behind every surface and bridges every sealed gap. Of that boundary only the cells
# some viewpoint sees through the car are kept (round the car, above it, from the seats), merged flat, in the matte
# black of the hinge pocket. The body gets one with the doors away (the door apertures count as outside), each door its
# own, seen on its own from all round.
import numpy as np
# Four detail materials (grille slats, badges, vents, cabin trim, lamp internals) carry an alpha channel that is all but
# opaque, so they went out alpha-blended: drawn without depth, sorted per object, they let what lies behind show
# through. They are opaque.
for name in ('AMAT_Details_EXT1','AMAT_Details_Add_04','AMAT_Details_Add_05','AMAT_Details_Add_07'):
 m=bpy.data.materials.get(name)
 if not m or not m.use_nodes:continue
 for n_ in m.node_tree.nodes:
  if n_.type=='BSDF_PRINCIPLED':
   for l in list(n_.inputs['Alpha'].links):m.node_tree.links.remove(l)
   n_.inputs['Alpha'].default_value=1
 if hasattr(m,'surface_render_method'):m.surface_render_method='DITHERED'
 if hasattr(m,'blend_method'):m.blend_method='OPAQUE'
VOX,SEAL,BACK=.012,2,3
def blocker(objs,occluders,viewpoints,name,parent):
 P=[]
 for o in objs:
  me=o.data;names=[m.name if m else '' for m in me.materials];me.calc_loop_triangles()
  if not len(me.vertices):continue
  co=np.array([o.matrix_world@v.co for v in me.vertices],dtype=np.float32)
  for lt in me.loop_triangles:
   if names and any(s in names[lt.material_index] for s in ('Glass','glass','Trans','Aglass')):continue
   P.append(co[list(lt.vertices)])
 P=np.array(P,dtype=np.float32);lo=P.reshape(-1,3).min(0)-.1;dims=np.ceil((P.reshape(-1,3).max(0)+.1-lo)/VOX).astype(int)+1
 occ=np.zeros(dims,dtype=bool)
 longest=np.stack([np.linalg.norm(P[:,1]-P[:,0],axis=1),np.linalg.norm(P[:,2]-P[:,1],axis=1),np.linalg.norm(P[:,0]-P[:,2],axis=1)],1).max(1)
 N=np.maximum(1,np.ceil(longest/(VOX*.5)).astype(int))
 for n in np.unique(N):
  sel=P[N==n];w=np.array([[1-(i+j)/n,i/n,j/n] for i in range(n+1) for j in range(n+1-i)],dtype=np.float32)
  for s0 in range(0,len(sel),20000):
   idx=np.floor((np.einsum('kb,tbc->tkc',w,sel[s0:s0+20000]).reshape(-1,3)-lo)/VOX).astype(int);occ[idx[:,0],idx[:,1],idx[:,2]]=True
 def grow(m,k):
  for _ in range(k):
   g=m.copy();g[1:]|=m[:-1];g[:-1]|=m[1:];g[:,1:]|=m[:,:-1];g[:,:-1]|=m[:,1:];g[:,:,1:]|=m[:,:,:-1];g[:,:,:-1]|=m[:,:,1:];m=g
  return m
 free=~grow(occ,SEAL);out=np.zeros(dims,dtype=bool);out[0]=out[-1]=True;out[:,0]=out[:,-1]=True;out[:,:,0]=out[:,:,-1]=True;out&=free
 while True:
  g=out.copy();g[1:]|=out[:-1];g[:-1]|=out[1:];g[:,1:]|=out[:,:-1];g[:,:-1]|=out[:,1:];g[:,:,1:]|=out[:,:,:-1];g[:,:,:-1]|=out[:,:,1:];g&=free
  if np.array_equal(g,out):break
  out=g
 out=grow(out,SEAL+BACK)
 V,T=world_tris(occluders);tree=BVHTree.FromPolygons(V,T)
 bm=bmesh.new();h=VOX/2;kept=0
 for ax in range(3):
  A=np.moveaxis(out,ax,0);u,w2=[k for k in range(3) if k!=ax]
  for sgn,m in ((-1,A[:-1]&~A[1:]),(1,~A[:-1]&A[1:])):
   nrm=Vector((0,0,0));nrm[ax]=sgn
   for i,j,k in np.argwhere(m):
    c=Vector((0,0,0));c[ax]=lo[ax]+(i+1)*VOX;c[u]=lo[u]+(j+.5)*VOX;c[w2]=lo[w2]+(k+.5)*VOX
    for v in viewpoints:
     d=v-c
     if d.dot(nrm)<=0:continue
     L=d.length;d/=L
     if tree.ray_cast(c+d*.001,d,L)[0] is None:
      vs=[]
      for du,dw in ((-1,-1),(1,-1),(1,1),(-1,1)):
       p=c.copy();p[u]+=du*h;p[w2]+=dw*h;vs.append(bm.verts.new(p))
      if sgn==-1:vs.reverse()
      bm.faces.new(vs);kept+=1;break
 bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=VOX*.01)
 bmesh.ops.dissolve_limit(bm,angle_limit=.01,verts=bm.verts,edges=bm.edges)
 bm.transform(parent.matrix_world.inverted())
 me=bpy.data.meshes.new(name);bm.to_mesh(me);bm.free();me.materials.append(pocket)
 ob=bpy.data.objects.new(name,me);bpy.context.scene.collection.objects.link(ob);ob.parent=parent
 return kept,len(me.polygons)
ring=lambda c,r,hs:[c+Vector((math.cos(t)*r,math.sin(t)*r,h)) for t in [i*2*math.pi/16 for i in range(16)] for h in hs]
seats=[Vector((.12,s*.33,.98)) for s in (-1,1)]
body=[o for o in root.children if o.type=='MESH']
no_doors=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.parent not in doors.values()]
n,f=blocker(body,no_doors,ring(Vector(),6,(.4,1.2,2.6))+[Vector((0,0,4.5))]+seats,'Aston_Martin_Valhalla__blocker',root)
print('RIG blocker body: cells',n,'faces',f)
for side,g in doors.items():
 objs=[o for o in g.children if o.type=='MESH']
 n,f=blocker(objs,objs,ring(g.matrix_world.translation+Vector((.5,0,-.3)),3,(-1.,.3,1.6))+[g.matrix_world.translation+Vector((.5,0,3))],g.name.replace(' ','_')+'__blocker',g)
 print('RIG blocker',g.name,': cells',n,'faces',f)
if RIGGED:bpy.ops.wm.save_as_mainfile(filepath=RIGGED)
bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',export_draco_mesh_compression_enable=False,export_animations=False,export_skins=False)
print('RIG',counts)
print('RIG wheels',[(w.name,[round(v,3) for v in w.location]) for w in wheels])
print('RIG doors',[(d.name,[round(v,3) for v in d.location]) for d in doors.values()])
