"""Add exportable door hardware without editing authored body/door vertices.
Blender axes: front -X, up Z. All animation is baked to standard glTF TRS.
"""
import bpy, math, os, json, sys, hashlib
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'tools/generated/draft-door-mechanisms');os.makedirs(OUT,exist_ok=True)
WORK=os.path.join(ROOT,'tools/generated/door-mechanisms');os.makedirs(WORK,exist_ok=True)
CONFIG={'porsche':('porsche-911-gt3.glb',['Porsche door L','Porsche door R']), 'ferrari':('ferrari-italia-complete.glb',['door_L','door_R']), 'revuelto':('lamborghini-revuelto.glb',[])}
V=Vector

def empty(name,parent=None,loc=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.scene.collection.objects.link(o);o.parent=parent;o.location=loc;return o

def material(name,color,metal,rough):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 return m

def mesh_finish(o,name,parent,mat):
 o.name=name;o.parent=parent;o.data.materials.append(mat)
 for f in o.data.polygons:f.use_smooth=True
 return o

def box(name,parent,loc,size,mat):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.location=loc;o.scale=size
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 bevel=o.modifiers.new('Machined rounded edges','BEVEL');bevel.width=.002;bevel.segments=2
 bpy.ops.object.modifier_apply(modifier=bevel.name)
 return mesh_finish(o,name,parent,mat)

def cylinder(name,parent,loc,radius,depth,mat,axis='Z',vertices=16):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth)
 o=bpy.context.object;o.location=loc
 if axis=='Y':o.rotation_euler.x=math.pi/2
 if axis=='X':o.rotation_euler.y=math.pi/2
 return mesh_finish(o,name,parent,mat)

def bolts(parent,center,axis,mat):
 for delta in [-.022,.022]:
  p=V(center);p.z+=delta
  cylinder('Bolt_M8_hex',parent,p,.007,.006,mat,axis,6)
  cylinder('Bolt_M8_washer',parent,p,.009,.0015,mat,axis,16)

def beam(name,parent,a,b,width,mat):
 a,b=V(a),V(b);o=box(name,parent,(a+b)*.5,(width,width,(b-a).length),mat);o.rotation_mode='QUATERNION';o.rotation_quaternion=(b-a).to_track_quat('Z','Y');return o

def mesh_world(o):return [o.matrix_world@v.co for v in o.data.vertices]
def tree(points,polys):return BVHTree.FromPolygons(points,polys,all_triangles=False,epsilon=0)
def painted(o):return any(('Paint' in m.name or 'paint' in m.name) for m in o.data.materials if m)
def smooth(p,a,b):
 t=max(0,min(1,(p-a)/(b-a)));return t*t*(3-2*t)

def build(key):
 filename,door_names=CONFIG[key]
 steps=120 if key=='ferrari' else 60
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/models',filename))
 if key=='revuelto':
  basis=Matrix.Translation(V((.10516,0,.00108)))@Matrix.Rotation(-math.pi/2,4,'Z')
  for o in list(bpy.context.scene.objects):
   if o.parent is None:o.matrix_world=basis@o.matrix_world
 bpy.context.view_layer.update()
 originals=[o for o in bpy.context.scene.objects if o.type=='MESH']
 baseline={o.name:[tuple(v) for v in mesh_world(o)] for o in originals}
 doors=[]
 if key=='revuelto':
  for code,side in [('L',-1),('R',1)]:
   d=empty('Revuelto_door_'+code,loc=(-1.10,side*.86,.64));doors.append(d);bpy.context.view_layer.update()
   for o in originals:
    if o.name.startswith(('Door'+code+'F_','DoorCard'+code+'F','WingMirror'+code+'_','MirrorBase'+code+'_','Glass'+code+'M_')):
     w=o.matrix_world.copy();o.parent=d;o.matrix_world=w
 else:doors=[bpy.data.objects[n] for n in door_names]
 bpy.context.view_layer.update()
 moving=[[o for o in d.children_recursive if o.type=='MESH'] for d in doors]
 fixed=[o for o in originals if all(o not in ms for ms in moving)]
 # Only external painted panels determine new body collisions. Existing closed
 # seams may overlap; record baseline intersections separately from new ones.
 fixed_paint=[o for o in fixed if painted(o)]
 fp=[];ff=[]
 for o in fixed_paint:
  off=len(fp);fp+=mesh_world(o);ff += [[v+off for v in f.vertices] for f in o.data.polygons]
 ft=tree(fp,ff)
 rig=empty('DoorMechanisms_'+key)
 steel=material('Hinge satin zinc steel',(.38,.41,.43),.88,.3)
 dark=material('Hinge forged dark alloy',(.07,.085,.095),.8,.36)
 chrome=material('Hinge polished piston',(.62,.66,.7),1,.19)
 rubber=material('Hinge EPDM rubber',(.012,.016,.018),0,.86)
 bronze=material('Hinge bronze bush',(.28,.18,.065),.8,.38)
 report={'car':key,'original_vertices':sum(len(v) for v in baseline.values()),'sides':[]}
 mechanisms=[]
 for i,d in enumerate(doors):
  code='L' if i==0 else 'R';side=1 if d.matrix_world.translation.y>0 else -1
  rest=d.matrix_world.copy();origin=rest.translation.copy();verts=[];faces=[]
  for o in moving[i]:
   if not painted(o):continue
   off=len(verts);verts+=mesh_world(o);faces += [[v+off for v in f.vertices] for f in o.data.polygons]
  baseline_hits=set(tree(verts,faces).overlap(ft))
  tilt=0
  def pose(p,pivot):
   if key!='revuelto':return Matrix.Translation(pivot)@Matrix.Rotation(side*math.radians(70)*p,4,'Z')@Matrix.Translation(-pivot)
   release=smooth(p,0,.25);lift=smooth(p,.2,1)
   offset=V((0,side*.035,0))
   return Matrix.Translation(pivot)@Matrix.Rotation(side*.21*release,4,'Z')@Matrix.Translation(offset)@Matrix.Rotation(-math.radians(72)*lift,4,'Y')@Matrix.Translation(-offset)@Matrix.Translation(-pivot)
  # Fit a fixed physical hinge axis; no translating the entire door outwards.
  candidates=[]
  lateral=[.84,.86,.88,.90,.92,.94] if key=='porsche' else ([.94,.96,.98,1.0] if key=='ferrari' else [.86,.9,.94])
  for y in lateral:
   for dx in ([0,-.025,.025,-.05] if key=='ferrari' else [0,-.025,.025]):
    for tilt in ([0] if key=='ferrari' else [0]):
     pivot=V((origin.x+dx,side*y,origin.z));counts=[]
     for p in [n/60 for n in range(1,61)]:
      mat=pose(p,pivot);hits=set(tree([mat@v for v in verts],faces).overlap(ft))-baseline_hits;counts.append(len(hits))
     candidates.append((sum(counts),abs(y-abs(origin.y))+abs(dx)+abs(tilt)*.1,pivot,counts,tilt))
  candidates.sort(key=lambda c:(c[0],c[1]));count,_,pivot,counts,tilt=candidates[0]
  corrections=[V((0,0,0)) for _ in range(steps+1)]
  if key=='ferrari':
   # A compact floating hinge carrier provides millimetric clearance for the
   # authored jamb/latch. The door shell remains completely rigid.
   offsets=sorted([V((x*.003,side*y*.003,0)) for x in range(-10,11) for y in range(-3,14)],key=lambda v:v.length_squared)
   for n in range(1,steps+1):
    raw=pose(n/steps,pivot);points=[raw@v for v in verts]
    previous=corrections[n-1]
    if previous.length<.004 and not (set(tree(points,faces).overlap(ft))-baseline_hits):continue
    offsets.sort(key=lambda v:(v-previous*.7).length_squared+v.length_squared*.08)
    best=(100000,None)
    for shift in offsets:
     hits=len(set(tree([v+shift for v in points],faces).overlap(ft))-baseline_hits)
     if hits<best[0]:best=(hits,shift.copy())
     if not hits:break
    corrections[n]=best[1]
   raw_pose=pose
   def pose(p,pivot):
    t=max(0,min(steps,p*steps));a=int(t);b=min(steps,a+1)
    shift=corrections[a].lerp(corrections[b],t-a)
    return Matrix.Translation(shift)@raw_pose(p,pivot)
   print('CARRIER',code,[(n,[round(v,4) for v in shift]) for n,shift in enumerate(corrections) if shift.length>.0001],flush=True)
  print(key,code,'axis',list(pivot),'new painted-panel intersections',counts,flush=True)
  anchor=empty('DoorAnchor_'+code,rig);anchor.matrix_world=rest
  w=d.matrix_world.copy();d.parent=anchor;d.matrix_world=w
  # Hardware local coordinates centred on the fitted axis.
  hardware_basis=Matrix.Translation(pivot)

  housing=empty('HingeHousing_'+code,rig);housing.matrix_world=hardware_basis
  leaf=empty('HingeLeaf_'+code,rig,pivot)
  animated=[anchor,leaf];dynamic=[]
  carrier=empty('HingeCarrier_'+code,rig,pivot) if key=='ferrari' else housing
  if key=='ferrari':animated.append(carrier)
  if key!='revuelto':
   for z in ([-.26,.04] if key=='porsche' else [-.22,.10]):
    box('Fixed_mount_plate_'+code,housing,(-.037,-side*.048,z),(.055,.014,.085),steel)
    bolts(housing,(-.037,-side*.057,z),'Y',chrome)
    if key=='ferrari':
     box('Clearance_carrier_guide',housing,(-.037,-side*.043,z),(.088,.038,.077),dark)
     box('Clearance_carrier_slide',carrier,(-.037,-side*.043,z),(.056,.045,.064),steel)
    beam('Fixed_forged_knuckle',carrier,(-.037,-side*.043,z),(0,0,z),.027,steel)
    cylinder('Hinge_pin',carrier,(0,0,z),.009,.094,chrome)
    for dz in [-.031,.031]:cylinder('Fixed_hinge_knuckle',carrier,(0,0,z+dz),.017,.025,steel)
    cylinder('Rotating_hinge_knuckle',leaf,(0,0,z),.017,.034,steel)
    for dz in [-.018,.018]:cylinder('Bronze_bushing',leaf,(0,0,z+dz),.012,.003,bronze)
    beam('Door_leaf_bracket',leaf,(0,0,z),(.058,-side*.027,z),.026,steel)
    box('Door_mount_plate_'+code,leaf,(.065,-side*.03,z),(.024,.052,.077),steel)
    bolts(leaf,(.079,-side*.03,z),'X',chrome)
   # Sliding door check stays connected at both ends, with rubber stop.
   start=pivot+V((-.045,-side*.085,-.02));endlocal=V((.17,-side*.035,-.02))
   arm=box('Door_check_strap_'+code,rig,(0,0,0),(.018,.008,1),steel)
   socket=box('Door_check_housing_'+code,housing,(-.045,-side*.085,-.02),(.045,.045,.03),dark)
   box('Door_check_rubber_stop',leaf,endlocal,(.025,.035,.026),rubber)
   dynamic.append((arm,start,pivot+endlocal,0,1));animated.append(arm)
  else:
   for z in [-.19,.10]:
    box('Scissor_body_mount',housing,(-.04,-side*.065,z),(.07,.027,.10),dark)
    bolts(housing,(-.04,-side*.082,z),'Y',chrome)
   beam('Scissor_fixed_spine',housing,(-.04,-side*.06,-.19),(-.04,-side*.06,.10),.045,dark)
   cylinder('Scissor_release_axis',housing,(0,0,0),.019,.16,chrome)
   # Compound hinge: outward release around Z then lifting around lateral Y.
   yoke=empty('ScissorYaw_'+code,rig,pivot);animated.append(yoke)
   cylinder('Scissor_main_bearing',yoke,(0,side*.035,0),.043,.08,dark,'Y',24)
   cylinder('Scissor_main_pin',yoke,(0,side*.035,0),.018,.088,chrome,'Y',20)
   for offset in [-.028,.028]:
    beam('Scissor_lift_arm',leaf,(0,side*.035+offset,0),(.19,side*.035+offset,.045),.035,dark)
   box('Scissor_door_bracket',leaf,(.19,side*.035,.045),(.07,.10,.095),steel)
   bolts(leaf,(.22,side*.035,.045),'X',chrome)
   start=pivot+V((-.065,-side*.025,-.25));end=pivot+V((.22,side*.035,.07))
   barrel=cylinder('Gas_strut_barrel_'+code,rig,(0,0,0),.017,1,dark)
   rod=cylinder('Gas_strut_chrome_rod_'+code,rig,(0,0,0),.008,1,chrome)
   dynamic += [(barrel,start,end,0,.58),(rod,start,end,.5,1)]
   animated += [barrel,rod]
   cylinder('Gas_strut_fixed_eye',housing,start-pivot,.022,.025,steel,'Y')
   cylinder('Gas_strut_moving_eye',leaf,end-pivot,.022,.025,steel,'Y')
   box('Scissor_open_stop',housing,(.035,-side*.025,.10),(.04,.04,.035),rubber)
  # Fine, visually discrete wiring boot across the jamb.
  for j in range(9):cylinder('Wiring_boot_rib',housing,(-.035,-side*(.025+j*.006),-.06),.016,.004,rubber,'Y',12)
  matrices=[];sample_hits=[]
  for frame in range(1,steps+2):
   p=(frame-1)/steps;mat=pose(p,pivot);matrices.append(mat)
   anchor.matrix_world=mat@rest;leaf.matrix_world=mat@hardware_basis
   if key=='ferrari':carrier.matrix_world=Matrix.Translation(corrections[frame-1])@hardware_basis
   if key=='revuelto':yoke.matrix_world=Matrix.Translation(pivot)@Matrix.Rotation(side*.21*smooth(p,0,.25),4,'Z')
   for ob,start,end,a,b in dynamic:
    finish=mat@end;vec=finish-start
    ob.location=start+vec*((a+b)/2);ob.rotation_mode='QUATERNION';ob.rotation_quaternion=vec.to_track_quat('Z','Y');ob.scale.z=vec.length*(b-a)
   for ob in animated:
    ob.rotation_mode='QUATERNION'
    ob.keyframe_insert('location',frame=frame);ob.keyframe_insert('rotation_quaternion',frame=frame);ob.keyframe_insert('scale',frame=frame)
   if True:
    hits=set(tree([mat@v for v in verts],faces).overlap(ft))-baseline_hits;sample_hits.append({'frame':frame,'new_intersections':len(hits)})

  for ob in animated:
   action=ob.animation_data.action;track=ob.animation_data.nla_tracks.new();track.name='Door_'+code+'_Open'
   strip=track.strips.new(action.name,1,action);ob.animation_data.action=None
  report['sides'].append({'side':code,'pivot':list(pivot),'axis_tilt':tilt,'carrier_offsets_m':[list(v) for v in corrections],'fit_intersections':counts,'sweep':sample_hits,'baseline_intersections':len(baseline_hits)})
  mechanisms.append(anchor)
 bpy.context.scene.render.fps=steps//2;bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=steps+1;bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
 error=max((V(v)-o.matrix_world@o.data.vertices[i].co).length for o in originals for i,v in enumerate(baseline[o.name]))
 report['max_closed_vertex_error_m']=error
 assert error<.00001,('Authored geometry changed',error)
 export=dict(export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=True,export_extras=True)
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK,key+'-door-mechanisms.blend'))
 for o in bpy.context.scene.objects:
  legacy=key=='revuelto' and 'Piston' in o.name
  o.select_set(not legacy)
  if legacy:o.hide_render=True;o.hide_set(True)
 bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,key+'-complete.glb'),use_selection=True,**export)
 # Companion rig includes empty anchors, never duplicate body/door surfaces.
 for o in bpy.context.scene.objects:o.select_set(False)
 rig.select_set(True)
 for o in rig.children_recursive:
  if o not in originals and o not in doors:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,key+'-mechanisms.glb'),use_selection=True,**export)
 import runpy
 close_clip=runpy.run_path(os.path.join(ROOT,'tools/add-door-close-clips.py'))['add_close']
 for suffix in ['complete','mechanisms']:close_clip(os.path.join(OUT,key+'-'+suffix+'.glb'))
 report['hardware_meshes']=sum(o.type=='MESH' for o in rig.children_recursive if o not in originals)
 json.dump(report,open(os.path.join(WORK,key+'-verification.json'),'w'),indent=2)
 print('DONE',key,'closed vertex error',error,flush=True)

for key in (sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else CONFIG):build(key)

