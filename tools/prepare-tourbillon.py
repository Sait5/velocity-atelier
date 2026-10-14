import bpy,os,json,bmesh
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('tools/generated/Tourbillon-parts.blend'))
rows={r['name']:r for r in json.load(open('tools/generated/tourbillon-parts.json'))}
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name in rows]
# The source-to-site axis swap has negative determinant. Restore winding once
# from the immutable parts file so exterior surfaces face outwards again.
for data in {o.data for o in meshes}:data.flip_normals()
source_faces=sum(len(o.data.polygons) for o in meshes)
root=bpy.data.objects.new('Tourbillon',None);bpy.context.collection.objects.link(root)
groups={}
for i in range(2):
 o=bpy.data.objects.new('Tourbillon_door_'+str(i),None);bpy.context.collection.objects.link(o);o.parent=root;o.location=(-1.04,(1 if i==0 else -1)*.71,.78);groups['door'+str(i)]=o
wheelcentres={}
for i in range(4):
 r=[rows[o.name] for o in meshes if '3DWheel1A_' in rows[o.name]['mat'] and (0 if (rows[o.name]['lo'][0]+rows[o.name]['hi'][0])<0 else 2)+(0 if (rows[o.name]['lo'][1]+rows[o.name]['hi'][1])>0 else 1)==i]
 lo=[min(a['lo'][k] for a in r) for k in range(3)];hi=[max(a['hi'][k] for a in r) for k in range(3)]
 o=bpy.data.objects.new('Tourbillon_wheel_'+str(i),None);bpy.context.collection.objects.link(o);o.parent=root;o.location=tuple((lo[k]+hi[k])/2 for k in range(3));groups['wheel'+str(i)]=o
# Match small inner pieces to the actual closed door surface, rather than
# assigning dashboard controls merely because they sit near a door jamb.
shells=[]
for side in range(2):
 verts=[];faces=[]
 for obj in meshes:
  row=rows[obj.name]
  if (0 if row['lo'][1]+row['hi'][1]>0 else 1)!=side:continue
  if ('Paint_' in row['mat'] and row['faces'] in [1551,107]) or ('InteriorA_' in row['mat'] and row['faces'] in [941,642,308,330]) or ('Carbon1' in row['mat'] and row['faces'] in [222,256]):
   start=len(verts);verts.extend(v.co.copy() for v in obj.data.vertices);faces.extend([start+i for i in p.vertices] for p in obj.data.polygons)
 shells.append(BVHTree.FromPolygons(verts,faces))
batches={};assignments=[]
for o in meshes:
 r=rows[o.name];lo=r['lo'];hi=r['hi'];mat=r['mat'];side=0 if lo[1]+hi[1]>0 else 1;key='body'
 if '3DWheel1A_' in mat:key='wheel'+str((0 if lo[0]+hi[0]<0 else 2)+side)
 elif lo[0]>-1.115 and hi[0]<.615 and ((lo[1]>.095) or (hi[1]<-.095)):
  centre=abs((lo[1]+hi[1])/2)
  edge=min(abs(lo[1]),abs(hi[1]));width=hi[0]-lo[0]
  if centre>.50 and any(t in mat for t in ['Paint_','col_2','Window_']):key='door'+str(side)
  if 'Paint_' in mat and r['faces'] in [159,2]:key='body' # fixed front jamb, not a door leaf
  if 'Carbon' in mat and edge>.64 and lo[2]>.33:key='door'+str(side)
  if 'Carbon' in mat and r['faces']==222:key='door'+str(side)
  if 'Carbon' in mat and r['faces']==43 and width>1 and edge>.45:key='door'+str(side)
  if 'Coloured' in mat and r['faces']==310 and width>1 and edge>.9:key='door'+str(side)
  if 'Interior' in mat and edge>.62 and lo[2]>.35 and hi[2]<.80:key='door'+str(side)
  if 'InteriorA_' in mat and r['faces'] in [642,941,524,308,330] and edge>.45:key='door'+str(side)

 if key=='body' and lo[0]>-1.115 and hi[0]<.615 and min(abs(lo[1]),abs(hi[1]))>.45 and lo[2]>.33:
  samples=list(o.data.vertices)[::max(1,len(o.data.vertices)//48)]
  near=sum(1 for v in samples if shells[side].find_nearest(v.co)[3]<.025)
  if samples and near/len(samples)>.9:key='door'+str(side)
 # The roof, monocoque door aperture and sill are fixed structural surfaces.
 # Their bounding boxes overlap the door but they must never rise with it.
 if 'Carbon1' in mat and r['faces'] in [243,443,1095,849,3312,3313] and hi[2]>1.1:key='body'
 if 'col_2' in mat:key='body'
 if 'Interior' in mat and hi[2]>1.12:key='body'
 if 'InteriorA_' in mat and r['faces'] in [1256,1258,1020,1018] and lo[0]>-.04 and hi[0]<.3:
  upholstery=bpy.data.materials.get('Tourbillon InteriorSeatColourZoneA')
  if not upholstery:upholstery=o.data.materials[0].copy();upholstery.name='Tourbillon InteriorSeatColourZoneA'
  o.data.materials[0]=upholstery;mat=upholstery.name;key='body'
 if key.startswith('door') and '2026Window_' in mat and r['faces']==89:
  clone=bpy.data.materials.get('Tourbillon sliding glass')
  if not clone:clone=o.data.materials[0].copy();clone.name='Tourbillon sliding glass'
  o.data.materials[0]=clone;mat=clone.name
 batches.setdefault((key,mat),[]).append(o)
 assignments.append(dict(name=r['name'],material=r['mat'],faces=r['faces'],group=key))
for (key,mat),objects in batches.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.view_layer.objects.active;o.name=key+'_'+mat
 # Keep the authored split normals and smooth edges after grouping.
 parent=root if key=='body' else groups[key];o.parent=parent;o.location=-parent.location if parent!=root else (0,0,0)
for o in list(bpy.context.scene.objects):
 if o==root or o.parent==root or o.parent in groups.values():continue
 bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.object.select_all(action='SELECT')
assert sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')==source_faces,'Lost source geometry'
json.dump(assignments,open('tools/generated/tourbillon-assignments.json','w'),indent=2)
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('tools/generated/Tourbillon-ready.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.abspath('public/models/bugatti-tourbillon.glb'),export_format='GLB',export_yup=True,export_materials='EXPORT',export_animations=False,use_selection=True)
print('RIG',[(k,list(v.location)) for k,v in groups.items()],flush=True)
