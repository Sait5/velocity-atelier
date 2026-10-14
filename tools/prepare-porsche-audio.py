from pathlib import Path
import numpy as np,soundfile as sf,json,hashlib
from scipy.signal import resample_poly
ROOT=Path(__file__).resolve().parents[1];src=ROOT/'tools/source-audio/porsche';out=ROOT/'public/audio'
x,sr=sf.read(src/'gt3-onboard.wav',always_2d=True);x=resample_poly(x,1,2);sr//=2
# One continuous onboard recording for every engine state. No synthesized layers,
# pitch shifting or speed stretching. Static gain only, with short loop overlaps.
gain=min(7,.74/np.max(abs(x)))
x*=gain
def cut(a,b):return x[round(a*sr):round(b*sr)].copy()
def fade(a):
 n=min(int(.006*sr),len(a)//10);a[:n]*=np.linspace(0,1,n)[:,None];a[-n:]*=np.linspace(1,0,n)[:,None];return a
def circular(a):
 n=int(.4*sr);t=np.linspace(0,np.pi/2,n)[:,None]
 return np.concatenate((a[n:-n],a[-n:]*np.cos(t)+a[:n]*np.sin(t)))
clips={'start':fade(cut(2.1,5.9)),'idle':circular(cut(35,54)),
       'drive':circular(cut(132,156)),'coast':fade(cut(91,102)),
       'coast-idle':circular(cut(100,106)),'stop':fade(cut(201.2,206.4))}
for name,a in clips.items():sf.write(out/('porsche-'+name+'.wav'),a,sr,subtype='PCM_16')
d,ds=sf.read(src/'porsche-door.mp3',always_2d=True)
for name,a,b in [('door-open',0,1),('door-close',2.45,3.3)]:
 clip=d[int(a*ds):int(b*ds)]*.6;n=int(.006*ds);clip[:n]*=np.linspace(0,1,n)[:,None];clip[-n:]*=np.linspace(1,0,n)[:,None]
 sf.write(out/('porsche-'+name+'.wav'),clip,ds,subtype='PCM_16')
manifest={'source_vehicle':'Porsche 997 GT3 RS 2008 (not a 992.2 recording)','publisher':'Pole Position Production','bundle':'Sonniss GameAudioGDC 2020','license':'https://sonniss.com/gdc-bundle-license/','source_urls':(src/'sources.txt').read_text().splitlines(),'sha256':hashlib.sha256((src/'gt3-onboard.wav').read_bytes()).hexdigest(),'gain':float(gain),'processing':'Native playback speed/pitch, static gain, 400ms equal-power circular overlaps, 48kHz PCM16','source_intervals':{'start':[2.1,5.9],'idle':[35,54],'drive':[132,156],'coast':[91,102],'coast-idle':[100,106],'stop':[201.2,206.4]},'duration_seconds':{k:len(v)/sr for k,v in clips.items()},'doors':{'source':'https://freesound.org/people/mincedbeats/sounds/630562/','author':'mincedbeats','license':'CC0','note':'Classic 911, not verified 992.2. Public MP3 preview used; original WAV requires login.'},'tyres':{'source':'https://bigsoundbank.com/crissement-de-pneus-1-s2368.html','author':'Dorian CLAIR','license':'CC0','file':'car-braking.wav'}}
(ROOT/'tools/porsche-audio-manifest.json').write_text(json.dumps(manifest,indent=2))
print(manifest['duration_seconds'])
