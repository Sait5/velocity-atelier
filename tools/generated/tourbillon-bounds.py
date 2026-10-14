import bpy
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath='C:/Users/Admin/Documents/ChatGPT/Velocity Atelier/apex/tools/generated/Tourbillon-source.blend')
for mat in bpy.data.materials:
 objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and mat in list(o.data.materials)]
 pts=[o.matrix_world@v.co for o in objects for v in o.data.vertices]
 if pts: print(mat.name,len(objects),[round(min(p[i] for p in pts),5) for i in range(3)],[round(max(p[i] for p in pts),5) for i in range(3)])
