exec(open('tools/audit-revuelto-floating.py',encoding='utf8').read().split("print('FLOATING_COMPONENTS'")[0])
mesh=bpy.data.objects['DoorJambLF_CarPaint'];parents=list(range(len(mesh.data.vertices)))
def find(a):
 while parents[a]!=a:parents[a]=parents[parents[a]];a=parents[a]
 return a
for edge in mesh.data.edges:
 a,b=map(find,edge.vertices);parents[b]=a
selected={find(818),find(1012)};faces=[list(f.vertices) for f in mesh.data.polygons if find(f.vertices[0]) in selected]
data=bpy.data.meshes.new('Isolated existing hinge');data.from_pydata([mesh.matrix_world@v.co for v in mesh.data.vertices],[],faces);data.update()
for o in list(bpy.context.scene.objects):bpy.data.objects.remove(o,do_unlink=True)
obj=bpy.data.objects.new('Existing orange hinge fragment',data);bpy.context.scene.collection.objects.link(obj)
mat=bpy.data.materials.new('Reference orange');mat.diffuse_color=(.8,.11,.01,1);obj.data.materials.append(mat)
target=Vector((-.875,-.88,.61))
camdata=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',camdata);bpy.context.scene.collection.objects.link(cam);cam.location=(-1.15,-1.4,.92);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=.28;bpy.context.scene.camera=cam
for location,power in [((-1,-1.1,1.2),50),((-.5,-.6,.8),30)]:
 lightdata=bpy.data.lights.new('Light','AREA');lightdata.energy=power;lightdata.size=.5;light=bpy.data.objects.new('Light',lightdata);bpy.context.scene.collection.objects.link(light);light.location=location;light.rotation_euler=(target-light.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.world=bpy.data.worlds.new('World');scene.world.color=(.15,.15,.15);scene.render.filepath=os.path.abspath('tools/generated/legacy-hinge-fragment.png');bpy.ops.render.render(write_still=True)
