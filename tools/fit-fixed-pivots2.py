import bpy,os,math,json,sys
from mathutils import Vector as V,Matrix as M
from mathutils.bvhtree import BVHTree
key=sys.argv[-1];file,doorname={'porsche':('porsche-911-gt3-door-assembly.glb','Porsche door L'),'ferrari':('ferrari-italia-complete.glb','door_L')}[key]
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/'+file));bpy.context.view_layer.update()
d=bpy.data.objects[doorname];moving=set(d.children_recursive);origin=d.matrix_world.translation.copy();side=1 if origin.y>0 else -1
ps=[];fs=[];fp=[];ff=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or not any(m and 'paint' in m.name.lower() for m in o.data.materials):continue
 points,faces=(ps,fs) if o in moving else (fp,ff);off=len(points);points.extend(o.matrix_world@v.co for v in o.data.vertices);faces.extend([v+off for v in f.vertices] for f in o.data.polygons)
ft=BVHTree.FromPolygons(fp,ff);base=set(BVHTree.FromPolygons(ps,fs).overlap(ft));results=[]
for dx in [-.28,-.24,-.20,-.16,-.12,-.08]:
 for lat in [.86,.88,.90,.92,.94]:
  for release in [0]:
   pivot=V((origin.x+dx,side*lat,origin.z));counts=[]
   for p in [.005,.015,.025,.035,.045,.055,.07,.085,.1,.15,.22,.3,.45,.6,.8,1]:
    shift=side*release*min(1,p/.08);mat=M.Translation(V((0,shift,0)))@M.Translation(pivot)@M.Rotation(side*math.radians(64)*p,4,'Z')@M.Translation(-pivot)
    counts.append(len(set(BVHTree.FromPolygons([mat@v for v in ps],fs).overlap(ft))-base))
   results.append({'pivot':list(pivot),'release':release,'hits':counts,'total':sum(counts)})
results.sort(key=lambda x:(x['total'],x['release']));json.dump(results,open('tools/generated/door-mechanisms/'+key+'-fixed-pivot-fit2.json','w'),indent=2);print(json.dumps(results[:8]),flush=True)




