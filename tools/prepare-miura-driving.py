from pathlib import Path
import json, hashlib
import numpy as np
import soundfile as sf
ROOT=Path(__file__).resolve().parents[1]
source=next(Path('C:/Users/Admin/Downloads').glob('Lamborghini Miura*.mp3'))
x,sr=sf.read(source,always_2d=True)
n=int(.75*sr)
def blend(a,b):
 t=np.linspace(0,np.pi/2,len(a))[:,None]
 return a*np.cos(t)+b*np.sin(t)
def join(a,b,overlap):
 return np.concatenate((a[:-overlap],blend(a[-overlap:],b[:overlap]),b[overlap:]))
first=x[4*sr:int(23.3*sr)].copy()
tail=x[12*sr:int(23.3*sr)].copy()
# A brief recorded low-note/drop follows the old loop entry. Remove it only from repeats.
cut0=int((12.88-12)*sr);cut1=int((13.33-12)*sr)
tail=join(tail[:cut0],tail[cut1:],int(.065*sr))
# Bake an energy-preserving circular splice; do not crossfade at runtime or alter pitch.
cycle=np.concatenate((tail[n:-n],blend(tail[-n:],tail[:n])))
intro=join(first,cycle,n)
buffer=np.concatenate((intro,cycle))
loop_start=len(intro)/sr;loop_end=len(buffer)/sr
buffer[:int(.005*sr)]*=np.linspace(0,1,int(.005*sr))[:,None]
# Quiet static playback gain avoids clipping the loud supplied MP3 decoder peaks.
gain=min(.25,.85/np.max(abs(buffer)))
public=ROOT/'public/audio';sf.write(public/'miura-user-driving.wav',buffer*gain,sr,subtype='PCM_24')
timing={'loopStart':loop_start,'loopEnd':loop_end}
(public/'miura-user-timing.json').write_text(json.dumps(timing,indent=2)+'\n')
preview=buffer.copy()
while len(preview)<60*sr:preview=np.concatenate((preview,cycle))
preview=preview[:60*sr];end=int(.03*sr);preview[-end:]*=np.linspace(1,0,end)[:,None]
output=ROOT/'tools/generated/audio/Miura_V12_60s_fixed_dip_v6.wav'
sf.write(output,preview,sr,subtype='FLOAT')
assert len(preview)==60*sr
assert np.max(abs(buffer[int(.005*sr):18*sr]-x[4*sr+int(.005*sr):22*sr]))<1e-12
# At the runtime wrap the samples must be exactly those of the baked circular cycle.
assert np.array_equal(buffer[-len(cycle):],cycle)
assert np.max(abs(buffer[-1]-buffer[int(loop_start*sr)]))<.5
manifest={'source':str(source),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
 'first_source_seconds':[4,23.3],'continuation_source_seconds':[12,23.3],
 'removed_from_repeats_seconds':[12.88,13.33],'inner_cut_crossfade':.065,
 'crossfade_seconds':.75,'continuation_duration':len(cycle)/sr,'site_gain':gain,
 'pitch_change':False,'tempo_change':False,'EQ':False,**timing,'preview':str(output)}
(ROOT/'tools/miura-user-audio-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
