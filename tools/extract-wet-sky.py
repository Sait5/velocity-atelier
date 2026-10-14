import bpy
root=r'C:\Users\Admin\Documents\ChatGPT\Velocity Atelier\apex'
bpy.ops.wm.open_mainfile(filepath=root+r'\tools\generated\wet-road-source\scene\scene.blend')
image=next(i for i in bpy.data.images if 'rural_landscape' in i.name)
open(root+r'\public\textures\wet-road-sky.hdr','wb').write(image.packed_file.data)
