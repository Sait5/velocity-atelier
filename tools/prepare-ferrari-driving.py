from pathlib import Path
import hashlib,json
import numpy as np
import soundfile as sf
root=Path(__file__).resolve().parents[1]
source=Path('C:/Users/Admin/Downloads/Звук двигателя Ferrari 458 Spider.mp3')
x,sr=sf.read(source,always_2d=True)
first=x[3*sr:19*sr].copy();tail=x[12*sr:int(18.8*sr)].copy()
n=int(.75*sr);t=np.linspace(0,np.pi/2,n)[:,None]
cycle=np.concatenate((tail[n:-n],tail[-n:]*np.cos(t)+tail[:n]*np.sin(t)))
intro=np.concatenate((first[:-n],first[-n:]*np.cos(t)+cycle[:n]*np.sin(t),cycle[n:]))
buffer=np.concatenate((intro,cycle));gain=min(.8,.95/np.max(np.abs(buffer)))
buffer[:int(.005*sr)]*=np.linspace(0,1,int(.005*sr))[:,None]
sf.write(root/'public/audio/ferrari-user-driving.wav',buffer*gain,sr,subtype='PCM_24')
timing={'loopStart':len(intro)/sr,'loopEnd':len(buffer)/sr}
(root/'public/audio/ferrari-user-driving-timing.json').write_text(json.dumps(timing,indent=2)+'\n')
preview=buffer.copy()
while len(preview)<60*sr:preview=np.concatenate((preview,cycle))
preview=preview[:60*sr]*gain;preview[-int(.03*sr):]*=np.linspace(1,0,int(.03*sr))[:,None]
sf.write(root/'tools/generated/audio/Ferrari_458_60s_smooth.wav',preview,sr,subtype='PCM_24')
manifest={'source':str(source),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
 'source_seconds':[3,19],'continuation_source_seconds':[12,18.8],
 'crossfade_seconds':.75,'gain':gain,'pitch_change':False,'tempo_change':False,**timing}
(root/'tools/ferrari-driving-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
