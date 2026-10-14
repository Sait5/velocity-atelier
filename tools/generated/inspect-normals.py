import bpy,os
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('tools/generated/Tourbillon-parts.blend'))
for o in bpy.context.scene.objects:
 if o.type=='MESH' and o.data.materials and 'Paint_' in o.data.materials[0].name and o.name.endswith('_0.001'):
  polys=[p for p in o.data.polygons if p.center.x < -1.3 and p.center.z>.5]
  print(o.name,len(polys),[(tuple(round(v,2) for v in p.center),tuple(round(v,2) for v in p.normal)) for p in polys[:8]],flush=True)
