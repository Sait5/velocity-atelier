import bpy,json,os
from mathutils import Matrix,Vector
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('tools/generated/Tourbillon-source.blend'))
objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in objs:
 m=o.matrix_world.copy();o.parent=None;o.data.transform(m);o.matrix_world=Matrix.Identity(4)
 o.data.transform(Matrix(((0,100,0,0),(100,0,0,0),(0,0,100,0),(0,0,0,1))))
 if not o.name.startswith('polySurface'):
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='LOOSE');bpy.ops.object.mode_set(mode='OBJECT')
rows=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or not o.data.materials or not o.data.vertices:continue
 pts=[v.co for v in o.data.vertices];lo=[min(p[i] for p in pts) for i in range(3)];hi=[max(p[i] for p in pts) for i in range(3)]
 rows.append(dict(name=o.name,mat=o.data.materials[0].name,lo=lo,hi=hi,faces=len(o.data.polygons)))
Path=None
open('tools/generated/tourbillon-parts.json','w').write(json.dumps(rows))
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('tools/generated/Tourbillon-parts.blend'))
