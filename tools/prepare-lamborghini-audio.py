"""Preserve source pitch; extend duration with waveform-aligned overlap-add."""
from pathlib import Path
import json, hashlib
import numpy as np
import soundfile as sf
from scipy.signal import correlate
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/audio'
files=[Path('C:/Users/Admin/Downloads/Lamborghini Aventador — Звук двигателя (www.hotplayer.ru).mp3'),Path('C:/Users/Admin/Downloads/Lamborghini aventador svj ignition and exhaust.mp3')]
records=[]
def save(name,x,rate,source,gain_db,edit):
 sf.write(OUT/(name+'.wav'),x*10**(gain_db/20),rate,subtype='PCM_24')
 records.append(dict(output=name+'.wav',source=source.name,source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),gain_db=gain_db,duration=len(x)/rate,edit=edit))
def extend(x,rate,factor):
 # Align overlapping waveforms instead of lowering playback rate or changing pitch.
 window=round(.06*rate);hop=round(.02*rate);search=round(.010*rate)
 length=round(len(x)*factor);out=np.zeros((length+window,2));weights=np.zeros(length+window)
 taper=np.hanning(window);mono=x.mean(axis=1);previous=0
 for pos in range(0,length,hop):
  expected=min(round(pos/factor),len(x)-window)
  if pos==0:chosen=0
  else:
   lo=max(0,expected-search);hi=min(len(x)-window,expected+search)
   reference=mono[previous+hop:previous+window]
   # Correlate the unchanged samples; alignment is shared by both stereo channels.
   region=mono[lo:hi+len(reference)]
   scores=correlate(region,reference,mode='valid',method='fft')
   energy=np.convolve(region*region,np.ones(len(reference)),mode='valid')
   scores/=np.sqrt(np.maximum(energy,1e-12))
   chosen=lo+int(np.argmax(scores))
  frame=x[chosen:chosen+window]
  out[pos:pos+window]+=frame*taper[:,None];weights[pos:pos+window]+=taper
  previous=chosen
 good=weights>1e-9;out[good]/=weights[good,None]
 return out[:length]
main,rate=sf.read(files[0],always_2d=True)
save('aventador-engine-quiet',main,rate,files[0],-14.301,'Complete original, static volume only.')
prefix=main[6*rate:18*rate].copy()
tail=extend(main[18*rate:round(24.4*rate)],rate,4)
# Long continuation: crossfade a full second at the circular splice, not a 1.5 s restart.
n=rate;t=np.linspace(0,1,n)[:,None]
tail[-n:]=tail[-n:]*(1-t)+tail[:n]*t
# Join acceleration and continuation over 60 ms, keeping the original pitch.
f=round(.06*rate);u=np.linspace(0,1,f)[:,None]
prefix[-f:]=prefix[-f:]*(1-u)+tail[:f]*u
driving=np.concatenate([prefix,tail[f:]])
loop_start=len(prefix)/rate+1-f/rate
save('aventador-engine-driving',driving,rate,files[0],-14.301,'Original acceleration 6–18 s; source 18–24.4 s duration extended 4x with stereo WSOLA, no resampling/filtering/pitch shift; 1 s circular splice.')
config=dict(loopStart=loop_start,loopEnd=len(driving)/rate)
(OUT/'aventador-engine-timing.json').write_text(json.dumps(config),encoding='utf-8')
ignition,rate=sf.read(files[1],always_2d=True)
save('aventador-ignition-exhaust',ignition,rate,files[1],-12,'Complete original, static volume only.')
(ROOT/'tools/lamborghini-audio-manifest.json').write_text(json.dumps(dict(provenance='Owner-supplied Aventador/SVJ recordings.',processing='Pitch-preserving duration extension; no filters or playback-rate changes. Cabin volume only.',timing=config,assets=records),ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(config));print('Continuation loop lasts',config['loopEnd']-config['loopStart'],'seconds')
