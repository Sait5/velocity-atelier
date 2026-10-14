from pathlib import Path
import numpy as np,wave,json
ROOT=Path(__file__).resolve().parents[1]
with wave.open(str(ROOT/'tools/source-audio/porsche/gt3-onboard.wav'),'rb') as f:
 sr=f.getframerate();raw=np.frombuffer(f.readframes(f.getnframes()),dtype=np.uint8).reshape(-1,3)
 vals=raw[:,0].astype(np.int32)|(raw[:,1].astype(np.int32)<<8)|(raw[:,2].astype(np.int32)<<16)
 x=((vals^0x800000)-0x800000).reshape(-1,2).astype(np.float32)/8388608
x=(x[::2]+x[1::2])*.5;sr//=2
banks={'load-low':(145.7,147.0,2600),'load-high':(85.8,87.6,4900),'overrun-low':(96.2,97.4,1900),'overrun-high':(135.6,137.0,4600)}
report={}
for name,(begin,end,rpm) in banks.items():
 a=x[round(begin*sr):round(end*sr)].copy();a-=a.mean(axis=0)
 gain=min(.10/max(1e-6,float(np.sqrt(np.mean(a*a)))),.78/max(1e-6,float(abs(a).max())))
 a*=gain;n=int(.12*sr);t=np.linspace(0,np.pi/2,n)[:,None]
 a=np.concatenate((a[n:-n],a[-n:]*np.cos(t)+a[:n]*np.sin(t)))
 with wave.open(str(ROOT/'public/audio'/('porsche-'+name+'.wav')),'wb') as f:
  f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes((np.clip(a,-1,1)*32767).astype('<i2').tobytes())
 report[name]={'source_interval':[begin,end],'nominal_tuning_rpm':rpm,'duration':len(a)/sr,'peak':float(abs(a).max()),'gain':gain}
p=ROOT/'tools/porsche-audio-manifest.json';manifest=json.loads(p.read_text(encoding='utf-8'))
manifest['rpm_banks']=report;manifest['playback']='Four real GT3 recording loops, smoothly RPM-scaled and crossfaded by load. Original idle, start and stop. No unrelated braking effect.'
p.write_text(json.dumps(manifest,indent=2),encoding='utf-8');print(json.dumps(report,indent=2))
