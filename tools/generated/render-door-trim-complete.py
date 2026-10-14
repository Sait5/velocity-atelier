import bpy,os,math
from mathutils import Vector as V
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('../blender/Ferrari-Door-Hinges-Marked-Mounts.blend'))
s=bpy.context.scene;s.frame_set(1)
red=bpy.data.materials.new('Trim review paint');red.diffuse_color=(.5,.028,.022,1)
black=bpy.data.materials.new('Trim review black');black.diffuse_color=(.018,.021,.022,1)
for o in s.objects:
 if o.type!='MESH':continue
 paint=any(m and 'paint' in m.name.lower() for m in o.data.materials)
 o.data.materials.clear();o.data.materials.append(red if paint else black);o.data.materials.append(black)
 if not paint:continue
 door=('doorLF_body_2__carpaint' in o.name or 'doorRF_body_2__carpaint' in o.name)
 body='lod0_body_body__carpaint' in o.name
 if not(door or body):continue
 pts=[o.matrix_world@v.co for v in o.data.vertices]
 from collections import defaultdict
 touch=defaultdict(list)
 for f in o.data.polygons:
  for v in f.vertices:touch[v].append(f.index)
 unseen=set(range(len(o.data.polygons)))
 while unseen:
  seed=unseen.pop();part={seed};todo=[seed]
  while todo:
   for v in o.data.polygons[todo.pop()].vertices:
    for nxt in touch[v]:
     if nxt in unseen:unseen.remove(nxt);part.add(nxt);todo.append(nxt)
  pp=[pts[v] for i in part for v in o.data.polygons[i].vertices]
  xs=[v.x for v in pp];ys=[v.z for v in pp];zs=[abs(v.y) for v in pp]
  selected=body and min(xs)>-.78 and max(xs)<.57 and min(ys)>.19 and max(ys)<.90 and min(zs)>.74 and max(zs)<.96
  if door:selected=not (min(zs)>.84 and max(zs)>.95 and max(xs)-min(xs)>1)
  if selected:
   print('TRIM_COMPONENT',o.name,len(part),flush=True)
   for i in part:o.data.polygons[i].material_index=1
s.frame_set(241)
cam=bpy.data.objects.new('Trim review camera',bpy.data.cameras.new('Trim review camera'));s.collection.objects.link(cam);s.camera=cam;cam.data.clip_start=.005;cam.data.lens=48
s.render.engine='BLENDER_WORKBENCH';s.display.shading.light='STUDIO';s.display.shading.color_type='MATERIAL';s.display.shading.show_cavity=True;s.render.resolution_x=1000;s.render.resolution_y=720;s.render.resolution_percentage=100
for i,(pos,tar) in enumerate([((.65,-2.5,.75),(-.9,-1.4,.50)),((-.3,-.8,.9),(-1,-1.3,.55)),((-2,-2.5,1.1),(-.9,-1.3,.5))]):
 cam.location=V(pos);cam.rotation_euler=(V(tar)-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=os.path.abspath('tools/generated/trim-review-'+str(i)+'.png');bpy.ops.render.render(write_still=True)



