exec(compile(open('tools/generated/verify-hinge-solid-clearance.py').read().split('for index,row in enumerate(rows):')[0],'verify-hinge-solid-clearance.py','exec'))
import itertools
fits=json.load(open('app/three/ferrariDoorHingeMounts.json'))
faces=[(0,1,2),(0,2,3),(4,7,6),(4,6,5),(0,4,5),(0,5,1),(1,5,6),(1,6,2),(2,6,7),(2,7,3),(3,7,4),(3,4,0)]
joint=1;row=fits[joint];a=V(row['a']);b=V(row['b']);side=joint//2;rest=mat(data['poses'][0][side]);samples=[]
for n in range(241):
 delta=mat(data['poses'][n][side])@rest.inverted();samples.append((n,delta@b,delta.inverted()))
def score(bias,length,step=1,limit=100000):
 bad=[]
 for n,target,inv in samples[::step]:
  direction=(target-a).normalized();fold=(bias-direction*bias.dot(direction)).normalized();elbow=(a+target)*.5+fold*math.sqrt(max(0,length*length-(target-a).length_squared/4))
  count=0
  for start,end in [(a,elbow),(elbow,target)]:
   unit=(end-start).normalized();q=V((1,0,0)).rotation_difference(unit);up=q@V((0,.004,0));across=q@V((0,0,.002))
   for treeidx,space in [(0,M.Identity(4)),(side+1,inv)]:
    corners=[space@(p+up*y+across*z) for p in [start,end] for y,z in [(-1,-1),(-1,1),(1,1),(1,-1)]]
    solid=BVHTree.FromPolygons(corners,faces);contacts=solid.overlap(bvh[treeidx]);found=False
    for hf,cf in contacts:
     hits=intersections([corners[v] for v in faces[hf]],[vs[treeidx][v] for v in fs[treeidx][cf]])
     if any(min((p-space@a).length,(p-space@target).length)>.016 for p in hits):found=True;break
    if found:count+=1
  if count:bad.append([n,count])
  if len(bad)>limit:break
 return bad
original=V(row['bias']);best=(len(score(original,row['length'])),row['length'],original)
for scale in [1,1.01,1.025]:
 for x,z in itertools.product([0,-.025,.025,-.05,.05,-.1,.1,-.2,.2],repeat=2):
  bias=original+V((x,0,z));length=row['length']*scale
  if score(bias,length,step=10,limit=0):continue
  bad=score(bias,length,limit=best[0]);print('CANDIDATE',list(bias),length,len(bad),flush=True)
  if len(bad)<best[0]:best=(len(bad),length,bias)
  if best[0]==0:break
 if best[0]==0:break
row['length']=best[1];row['bias']=list(best[2]);json.dump(fits,open('app/three/ferrariDoorHingeMounts.json','w'),indent=2)
print('REFINED',best[0],row,flush=True)
