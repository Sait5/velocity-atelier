import bpy,os
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('../blender/Revuelto-Mechanism-Placed.blend'));bpy.context.scene.frame_set(241)
for name in ['Door_Mount | bolt flange','DoorJambLF_CarPaint','DoorCardLF_Leather_01']:
 o=bpy.data.objects[name];c=sum((o.matrix_world@Vector(p) for p in o.bound_box),Vector())/8
 print(name,list(c))
