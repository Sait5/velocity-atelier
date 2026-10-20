"""McLaren 750S (geyges, Sketchfab Free Standard): turn the game-rip to the site's axes (front -x, driver -y) and rig
independent door and wheel groups. The source merges all four wheels into a few meshes and spreads each door over
dozens of parts, so both are split by connected pieces and sorted by position.
Usage: blender -b blender-cars/backups/mclaren-original.blend --python tools/prepare-mclaren-model.py -- <out.glb> [<rigged.blend>]
(the source as imported from the glb; blender-cars/mclaren.blend is already the rigged result)"""
import bpy,bmesh,sys,math
from mathutils import Matrix,Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
OUT=args[0];RIGGED=args[1] if len(args)>1 else None
import re
# Source axes: front -y, driver (LHD) +x. Site axes: front -x, driver -y.
R=Matrix.Rotation(-math.pi/2,4,'Z')
WHEEL=re.compile(r'^B_(New_Front_Wheel|New_Back_Wheel|polySurface12766_INSTALOD|NEW_DISK_NOTS|new_screw20|McClaren_2235_3901_STD|polySurface369_dupl2_dupl2)-')
TYRE=re.compile(r'^B_New_(Front|Back)_Wheel-0')
CORE=re.compile(r'B_Door_Dull|2235_2435_|2235_2443_|2235_35(17|19|22|23|24|26|32|35|44|46|50|60|62)|polySurface1275[78]|C_door|C_DDDD|C_DOOR_AAA|Door_Corner_Speaker|C_polySurface127605\.001|2235_24(02|14|28|29|30|32|44|49|50|54|61|65)|DOOR_GRABER|C_pasted__|C_pCube24|C_pCylinder17|C_polySurface4\.001|C_polySurface5-|C_pPlane1\.00[34]|1277205_AAA')
# the door's inner frame and lower inner panel, the window's upper frame, the seals round the door, its rear shut face,
# and the air intake built into the door's tail (duct, shroud and its painted surround). These objects also carry small
# clips and seal pieces of the body round the opening: a small piece goes to whichever it sits on, door or body.
EXTRA=re.compile(r'2235_2397|2235_2409|2235_2398|2235_3488_INSTALOD_INSTALOD_INSTALOD-1|B_pCube6|2235_2746|2235_2737|B_McClaren_2235_7_INSTALOD'
 # the door card's front corner: the pale panel under the window line and the tweeter pod above it. Shut, the door
 # hides them; left on the body they hung beside the dashboard once the door rose
 r'|lwr_facia_fed_lhd_457_LP_6|a_pillar_436__Speaker')
CARD_CORNER='lwr_facia_fed_lhd_457_LP_6'
class _Door:
 def search(self,name):return CORE.search(name) or EXTRA.search(name)
DOOR=_Door()
# One cabin shell piece welds the door's inner window-sill trim (a rail along the window line) to the headliner: only
# that piece is split face by face, the rail band rising with the door and the roof staying. Every other shell piece stays
# whole on the body (cutting them left ragged edges on the pillars and in the door's tail).
FACE_SPLIT=re.compile(r'2235_2409|2235_2397')
def welded_rail(lo,hi):return lo.z>.74 and hi.z>1.1
def in_rail_band(c):return abs(c.x)>.58 and -1.0<c.y<.40 and .74<c.z<.92
def in_door_plane(c):return abs(c.x)>.58 and -1.0<c.y<.40 and .12<c.z<1.10
def door_box(lo,hi):
 cx=(lo.x+hi.x)/2
 return abs(cx)>.5 and lo.x*hi.x>0 and min(abs(lo.x),abs(hi.x))>.5 and lo.y>-1.06 and hi.y<.43 and lo.z>.10 and hi.z<1.13
sources=[o for o in bpy.context.scene.objects if o.type=='MESH']
worlds={o.name:o.matrix_world.copy() for o in sources}
def components(o):
 """Faces of o grouped into vertex-connected pieces, with each piece's world bounds (source axes)."""
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
  g=groups.setdefault(find(p.vertices[0]),[[],Vector((9,9,9)),Vector((-9,-9,-9))])
  g[0].append(p.index)
  for v in p.vertices:
   w=world[v]
   for i in range(3):g[1][i]=min(g[1][i],w[i]);g[2][i]=max(g[2][i],w[i])
 return list(groups.values())
cache={o.name:components(o) for o in sources if WHEEL.match(o.name) or DOOR.search(o.name)}
from mathutils.bvhtree import BVHTree
def bvh(parts):
 verts=[];polys=[]
 for o,faces in parts:
  M=worlds[o.name];me=o.data;idx={}
  for f in faces:
   ring=[]
   for v in me.polygons[f].vertices:
    if v not in idx:idx[v]=len(verts);verts.append(M@me.vertices[v].co)
    ring.append(idx[v])
   polys.append(ring)
 return BVHTree.FromPolygons(verts,polys)
# reference surfaces for the small pieces: the door proper (its core parts) and the stationary body
core_door=bvh([(o,f) for o in sources if CORE.search(o.name) for f,lo,hi in cache[o.name] if door_box(lo,hi)])
body_tree=bvh([(o,range(len(o.data.polygons))) for o in sources if not DOOR.search(o.name) and not WHEEL.match(o.name)])
def nearer_body(lo,hi):
 c=(lo+hi)/2;d=core_door.find_nearest(c)[3];b=body_tree.find_nearest(c)[3]
 return b is not None and (d is None or b<d)
# Wheel centres from the tyres: every tyre object holds both tyres of an axle.
centres=[]
for o in sources:
 if not TYRE.match(o.name):continue
 for side in (1,-1):
  pieces=[(lo,hi) for f,lo,hi in cache[o.name] if (lo.x+hi.x)*side>0]
  lo=Vector([min(p[0][i] for p in pieces) for i in range(3)]);hi=Vector([max(p[1][i] for p in pieces) for i in range(3)])
  centres.append(((lo+hi)/2,'Front' in o.name,side))
# Site order: 0,1 front, 2,3 rear; within an axle the driver's side (-y on site = +x source) first.
centres.sort(key=lambda c:(not c[1],-c[2]))
root=bpy.data.objects.new('McLaren 750S',None);bpy.context.scene.collection.objects.link(root)
def group(name,point):
 o=bpy.data.objects.new(name,None);bpy.context.scene.collection.objects.link(o);o.parent=root;o.location=point;return o
wheels=[group('McLaren wheel '+str(i),(R@c).to_3d()) for i,(c,_,_) in enumerate(centres)]
# Door groups sit at the hinge (top front corner of the door, under the A-pillar); the runtime turns them about a
# dihedral axis through that point. Source x>0 is the driver's door.
HINGE=Vector((.86,-.98,.86))
doors={1:group('McLaren door L',(R@Vector((HINGE.x,HINGE.y,HINGE.z))).to_3d()),-1:group('McLaren door R',(R@Vector((-HINGE.x,HINGE.y,HINGE.z))).to_3d())}
counts={}
for source in sources:
 world=worlds[source.name];partitions={}
 if source.name in cache:
  for faces,lo,hi in cache[source.name]:
   centre=(lo+hi)/2
   if WHEEL.match(source.name):
    target=wheels[min(range(4),key=lambda i:(centres[i][0]-centre).length)]
   elif door_box(lo,hi):
    target=doors[1 if centre.x>0 else -1]
    if EXTRA.search(source.name) and ((hi-lo).length<.05 or len(faces)<=6) and nearer_body(lo,hi):target=root
    # scraps of seal a few triangles big hang loose on whichever side they land: they are dropped
    elif EXTRA.search(source.name) and len(faces)<=8 and (hi-lo).length>.03:continue
    # a dashboard switch cap sits just inside the door plane: it stays on the dash
    if 'pasted__polySurface7' in source.name and min(abs(lo.x),abs(hi.x))<.55:target=root
    # of the lower fascia the dashboard end stays; its corner panel out in the door's plane is a torn game stub, hidden
    # by the shut door and only shards once it rises: it is dropped
    if CARD_CORNER in source.name:
     if abs(centre.x)<.62:target=root
     else:continue
   elif FACE_SPLIT.search(source.name) and welded_rail(lo,hi):
    for f in faces:
     c=world@source.data.polygons[f].center
     partitions.setdefault(doors[1 if c.x>0 else -1] if in_rail_band(c) else root,[]).append(f)
    continue
   elif FACE_SPLIT.search(source.name):
    # the cabin side shell (sill to roof): only what juts into the opening, clear of the body, goes with the door
    for f in faces:
     c=world@source.data.polygons[f].center
     loose=in_door_plane(c) and body_tree.find_nearest(c)[3]>.02
     partitions.setdefault(doors[1 if c.x>0 else -1] if loose else root,[]).append(f)
    continue
   else:target=root
   partitions.setdefault(target,[]).extend(faces)
 else:partitions[root]=None
 for target,faces in partitions.items():
  data=source.data.copy()
  has_custom=data.has_custom_normals
  original=[n.vector.copy() for n in source.data.corner_normals]
  if faces is not None:
   ids=data.attributes.new('source_loop','INT','CORNER')
   for i,item in enumerate(ids.data):item.value=i
   bm=bmesh.new();bm.from_mesh(data);keep=set(faces);bm.faces.ensure_lookup_table()
   bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index not in keep],context='FACES')
   bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(data);bm.free()
   loops=[item.value for item in data.attributes['source_loop'].data]
   data.attributes.remove(data.attributes['source_loop'])
  else:loops=list(range(len(original)))
  bake=Matrix.Translation(-target.location if target is not root else Vector())@R@world
  data.transform(bake)
  normal_matrix=bake.to_3x3().inverted().transposed()
  data.normals_split_custom_set([(normal_matrix@original[i]).normalized() for i in loops])
  name=source.name
  if target is not root:name=target.name.replace(' ','_')+'__'+source.name
  if target in doors.values() and '2443' in source.name:name=target.name.replace('door','door glass')+' '+source.name
  o=bpy.data.objects.new(name,data);bpy.context.scene.collection.objects.link(o);o.parent=target
  counts[target.name]=counts.get(target.name,0)+len(data.polygons)
 bpy.data.objects.remove(source,do_unlink=True)
for o in list(bpy.context.scene.objects):
 if o.type!='MESH' and o!=root and o.parent is None:bpy.data.objects.remove(o,do_unlink=True)
for o in list(bpy.data.objects):
 if o.type=='EMPTY' and o.name.startswith(('Rig','Sketchfab','RootNode','GLTF')):bpy.data.objects.remove(o,do_unlink=True)
bpy.context.view_layer.update()
# Many of the 250 game materials are exact duplicates (the same flat black plastic under a dozen names): fold each set
# of identical node trees into one, keeping the names the runtime looks up (app/three/mclaren.ts).
KEEP=('m_0_1413','m_0_153','m_0_966','m_0_2478','m_0_705','DRLstrip','TailLED','HeadlightLens')
def signature(m):
 if not m or not m.node_tree:return None
 parts=[m.surface_render_method,m.blend_method]
 for n in sorted(m.node_tree.nodes,key=lambda n:n.name):
  parts.append(n.bl_idname+(':'+n.image.name if getattr(n,'image',None) else ''))
  for s in n.inputs:
   if s.is_linked:parts.append(s.identifier+'<'+','.join(l.from_node.bl_idname+'.'+l.from_socket.identifier for l in s.links))
   elif hasattr(s,'default_value'):
    v=s.default_value;parts.append(s.identifier+'='+(','.join('%.3f'%x for x in v) if hasattr(v,'__len__') and not isinstance(v,str) else ('%.3f'%v if isinstance(v,float) else str(v))))
 return '|'.join(parts)
families={}
for m in bpy.data.materials:
 if m.users:families.setdefault(signature(m),[]).append(m)
remap={}
for sig,members in families.items():
 if sig is None or len(members)<2:continue
 keep=next((m for m in members if m.name in KEEP),members[0])
 for m in members:
  if m is not keep:remap[m.name]=keep
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 for slot in o.material_slots:
  if slot.material and slot.material.name in remap:slot.material=remap[slot.material.name]
print('RIG materials folded',len(remap),'of',len([m for m in bpy.data.materials if m.users]))
# The game-rip arrives as ~420 parts; split by doors and wheels it would cost ~1500 draw calls a frame. Parts of one
# group that share their materials are joined (the door glass stays apart: the windows move it).
batches={}
for o in bpy.context.scene.objects:
 if o.type!='MESH' or 'door glass' in o.name:continue
 batches.setdefault((o.parent.name,tuple(m.name if m else '' for m in o.data.materials)),[]).append(o)
for (parent,mats),parts in batches.items():
 if len(parts)<2:continue
 with bpy.context.temp_override(active_object=parts[0],selected_editable_objects=parts,object=parts[0]):bpy.ops.object.join()
 parts[0].name=(parent.replace(' ','_')+'__'+'_'.join(mats))[:60]
print('RIG objects',len([o for o in bpy.context.scene.objects if o.type=='MESH']))
# The game never opens these doors, so their bottom, front and tail are open: raised, the door showed its hollow inside.
# Each door gets a shut face: a dark wall following the door's outline (traced from the paint skin seen from the side),
# 4 mm inside the skin's edge, running from the skin to the inner panel at every point (both found by rays), so it stays
# hidden behind the skin's edge while the door is shut.
from mathutils.bvhtree import BVHTree as _BVH
BELT,CELL,INSET=.83,.004,.004
shut=bpy.data.materials.new('McLaren door shut');shut.use_nodes=True;_nt=shut.node_tree;_nt.nodes.clear()
_b=_nt.nodes.new('ShaderNodeBsdfPrincipled');_o=_nt.nodes.new('ShaderNodeOutputMaterial');_nt.links.new(_b.outputs[0],_o.inputs[0])
_b.inputs['Base Color'].default_value=(.012,.013,.013,1);_b.inputs['Roughness'].default_value=.7;_b.inputs['Metallic'].default_value=0
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
def close_door(group,side):
 objs=[o for o in group.children_recursive if o.type=='MESH' and 'glass' not in o.name]
 sv,sp=tris_of(objs,lambda n,c:n=='m_0_1413' and c.z<BELT and abs(c.y)>.7)
 av,ap=tris_of(objs)
 skin,alld=_BVH.FromPolygons(sv,sp),_BVH.FromPolygons(av,ap)
 # silhouette of the skin in the side view (x, z) on a 4 mm grid
 xs=[v.x for v in sv];zs=[v.z for v in sv];x0,z0=min(xs)-.01,min(zs)-.01;nx=int((max(xs)-x0)/CELL)+3;nz=int((max(zs)-z0)/CELL)+3
 occ=bytearray(nx*nz)
 for ring in sp:
  P=[sv[i] for i in ring]
  for k in range(1,len(P)-1):
   a,b,c=P[0],P[k],P[k+1]
   i0=int((min(a.x,b.x,c.x)-x0)/CELL);i1=int((max(a.x,b.x,c.x)-x0)/CELL)+1;j0=int((min(a.z,b.z,c.z)-z0)/CELL);j1=int((max(a.z,b.z,c.z)-z0)/CELL)+1
   d=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z)
   if abs(d)<1e-12:continue
   for i in range(i0,i1+1):
    px=x0+(i+.5)*CELL
    for j in range(j0,j1+1):
     pz=z0+(j+.5)*CELL;l1=((b.z-c.z)*(px-c.x)+(c.x-b.x)*(pz-c.z))/d;l2=((c.z-a.z)*(px-c.x)+(a.x-c.x)*(pz-c.z))/d
     if l1>=-.02 and l2>=-.02 and 1-l1-l2>=-.02:occ[i*nz+j]=1
 at=lambda i,j:0<=i<nx and 0<=j<nz and occ[i*nz+j]
 # outer contour by Moore-neighbour tracing from the lowest-left filled cell
 start=next((i,j) for i in range(nx) for j in range(nz) if at(i,j))
 nb=[(-1,0),(-1,1),(0,1),(1,1),(1,0),(1,-1),(0,-1),(-1,-1)]
 contour=[start];cur=start;back=0
 for _ in range(200000):
  for k in range(8):
   d=(back+1+k)%8;c=(cur[0]+nb[d][0],cur[1]+nb[d][1])
   if at(*c):back=(d+4)%8;cur=c;break
  if cur==start:break
  contour.append(cur)
 pts=[Vector((x0+(i+.5)*CELL,0,z0+(j+.5)*CELL)) for i,j in contour[::3]]
 # move each point INSET into the silhouette (towards the filled side of the outline)
 inner=[]
 for k,p in enumerate(pts):
  t=(pts[(k+1)%len(pts)]-pts[k-1]);t.y=0
  if t.length<1e-6:inner.append(None);continue
  t.normalize();n=Vector((-t.z,0,t.x))
  q=p+n*INSET
  if not at(int((q.x-x0)/CELL),int((q.z-z0)/CELL)):n=-n;q=p+n*INSET
  inner.append(q)
 wall=[]
 for q in inner:
  if q is None or q.z>BELT-.008:wall.append(None);continue
  out=skin.ray_cast(Vector((q.x,side*1.4,q.z)),Vector((0,-side,0)),1.2)
  if out[0] is None:wall.append(None);continue
  yo=out[0].y
  inn=alld.ray_cast(Vector((q.x,side*.3,q.z)),Vector((0,side,0)),abs(yo)-.3)
  yi=inn[0].y if inn[0] is not None and abs(inn[0].y)<abs(yo)-.01 else yo+(-side)*.06
  wall.append((Vector((q.x,yo-side*.003,q.z)),Vector((q.x,yi+side*.003,q.z))))
 # the wall is laid in small cells (six across the door's depth) and a cell is left out where the door already has its
 # own surface within 5 mm (the skin turning in at the tail, the seals): coincident surfaces flicker in the browser
 # Columns where the door is mostly closed already are skipped whole, and so is a lone open column between closed ones:
 # stray cells read as dark tabs on the skin's edge.
 ROWS=6;cols=[]
 for k in range(len(wall)):
  a,b=wall[k],wall[(k+1)%len(wall)]
  if a is None or b is None or (a[0]-b[0]).length>.05:cols.append(None);continue
  cells=[]
  for r in range(ROWS):
   t0,t1=r/ROWS,(r+1)/ROWS
   cell=(a[0].lerp(a[1],t0),a[0].lerp(a[1],t1),b[0].lerp(b[1],t1),b[0].lerp(b[1],t0))
   if alld.find_nearest(sum(cell,Vector())/4)[3]>=.006:cells.append(cell)
  cols.append(cells if len(cells)==ROWS else None)
 # only whole, open stretches of at least five columns: partial columns beside the skin's own in-turn read as stripes
 n=len(cols);keep=[False]*n;k=0
 while k<n:
  if cols[k] is None:k+=1;continue
  j=k
  while j<n and cols[j] is not None:j+=1
  if j-k>=5:
   for i in range(k,j):keep[i]=True
  k=j
 bm=bmesh.new();inv=group.matrix_world.inverted();quads=0
 for k in range(n):
  if not keep[k]:continue
  for cell in cols[k]:
   vs=[bm.verts.new(inv@v) for v in cell];bm.faces.new(vs);quads+=1
 bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.0002)
 me=bpy.data.meshes.new(group.name+' shut');bm.to_mesh(me);bm.free();me.materials.append(shut)
 ob=bpy.data.objects.new(group.name.replace('door','door shut'),me);bpy.context.scene.collection.objects.link(ob);ob.parent=group
 print('RIG shut face',group.name,'outline',len(pts),'quads',quads)
bpy.context.view_layer.update()
# Seal shards: single triangles and slivers of the body's rubber and trim round the opening that touch only the door
# while it is shut. Left on the body they float in the open aperture: a shard within 2 cm of its door goes with the door,
# one touching nothing at all is dropped.
from mathutils.kdtree import KDTree as _KD
def shard_pass():
 bobjs=[o for o in root.children if o.type=='MESH']
 trees={}
 for s,g in ((-1,doors[1]),(1,doors[-1])):
  v,p=tris_of([o for o in g.children_recursive if o.type=='MESH']);trees[s]=_BVH.FromPolygons(v,p)
 pieces=[];pts=[];own=[]
 for o in bobjs:
  me=o.data;M=o.matrix_world;n=len(me.vertices);parent=list(range(n))
  def find(q):
   while parent[q]!=q:parent[q]=parent[parent[q]];q=parent[q]
   return q
  for e in me.edges:
   x,y=find(e.vertices[0]),find(e.vertices[1])
   if x!=y:parent[x]=y
  W=[M@v.co for v in me.vertices];g={}
  for i in range(n):g.setdefault(find(i),[]).append(i)
  faces={}
  for p in me.polygons:faces.setdefault(find(p.vertices[0]),[]).append(p.index)
  for r,vs in g.items():
   P=[W[i] for i in vs];k=len(pieces);pieces.append((o,faces.get(r,[]),P))
   for q in P[::3]:pts.append(q);own.append(k)
 kd=_KD(len(pts))
 for i,q in enumerate(pts):kd.insert(q,i)
 kd.balance()
 moves={};drops={}
 for k,(o,faces,P) in enumerate(pieces):
  lo=Vector([min(q[i] for q in P) for i in range(3)]);hi=Vector([max(q[i] for q in P) for i in range(3)]);c=(lo+hi)/2
  if not(-1.08<c.x<.45 and .5<abs(c.y)<1.0 and .1<c.z<1.18) or (hi-lo).length>.2 or len(faces)>40:continue
  S=P[::max(1,len(P)//10)]
  if sum(1 for q in S if any(own[j]!=k for _,j,_ in kd.find_range(q,.006)))/len(S)>=.3:continue
  s=1 if c.y>0 else -1;d=trees[s].find_nearest(c)[3]
  (moves.setdefault((o,s),[]) if d is not None and d<.02 else drops.setdefault(o,[])).extend(faces)
 for (o,s),faces in moves.items():
  g=doors[-1] if s>0 else doors[1];data=o.data.copy();keep=set(faces)
  bm=bmesh.new();bm.from_mesh(data);bm.faces.ensure_lookup_table()
  bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index not in keep],context='FACES')
  bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(data);bm.free()
  data.transform(g.matrix_world.inverted()@o.matrix_world)
  ob=bpy.data.objects.new(g.name.replace(' ','_')+'__seal_shards',data);bpy.context.scene.collection.objects.link(ob);ob.parent=g
  drops.setdefault(o,[]).extend(faces)
 for o,faces in drops.items():
  bm=bmesh.new();bm.from_mesh(o.data);bm.faces.ensure_lookup_table();kill=set(faces)
  bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index in kill],context='FACES');bm.to_mesh(o.data);bm.free()
 print('RIG shards moved',sum(len(f) for f in moves.values()),'faces, dropped',sum(len(f) for f in drops.values())-sum(len(f) for f in moves.values()))
 bpy.context.view_layer.update()
shard_pass()
# Whatever of the body sits INSIDE the shut door (door surface outboard, inboard, ahead, behind and below it) is never
# seen in the game, so the model left overlapping layers there: two trims showing through each other as saw teeth,
# pieces of the door card counted as body. A piece mostly inside the door goes with the door; of a piece only partly
# inside, the hidden part is removed (it lies over another layer, which stays).
def enclosed_pass():
 dirs=[Vector((0,1,0)),Vector((0,-1,0)),Vector((1,0,0)),Vector((-1,0,0)),Vector((0,0,-1))]
 reach=[.35,.35,.9,.9,.7]
 trees={}
 for s,g in ((-1,doors[1]),(1,doors[-1])):
  v,p=tris_of([o for o in g.children_recursive if o.type=='MESH' and 'shut' not in o.name]);trees[s]=_BVH.FromPolygons(v,p)
 moved=dropped=0
 for o in [o for o in root.children if o.type=='MESH']:
  me=o.data;M=o.matrix_world;n=len(me.vertices);parent=list(range(n))
  def find(q):
   while parent[q]!=q:parent[q]=parent[parent[q]];q=parent[q]
   return q
  for e in me.edges:
   x,y=find(e.vertices[0]),find(e.vertices[1])
   if x!=y:parent[x]=y
  inside={};total={}
  for p in me.polygons:
   r=find(p.vertices[0]);total[r]=total.get(r,0)+1
   c=M@p.center
   if not(-1.1<c.x<.48 and .5<abs(c.y)<1.0 and .1<c.z<1.2):continue
   t=trees[1 if c.y>0 else -1]
   if all(t.ray_cast(c+d*.001,d,l)[0] is not None for d,l in zip(dirs,reach)):inside.setdefault(r,[]).append(p.index)
  if not inside:continue
  take={};kill=[]
  for r,faces in inside.items():
   if len(faces)>=.5*total[r]:
    side=1 if (M@me.polygons[faces[0]].center).y>0 else -1
    take.setdefault(side,[]).extend(p.index for p in me.polygons if find(p.vertices[0])==r)
   else:kill+=faces
  for side,faces in take.items():
   g=doors[-1] if side>0 else doors[1];data=me.copy();keep=set(faces)
   bm=bmesh.new();bm.from_mesh(data);bm.faces.ensure_lookup_table()
   bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index not in keep],context='FACES')
   bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(data);bm.free()
   data.transform(g.matrix_world.inverted()@M)
   ob=bpy.data.objects.new(g.name.replace(' ','_')+'__'+o.name[:30]+'_inner',data);bpy.context.scene.collection.objects.link(ob);ob.parent=g
   moved+=len(faces);kill+=faces
  bm=bmesh.new();bm.from_mesh(me);bm.faces.ensure_lookup_table();ks=set(kill)
  bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index in ks],context='FACES');bm.to_mesh(me);bm.free()
  dropped+=len(kill)
 print('RIG enclosed moved',moved,'faces into the doors, removed',dropped-moved,'hidden faces')
 bpy.context.view_layer.update()
enclosed_pass()
# The thin rubber strips of the door gap (m_0_1191) ride along the body's aperture flange: carried by the door they stood
# off its raised front edge as loose strips with cut, spiky ends. They go back to the body and line the opening.
def seal_strips_to_body():
 back=0
 for g in (doors[1],doors[-1]):
  for o in [o for o in g.children if o.type=='MESH']:
   me=o.data;names=[m.name if m else '' for m in me.materials]
   if 'm_0_1191' not in names:continue
   n=len(me.vertices);parent=list(range(n))
   def find(q):
    while parent[q]!=q:parent[q]=parent[parent[q]];q=parent[q]
    return q
   for e in me.edges:
    x,y=find(e.vertices[0]),find(e.vertices[1])
    if x!=y:parent[x]=y
   comp={}
   for p in me.polygons:comp.setdefault(find(p.vertices[0]),[]).append(p.index)
   M=o.matrix_world;W=[M@v.co for v in me.vertices];take=[]
   for faces in comp.values():
    if len(faces)>24 or any(names[me.polygons[f].material_index]!='m_0_1191' for f in faces):continue
    P=[W[v] for f in faces for v in me.polygons[f].vertices]
    lo=Vector([min(p[i] for p in P) for i in range(3)]);hi=Vector([max(p[i] for p in P) for i in range(3)]);L=(hi-lo).length
    area=sum(me.polygons[f].area for f in faces)
    if L>.03 and area/L<.006:take+=faces
   if not take:continue
   data=me.copy();keep=set(take)
   bm=bmesh.new();bm.from_mesh(data);bm.faces.ensure_lookup_table()
   bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index not in keep],context='FACES')
   bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(data);bm.free()
   data.transform(root.matrix_world.inverted()@M)
   ob=bpy.data.objects.new('McLaren_750S__aperture_seal_'+g.name[-1],data);bpy.context.scene.collection.objects.link(ob);ob.parent=root
   bm=bmesh.new();bm.from_mesh(me);bm.faces.ensure_lookup_table()
   bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index in keep],context='FACES');bm.to_mesh(me);bm.free()
   back+=len(take)
 print('RIG seal strips back to the body',back,'faces')
 bpy.context.view_layer.update()
seal_strips_to_body()
# Trims of the A-pillar and the roof edge were in the doors' parts lists: with the door shut they lie on the body's own
# surface (a few millimetres off it all along), raised they stood off the window frame as torn strips. Any door piece
# without paint or glass that hugs the body like that goes back to it.
def body_huggers():
 v,p=tris_of([o for o in root.children if o.type=='MESH']);bt=_BVH.FromPolygons(v,p);back=0
 for g in (doors[1],doors[-1]):
  for o in [o for o in g.children if o.type=='MESH' and 'shut' not in o.name and not o.name.endswith('_inner')]:
   me=o.data;names=[m.name if m else '' for m in me.materials]
   n=len(me.vertices);parent=list(range(n))
   def find(q):
    while parent[q]!=q:parent[q]=parent[parent[q]];q=parent[q]
    return q
   for e in me.edges:
    x,y=find(e.vertices[0]),find(e.vertices[1])
    if x!=y:parent[x]=y
   comp={}
   for p in me.polygons:comp.setdefault(find(p.vertices[0]),[]).append(p.index)
   M=o.matrix_world;W=[M@v.co for v in me.vertices];take=[]
   for faces in comp.values():
    mats={names[me.polygons[f].material_index] if names else '' for f in faces}
    if any(m=='m_0_1413' or '705' in m or '702' in m for m in mats):continue
    vs={v for f in faces for v in me.polygons[f].vertices}
    d=sorted(bt.find_nearest(W[v])[3] for v in vs)
    if d[len(d)//2]<=.002 and d[int(len(d)*.9)]<=.006:take+=faces
   if not take:continue
   data=me.copy();keep=set(take)
   bm=bmesh.new();bm.from_mesh(data);bm.faces.ensure_lookup_table()
   bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index not in keep],context='FACES')
   bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(data);bm.free()
   data.transform(root.matrix_world.inverted()@M)
   ob=bpy.data.objects.new('McLaren_750S__pillar_trim_'+g.name[-1]+'_'+o.name[-6:],data);bpy.context.scene.collection.objects.link(ob);ob.parent=root
   bm=bmesh.new();bm.from_mesh(me);bm.faces.ensure_lookup_table()
   bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index in keep],context='FACES');bm.to_mesh(me);bm.free()
   print('RIG body hugger',o.name[-24:],len(take));back+=len(take)
 print('RIG body huggers back to the body',back,'faces')
 bpy.context.view_layer.update()
body_huggers()
# Nothing of a door may stand outside the door's own side-view outline (its paint skin, mirror and glass, grown by
# 15 mm for the window frame): layers of the tail's air duct and seals poked out past the skin as spikes once raised.
def outline_trim():
 cut=0
 for s,g in ((-1,doors[1]),(1,doors[-1])):
  objs=[o for o in g.children_recursive if o.type=='MESH']
  ref=lambda n,c:n=='m_0_1413' or '705' in n or '702' in n
  sv,sp=tris_of(objs,ref)
  xs=[v.x for v in sv];zs=[v.z for v in sv];x0,z0=min(xs)-.05,min(zs)-.05;nx=int((max(xs)-x0+.05)/CELL)+2;nz=int((max(zs)-z0+.05)/CELL)+2
  occ=bytearray(nx*nz)
  for ring in sp:
   P=[sv[i] for i in ring]
   for k in range(1,len(P)-1):
    a,b,c=P[0],P[k],P[k+1];d=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z)
    if abs(d)<1e-12:continue
    for i in range(int((min(a.x,b.x,c.x)-x0)/CELL),int((max(a.x,b.x,c.x)-x0)/CELL)+2):
     px=x0+(i+.5)*CELL
     for j in range(int((min(a.z,b.z,c.z)-z0)/CELL),int((max(a.z,b.z,c.z)-z0)/CELL)+2):
      pz=z0+(j+.5)*CELL;l1=((b.z-c.z)*(px-c.x)+(c.x-b.x)*(pz-c.z))/d;l2=((c.z-a.z)*(px-c.x)+(a.x-c.x)*(pz-c.z))/d
      if l1>=-.02 and l2>=-.02 and 1-l1-l2>=-.02 and 0<=i<nx and 0<=j<nz:occ[i*nz+j]=1
  grow=4;ok=bytearray(nx*nz)
  for i in range(nx):
   for j in range(nz):
    if occ[i*nz+j]:
     for a2 in range(-grow,grow+1):
      for b2 in range(-grow,grow+1):
       if 0<=i+a2<nx and 0<=j+b2<nz and a2*a2+b2*b2<=grow*grow:ok[(i+a2)*nz+j+b2]=1
  for o in objs:
   me=o.data;M=o.matrix_world;out=set()
   for p in me.polygons:
    c=M@p.center;i=int((c.x-x0)/CELL);j=int((c.z-z0)/CELL)
    if not(0<=i<nx and 0<=j<nz and ok[i*nz+j]):out.add(p.index)
   if not out:continue
   # a piece that is mostly outside goes whole: cutting it along the outline left toothed stubs
   parent=list(range(len(me.vertices)))
   def find(q):
    while parent[q]!=q:parent[q]=parent[parent[q]];q=parent[q]
    return q
   for e in me.edges:
    x,y=find(e.vertices[0]),find(e.vertices[1])
    if x!=y:parent[x]=y
   comp={}
   for p in me.polygons:comp.setdefault(find(p.vertices[0]),[]).append(p.index)
   kill=[]
   for faces in comp.values():
    n_out=sum(f in out for f in faces)
    if n_out*2>=len(faces):kill+=faces
    elif n_out:kill+=[f for f in faces if f in out]
   if kill:
    bm=bmesh.new();bm.from_mesh(me);bm.faces.ensure_lookup_table();ks=set(kill)
    bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index in ks],context='FACES');bm.to_mesh(me);bm.free();cut+=len(kill)
 print('RIG outline trim removed',cut,'faces standing outside the doors')
 bpy.context.view_layer.update()
outline_trim()
# The sill under the door's foot is built from stacked trims with toothed hems (the game never shows it: the shut door
# covers it). Pale trims over the black base showed as saw teeth once the door rose; removing a layer only bared the
# next. The whole band takes one dark satin material instead, like the real car's carbon sill: the hems no longer show.
sill=bpy.data.materials.new('McLaren sill');sill.use_nodes=True;_t=sill.node_tree;_t.nodes.clear()
_sb=_t.nodes.new('ShaderNodeBsdfPrincipled');_so=_t.nodes.new('ShaderNodeOutputMaterial');_t.links.new(_sb.outputs[0],_so.inputs[0])
_sb.inputs['Base Color'].default_value=(.014,.015,.016,1);_sb.inputs['Roughness'].default_value=.55;sill.diffuse_color=(.014,.015,.016,1)
def sill_band():
 n=0
 band=lambda c:-.98<c.x<.38 and .56<abs(c.y)<.84 and .13<c.z<.40
 for o in [o for o in root.children if o.type=='MESH']:
  me=o.data;names=[m.name if m else '' for m in me.materials];M=o.matrix_world
  # the cabin side shell's hem is a row of big triangles that dips under the sill trim and pokes back out through it
  if o.name.endswith('__m_0_2079'):
   hem=[p.index for p in me.polygons if band(M@p.center) and (M@p.center).z<.335 and .66<abs((M@p.center).y)<.76]
   if hem:
    bm=bmesh.new();bm.from_mesh(me);bm.faces.ensure_lookup_table();hs=set(hem)
    bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index in hs],context='FACES');bm.to_mesh(me);bm.free()
    print('RIG sill hem removed',len(hem),'faces')
  faces=[p for p in me.polygons if names and names[p.material_index] not in ('m_0_1413','m_0_1191') and band(M@p.center)]
  if not faces:continue
  if 'McLaren sill' not in names:me.materials.append(sill)
  k=[m.name if m else '' for m in me.materials].index('McLaren sill')
  for p in faces:p.material_index=k
  n+=len(faces)
 print('RIG sill band recoloured',n,'faces')
# Through the open door the lower body sheet in front of the tub showed its back: an inward-facing panel whose top edge
# is a row of triangles, laid a few centimetres over the tub's own sill. Faces in the sill band that a viewer outside the
# opening sees from behind, with a front-facing surface right behind them, are removed.
def sill_backfaces():
 body=[o for o in root.children if o.type=='MESH'];v,p=tris_of(body);tree=_BVH.FromPolygons(v,p);n=0
 for o in body:
  # the rubber seal, the frame trim and the paint stay (a seal's open profile is seen from behind by design)
  if 'seal' in o.name:continue
  me=o.data;M=o.matrix_world;N=M.to_3x3().inverted().transposed();kill=[];names=[m.name if m else '' for m in me.materials]
  for f in me.polygons:
   if names and names[f.material_index] in ('m_0_1191','m_0_1188','m_0_1413'):continue
   c=M@f.center
   if not(-.98<c.x<.38 and .62<abs(c.y)<.84 and .13<c.z<.40):continue
   s=1 if c.y>0 else -1;nn=(N@f.normal).normalized()
   for dx in (-.4,0,.4):
    for dz in (.1,.4,.8):
     V=Vector((c.x+dx,s*1.4,c.z+dz));d=(c-V).normalized()
     if nn.dot(d)<=0:continue
     if tree.ray_cast(c-d*.001,-d,(V-c).length)[0] is not None:continue
     hit=tree.ray_cast(c+d*.001,d,.06)
     if hit[0] is not None and hit[1].dot(d)<0:kill.append(f.index);break
    else:continue
    break
  if not kill:continue
  bm=bmesh.new();bm.from_mesh(me);bm.faces.ensure_lookup_table();ks=set(kill)
  bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index in ks],context='FACES');bm.to_mesh(me);bm.free()
  print('RIG sill backfaces',o.name[-10:],len(kill));n+=len(kill)
 print('RIG sill backfaces removed',n)
sill_backfaces()
sill_band()
for s,g in ((-1,doors[1]),(1,doors[-1])):close_door(g,s)
if RIGGED:bpy.ops.wm.save_as_mainfile(filepath=RIGGED)
bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',export_draco_mesh_compression_enable=False,export_animations=False,export_skins=False)
print('RIG',{k:v for k,v in counts.items()})
print('RIG wheels',[(w.name,[round(v,3) for v in w.location]) for w in wheels])
print('RIG doors',[(d.name,[round(v,3) for v in d.location]) for d in doors.values()])
