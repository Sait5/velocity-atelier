import bpy,bmesh,os,json
from mathutils import Matrix,Vector
BASE=os.path.abspath(os.path.join(os.path.dirname(__file__),"../../blender"))
bpy.ops.wm.open_mainfile(filepath=os.path.join(BASE,'italia.blend'))
sources=[o for o in bpy.data.objects if o.type=='MESH' and ('_s_wheel_wheel_' in o.name or '_s_lod0_rotor' in o.name or '_s_lod0_caliper' in o.name or 'M_Tire_Highcar' in o.name)]
centers=[(-.8004,1.49645,.21285),(.8004,1.49645,.21285),(.8392,-1.15575,.18325),(-.8392,-1.15575,.18325)]
groups=[];manifest=[]
for i in range(4):
 w=bpy.data.objects.new('donor_wheel_'+str(i),None);bpy.context.scene.collection.objects.link(w)
 c=bpy.data.objects.new('donor_caliper_'+str(i),None);bpy.context.scene.collection.objects.link(c);groups.append((w,c))
for o in sources:
 world=o.matrix_world.copy();pts=[world@v.co for v in o.data.vertices];parts=[[] for _ in range(4)]
 for f in o.data.polygons:
  center=sum((pts[i] for i in f.vertices),Vector())/len(f.vertices)
  index=min(range(4),key=lambda i:(center-Vector(centers[i])).length_squared);parts[index].append(f.index)
 for i,fs in enumerate(parts):
  if not fs:continue
  data=o.data.copy();bm=bmesh.new();bm.from_mesh(data);bm.faces.ensure_lookup_table();kept=set(fs)
  bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index not in kept],context='FACES');bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(data);bm.free()
  x,y,z=centers[i];data.transform(Matrix(((0,.988,0,-y*.988),(-1,0,0,x),(0,0,.988,-z*.988),(0,0,0,1)))@world)
  obj=bpy.data.objects.new('donor_'+o.name+'_'+str(i),data);bpy.context.scene.collection.objects.link(obj);obj.parent=groups[i][1 if 'caliper' in o.name else 0]
  manifest.append(dict(source=o.name,assembly=obj.parent.name,faces=len(data.polygons)))
for o in list(bpy.context.scene.objects):
 if not o.name.startswith('donor_'):bpy.data.objects.remove(o,do_unlink=True)
for o in bpy.context.scene.objects:o.select_set(True)
out=os.path.join(BASE,'../apex/public/models/ferrari-donor-wheels.glb')
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',use_selection=True,export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BASE,'Ferrari-donor-wheels.blend'))
with open(os.path.join(BASE,'../apex/tools/donor-wheel-manifest.json'),'w') as f:json.dump(manifest,f,indent=2)
print('EXPORTED',len(manifest),'wheel components')

