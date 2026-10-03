"""Only donor interior surfaces; the original exterior is never exported or edited."""
import bpy,bmesh,os,json
from mathutils import Vector,Matrix
BASE=os.path.abspath(os.path.join(os.path.dirname(__file__),"../../blender"))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(BASE,'../apex/public/models/ferrari-carbon-interior.glb'))
for o in list(bpy.data.objects):
 if o.type=='MESH' and o.parent and (o.parent.name=='upgrade_seats' or o.parent.name.startswith('upgrade_door')):
  if not any(m and 'glass' in m.name.lower() for m in o.data.materials):bpy.data.objects.remove(o,do_unlink=True)
cockpit=bpy.data.objects.new('upgrade_cockpit',None);bpy.context.scene.collection.objects.link(cockpit)
manifest=[]
def evaluate_sources(sources):
 linked=[]
 for source in sources:
  o=source
  while o:
   if o.name not in bpy.context.scene.objects:bpy.context.scene.collection.objects.link(o);linked.append(o)
   o=o.parent
 bpy.context.view_layer.update()
 worlds={o:o.matrix_world.copy() for o in sources if o}
 for o,w in worlds.items():o.parent=None;o.matrix_world=w
 for o in linked:
  if o not in sources:bpy.context.scene.collection.objects.unlink(o)
evaluate_sources([o for o in bpy.context.scene.objects if o.type=='EMPTY'])
def components(o):
 pts=[o.matrix_world@v.co for v in o.data.vertices];parent=list(range(len(pts)));weld={}
 def find(i):
  while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
  return i
 def join(a,b):parent[find(a)]=find(b)
 for i,p in enumerate(pts):
  key=tuple(round(v,6) for v in p)
  if key in weld:join(i,weld[key])
  else:weld[key]=i
 for f in o.data.polygons:
  for v in f.vertices[1:]:join(f.vertices[0],v)
 groups={}
 for f in o.data.polygons:groups.setdefault(find(f.vertices[0]),[]).append(f.index)
 return pts,groups
def subset(o,faces,name,parent,transform):
 if not faces:return
 mesh=o.data.copy();bm=bmesh.new();bm.from_mesh(mesh);bm.faces.ensure_lookup_table();keep=set(faces)
 bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index not in keep],context='FACES')
 bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(mesh);bm.free()
 mesh.transform(transform@o.matrix_world)
 new=bpy.data.objects.new(name,mesh);bpy.context.scene.collection.objects.link(new);new.parent=parent;new.matrix_world=Matrix.Identity(4)
 # Keep source UVs, texture maps and authored split normals.
 manifest.append(dict(donor='speciale' if 'Speciale' in o.name else 'italia',source=o.name,assembly=parent.name,faces=len(mesh.polygons)))
 return new
italiaTransform=Matrix(((0,1,0,-.05),(-.92,0,0,0),(0,0,1,.20),(0,0,0,1)))
with bpy.data.libraries.load(os.path.join(BASE,'italia.blend'),link=False) as (src,dst):
 dst.objects=[n for n in src.objects if 'cockpit_s_seat' in n or 'cockpit_s_steering' in n or 'cockpit_s_interior_' in n]
sources=list(dst.objects)
evaluate_sources(sources)
for o in sources:
 if not o or o.type!='MESH':continue
 if any(t in o.name for t in ['headliner','mirrorMiddle','interior_glass']):continue
 pts,parts=components(o);selected=[];rear=[]
 for key,fs in parts.items():
  ids=set(i for fi in fs for i in o.data.polygons[fi].vertices);lo=Vector(tuple(min(pts[i][a] for i in ids) for a in range(3)));hi=Vector(tuple(max(pts[i][a] for i in ids) for a in range(3)))
  # The coupe roof/roof pillars and overhead lamp have no place in this Spider.
  if 'interior_' in o.name:
   if lo.z>.84 or (hi.z>1 and hi.x-lo.x>1):continue
   if lo.y>.37 and hi.x-lo.x>1 and hi.z>.8:rear.extend(fs);continue
   if (lo.x>.55 or hi.x<-.55) and lo.y<.24 and hi.y>.12:continue
  selected.extend(fs)
 if selected:
  if 'interior_' in o.name:
   selected=[fi for fi in selected if all((pts[j].z<.83 or pts[j].y<-.45) and not(pts[j].y>.25 and pts[j].z>.70) for j in o.data.polygons[fi].vertices)]
  parent=bpy.data.objects['upgrade_seats'] if '_seat' in o.name else cockpit
  subset(o,selected,'upgrade_italia_'+o.name.split('cockpit_s_')[1],parent,italiaTransform)
 if rear:
  # Skin over the closed fitted rear shell; preserve the shell above it for sealing.
  rearTransform=Matrix(((0,.1775,0,.399),(-.92,0,0,0),(0,0,.92,.10),(0,0,0,1)))
  subset(o,rear,'upgrade_italia_rear_lining',bpy.data.objects['upgrade_rear'],rearTransform)
for o in sources:
 if o and o.name in bpy.data.objects:bpy.data.objects.remove(o,do_unlink=True)
with bpy.data.libraries.load(os.path.join(BASE,'speciale.blend'),link=False) as (src,dst):
 dst.objects=[n for n in src.objects if 'Carbon2_Geo' in n or '_Interior_Geo' in n]
sources=list(dst.objects)
evaluate_sources(sources)
for o in sources:
 if not o or o.type!='MESH':continue
 pts,parts=components(o)
 for side in [-1,1]:
  fs=[]
  for key,faces in parts.items():
   ids=set(i for fi in faces for i in o.data.polygons[fi].vertices);lo=[min(pts[i][a]*100 for i in ids) for a in range(3)];hi=[max(pts[i][a]*100 for i in ids) for a in range(3)]
   if (lo[0]>.68 if side>0 else hi[0]<-.68) and lo[1]>-.82 and hi[1]<.25 and lo[2]>.24 and hi[2]<.86:fs.extend(faces)
   elif 'Interior_Geo' in o.name and lo[0]<-.65 and hi[0]>.65:
    # The donor's release/pull trim is welded to its cabin shell. Keep only
    # complete door-zone triangles, without importing the donor shell itself.
    for fi in faces:
     vs=[pts[j]*100 for j in o.data.polygons[fi].vertices]
     if all(side*p.x>.68 and -.78<p.y<.24 and .30<p.z<.845 for p in vs):fs.append(fi)
  door=bpy.data.objects['upgrade_door_R' if side>0 else 'upgrade_door_L']
  transform=Matrix(((0,118,0,.25),(-100,0,0,-side*.047),(0,0,122.4,-.05),(0,0,0,1)))
  subset(o,fs,'upgrade_speciale_door_'+str(side)+'_'+str(len(fs)),door,transform)
for o in sources:
 if o and o.name in bpy.data.objects:bpy.data.objects.remove(o,do_unlink=True)
# Source texture factors were near black; preserve maps and tune physical finish.
for mat in bpy.data.materials:
 if not mat.use_nodes:continue
 bs=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
 if not bs:continue
 if any(t in mat.name for t in ['leather','stitching','tiling_cloth','mottled']):
  bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=.72
  if not bs.inputs['Base Color'].is_linked:bs.inputs['Base Color'].default_value=(.025,.029,.027,1)
 if mat.name=='bump_leather_cp' and bs.inputs['Base Color'].is_linked:
  node=bs.inputs['Base Color'].links[0].from_node
  if node.type=='TEX_IMAGE' and node.image:
   # A neutral detail atlas lets the existing upholstery control recolor leather
   # without multiplying a dark baked albedo by another dark color.
   image=node.image.copy();image.name='Donor neutral leather detail';values=list(image.pixels)
   for i in range(0,len(values),4):
    light=min(1,.62+sum(values[i:i+3])/3*.7)
    values[i:i+3]=[light]*3
   image.pixels.foreach_set(values);image.pack();node.image=image
for o in bpy.context.scene.objects:
 if o.type=='MESH':o.select_set(True)
 else:o.select_set(o.name.startswith('upgrade_'))
out=os.path.join(BASE,'../apex/public/models/ferrari-donor-interior.glb')
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',use_selection=True,export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BASE,'Ferrari-donor-interior.blend'))
with open(os.path.join(BASE,'../apex/tools/donor-parts-manifest.json'),'w') as f:json.dump(manifest,f,indent=2)
print('DONOR INTERIOR EXPORTED',len(manifest),'source meshes',out)

