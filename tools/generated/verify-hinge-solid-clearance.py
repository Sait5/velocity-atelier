# Reuse the same source geometry and removed-hardware selection as the fitting audit.
exec(compile(open('tools/generated/fit-hinge-clearance.py').read().split('pins=')[0],'fit-hinge-clearance.py','exec'))
rows=[r for r in data['hardware'] if 'rigid hinge link' in r['name']]
from mathutils.geometry import intersect_ray_tri
pins=[r for r in data['hardware'] if r['name'].startswith('Body hinge pin')]
ends=[r for r in data['hardware'] if r['name'].startswith('Vertical hinge pin')]
bad=[];mount_only=0
def intersections(first,second):
 result=[]
 for edge,triangle in [(first,second),(second,first)]:
  for i in range(3):
   start=edge[i];vec=edge[(i+1)%3]-start
   hit=intersect_ray_tri(*triangle,vec,start,True)
   if hit is not None and (hit-start).dot(vec)>=-1e-10 and (hit-start).length<=vec.length+1e-6:result.append(hit)
 return result
for index,row in enumerate(rows):
 side=index//4
 p=row['positions'];points=[V(p[j:j+3]) for j in range(0,len(p),3)];ids=row['indices'];faces=[ids[j:j+3] for j in range(0,len(ids),3)]
 lo=min(v.x for v in points);hi=max(v.x for v in points);width=hi-lo
 # Only the first/last 12 mm are part of the mounting footprint.
 start=lo+(.012 if row['name'].startswith('Body') else 0);end=hi-(.012 if row['name'].startswith('Door') else 0)
 for v in points:v.x=start+(v.x-lo)/width*(end-start)
 rest=mat(data['poses'][0][side])
 for n in range(241):
  world=mat(row['samples'][n]);inverse=(mat(data['poses'][n][side])@rest.inverted()).inverted()
  a=V(pins[index//2]['samples'][n][12:15]);b=V(ends[index//2]['samples'][n][12:15])
  for label,tree,transform,treeidx,space in [('body',bvh[0],world,0,M.Identity(4)),('door',bvh[side+1],inverse@world,side+1,inverse)]:
   vertices=[transform@p for p in points];solid=BVHTree.FromPolygons(vertices,faces)
   contacts=solid.overlap(tree)
   locations=[]
   for hf,cf in contacts:
    locations.extend(intersections([vertices[v] for v in faces[hf]],[vs[treeidx][v] for v in fs[treeidx][cf]]))
   outside=[p for p in locations if min((p-space@a).length,(p-space@b).length)>.016]
   if outside:bad.append({'link':index,'frame':n,'surface':label,'pairs':len(contacts),'point':list(outside[0]),'mountDistance':min((outside[0]-space@a).length,(outside[0]-space@b).length)})
   elif contacts:mount_only+=1
report={'car':key,'samples':241,'links':len(rows),'mountFootprintRadiusMm':16,'mountOrSurfaceTouchFrames':mount_only,'contactFrames':bad}
json.dump(report,open('tools/generated/'+key+'-hinge-solid-clearance.json','w'),indent=2)
print('SOLID_CLEARANCE',key,len(bad),bad[:20],flush=True)
