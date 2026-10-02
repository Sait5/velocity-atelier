import bpy, os
base=os.path.abspath(os.path.join(os.path.dirname(__file__),"../../blender"))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(base,'../apex/public/models/ferrari.glb'))
bpy.ops.export_scene.gltf(filepath=os.path.join(base,'source.glb'),export_format='GLB',export_draco_mesh_compression_enable=False)

