"""Preserve the authored GT3 geometry; bake scale and rig real door/wheel parts."""
import bpy,bmesh,json,os
from mathutils import Matrix,Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE=os.path.join(ROOT,'tools/generated/porsche')
bpy.ops.wm.open_mainfile(filepath=os.path.join(BASE,'source.blend'))
sources=[o for o in bpy.context.scene.objects if o.type=='MESH']
worlds={o.name:o.matrix_world.copy() for o in sources}
transform=Matrix(((0,100,0,0),(-100,0,0,0),(0,0,100,.00528),(0,0,0,1)))
root=bpy.data.objects.new('Porsche GT3 992.2',None);bpy.context.scene.collection.objects.link(root)
def group(name,point):
 o=bpy.data.objects.new(name,None);bpy.context.scene.collection.objects.link(o);o.parent=root;o.location=point;return o
doors=[group('Porsche door L',(-.73,-.79,.70)),group('Porsche door R',(-.73,.79,.70))]
wheels=[]
for o in sources:
 if 'Wheel1C' not in o.name:continue
 pts=[transform@worlds[o.name]@Vector(v) for v in o.bound_box]
 center=Vector([(min(p[i] for p in pts)+max(p[i] for p in pts))/2 for i in range(3)])
 wheels.append((o,group('Porsche wheel '+str(len(wheels)),center)))
wheel_groups={o.name:g for o,g in wheels}
uv_parts=json.load(open(os.path.join(BASE,'uv-components.json')))
uv_by_object={}
for part in uv_parts:uv_by_object.setdefault(part['object'],[]).append(part)
upholstery=bpy.data.materials.get('Porsche upholstery')
if not upholstery:
 source_mat=next(m for m in bpy.data.materials if '2025InteriorA_' in m.name)
 upholstery=source_mat.copy();upholstery.name='Porsche upholstery'
 principled=next(n for n in upholstery.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 for input_name in ['Base Color','Alpha','Metallic','Normal']:
  for link in list(principled.inputs[input_name].links):upholstery.node_tree.links.remove(link)
 principled.inputs['Base Color'].default_value=(1,1,1,1)
 principled.inputs['Metallic'].default_value=0
 principled.inputs['Roughness'].default_value=.78
 principled.inputs['Alpha'].default_value=1
 upholstery.surface_render_method='DITHERED'
backing=upholstery.copy();backing.name='Porsche door backing'
backing_bsdf=next(n for n in backing.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
backing_bsdf.inputs['Base Color'].default_value=(.018,.02,.021,1)
backing_bsdf.inputs['Roughness'].default_value=.82
manifest=[]
for source in sources:
 world=worlds[source.name];points=[world@v.co for v in source.data.vertices]
 partitions={}
 if source.name in wheel_groups:
  partitions[(wheel_groups[source.name],False)]=list(range(len(source.data.polygons)))
 else:
  # Use complete UV/edge-connected pieces across every material. The source
  # welds window seals, carbon inserts and speaker meshes to unrelated cabin
  # geometry at shared points; positional connected-components miss those parts.
  groups={i:r['faces'] for i,r in enumerate(uv_by_object[source.name])}
  for faces in groups.values():
   vertices={i for fi in faces for i in source.data.polygons[fi].vertices};p=[points[i]*100 for i in vertices]
   lo=Vector([min(v[i] for v in p) for i in range(3)]);hi=Vector([max(v[i] for v in p) for i in range(3)])
   interior='_Interior_Geo' in source.name
   # Both logo backings close openings in the headrest. Preserve and dye them;
   # remove only the separate 15-face lettering overlay.
   seat_logo=interior and len(faces) in (37,16,15) and lo.z>.95 and hi.z<1.03 and lo.y>.40 and hi.y<.47 and max(abs(lo.x),abs(hi.x))<.42
   if seat_logo and len(faces)==15:continue
   # Thin atlas ribbons between the two hinges are trim/decal overlays, not
   # structural hardware. Without the game mask they become floating flaps.
   hinge_ribbon=interior and len(faces)==138 and min(abs(lo.x),abs(hi.x))>.76 and hi.y<-.63 and lo.y>-.71 and lo.z>.50 and hi.z<.70
   if hinge_ribbon:continue
   # Inboard dashboard switches must stay on the body, not float with the door.
   threshold=.65 if interior else .56
   side=0 if lo.x>threshold else 1 if hi.x<-threshold else None
   is_door=side is not None and lo.y>(-.705 if interior else -.75) and hi.y<.59 and lo.z>(.265 if interior else .20) and hi.z<(1.0 if interior else 1.25)
   # The little black A-pillar foot seals belong to the stationary frame.
   # Broad position-only door selection used to pull them through the fender.
   if '_Coloured_Geo' in source.name and hi.y<-.56 and max(abs(lo.x),abs(hi.x))<.78:is_door=False
   # Rear window/seat-belt anchors stay on the B-pillar, not on the door glass.
   if ('_Base_Geo' in source.name or '_Coloured_Geo' in source.name) and lo.y>.47 and lo.z>.89 and max(abs(lo.x),abs(hi.x))<.72:is_door=False
   if '_Badge_Geo' in source.name and lo.z<.6 and max(abs(lo.x),abs(hi.x))<.62:is_door=False
   target=doors[side] if is_door else root
   # Seat cushions/backrests and door trim receive a neutral dyeable base.
   # Keep steering, labels, dashboard, seat hardware and carbon on their atlas.
   seat=interior and min(abs(lo.x),abs(hi.x))>.06 and max(abs(lo.x),abs(hi.x))<.615 and lo.y>-.30 and hi.y<.54 and lo.z>.18 and (hi.z>.55 or (lo.z>.35 and hi.z>.45)) and len(faces)>20
   # Dye the broad trim surfaces, not atlas decals, locks, hinge pins or wiring.
   # Those small pieces need their original color and cutout mask.
   door_trim=is_door and len(faces)>50 and max(hi.y-lo.y,hi.z-lo.z)>.12
   recolor=interior and (door_trim or seat or seat_logo)
   # This connected shell wraps behind the door card and into the hinge edge.
   # It is the dark structural backing, not exposed upholstery.
   if interior and is_door and len(faces)==435 and hi.z-lo.z>.65:recolor='backing'
   partitions.setdefault((target,recolor),[]).extend(faces)
 for (target,recolor),faces in partitions.items():
  if not faces:continue
  data=source.data.copy();original_normals=[n.vector.copy() for n in source.data.corner_normals]
  loop_ids=data.attributes.new('source_loop','INT','CORNER')
  for i,item in enumerate(loop_ids.data):item.value=i
  bm=bmesh.new();bm.from_mesh(data);bm.faces.ensure_lookup_table();keep=set(faces)
  bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index not in keep],context='FACES')
  bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(data);bm.free()
  bake=Matrix.Translation(-target.location)@transform@world
  data.transform(bake)
  normal_matrix=bake.to_3x3().inverted().transposed()
  data.normals_split_custom_set([(normal_matrix@original_normals[item.value]).normalized() for item in data.attributes['source_loop'].data])
  data.attributes.remove(data.attributes['source_loop'])
  if recolor:
   data.materials.clear();data.materials.append(backing if recolor=='backing' else upholstery)
   for poly in data.polygons:poly.material_index=0
  o=bpy.data.objects.new(source.name,data);bpy.context.scene.collection.objects.link(o);o.parent=target
  if target in doors and '_Window' in source.name:o.name='Porsche door glass '+str(doors.index(target))
  if 'Calliper' in source.name:o.name='Fixed wheel hardware Porsche '+source.name
  manifest.append({'mesh':o.name,'parent':target.name,'triangles':len(data.polygons)})
 bpy.data.objects.remove(source,do_unlink=True)
# Remove imported transform empties now that all mesh transforms are baked.
for o in list(bpy.context.scene.objects):
 if o.type=='EMPTY' and o!=root and o not in doors and o not in [g for _,g in wheels]:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BASE,'Porsche-911-GT3-rigged.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public/models/porsche-911-gt3.glb'),export_format='GLB',export_draco_mesh_compression_enable=False)
open(os.path.join(BASE,'rig-manifest.json'),'w').write(json.dumps(manifest,indent=2))
print('DOORS',[(g.name,len(g.children)) for g in doors],'WHEELS',[(g.name,list(g.location)) for _,g in wheels])
