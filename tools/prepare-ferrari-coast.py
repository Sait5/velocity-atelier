from pathlib import Path
import hashlib, json
import numpy as np
import soundfile as sf
from scipy.ndimage import maximum_filter1d
root=Path(__file__).resolve().parents[1]
source=Path('C:/Users/Admin/Downloads/Звук двигателя Ferrari 458 Spider.mp3')
x,sr=sf.read(source,always_2d=True)
# Lift the recorded falling tail without changing its pitch or playback speed.
# Apply the same source-time envelope to the first pass and sustained excerpt.
source_time=np.arange(len(x))/sr
lift=1+5*np.clip((source_time-20)/2,0,1)**2*(3-2*np.clip((source_time-20)/2,0,1))
x=x*lift[:,None]
# Keep the previous five-second recording at its original speed.
first=x[19*sr:int(24*sr)].copy()
gain=.9590811738040164
first*=gain
# Limit only local transient peaks; global normalization would undo the volume lift.
peaks=maximum_filter1d(np.max(np.abs(first),axis=1),size=int(.02*sr))
first*=np.minimum(1,.85/np.maximum(peaks,1e-8))[:,None]
n=int(.25*sr);t=np.linspace(0,np.pi/2,n)[:,None]
def blend(a,b):return a*np.cos(t)+b*np.sin(t)
# Skip the first two seconds only on repeats; retain the existing splice overlap.
repeat=first[2*sr:4*sr+n].copy()
cycle=np.concatenate((repeat[n:-n],blend(repeat[-n:],repeat[:n])))
intro=first[:4*sr].copy()
# Only the last join overlaps; the initial four-second take never restarts.
intro[-n:]=blend(intro[-n:],repeat[:n])
buffer=np.concatenate((intro,cycle,cycle))
buffer[:int(.005*sr)]*=np.linspace(0,1,int(.005*sr))[:,None]
sf.write(root/'public/audio/ferrari-user-coast.wav',buffer,sr,subtype='PCM_24')
ending=first[3*sr:5*sr].copy();ending[:int(.005*sr)]*=np.linspace(0,1,int(.005*sr))[:,None]
ending[-int(.1*sr):]*=np.linspace(1,0,int(.1*sr))[:,None]
sf.write(root/'public/audio/ferrari-user-coast-end.wav',ending,sr,subtype='PCM_24')
timing={'loopStart':len(intro)/sr,'loopEnd':len(buffer)/sr,'repeat_seconds':len(cycle)/sr}
(root/'public/audio/ferrari-user-coast-timing.json').write_text(json.dumps(timing,indent=2)+'\n')
preview=np.concatenate((intro,cycle,cycle,cycle,ending))*2*.9
preview*=np.maximum(.35,np.exp(-np.arange(len(preview))/sr/20))[:,None]
preview[-int(.03*sr):]*=np.linspace(1,0,int(.03*sr))[:,None]
sf.write(root/'tools/generated/audio/Ferrari_458_deceleration_from_19s.wav',preview,sr,subtype='FLOAT')
sf.write(root/'tools/generated/audio/Ferrari_458_restored_two_second_repeats_and_ending.wav',preview,sr,subtype='FLOAT')
manifest={'source':str(source),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
 'intro_source_seconds':[19,23],'repeat_source_seconds':[21,23.25],'ending_source_seconds':[22,24],'ending_duration':2,
 'method':'initial 4 seconds once, first two seconds removed from repeats, 2-second cycles with 250 ms overlapping splice; original final 2 seconds once; no time stretching',
 'gain':gain,'runtime_gain_multiplier':2,'master_volume_multiplier':.9,'tail_lift_max':6,'pitch_change':False,'tempo_change':False,**timing}
(root/'tools/ferrari-coast-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
