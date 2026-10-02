import bpy, bmesh, os, math, json
from functools import lru_cache
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
BASE=os.path.abspath(os.path.join(os.path.dirname(__file__),"../../blender"))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(BASE,'Ferrari-458-interior.glb'))
def P(x,y,z): return Vector((x,-z,y))
def W(v): return Vector((v.x,v.z,-v.y))
def material(name,color,rough=.8,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal
 return m
leather=material('Fitted upholstery',(.024,.030,.027),.88)
black=material('Fitted fixed black trim',(.012,.017,.014),.92)
felt=material('Fitted recessed felt',(.004,.007,.005),1)
thread=material('Fitted saddle thread',(.12,.105,.082),.95)
metal=material('Fitted satin aluminium',(.32,.36,.33),.3,.8)
red=material('Fitted red reflector',(.4,.016,.009),.3)
glass=material('Fitted side glass',(.16,.22,.19),.055)
carbon=material('Fitted carbon shell',(.032,.037,.035),.49,.12)
cn=carbon.node_tree.nodes.get('Principled BSDF');cn.inputs['Coat Weight'].default_value=.22
tree=carbon.node_tree;check=tree.nodes.new('ShaderNodeTexChecker');check.inputs['Scale'].default_value=650
check.inputs['Color1'].default_value=(.018,.022,.020,1);check.inputs['Color2'].default_value=(.040,.045,.042,1)
uvnode=tree.nodes.new('ShaderNodeTexCoord');tree.links.new(uvnode.outputs['UV'],check.inputs['Vector']);tree.links.new(check.outputs['Color'],cn.inputs['Base Color'])
gn=glass.node_tree.nodes.get('Principled BSDF');gn.inputs['Alpha'].default_value=.24;gn.inputs['Transmission Weight'].default_value=.72;gn.inputs['IOR'].default_value=1.45
new=[]
def group(name,origin=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=P(*origin);new.append(o);return o
rear=group('upgrade_rear')
def obj(name,verts,faces,mat,parent=None,smooth=True,bevel=0):
 g=bpy.data.meshes.new(name);g.from_pydata([P(*v) for v in verts],[],faces);g.update()
 uv=g.uv_layers.new(name='Upholstery UV')
 for loop in g.loops:
  x,y,z=verts[loop.vertex_index];uv.data[loop.index].uv=(z,y) if parent and parent.name=='upgrade_rear' else (x,y)
 o=bpy.data.objects.new(name,g);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
 if parent:o.parent=parent;o.matrix_parent_inverse=parent.matrix_world.inverted()
 for p in g.polygons:p.use_smooth=smooth
 if bevel:
  mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=3
  mod=o.modifiers.new('Stable face normals','WEIGHTED_NORMAL');mod.keep_sharp=True
 new.append(o);return o
def solid(name,surface,nu,nv,mat,parent,depth=.009,axis=0):
 verts=[];faces=[]
 for layer in range(2):
  for j in range(nv+1):
   for i in range(nu+1):
    p=Vector(surface(i/nu,j/nv));p[axis]+=layer*depth;verts.append(p)
 stride=nu+1;n=stride*(nv+1)
 for j in range(nv):
  for i in range(nu):
   a=j*stride+i;b=a+1;c=a+stride;d=c+1;faces.extend([(a,c,d,b),(a+n,b+n,d+n,c+n)])
 edge=list(range(stride))+[j*stride+nu for j in range(1,nv+1)]+[nv*stride+i for i in range(nu-1,-1,-1)]+[j*stride for j in range(nv-1,0,-1)]
 for i,a in enumerate(edge):b=edge[(i+1)%len(edge)];faces.append((a,b,b+n,a+n))
 return obj(name,verts,faces,mat,parent)
def tube(name,points,r,mat,parent):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=16;c.bevel_depth=r;c.bevel_resolution=3
 s=c.splines.new('POLY');s.points.add(len(points)-1)
 for a,p in zip(s.points,points):a.co=(*P(*p),1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
 if parent:o.parent=parent;o.matrix_parent_inverse=parent.matrix_world.inverted()
 new.append(o);return o
def cuboid(name,c,size,mat,parent,r=.005):
 x,y,z=c;dx,dy,dz=[v/2 for v in size];vs=[(x+a*dx,y+b*dy,z+d*dz) for a,b,d in [(-1,-1,-1),(-1,-1,1),(-1,1,1),(-1,1,-1),(1,-1,-1),(1,-1,1),(1,1,1),(1,1,-1)]]
 return obj(name,vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(1,2,6,5),(0,4,7,3)],mat,parent,True,r)
def stitch(name,points,mat,parent):
 # Each stitch follows its supporting surface and has a distinct short dash.
 for i in range(0,len(points)-1,2):tube(name,[points[i],points[i+1]],.0006,mat,parent)

# Measure the painted rear aperture, after the complete door panel was detached.
body=bpy.data.objects.get('body');edge_counts={};points=[];weld={};ids={}
for v in body.data.vertices:
 p=W(body.matrix_world@v.co);key=tuple(round(x,5) for x in p)
 if key not in weld:weld[key]=len(points);points.append(p)
 ids[v.index]=weld[key]
for f in body.data.polygons:
 vv=[ids[i] for i in f.vertices]
 for i,a in enumerate(vv):b=vv[(i+1)%len(vv)];key=tuple(sorted((a,b)));edge_counts[key]=edge_counts.get(key,0)+1
boundary=[(points[a],points[b]) for (a,b),n in edge_counts.items() if n==1]
@lru_cache(maxsize=512)
def aperture(y,side):
 candidates=[]
 for a,b in boundary:
  if a.z*side<.65 or b.z*side<.65 or a.z*side>1.02 or b.z*side>1.02:continue
  if max(a.x,b.x)<.42 or min(a.x,b.x)>.80:continue
  if min(a.y,b.y)<=y<=max(a.y,b.y) and abs(b.y-a.y)>1e-6:
   p=a.lerp(b,(y-a.y)/(b.y-a.y));candidates.append(p)
 if candidates:
  return min(candidates,key=lambda p:abs(p.x-.565))
 candidates=[p for p in points if .52<p.x<.72 and .65<p.z*side<.99]
 p=min(candidates,key=lambda p:abs(p.y-y)*8+abs(p.x-.565));return Vector((p.x,y,p.z))
samples={str(side):[list(aperture(.25+i*.65/12,side)) for i in range(13)] for side in [-1,1]}
print('MEASURED APERTURE',json.dumps(samples))

# A continuous curved rear shell: central wall and both quarter returns share vertices.
def rear_surface(u,v):
 y=.238+v*.658;z=(u*2-1)*.705;x=.486+.064*v*v+.014*(abs(z)/.705)**4
 return (x,y,z)
solid('rear_continuous_bulkhead',rear_surface,80,56,black,rear,.012)
for side in [-1,1]:
 def quarter(u,v,side=side):
  y=.238+v*.658;edge=aperture(y,side);x0=edge.x+.004;z0=edge.z-side*.007
  inner=Vector(rear_surface(0 if side<0 else 1,v));t=u*u*(3-2*u)
  p=Vector((x0,y,z0)).lerp(inner,t);p.x-=.016*math.sin(math.pi*u)*math.sin(math.pi*v)
  return p
 solid('rear_moulded_quarter_'+str(side),quarter,40,56,black,rear,.009)
 # Upholstery is an inset surface rather than a slab placed in the doorway.
 def inset(u,v,side=side):
  p=Vector(rear_surface(.045+u*.40 if side<0 else .555+u*.40,.10+v*.80));p.x-=.002+.004*math.sin(u*math.pi)*math.sin(v*math.pi);return p
 solid('rear_upholstered_inset_'+str(side),inset,40,40,leather,rear,.004)
 for u in [.018,.034,.966,.982]:
  stitch('rear_double_stitch',[(inset(u,j/160)[0]-.001,*inset(u,j/160)[1:]) for j in range(161)],thread,rear)
 for v in [.018,.034,.966,.982]:stitch('rear_double_stitch',[(inset(j/160,v)[0]-.001,*inset(j/160,v)[1:]) for j in range(161)],thread,rear)
 # Rounded belt guide and recessed lower service panel.
 edge=aperture(.81,side)
 cuboid('rear_belt_guide',(edge.x+.015,.80,side*.676),(.027,.048,.085),black,rear,.010)
 tube('rear_belt_mount_rim',[(edge.x-.004,.802,side*(.65+j*.003)) for j in range(19)],.002,metal,rear)
 # Broad, gently curved webbing connects the pillar to the seat buckle.
 def belt_surface(u,v,side=side,edge=edge):
  t=v;cx=(edge.x+.007)*(1-t)+.15*t-.013*math.sin(t*math.pi);cy=.804*(1-t)+.365*t;cz=side*(.677*(1-t)+.602*t)
  return (cx,cy,cz+side*(u-.5)*.042)
 solid('seatbelt_webbing_fitted',belt_surface,4,48,felt,rear,.002)
solid('rear_floor_luggage_well',lambda u,v:(.24+u*.37,.217+.015*math.sin(v*math.pi),-.705+v*1.41),40,32,felt,rear,.012,1)
tube('rear_top_bound_seam',[rear_surface(i/100,1) for i in range(101)],.003,black,rear)
solid('rear_upper_full_width_join',lambda u,v:(.589+.016*v,.874+.124*v,-.708+1.416*u),56,24,black,rear,.008)

# Thin deck binding and contoured liners follow the painted roll-bar aperture.
carbon_parts=[]
start=len(new)
def bridge_top(u,v):
 z=-.726+u*1.452;edge=(abs(z)/.726)**6
 return (.531+.032*edge+(.167-.032*edge)*v,1.005-.048*edge+.006*math.sin(v*math.pi),z)
solid('carbon_cross_car_bridge',bridge_top,72,24,carbon,rear,-.038,1)
for side in [-1,1]:
 # Shallow cover with the tapered arch boundary, tucked under the painted lip.
 outline=[(.264,.947),(.270,1.002),(.386,1.065),(.436,1.130),(.481,1.158),(.530,1.149),(.594,1.117),(.661,1.039),(.717,.963),(.700,.947),(.52,.942),(.36,.942)]
 border=[]
 for i in range(len(outline)):
  p0=Vector(outline[(i-1)%len(outline)]);p1=Vector(outline[i]);p2=Vector(outline[(i+1)%len(outline)]);p3=Vector(outline[(i+2)%len(outline)])
  for j in range(12):
   t=j/12;v=.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)
   border.append(v)
 vs=[];fs=[];n=len(border)
 for layer in range(2):
  for z,y in border:
   x=.551+.052*max(0,(y-.947)/.211)+layer*.031
   vs.append((x,y,side*(.490+(z-.490)*1.035)))
  vs.append((.572+layer*.031,1.031,side*.490))
 for i in range(n):
  j=(i+1)%n;fs.extend([(n,i,j),(2*n+1,n+1+j,n+1+i),(i,n+1+i,n+1+j,j)])
 obj('carbon_contoured_rollbar_liner_'+str(side),vs,fs,carbon,rear)
 # Closed swept side return overlaps both the body aperture and the lower trim.
 def outer_return(u,v,side=side):return (.548+.095*u,.892+.072*v,side*((.756-.020*v)*(1-u)+.645*u))
 solid('carbon_body_return_'+str(side),outer_return,32,32,carbon,rear,.010)
carbon_parts=[o for o in new[start:] if o.type=='MESH']
# Fuse the bridge, fairings and returns into a single continuous manufactured shell.
for o in bpy.context.selected_objects:o.select_set(False)
for o in carbon_parts:o.select_set(True)
bpy.context.view_layer.objects.active=carbon_parts[0];bpy.ops.object.join()
shell=carbon_parts[0];shell.name='carbon_unified_rear_shell'
rem=shell.modifiers.new('Continuous closed carbon shell','REMESH');rem.mode='VOXEL';rem.voxel_size=.003;rem.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=rem.name)
smooth=shell.modifiers.new('Rounded junctions','SMOOTH');smooth.factor=.55;smooth.iterations=3;bpy.ops.object.modifier_apply(modifier=smooth.name)
# Remeshing removes UVs; project metres for the fine woven material.
uv=shell.data.uv_layers.new(name='Carbon weave UV') if not shell.data.uv_layers else shell.data.uv_layers[0]
for loop in shell.data.loops:
 p=W(shell.matrix_world@shell.data.vertices[loop.vertex_index].co);uv.data[loop.index].uv=(p.z,p.y+p.x*.25)
new=[o for o in bpy.data.objects if o.name.startswith('upgrade_') or (o.parent and o.parent.name.startswith('upgrade_'))]
# A narrow rubber binding delineates the carbon/leather junction without coplanar faces.
binding=[]
for i in range(181):
 x,y,z=bridge_top(i/180,.035);binding.append((x,y+.0012,z))
tube('rear_carbon_fine_bound_edge',binding,.0009,black,rear)
# Remove the original overlapping upper linings only in the repaired region.
for name in ['interior_light','interior_dark']:
 source=bpy.data.objects[name];mesh=bmesh.new();mesh.from_mesh(source.data);remove=[]
 for f in mesh.faces:
  p=W(source.matrix_world@f.calc_center_median())
  if .38<p.x<.78 and p.y>.88 and abs(p.z)<.85:remove.append(f)
 bmesh.ops.delete(mesh,geom=remove,context='FACES');mesh.to_mesh(source.data);mesh.free()
# Closed bucket seats, with one continuous headrest/back rather than intersecting shells.
seats=group('upgrade_seats')
for side in [-1,1]:
 zc=side*.35
 def profile(y):
  t=max(0,min(1,(y-.36)/.57))
  width=.178+.025*math.exp(-((t-.18)/.24)**2)+.032*math.exp(-((t-.74)/.20)**2)
  neck=max(0,(t-.84)/.16);width-=.054*(neck*neck*(3-2*neck))
  return (.045+.235*t,.060+.009*math.sin(t*math.pi),width)
 vs=[];fs=[];rings=84;around=64
 for j in range(rings+1):
  y=.36+j*.57/rings;x,depth,width=profile(y)
  for i in range(around):
   a=i*math.tau/around;co=math.cos(a);si=math.sin(a);dz=math.copysign(abs(si)**.5,si)*width
   bolster=.028*math.exp(-((abs(dz)/width-.85)/.12)**2)*math.sin(j/rings*math.pi) if co<0 else 0
   vs.append((x+.075+math.copysign(abs(co)**.5,co)*depth-bolster,y,zc+dz))
 for j in range(rings):
  for i in range(around):a=j*around+i;b=j*around+(i+1)%around;fs.append((a,a+around,b+around,b))
 for j in [0,rings]:
  y=.36+j*.57/rings;x,depth,width=profile(y);center=len(vs);vs.append((x+.075,y,zc))
  for i in range(around):a=j*around+i;b=j*around+(i+1)%around;fs.append((center,b,a) if j==rings else (center,a,b))
 obj('seat_continuous_closed_back',vs,fs,leather,seats)
 def padded(u,v):
  y=.418+v*.435;x,d,w=profile(y);dz=(u-.5)*.235
  return (x+.075-d*max(0,1-(dz/w)**4)**.25-.002-.003*math.sin(u*math.pi)*math.sin(v*math.pi),y,zc+dz)
 solid('seat_central_padded_insert',padded,48,64,leather,seats,.006)
 for u in [.014,.030,.970,.986]:stitch('seat_double_saddle_stitch',[(padded(u,j/160)[0]-.0008,*padded(u,j/160)[1:]) for j in range(161)],thread,seats)
 for v in [.25,.5,.75]:tube('seat_quilted_horizontal_seam',[(padded(i/80,v)[0]-.0008,*padded(i/80,v)[1:]) for i in range(81)],.00065,thread,seats)
 # Separate soft rectangular headrest matches the supplied Ferrari reference.
 cuboid('seat_padded_headrest',(.368,1.026,zc),(.115,.185,.285),leather,seats,.041)
 for dz in [-.072,.072]:cuboid('headrest_mount',(.36,.931,zc+dz),(.022,.043,.018),black,seats,.005)
 tube('headrest_bound_edge',[(.309,1.026+.075*math.sin(i*math.tau/100),zc+.123*math.cos(i*math.tau/100)) for i in range(101)],.0008,thread,seats)
 cuboid('seat_structural_base',(-.055,.285,zc),(.61,.115,.46),black,seats,.033)
 def cushion(u,v):
  x=-.385+u*.53;dz=(v-.5)*.45;y=.342+.020*math.sin(u*math.pi)+.038*(abs(dz)/.225)**4
  return (x,y,zc+dz)
 solid('seat_contoured_cushion',cushion,56,48,leather,seats,-.055,1)
 for v in [.15,.18,.82,.85]:stitch('seat_cushion_double_stitch',[(cushion(i/140,v)[0],cushion(i/140,v)[1]+.001,cushion(i/140,v)[2]) for i in range(141)],thread,seats)
 for dz in [-.18,.18]:cuboid('seat_adjustment_slide',(-.04,.222,zc+dz),(.51,.026,.026),metal,seats,.004)
 cuboid('seat_buckle',(-.044,.406,zc-side*.25),(.036,.068,.046),black,seats,.006)
 cuboid('seat_red_release',(-.044,.441,zc-side*.25),(.030,.008,.038),red,seats,.002)

# Rebuild each door over its measured original exterior, with a tapered thickness.
for side,label in [(-1,'L'),(1,'R')]:
 source=bpy.data.objects.get('door_'+label)
 source.rotation_euler=(0,0,0);bpy.context.view_layer.update()
 meshes=[o for o in source.children_recursive if o.type=='MESH' and o.name.startswith('body_door')]
 def area(o):
  ps=[W(o.matrix_world@v.co) for v in o.data.vertices];return (max(p.x for p in ps)-min(p.x for p in ps))*(max(p.y for p in ps)-min(p.y for p in ps))
 skin=max(meshes,key=area);ps=[W(skin.matrix_world@v.co) for v in skin.data.vertices];skin.data.calc_loop_triangles()
 tris=[]
 for t in skin.data.loop_triangles:
  a,b,c=[ps[i] for i in t.vertices]
  if (b-a).cross(c-a).z*side>1e-10:tris.append((a,b,c))
 bins={};step=.045
 for tri in tris:
  for ix in range(math.floor(min(p.x for p in tri)/step),math.floor(max(p.x for p in tri)/step)+1):
   for iy in range(math.floor(min(p.y for p in tri)/step),math.floor(max(p.y for p in tri)/step)+1):bins.setdefault((ix,iy),[]).append(tri)
 def outer(x,y):
  for a,b,c in bins.get((math.floor(x/step),math.floor(y/step)),[]):
   den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y)
   if abs(den)<1e-12:continue
   u=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/den;v=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/den
   if u>=-1e-5 and v>=-1e-5 and u+v<=1.00001:return u*a.z+v*b.z+(1-u-v)*c.z
  return min(ps,key=lambda p:(p.x-x)**2+(p.y-y)**2).z
 def face(x,y,d=0):return (x,y,outer(x,y)-side*(.034+d))
 door=group('upgrade_door_'+label,(-.73,.65,side*.83));bpy.context.view_layer.update()
 # Weld the measured skin before making its solid return, preserving the exact silhouette.
 vv=[];ff=[];mapping={}
 for tri in tris:
  out=[]
  for p in tri:
   key=tuple(round(v,6) for v in p)
   if key not in mapping:mapping[key]=len(vv);vv.append(face(p.x,p.y))
   out.append(mapping[key])
  ff.append(tuple(reversed(out)))
 n=len(vv);vv.extend([(x,y,z+side*.032) for x,y,z in vv]);faces=ff+[tuple(i+n for i in reversed(f)) for f in ff];edges={}
 for f in ff:
  for i,a in enumerate(f):b=f[(i+1)%len(f)];key=tuple(sorted((a,b)));edges.setdefault(key,[]).append((a,b))
 for pairs in edges.values():
  if len(pairs)==1:a,b=pairs[0];faces.append((a,b,b+n,a+n))
 obj('door_continuous_inner_skin_'+label,vv,faces,black,door)
 # Large smoothly bulged leather insert, formed into the door rather than stacked blocks.
 def insert(u,v):
  x=-.575+u*.95;y=.47+v*.235+.025*math.sin(u*math.pi);return face(x,y,.004+.006*math.sin(u*math.pi)*math.sin(v*math.pi))
 solid('door_padded_leather_insert_'+label,insert,64,32,leather,door,side*.004,2)
 for v in [.025,.045,.955,.975]:stitch('door_insert_double_stitch',[insert(i/160,v) for i in range(161)],thread,door)
 # Sculpted armrest has a narrow padded crown and tapered support.
 def armrest(u,v):
  x=-.29+u*.57;y=.565+v*.062+.014*math.sin(u*math.pi);d=.015+.034*math.sin(v*math.pi)**.7*math.sin(u*math.pi)**.35
  return face(x,y,d)
 solid('door_sculpted_armrest_'+label,armrest,64,24,leather,door,side*.012,2)
 for v in [.33,.43]:stitch('door_armrest_stitch',[armrest(i/140,v) for i in range(141)],thread,door)
 # Pocket: felt cavity, shaped lip and two joined ends.
 solid('door_storage_recess_'+label,lambda u,v:face(-.25+u*.53,.35+v*.092,.008),48,16,felt,door,side*.006,2)
 solid('door_storage_front_lip_'+label,lambda u,v:face(-.25+u*.53,.353+v*.045+.011*math.sin(u*math.pi),.024+.019*math.sin(u*math.pi)),48,12,leather,door,side*.012,2)
 for x in [-.25,.28]:solid('door_storage_joined_end',lambda u,v,x=x:face(x+u*.009,.35+v*.09,.008+.025*(1-v)),4,20,black,door,side*.008,2)
 # Release handle and recess follow the same curved skin; every point has a support.
 solid('door_release_recess',lambda u,v:face(-.19+u*.25,.64+v*.042,.011),40,12,felt,door,side*.006,2)
 tube('door_release_handle',[face(-.17+i*.23/40,.66+.012*math.sin(i*math.pi/40),.024+.004*math.sin(i*math.pi/40)) for i in range(41)],.006,metal,door)
 # Mounted perforated speaker with a circular leather surround.
 center=(-.46,.442)
 def disc(r):
  vs=[face(*center,.008)]+[face(center[0]+r*math.cos(i*math.tau/96),center[1]+r*math.sin(i*math.tau/96),.008) for i in range(96)]
  return vs,[(0,i+1,(i+1)%96+1) for i in range(96)]
 vs,fs=disc(.076);obj('door_speaker_grille',vs,fs,felt,door)
 tube('door_speaker_satin_ring',[face(center[0]+.078*math.cos(i*math.tau/96),center[1]+.078*math.sin(i*math.tau/96),.008) for i in range(97)],.0014,metal,door)
 pores=[];pf=[]
 for row in range(-15,16):
  for col in range(-15,16):
   dx=col*.0044+(row%2)*.0022;dy=row*.00381
   if dx*dx+dy*dy>.069**2:continue
   at=len(pores);pores.append(face(center[0]+dx,center[1]+dy,.009))
   pores.extend([face(center[0]+dx+.0007*math.cos(i*math.tau/6),center[1]+dy+.0007*math.sin(i*math.tau/6),.0093) for i in range(6)])
   pf.extend([(at,at+i+1,at+(i+1)%6+1) for i in range(6)])
 obj('door_speaker_microperforations',pores,pf,black,door)
 for x in [-.34,-.292]:
  solid('door_window_switch',lambda u,v,x=x:face(x+u*.025,.687+v*.012,.017),8,4,metal,door,side*.005,2)
 solid('door_red_edge_reflector',lambda u,v:face(.388+u*.026,.357+v*.040,.005),6,8,red,door,side*.003,2)
 tube('door_lower_soft_binding',[face(-.55+i*.88/70,.315+.022*math.sin(i*math.pi/70),.001) for i in range(71)],.002,black,door)
 # Frameless, slightly inward-leaning window with a polished edge and rubber wiper.
 edge_cache={}
 def top_edge(x):
  if x in edge_cache:return edge_cache[x]
  ys=[]
  for tri in tris:
   for i,a in enumerate(tri):
    b=tri[(i+1)%3]
    if min(a.x,b.x)<=x<=max(a.x,b.x) and abs(b.x-a.x)>1e-7:ys.append(a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x))
  edge_cache[x]=max(ys) if ys else .87
  return edge_cache[x]
 aframe=[(.84,-.795,.805),(.918,-.626,.734),(.999,-.492,.709),(1.081,-.294,.665),(1.147,-.168,.604)]
 def front_edge(y):
  k=next((k for k in range(len(aframe)-1) if aframe[k+1][0]>=y),len(aframe)-2);a,b=aframe[k:k+2];t=max(0,min(1,(y-a[0])/(b[0]-a[0])))
  return (a[1]*(1-t)+b[1]*t+.007,a[2]*(1-t)+b[2]*t)
 def window(u,v):
  bx=-.71+u*1.14;bottom=top_edge(bx)-.004;fy=top_edge(-.71)-.004+(1.137-top_edge(-.71)+.004)*v
  fx,fz=front_edge(fy);fx=max(-.718,fx);rx=.43-.038*v
  x=fx*(1-u)+rx*u;y=bottom+(1.137-.011*u-bottom)*v
  rz=outer(.425,top_edge(.425)-.01)-side*(.010+.118*v)
  return (x,y,(side*fz)*(1-u)+rz*u)
 solid('door_side_window_'+label,window,64,40,glass,door,side*.003,2)
 tube('window_top_polished_edge',[window(i/100,1) for i in range(101)],.0014,glass,door)
 tube('window_lower_wiper',[window(i/100,0) for i in range(101)],.0035,black,door)
 for x in [.38,.41]:
  solid('door_latch_fastener',lambda u,v,x=x:face(x+u*.009,.57+v*.01,.001),4,4,metal,door,side*.004,2)

# Batch microdetails per assembly and material; thousands of stitches do not become draw calls.
for o in bpy.context.selected_objects:o.select_set(False)
for o in new:
 if o.type=='CURVE':o.select_set(True)
bpy.context.view_layer.objects.active=next(o for o in new if o.type=='CURVE')
bpy.ops.object.convert(target='MESH')
for o in new:
 if o.type!='MESH':continue
 bpy.context.view_layer.objects.active=o
 for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
batches={}
for o in list(new):
 if o.type=='MESH':batches.setdefault((o.parent.name,o.data.materials[0].name),[]).append(o)
for (parent,mat),objects in batches.items():
 if len(objects)<2:continue
 for o in bpy.context.selected_objects:o.select_set(False)
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name=parent+'__'+mat
new=[o for o in bpy.data.objects if o.name.startswith('upgrade_') or (o.parent and o.parent.name.startswith('upgrade_'))]
for o in new:
 if o.type!='MESH':continue
 mesh=bmesh.new();mesh.from_mesh(o.data)
 bmesh.ops.recalc_face_normals(mesh,faces=list(mesh.faces))
 mesh.to_mesh(o.data);mesh.free();o.data.update()

# Remove the superseded assemblies from the editable full vehicle as well.
old=bpy.data.objects.get('rear_tailored_trim')
if old:
 for o in list(old.children_recursive)+[old]:bpy.data.objects.remove(o,do_unlink=True)
for name in ['seat_driver','seat_passenger']:
 old=bpy.data.objects.get(name)
 if old:
  for o in list(old.children_recursive)+[old]:bpy.data.objects.remove(o,do_unlink=True)
for label in ['L','R']:
 old=bpy.data.objects.get('door_'+label)
 for o in list(old.children_recursive):
  if o.name.startswith(('body_door','chrome_door','interior_dark_door')):continue
  if o.name in bpy.data.objects:bpy.data.objects.remove(o,do_unlink=True)
for o in list(bpy.data.objects):
 if o.type!='MESH' or not o.parent or o.parent.name!='closed_cabin':continue
 points=[W(o.matrix_world@v.co) for v in o.data.vertices]
 if not points:continue
 lo=[min(p[i] for p in points) for i in range(3)];hi=[max(p[i] for p in points) for i in range(3)]
 if .05<lo[0]<.10 and .30<hi[0]<.36 and .34<lo[1]<.38 and .82<hi[1]<.85:bpy.data.objects.remove(o,do_unlink=True)

# Preserve the full editable vehicle, but export only the replacement assemblies.
for o in bpy.context.selected_objects:o.select_set(False)
for o in new:o.select_set(True)
output=os.path.join(BASE,'../apex/public/models/ferrari-carbon-interior.glb')
bpy.ops.export_scene.gltf(filepath=output,export_format='GLB',use_selection=True,export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
for side in ['L','R']:
 o=bpy.data.objects['upgrade_door_'+side];world=o.matrix_world.copy()
 o.parent=bpy.data.objects['door_'+side];o.matrix_world=world
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BASE,'Ferrari-458-fitted.blend'))
print('EXPORTED FITTED ASSEMBLIES',output)







