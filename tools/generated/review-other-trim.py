import bpy,os,json,sys,math
from mathutils import Vector as V, Matrix, Quaternion
car=sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/'+('porsche-911-gt3-door-assembly.glb' if car=='porsche' else 'lamborghini-revuelto-user-edited.glb')))
s=bpy.context.scene
red=bpy.data.materials.new('Exterior review');red.diffuse_color=(.5,.028,.022,1)
black=bpy.data.materials.new('Interior review');black.diffuse_color=(.018,.021,.022,1)
for o in s.objects:
 if o.type!='MESH':continue
 paint=any(m and ('2025Paint_' in m.name or m.name in ['car_paint_v3_03','M_CarPaint']) for m in o.data.materials)
 o.data.materials.clear();o.data.materials.append(red if paint else black);o.data.materials.append(black)
 if car=='revuelto' and (o.name in ['DoorJambLF_CarPaint','DoorJambRF_CarPaint','DoorSill_CarPaint']):
  for f in o.data.polygons:f.material_index=1
if car=='porsche':
 row=json.load(open('tools/generated/porsche-jamb-regions-20.json'));o=bpy.data.objects[row['name']]
 for part in row['parts']:
  if part['lo'][1]>.24 and part['hi'][1]<.91 and part['lo'][2]>.67:
   for i in part['faces']:o.data.polygons[i].material_index=1
 for row in json.load(open('tools/generated/porsche-trim-components.json')):
  o=bpy.data.objects[row['name']]
  if 'door' not in o.parent.name:continue
  for part in row['parts']:
   if part['count'] in [393,756]:
    for i in part['faces']:o.data.polygons[i].material_index=1
 C=Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
 poses=json.load(open('tools/generated/porsche-compact-hinges.json'))['poses'][-1]
 for i,name in enumerate(['Porsche door L','Porsche door R']):
  a=poses[i];bpy.data.objects[name].matrix_world=C.inverted()@Matrix([[a[c*4+r] for c in range(4)] for r in range(4)])@C
else:
 # Rotate imported +Y-forward Blender source into the site's canonical axes.
 rot=Matrix.Rotation(-math.pi/2,4,'Z')
 for o in list(s.objects):
  if o.parent is None:o.matrix_world=Matrix.Translation((.10516,0,.00108))@rot@o.matrix_world
 bpy.context.view_layer.update()
 C=Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
 for side,code in [(1,'L'),(-1,'R')]:
  pivot=V((-.80,.98,side*.86));q=Quaternion(V((side*.035,-side*.55,1)).normalized(),1.22)
  delta=C.inverted()@Matrix.Translation(pivot)@q.to_matrix().to_4x4()@Matrix.Translation(-pivot)@C
  for o in list(s.objects):
   if o.type=='MESH' and o.name.startswith(('Door'+code+'F_','DoorJamb'+code+'F_','DoorCard'+code+'F','WingMirror'+code+'_','MirrorBase'+code+'_','Glass'+code+'M_')):o.matrix_world=delta@o.matrix_world
cam=bpy.data.objects.new('Review',bpy.data.cameras.new('Review'));s.collection.objects.link(cam);s.camera=cam;cam.data.lens=45;cam.data.clip_start=.01
s.render.engine='BLENDER_WORKBENCH';s.display.shading.light='STUDIO';s.display.shading.color_type='MATERIAL';s.display.shading.show_cavity=True
s.render.resolution_x=1100;s.render.resolution_y=800;s.render.resolution_percentage=100
for i,(pos,target) in enumerate([((1,-3,1.6),(-.25,-.9,.6)),((-2,-3,1.5),(-.4,-.8,.7))]):
 cam.location=pos;cam.rotation_euler=(V(target)-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=os.path.abspath('tools/generated/'+car+'-black-trim-'+str(i)+'.png');bpy.ops.render.render(write_still=True)
