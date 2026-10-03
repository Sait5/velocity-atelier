import bpy,bmesh,os,json
from mathutils import Matrix,Vector
BASE=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../blender'))
bpy.ops.wm.open_mainfile(filepath=os.path.join(BASE,'italia.blend'))
bpy.context.view_layer.update()
sources=[o for o in bpy.context.scene.objects if o.type=='MESH']
worlds={o.name:o.matrix_world.copy() for o in sources}
points=[worlds[o.name]@v.co for o in sources for v in o.data.vertices]
offset=Vector((-(min(p.y for p in points)+max(p.y for p in points))/2,
               (min(p.x for p in points)+max(p.x for p in points))/2,
               -min(p.z for p in points)))
transform=Matrix.Translation(offset)@Matrix(((0,1,0,0),(-1,0,0,0),(0,0,1,0),(0,0,0,1)))
root=bpy.data.objects.new('ferrari_complete',None);bpy.context.scene.collection.objects.link(root)
def group(name,point):
 o=bpy.data.objects.new(name,None);bpy.context.scene.collection.objects.link(o);o.parent=root;o.location=point;return o
doors=[group('door_L',Vector((-.735,.775,.50))+offset),group('door_R',Vector((-.735,-.775,.50))+offset)]
centers=[(-.8004,1.49645,.21285),(.8004,1.49645,.21285),(.8392,-1.15575,.18325),(-.8392,-1.15575,.18325)]
wheels=[group('wheel_'+str(i),transform@Vector(c)) for i,c in enumerate(centers)]
manifest=[]
for source in sources:
 name=source.name;world=worlds[name]
 if '_s_wheel_wheel_' in name or '_s_lod0_rotor' in name or 'M_Tire_Highcar' in name:
  pts=[world@v.co for v in source.data.vertices];parts=[[] for _ in centers]
  for f in source.data.polygons:
   center=sum((pts[i] for i in f.vertices),Vector())/len(f.vertices)
   i=min(range(4),key=lambda i:(center-Vector(centers[i])).length_squared);parts[i].append(f.index)
  for i,faces in enumerate(parts):
   if not faces:continue
   data=source.data.copy();bm=bmesh.new();bm.from_mesh(data);bm.faces.ensure_lookup_table();keep=set(faces)
   bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index not in keep],context='FACES')
   bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(data);bm.free()
   data.transform(Matrix.Translation(-wheels[i].location)@transform@world)
   o=bpy.data.objects.new(name+'_'+str(i),data);bpy.context.scene.collection.objects.link(o);o.parent=wheels[i]
   manifest.append(dict(source=name,assembly=wheels[i].name,faces=len(data.polygons)))
  bpy.data.objects.remove(source,do_unlink=True)
 else:
  target=root
  if any(t in name for t in ['doorLF_','doorcardLF_','glassLF_','_mirrorL_']):target=doors[1]
  elif any(t in name for t in ['doorRF_','doorcardRF_','glassRF_','_mirrorR_']):target=doors[0]
  source.parent=None;source.matrix_world=Matrix.Identity(4)
  source.data.transform(Matrix.Translation(-target.location)@transform@world)
  source.parent=target
  manifest.append(dict(source=name,assembly=target.name,faces=len(source.data.polygons)))
for o in list(bpy.context.scene.objects):
 if o.type!='MESH' and o!=root and o not in doors+wheels:bpy.data.objects.remove(o,do_unlink=True)
# Preserve native UVs and normal/detail maps. Make only the leather albedo
# tintable so the existing six upholstery finishes remain functional.
for mat in bpy.data.materials:
 if not mat.use_nodes:continue
 bs=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
 if mat.name=='bump_leather_cp' and bs and bs.inputs['Base Color'].is_linked:
  node=bs.inputs['Base Color'].links[0].from_node
  if node.type=='TEX_IMAGE' and node.image:
   image=node.image.copy();image.name='Italia tintable leather detail';values=list(image.pixels)
   for i in range(0,len(values),4):
    light=min(1,.62+sum(values[i:i+3])/3*.7);values[i:i+3]=[light]*3
   image.pixels.foreach_set(values);image.pack();node.image=image
for o in bpy.context.scene.objects:o.select_set(True)
out=os.path.join(BASE,'../apex/public/models/ferrari-italia-complete.glb')
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',use_selection=True,export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BASE,'Ferrari-complete.blend'))
with open(os.path.join(BASE,'../apex/tools/complete-italia-manifest.json'),'w') as f:json.dump(dict(offset=list(offset),parts=manifest),f,indent=2)
print('COMPLETE ITALIA',len(manifest),'parts; door children',[len(d.children) for d in doors],'; wheels',[len(w.children) for w in wheels])

