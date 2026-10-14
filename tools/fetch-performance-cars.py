from pathlib import Path
import urllib.request,struct,zlib,concurrent.futures,io
import soundfile as sf
import numpy as np
U='https://mutedio.s3.us-east-2.amazonaws.com/sounds/sample-packs/performance-cars-free-sample-pack-mutedio.zip'
def get(a,b):
 return urllib.request.urlopen(urllib.request.Request(U,headers={'Range':f'bytes={a}-{b}'}),timeout=30).read()
b=get(266093279-65536,266093278);i=b.rfind(b'PK\x05\x06');e=struct.unpack_from('<4s4H2LH',b,i);size,offset=e[5:7];d=get(offset,offset+size-1);p=0;entries=[]
while p<len(d):
 h=struct.unpack_from('<4s6H3L5H2L',d,p);n,x,c=h[10:13];name=d[p+46:p+46+n].decode('utf-8');p+=46+n+x+c
 if name.endswith('.wav') and not name.startswith('__'):entries.append((name,h[8],h[-1]))
root=Path('tools/source-audio/performance-cars');root.mkdir(exist_ok=True)
def load(entry):
 name,size,offset=entry;path=root/Path(name).name
 if not path.exists():
  raw=get(offset,offset+size+1023);head=struct.unpack_from('<4s5H3L2H',raw);start=30+head[-2]+head[-1];path.write_bytes(zlib.decompress(raw[start:start+size],-15))
 x,r=sf.read(path,always_2d=True);m=x.mean(axis=1);rms=[np.sqrt(np.mean(m[k:k+r]**2)) for k in range(0,len(m)-r,r)]
 return path.name,round(len(x)/r,2),round(float(np.std(rms)/max(np.mean(rms),1e-9)),3),round(float(np.max(abs(x))),3)
chosen=[e for e in entries if Path(e[0]).name=='005-performance-cars-mutedio.wav']
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for v in pool.map(load,chosen):print(v,flush=True)
