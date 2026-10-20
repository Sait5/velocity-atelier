"""The end zones of the doors of the "Aston Martin Valhalla" BeamNG.drive mod (S7471C): front end, rear end and bottom,
where its doors are built through (shut faces, the front frame with its hinge column, the latch plate) and the Ddiaz
doors are open, ragged shells. Writes tools/source-assets/cars/valhalla-door-ends.glb (objects 'door ends L' and
'door ends R', source axes: front -y, left +x, metres; geometry only), which tools/prepare-valhalla-model.py fits in
where the shut car hides it.
Usage: node tools/extract-collada-parts.cjs <mod>/vehicles/am/am.dae <parts.json> am_door_L am_door_R
       blender -b --factory-startup --python tools/extract-valhalla-door-ends.py -- <parts.json>"""
import bpy,bmesh,sys,os,json
from mathutils import Vector
parts=json.load(open(sys.argv[sys.argv.index('--')+1]))
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'source-assets','cars','valhalla-door-ends.glb')
def end_zone(s):
 """s: source axes, left door (mirror x for the right one): the bottom, the front end below the window, and a strip
 9 cm deep along the slanted rear edge ((y, z) (.17, .235) -> (.39, .77) -> (.43, 1.10))."""
 if s.z<.30:return True
 if s.y<-.84 and s.z<.82:return True
 ry=.17+(.39-.17)*(s.z-.235)/(.77-.235) if s.z<.77 else .39+(.43-.39)*(s.z-.77)/(1.10-.77)
 return s.y>ry-.09
bpy.ops.wm.read_factory_settings(use_empty=True)
for side,tag in ((1,'L'),(-1,'R')):
 src=parts['am_door_'+tag];V=[Vector(v) if None not in v else None for v in src['V']]
 keep=[t for t in src['T'] if all(V[i] is not None for i in t) and end_zone((lambda c:Vector((c.x*side,c.y,c.z)))((V[t[0]]+V[t[1]]+V[t[2]])/3))]
 used=sorted({i for t in keep for i in t});idx={v:k for k,v in enumerate(used)}
 me=bpy.data.meshes.new('door ends '+tag);me.from_pydata([V[i] for i in used],[],[[idx[i] for i in t] for t in keep]);me.update()
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.0002);bm.to_mesh(me);bm.free()
 o=bpy.data.objects.new('door ends '+tag,me);bpy.context.scene.collection.objects.link(o)
 print('ENDS',tag,len(me.polygons),'faces')
bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',export_materials='NONE',export_normals=True,export_texcoords=False)
print('ENDS written',OUT,os.path.getsize(OUT))
