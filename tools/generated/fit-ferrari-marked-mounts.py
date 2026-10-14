exec(compile(open('tools/generated/verify-hinge-solid-clearance.py').read().split('for index,row in enumerate(rows):')[0],'verify-hinge-solid-clearance.py','exec'))
fits=json.load(open('app/three/ferrariDoorHingeMounts.json'))
# These targets are on the broad inner jamb shown by the user's two red marks.
# The upper target is the centre of the existing rectangular jamb insert.
for joint,row in enumerate(fits):
 side=joint//2;sign=-1 if side==0 else 1
 target=V((-.649,.652 if joint%2 else .405,sign*.8275))
 approach=V((1,0,0));hit=bvh[0].ray_cast(V((-.62,target.y,target.z)),V((-1,0,0)),.10)
 if hit[0] is None:raise RuntimeError('No visible mounting surface at the marked point')
 normal=hit[1] if hit[1].dot(approach)>0 else -hit[1]
 nearest=(hit[0],normal,hit[2],(hit[0]-target).length)
 row['a']=list(nearest[0]+normal*.006);row['an']=list(normal)
 print('MARKED_MOUNT',joint,row['a'],row['an'],'targetDistance',nearest[3],flush=True)
json.dump(fits,open('tools/generated/ferrari-marked-mount-targets.json','w'),indent=2)
# Keep the door end exactly where it was; solve only the two rigid hinge links.
code=open('tools/generated/refine-final-hinge.py').read()
exec(compile(code[code.index('def score('):code.index('original=')],'hinge-score','exec'))
cube_faces=[(0,1,2),(0,2,3),(4,7,6),(4,6,5),(0,4,5),(0,5,1),(1,5,6),(1,6,2),(2,6,7),(2,7,3),(3,7,4),(3,4,0)]
faces=cube_faces
for joint,row in enumerate(fits):
 a=V(row['a']);b=V(row['b']);side=joint//2;rest=mat(data['poses'][0][side]);samples=[]
 for n in range(241):
  delta=mat(data['poses'][n][side])@rest.inverted();samples.append((n,delta@b,delta.inverted()))
 minimum=max((target-a).length for _,target,_ in samples)*.5
 candidates=[V(row['bias']),V((0,-1,0)),V((0,1,0)),V((-1,0,0)),V((1,0,0))]
 for n in range(180):
  y=1-2*(n+.5)/180;angle=n*2.39996323;r=math.sqrt(1-y*y);candidates.append(V((math.cos(angle)*r,y,math.sin(angle)*r)))
 ranked=[]
 for factor in [1.01,1.1,1.2,1.4,1.6,1.8,2.0]:
  length=minimum*factor
  for bias in candidates:
   val=len(score(bias,length,step=10));ranked.append((val,length,tuple(bias)))
 ranked.sort(key=lambda r:(r[0],r[1]));best=(100000,None)
 for val,length,bias in ranked[:80]:
  bad=score(V(bias),length,limit=best[0]);value=len(bad)
  if value<best[0]:best=(value,(length,bias,bad))
  if value==0:break
 length,bias,bad=best[1];row['length']=length;row['bias']=bias
 print('MARKED_FIT',joint,'length',length,'bias',bias,'bad',bad,flush=True)
json.dump(fits,open('app/three/ferrariDoorHingeMounts.json','w'),indent=2)
