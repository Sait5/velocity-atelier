"""The door apertures of the "Aston Martin Valhalla" BeamNG.drive mod (S7471C): its body is finished round the openings
(a smooth sill with the seal channel running round the frame, clean front and rear jambs), where the Ddiaz body, never
seen with the doors up, has rough game triangles. Writes tools/source-assets/cars/valhalla-apertures.glb (object
'apertures', source axes: front -y, left +x, metres; geometry only): the mod's chassis, quarter panels and front hood
round both openings, which tools/prepare-valhalla-model.py fits in where the shut doors hide it.
Usage: node tools/extract-collada-parts.cjs <mod>/vehicles/am/am.dae <parts.json> am_chassis am_quarterpanel_L am_quarterpanel_R am_fronthood
       blender -b --factory-startup --python tools/extract-valhalla-apertures.py -- <parts.json>"""
import bpy,bmesh,sys,os,json
from mathutils import Vector
parts=json.load(open(sys.argv[sys.argv.index('--')+1]))
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'source-assets','cars','valhalla-apertures.glb')
round_openings=lambda c:.48<abs(c.x)<1.08 and -1.1<c.y<.6 and c.z<1.27
bpy.ops.wm.read_factory_settings(use_empty=True)
V=[];T=[]
for name in ('am_chassis','am_quarterpanel_L','am_quarterpanel_R','am_fronthood'):
 src=parts[name];P=[Vector(v) if None not in v else None for v in src['V']];idx={}
 for t in src['T']:
  if any(P[i] is None for i in t) or not round_openings((P[t[0]]+P[t[1]]+P[t[2]])/3):continue
  tt=[]
  for i in t:
   if i not in idx:idx[i]=len(V);V.append(P[i])
   tt.append(idx[i])
  T.append(tt)
me=bpy.data.meshes.new('apertures');me.from_pydata(V,[],T);me.update()
bm=bmesh.new();bm.from_mesh(me);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.0002);bm.to_mesh(me);bm.free()
o=bpy.data.objects.new('apertures',me);bpy.context.scene.collection.objects.link(o)
print('APERTURES',len(me.polygons),'faces')
bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',export_materials='NONE',export_normals=True,export_texcoords=False)
print('APERTURES written',OUT,os.path.getsize(OUT))
