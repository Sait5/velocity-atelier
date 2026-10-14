exec(compile(open('tools/generated/verify-hinge-solid-clearance.py').read().split('for index,row in enumerate(rows):')[0],'verify-hinge-solid-clearance.py','exec'))
fits=json.load(open('app/three/ferrariDoorHingeMounts.json'))
code=open('tools/generated/refine-final-hinge.py').read();exec(compile(code[code.index('def score('):code.index('original=')],'hinge-score','exec'))
faces=[(0,1,2),(0,2,3),(4,7,6),(4,6,5),(0,4,5),(0,5,1),(1,5,6),(1,6,2),(2,6,7),(2,7,3),(3,7,4),(3,4,0)]
for joint in [2,3]:
 row=fits[joint];a=V(row['a']);b=V(row['b']);side=1;rest=mat(data['poses'][0][side]);all_samples=[]
 for n in range(241):
  delta=mat(data['poses'][n][side])@rest.inverted();all_samples.append((n,delta@b,delta.inverted()))
 samples=[all_samples[-1]];n,target,inv=samples[0];direction=(target-a).normalized();length=row['length'];radius=math.sqrt(length*length-(target-a).length_squared/4)
 old=V(row['bias']);u=(old-direction*old.dot(direction)).normalized();v=direction.cross(u).normalized();original=(a+target)*.5+u*radius
 ranked=[]
 for extra in [0,.0005,.001,.002,.003,.005]:
  length=row['length']+extra;radius=math.sqrt(length*length-(target-a).length_squared/4)
  for k in range(360):
   angle=k*math.pi/180;bias=u*math.cos(angle)+v*math.sin(angle);elbow=(a+target)*.5+bias*radius
   body=bvh[0].find_nearest(elbow);door=bvh[2].find_nearest(inv@elbow)
   gap=min(body[3],door[3]);contacts=len(score(bias,length));shift=(elbow-original).length
   ranked.append((contacts,0 if gap>=.009 else 1,max(0,.009-gap),extra+shift,k,tuple(bias),list(elbow),gap,length))
 ranked.sort();best=ranked[0];row['bias']=list(best[5]);row['length']=best[8]
 print('ELBOW',joint,'contacts',best[0],'clearance',best[7],'shift',best[3],'point',best[6],'bias',best[5],flush=True)
json.dump(fits,open('app/three/ferrariDoorHingeMounts.json','w'),indent=2)
