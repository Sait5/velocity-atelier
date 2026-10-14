exec(compile(open('tools/generated/fit-hinge-clearance.py').read().split('pins=')[0],'fit-hinge-clearance.py','exec'))
fits=json.load(open('tools/generated/ferrari-approved-link-mounts.json'))
allowed={'fer_f142_10_s_lod0_body_body__carpaint_0','fer_f142_10_s_lod0_body_rubber_trim__rubber_0','fer_f142_10_s_lod0_body_plastic__emblem_0'}
skinfaces=[f for f,name in zip(fs[0],owners[0]) if name in allowed]
skin=BVHTree.FromPolygons(vs[0],skinfaces)
cap=None
def raw_surface(y,z):
 hit=skin.ray_cast(V((-.45,y,z)),V((-1,0,0)),.45)
 if hit[0] is None:raise RuntimeError('No jamb surface at '+str((y,z)))
 return hit[0].x
def surface(y,z):
 x=raw_surface(y,z)
 if cap is not None:
  cy,cz,front=cap;outside=max(0,abs(y-cy)-.023,abs(z-cz)-.024)
  x=max(x,front-outside*2)
 return x
def patch(start,end,width,rows,top=.0032):
 dy=end[0]-start[0];dz=end[1]-start[1];distance=math.hypot(dy,dz)
 uy,uz=(-dz/distance,dy/distance) if distance>1e-8 else (1,0)
 cols=max(2,math.ceil(width/.0015));points=[];ids=[]
 for level in [.0008,top]:
  for i in range(rows+1):
   for j in range(cols+1):
    w=(j/cols-.5)*width;y=start[0]+dy*i/rows+uy*w;z=start[1]+dz*i/rows+uz*w
    outer=max(surface(y+dy,z+dz) for dy,dz in [(0,0),(.001,0),(-.001,0),(0,.001),(0,-.001)])
    points.append((outer+level,y,z))
 grid=(rows+1)*(cols+1)
 for i in range(rows):
  for j in range(cols):
   a=i*(cols+1)+j;b=a+1;c=a+cols+2;d=a+cols+1
   ids.extend([a,c,b,a,d,c,a+grid,b+grid,c+grid,a+grid,c+grid,d+grid])
 boundary=list(range(cols+1))+[i*(cols+1)+cols for i in range(1,rows+1)]+[rows*(cols+1)+j for j in range(cols-1,-1,-1)]+[i*(cols+1) for i in range(rows-1,0,-1)]
 for i,a in enumerate(boundary):
  b=boundary[(i+1)%len(boundary)];ids.extend([a,b,b+grid,a,b+grid,a+grid])
 for i in range(0,len(ids),3):ids[i+1],ids[i+2]=ids[i+2],ids[i+1]
 return {'positions':[n for p in points for n in p],'indices':ids}
for i,row in enumerate(fits):
 sign=-1 if i<2 else 1;y=.652 if i%2 else .44;z=sign*.8275
 cap=None
 if i%2:cap=(y,z,max(raw_surface(y+dy,z+dz) for dy in [-.023,0,.023] for dz in [-.022,0,.022]))
 row['mount']=[surface(y,z)+.0032,y,z]
 row['bodyPlate']=patch((y-.014,z),(y+.014,z),.020,20,.005)
 end=(row['a'][1],row['a'][2]);distance=math.hypot(end[0]-y,end[1]-z)
 row['bodyBase']=patch((y,z),end,.010,max(4,math.ceil(distance/.0015)))
 print('MOUNT_BASE',i,row['mount'],'knuckle',row['a'],'length',distance,flush=True)
json.dump(fits,open('app/three/ferrariDoorHingeMounts.json','w'),separators=(',',':'))
