from pathlib import Path
import numpy as np,wave,json
class sf:
 @staticmethod
 def read(path,always_2d=True):
  with wave.open(str(path),'rb') as f:
   return np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').reshape(-1,f.getnchannels()).astype(float)/32768,f.getframerate()
 @staticmethod
 def write(path,x,rate,subtype=None):
  with wave.open(str(path),'wb') as f:
   f.setnchannels(x.shape[1]);f.setsampwidth(2);f.setframerate(rate);f.writeframes((np.clip(x,-1,.999969)*32768).astype('<i2').tobytes())
base=Path('public/audio/bugatti');timing={}
for name,start,end in [('acceleration',15,25),('coast',2,6)]:
 x,rate=sf.read(base/('user-'+name+'.wav'),always_2d=True);x=x[:int(end*rate)].copy();n=int(.12*rate);a=int(start*rate)-n;w=np.linspace(0,1,n)[:,None]
 x[-n:]=x[-n:]*(1-w)+x[a:a+n]*w
 sf.write(base/('user-'+name+'-continuous.wav'),x,rate,subtype='PCM_16');timing[name]={'loopStart':start,'loopEnd':end}
 # Render a listening example with two repeats of the chosen continuation.
 demo=np.concatenate([x,x[int(start*rate):],x[int(start*rate):]])
 if name=='coast':
  raw,_=sf.read(base/'user-coast.wav',always_2d=True);ending=raw[int(6*rate):int(8*rate)];sf.write(base/'user-coast-end.wav',ending,rate,subtype='PCM_16');demo=np.concatenate([demo,ending])
 sf.write(base/('preview-'+name+'.wav'),demo,rate,subtype='PCM_16')
(base/'user-loop-timing.json').write_text(json.dumps(timing,indent=2))
