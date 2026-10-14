exec(compile(open('tools/generated/verify-hinge-solid-clearance.py').read().split('for index,row in enumerate(rows):')[0],'verify-hinge-solid-clearance.py','exec'))
fits=json.load(open('app/three/ferrariDoorHingeMounts.json'))
code=open('tools/generated/refine-final-hinge.py').read();exec(compile(code[code.index('def score('):code.index('original=')],'hinge-score','exec'))
faces=[(0,1,2),(0,2,3),(4,7,6),(4,6,5),(0,4,5),(0,5,1),(1,5,6),(1,6,2),(2,6,7),(2,7,3),(3,7,4),(3,4,0)]
for joint in [2,3]:
 row=fits[joint];a=V(row['a']);b=V(row['b']);side=1;rest=mat(data['poses'][0][side]);length=row['length'];old=V(row['bias'])
 for n in range(0,241,20):
  delta=mat(data['poses'][n][side])@rest.inverted();target=delta@b;samples=[(n,target,delta.inverted())];direction=(target-a).normalized();u=(old-direction*old.dot(direction)).normalized();v=direction.cross(u).normalized();best=10
  for k in range(0,360,5):
   bias=u*math.cos(k*math.pi/180)+v*math.sin(k*math.pi/180);count=sum(c for _,c in score(bias,length));best=min(best,count)
   if count==0:break
  print('FEASIBILITY',joint,n,best,flush=True)
