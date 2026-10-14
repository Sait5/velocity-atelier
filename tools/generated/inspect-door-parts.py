import bpy,os
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('tools/generated/Tourbillon-parts.blend'))
targets=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or not o.data.materials:continue
 m=o.data.materials[0].name
 if ('Carbon1' in m and o.name.endswith(('.002','.077','.078','.087','.296'))) or ('InteriorA_' in m and o.name.endswith(('.261','.918','.920','.1130'))):targets.append(o)
for o in list(bpy.context.scene.objects):
 if o not in targets:bpy.data.objects.remove(o,do_unlink=True)
mat=bpy.data.materials.new('diagnostic');mat.diffuse_color=(.55,.65,.75,1)
for i,o in enumerate(targets):
 pts=[v.co for v in o.data.vertices];center=sum(pts,Vector())/len(pts)
 o.location=Vector(((i%3)*2.3,0,-(i//3)*1.7))-center;o.data.materials.clear();o.data.materials.append(mat)
 text=bpy.data.curves.new('label','FONT');text.body=o.name.split('_')[-1]+' '+('Carbon' if 'Carbon' in o.name else 'Interior');text.size=.13
 t=bpy.data.objects.new('label',text);bpy.context.collection.objects.link(t);t.rotation_euler=(1.5708,0,0);t.location=((i%3)*2.3-.9,-.9,-(i//3)*1.7-.7)
scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True
bpy.ops.object.camera_add(location=(2.3,-14,1.4));cam=bpy.context.object;cam.rotation_euler=(Vector((2.3,0,-1.7))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=7.3;scene.camera=cam
scene.render.resolution_x=1100;scene.render.resolution_y=850;scene.render.resolution_percentage=100;scene.render.filepath=os.path.abspath('tools/generated/door-part-sheet.png');bpy.ops.render.render(write_still=True)
