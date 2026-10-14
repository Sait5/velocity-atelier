import bpy,bmesh,os,json,sys
from mathutils import Matrix as M,Vector as V
from mathutils.bvhtree import BVHTree
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
key=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'porsche'
source='porsche-911-gt3-door-assembly.glb' if key=='porsche' else 'ferrari-italia-complete.glb'
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/models',source))
if key=='ferrari':
 regions=json.load(open(os.path.join(ROOT,'tools/generated/retired-italia-hardware.json')))
 for name in set(row['name'] for row in regions):
  o=bpy.data.objects[name];bounds=[row['bounds'] for row in regions if row['name']==name]
  def retired(v):
   p=o.matrix_world@v.co
   return any(r[0]<p.x<r[1] and r[2]<p.z<r[3] and r[4]<abs(p.y)<r[5] for r in bounds)
  faces={f.index for f in o.data.polygons if all(retired(o.data.vertices[i]) for i in f.vertices)}
  normals=[n.vector.copy() for n in o.data.corner_normals];attr=o.data.attributes.new('source_corner','INT','CORNER')
  for i,x in enumerate(attr.data):x.value=i
  bm=bmesh.new();bm.from_mesh(o.data);bm.faces.ensure_lookup_table();bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index in faces],context='FACES');bm.to_mesh(o.data);bm.free()
  o.data.normals_split_custom_set([normals[x.value] for x in o.data.attributes['source_corner'].data]);o.data.attributes.remove(o.data.attributes['source_corner'])
  print('RETIRED_HARDWARE_TRIANGLES',name,len(faces),flush=True)
data=json.load(open(os.path.join(ROOT,'tools/generated',key+'-compact-hinges.json')))
C=M(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
def matrix(a):return C.inverted()@M([[a[c*4+r] for c in range(4)] for r in range(4)])@C
names=[name if name in bpy.data.objects else name.replace('_',' ') for name in data['doorNames']]
doors=[bpy.data.objects[name] for name in names]
allmoving=set(o for door in doors for o in door.children_recursive)
fp=[];ff=[];mp=[[],[]];mf=[[],[]]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or not any(m and 'paint' in m.name.lower() for m in o.data.materials):continue
 side=next((i for i,door in enumerate(doors) if o in door.children_recursive),None)
 ps,fs=(mp[side],mf[side]) if side is not None else (fp,ff)
 off=len(ps);ps.extend(o.matrix_world@v.co for v in o.data.vertices);fs.extend([[off+i for i in p.vertices] for p in o.data.polygons])
fixed=BVHTree.FromPolygons(fp,ff)
rest=[door.matrix_world.copy() for door in doors];baseline=[set(BVHTree.FromPolygons(mp[i],mf[i]).overlap(fixed)) for i in range(2)]
contacts=[]
for n,poses in enumerate(data['poses']):
 for i,values in enumerate(poses):
  transform=matrix(values)@rest[i].inverted();pairs=set(BVHTree.FromPolygons([transform@p for p in mp[i]],mf[i]).overlap(fixed))-baseline[i]
  if pairs:contacts.append({'sample':n,'door':i,'pairs':len(pairs)})
report={'car':key,'samples':241,'restContacts':[len(s) for s in baseline],'newPaintContactFrames':contacts};json.dump(report,open(os.path.join(ROOT,'tools/generated',key+'-compact-door-clearance.json'),'w'),indent=2);print('CLEARANCE',report,flush=True)
# Save a reviewable scene with the exact website hinge geometry and animation.
metal=bpy.data.materials.new('Compact hinge steel');metal.diffuse_color=(.034,.038,.042,1)
items=[]
for i,row in enumerate(data['hardware']):
 coords=row['positions'];points=[C.inverted().to_3x3()@V(coords[j:j+3]) for j in range(0,len(coords),3)];ids=row['indices'] or list(range(len(points)));faces=[ids[j:j+3] for j in range(0,len(ids),3)]
 mesh=bpy.data.meshes.new(row['name']);mesh.from_pydata(points,[],faces);node=bpy.data.objects.new(row['name']+' '+str(i),mesh);bpy.context.scene.collection.objects.link(node);mesh.materials.append(metal);node.rotation_mode='QUATERNION';items.append((node,row))
for frame in range(1,482):
 n=frame-1 if frame<=241 else 481-frame
 for i,door in enumerate(doors):door.rotation_mode='QUATERNION';door.matrix_world=matrix(data['poses'][n][i]);door.keyframe_insert('location',frame=frame);door.keyframe_insert('rotation_quaternion',frame=frame)
 for node,row in items:node.matrix_world=matrix(row['samples'][n]);node.keyframe_insert('location',frame=frame);node.keyframe_insert('rotation_quaternion',frame=frame)
scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=481;scene.render.fps=200;scene.frame_set(241)
folder=os.path.join(os.path.dirname(ROOT),'blender');filename='Porsche-Door-Hinges-Review-v2.blend' if key=='porsche' else 'Ferrari-Door-Hinges-Marked-Mounts.blend'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(folder,filename))
for o in scene.objects:
 if o.type=='MESH':o.color=(.85,.87,.88,1) if any(m and 'paint' in m.name.lower() for m in o.data.materials) else (.075,.08,.085,1)
side=1 if key=='porsche' else -1
camera=bpy.data.cameras.new('Hinge review');cam=bpy.data.objects.new('Hinge review',camera);scene.collection.objects.link(cam);scene.camera=cam
cam.location=V((-.15,-side*1.8,1.08));target=V((-.77,-side*.84,.57));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camera.type='ORTHO';camera.ortho_scale=.65
scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='OBJECT';scene.display.shading.show_cavity=True
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.filepath=os.path.join(ROOT,'tools/generated',key+'-compact-hinges-review.png');bpy.ops.render.render(write_still=True)
