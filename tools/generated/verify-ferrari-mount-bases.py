exec(compile(open('tools/generated/verify-hinge-solid-clearance.py').read().split('for index,row in enumerate(rows):')[0],'verify-hinge-solid-clearance.py','exec'))
mounts=[r for r in data['hardware'] if r['name'].startswith('Body hinge plate') or r['name'].startswith('Body hinge mounting base')]
report=[]
for index,row in enumerate(mounts):
 side=index//4;coords=row['positions'];world=mat(row['samples'][0]);points=[world@V(coords[j:j+3]) for j in range(0,len(coords),3)];ids=row['indices'];polygons=[ids[j:j+3] for j in range(0,len(ids),3)];solid=BVHTree.FromPolygons(points,polygons)
 contacts=solid.overlap(bvh[0]);penetrations=[]
 for hf,cf in contacts:
  hits=intersections([points[v] for v in polygons[hf]],[vs[0][v] for v in fs[0][cf]])
  if hits:penetrations.append([hf,cf])
 bad=[];rest=mat(data['poses'][0][side])
 for n in range(241):
  delta=mat(data['poses'][n][side])@rest.inverted();dp=[delta@v for v in vs[side+1]];door=BVHTree.FromPolygons(dp,fs[side+1]);contacts=solid.overlap(door)
  found=False
  for hf,cf in contacts:
   if intersections([points[v] for v in polygons[hf]],[dp[v] for v in fs[side+1][cf]]):found=True;break
  if found:bad.append(n)
 report.append({'index':index,'name':row['name'],'bodyContacts':len(penetrations),'doorFrames':bad})
print('MOUNT_CLEARANCE',json.dumps(report),flush=True)
json.dump(report,open('tools/generated/ferrari-marked-mount-clearance.json','w'),indent=2)
