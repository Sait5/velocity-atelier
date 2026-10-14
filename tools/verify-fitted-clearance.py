"""Independent collision sweep of exported GLB, including animation interpolation."""
import os,json,struct,bisect,sys
from mathutils import Matrix,Vector,Quaternion
from mathutils.bvhtree import BVHTree
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def verify(key):
 path=os.path.join(ROOT,'public/models/fitted-hinges',key+'-complete.glb');data=open(path,'rb').read();length=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+length]);binary=data[28+length:]
 cache={}
 def acc(i):
  if i in cache:return cache[i]
  a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']];dim={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];fmt={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']];size=struct.calcsize(fmt)*dim;stride=v.get('byteStride',size);off=v.get('byteOffset',0)+a.get('byteOffset',0)
  cache[i]=[struct.unpack_from('<'+fmt*dim,binary,off+n*stride) for n in range(a['count'])];return cache[i]
 nodes=doc['nodes'];parents={c:i for i,n in enumerate(nodes) for c in n.get('children',[])}
 def ancestor(i):
  while True:
   name=nodes[i].get('name','')
   if name.startswith('DoorAnchor_'):return name[-1]
   if name.startswith('Revuelto door '):return name[-1]
   if i not in parents:return None
   i=parents[i]
 tracks=[]
 for anim in doc.get('animations',[]):
  if not anim['name'].endswith('_Open'):continue
  for c in anim['channels']:
   sampler=anim['samplers'][c['sampler']];tracks.append((c['target']['node'],c['target']['path'],[x[0] for x in acc(sampler['input'])],acc(sampler['output'])))
 duration=max(t[2][-1] for t in tracks)
 def worlds(t):
  state={}
  for idx,path,times,values in tracks:
   a=max(0,min(len(times)-1,bisect.bisect_right(times,t)-1));b=min(a+1,len(times)-1);w=0 if a==b else max(0,min(1,(t-times[a])/(times[b]-times[a])))
   if path=='rotation':
    x,y,z,qw=values[a];qa=Quaternion((qw,x,y,z));x,y,z,qw=values[b];qb=Quaternion((qw,x,y,z));q=qa.slerp(qb,w);value=(q.x,q.y,q.z,q.w)
   else:value=tuple(x+(y-x)*w for x,y in zip(values[a],values[b]))
   state.setdefault(idx,{})[path]=value
  memo={}
  def world(i):
   if i in memo:return memo[i]
   n=nodes[i];s=state.get(i,{})
   if 'matrix' in n and not s:local=Matrix([n['matrix'][k:k+4] for k in range(0,16,4)]).transposed()
   else:
    p=s.get('translation',n.get('translation',(0,0,0)));q=s.get('rotation',n.get('rotation',(0,0,0,1)));sc=s.get('scale',n.get('scale',(1,1,1)))
    local=Matrix.Translation(Vector(p))@Quaternion((q[3],q[0],q[1],q[2])).to_matrix().to_4x4()@Matrix.Diagonal((*sc,1))
   memo[i]=world(parents[i])@local if i in parents else local;return memo[i]
  return [world(i) for i in range(len(nodes))]
 groups={None:[], 'L':[],'R':[]}
 for i,n in enumerate(nodes):
  if 'mesh' not in n:continue
  for prim in doc['meshes'][n['mesh']]['primitives']:
   mat=doc['materials'][prim['material']].get('name','')
   if 'paint' not in mat.lower():continue
   points=[Vector(v) for v in acc(prim['attributes']['POSITION'])];ids=[x[0] for x in acc(prim['indices'])];faces=[ids[j:j+3] for j in range(0,len(ids),3)]
   groups[ancestor(i)].append((i,points,faces))
 def tree(group,matrices):
  points=[];faces=[]
  for i,ps,fs in groups[group]:
   off=len(points);points += [matrices[i]@p for p in ps];faces += [[v+off for v in f] for f in fs]
  return BVHTree.FromPolygons(points,faces,all_triangles=True)
 rest=worlds(0);fixed=tree(None,rest);baseline={s:set(tree(s,rest).overlap(fixed)) for s in ['L','R']};results=[]
 for n in range(241):
  w=worlds(duration*n/240);counts={s:len(set(tree(s,w).overlap(fixed))-baseline[s]) for s in ['L','R']}
  if any(counts.values()):results.append({'sample':n,'time':duration*n/240,**counts})
 out={'car':key,'samples':241,'new_intersections':results,'baseline':{s:len(v) for s,v in baseline.items()}}
 json.dump(out,open(os.path.join(ROOT,'tools/generated/door-mechanisms',key+'-fitted-glb-sweep.json'),'w'),indent=2);print('GLB_SWEEP',key,'bad samples',len(results),'peak',max([max(r['L'],r['R']) for r in results]+[0]),flush=True)
for key in (sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['porsche','ferrari','revuelto']):verify(key)

