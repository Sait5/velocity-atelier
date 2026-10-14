import bpy,json,os,sys,math
from mathutils import Matrix as M,Vector as V
from mathutils.bvhtree import BVHTree
key=sys.argv[sys.argv.index('--')+1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/models/'+('porsche-911-gt3-door-assembly.glb' if key=='porsche' else 'ferrari-italia-complete.glb')))
data=json.load(open('tools/generated/'+key+'-compact-hinges.json'))
def mat(v):return M([[v[c*4+r] for c in range(4)] for r in range(4)])
C=M(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
names=[n if n in bpy.data.objects else n.replace('_',' ') for n in data['doorNames']]
doors=[bpy.data.objects[n] for n in names]
def removed(o,p):
 if key!='ferrari':return False
 if o.name=='fer_f142_10_s_lod0_body_body__carpaint_0':
  return (-.721<p.x<-.682 and .86<abs(p.z)<.94 and (.251<p.y<.305 or .60<p.y<.65)) or (-.614<p.x<-.587 and .503<p.y<.533 and .880<abs(p.z)<.906)
 if o.name=='fer_f142_10_s_lod0_body_metal__emblem_0':return -.665<p.x<-.587 and .520<p.y<.535 and .807<abs(p.z)<.905
 if o.name=='fer_f142_10_s_lod0_body_rubber_trim__rubber_0':return -.623<p.x<-.598 and .504<p.y<.526 and .865<abs(p.z)<.892
 return False
vs=[[],[],[]];fs=[[],[],[]];owners=[[],[],[]]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or any('glass' in m.name.lower() for m in o.data.materials if m):continue
 i=next((i+1 for i,d in enumerate(doors) if o in d.children_recursive),0)
 p=[C@(o.matrix_world@v.co) for v in o.data.vertices]
 for f in o.data.polygons:
  points=[p[v] for v in f.vertices]
  if all(removed(o,v) for v in points):continue
  if not any(-1.1<v.x<-.3 and .45<abs(v.z)<1.25 and .20<v.y<.85 for v in points):continue
  off=len(vs[i]);vs[i].extend(points);fs[i].append(tuple(range(off,off+len(points))));owners[i].append(o.name)
bvh=[BVHTree.FromPolygons(v,f) for v,f in zip(vs,fs)]
rearfaces=[f for f in fs[0] if (vs[0][f[1]]-vs[0][f[0]]).cross(vs[0][f[2]]-vs[0][f[0]]).normalized().x>.3]
rear=BVHTree.FromPolygons(vs[0],rearfaces)
print('BVH',key,[len(f) for f in fs],flush=True)
pins=[r for r in data['hardware'] if r['name'].startswith('Body hinge pin')]
ends=[r for r in data['hardware'] if r['name'].startswith('Vertical hinge pin')]
out=[]
for joint,(pin,end) in enumerate(zip(pins,ends)):
 side=joint//2; a=V(pin['samples'][0][12:15]);b=V(end['samples'][0][12:15]);doorrest=mat(data['poses'][0][side])
 for label,treeidx,point in [('a',0,a),('b',side+1,b)]:
  near=bvh[treeidx].find_nearest(point);print('MOUNT',joint,label,list(point),'SURFACE',list(near[0]),'NORMAL',list(near[1]),'DIST',near[3],owners[treeidx][near[2]],flush=True)
 if key=='ferrari':
  near=bvh[side+1].find_nearest(V((-.773,b.y,math.copysign(.80,b.z))));b=near[0]+near[1]*.004
  near=rear.find_nearest(b);a=near[0]+near[1]*.004
 samples=[]
 for n in range(0,241,10):
  delta=mat(data['poses'][n][side])@doorrest.inverted()
  target=delta@b;samples.append((n,target,delta.inverted()))
 minimum=max((target-a).length for _,target,_ in samples)/2
 def score(bias,length,details=False,limit=100000):
  total=0;bad=[]
  for n,target,inv in samples:
   direction=(target-a).normalized();fold=(bias-direction*bias.dot(direction)).normalized()
   elbow=(a+target)*.5+fold*math.sqrt(max(0,length*length-(target-a).length_squared/4))
   hits=0
   for start,finish in [(a,elbow),(elbow,target)]:
    vec=finish-start;dist=vec.length;unit=vec.normalized()
    # Ignore only the mounting footprint, not the elbow or the rest of either link.
    s=start+unit*min(.012,dist*.2) if (start-a).length<.001 else start
    e=finish-unit*min(.012,dist*.2) if (finish-target).length<.001 else finish
    for tree,transform in [(bvh[0],M.Identity(4)),(bvh[side+1],inv)]:
     q=V((1,0,0)).rotation_difference(unit);up=q@V((0,.004,0));across=q@V((0,0,.002))
     corners=[transform@(p+up*y+across*z) for p in [s,e] for y,z in [(-1,-1),(-1,1),(1,1),(1,-1)]]
     solid=BVHTree.FromPolygons(corners,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)])
     if solid.overlap(tree):hits+=4
   if hits:bad.append([n,hits]);total+=hits
   if total>limit and not details:return total
  return (total,bad) if details else total
 candidates=[V((1,-.25,-math.copysign(.5,a.z)))]
 for v in [(0,-1,0),(0,1,0),(1,0,0),(-1,0,0),(0,0,1),(0,0,-1)]:candidates.append(V(v))
 for n in range(120):
  y=1-2*(n+.5)/120;angle=n*2.39996323;r=math.sqrt(1-y*y);candidates.append(V((math.cos(angle)*r,y,math.sin(angle)*r)))
 if key=='ferrari':
  best=(100000,None);anchor_candidates=[];sign=math.copysign(1,b.z)
  if joint>=2:
   previous=out[joint-2]
   def mirror(v,offset=0):return V((v[0]+offset,v[1],-v[2]-.000606))
   ap=mirror(previous['a'],.000856);bp=mirror(previous['b'],.00082)
   an=V((previous['an'][0],previous['an'][1],-previous['an'][2]));bn=V((previous['bn'][0],previous['bn'][1],-previous['bn'][2]))
   anchor_candidates.append((ap,bp,an,bn));candidates.insert(0,V((previous['bias'][0],previous['bias'][1],-previous['bias'][2])))
  for height in ([.42,.46,.50,.54] if joint%2==0 else [.60,.64,.68]):
   for z in [.78,.80,.82,.84,.86,.88,.90,.92,.94,.96]:
    near=bvh[side+1].ray_cast(V((-1.1,height,sign*z)),V((1,0,0)),.6)
    if near[0] is None or near[0].x>-.5 or near[1].x>-.2:continue
    bp=near[0]+near[1]*.005;bn=near[1].copy()
    for az in [z-.025,z,z+.025]:
     hit=rear.find_nearest(V((bp.x-.04,height,sign*az)))
     if hit[0] is None:continue
     ap=hit[0]+hit[1]*.005;anchor_candidates.append((ap,bp,hit[1].copy(),bn))
  for ap,bp,an,bn in anchor_candidates:
   a=ap;b=bp;samples=[]
   for n in range(0,241,20):
    delta=mat(data['poses'][n][side])@doorrest.inverted();samples.append((n,delta@b,delta.inverted()))
   minimum=max((target-a).length for _,target,_ in samples)/2
   for factor in [1.01,1.06]:
    length=max(.03,minimum*factor)
    for bias in candidates[:7]+candidates[7::3]:
     val=score(bias,length,limit=best[0])
     rank=val+length*.01
     if rank<best[0]:best=(rank,(a.copy(),b.copy(),an.copy(),bn.copy(),length,bias.copy(),val))
  if best[1]:
   a,b,an,bn,length,bias,val=best[1];samples=[]
   for n in range(0,241):
    delta=mat(data['poses'][n][side])@doorrest.inverted();samples.append((n,delta@b,delta.inverted()))
   bestref=(score(bias,length),bias.copy())
   for candidate in candidates+[V((-.11752,.891667,math.copysign(.437172,-b.z)))]:
    val=score(candidate,length,limit=bestref[0])
    if val<bestref[0]:bestref=(val,candidate.copy())
   val,bias=bestref
   row={'joint':joint,'a':list(a),'b':list(b),'an':list(an),'bn':list(bn),'length':length,'bias':list(bias),'score':score(bias,length),'bad':score(bias,length,True)[1]}
   out.append(row);print('FIT',key,json.dumps(row),flush=True);continue
 ranked=[]
 for factor in [1.01,1.05,1.12]:
  length=max(.03,minimum*factor)
  for bias in candidates:ranked.append((score(bias,length),length,tuple(bias)))
 ranked.sort(key=lambda r:(r[0],r[1]))
 s,length,bias=ranked[0];baseline=score(candidates[0],max(.03,minimum*1.01),True)
 row={'joint':joint,'a':list(a),'b':list(b),'length':length,'bias':bias,'score':s,'baseline':baseline,'bad':score(V(bias),length,True)[1],'top':ranked[:5]}
 out.append(row);print('FIT',key,json.dumps(row),flush=True)
json.dump(out,open('tools/generated/'+key+'-hinge-clearance-fit.json','w'),indent=2)
