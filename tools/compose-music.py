"""Original instrumental loops for Velocity; no sampled third-party recordings."""
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

RATE=22050
OUT=Path(__file__).resolve().parents[1]/'public'/'audio'
THEMES=[
 ('night-pulse',96,[[45,52,57,60,64],[41,48,53,57,60],[48,55,60,64,67],[43,50,55,59,62]],.7),
 ('soft-horizon',72,[[48,55,60,64,71],[43,50,55,59,62],[45,52,57,60,64],[41,48,53,57,60]],.1),
 ('midnight-glass',80,[[38,45,50,53,57],[34,41,46,50,53],[41,48,53,57,60],[36,43,48,52,55]],.35),
 ('afterglow',84,[[41,48,53,57,64],[48,55,60,64,67],[43,50,55,59,62],[45,52,57,60,64]],.4),
]
def frequency(note):return 440*2**((note-69)/12)
for index,(name,tempo,chords,pulse) in enumerate(THEMES):
 beat=60/tempo;duration=32*beat;n=round(RATE*duration);t=np.arange(n)/RATE
 stereo=np.zeros((n,2));rng=np.random.default_rng(540+index)
 def add(signal,start,pan):
  start=round(start*RATE);ids=(np.arange(len(signal))+start)%n
  np.add.at(stereo[:,0],ids,signal*np.sqrt((1-pan)/2));np.add.at(stereo[:,1],ids,signal*np.sqrt((1+pan)/2))
 for c,chord in enumerate(chords):
  length=round(10*beat*RATE);v=np.arange(length)/RATE
  envelope=(1-np.exp(-v/.6))*np.exp(-np.maximum(0,v-6*beat)/(1.3*beat))
  for j,note in enumerate(chord[1:]):
   f=frequency(note);phase=rng.uniform(0,6.28)
   pad=(np.sin(2*np.pi*f*v+phase)+.25*np.sin(2*np.pi*f*1.0018*v)+.12*np.sin(4*np.pi*f*v))*.043*envelope
   add(pad,c*8*beat,(j-1.5)/2)
  for k in range(8):
   v=np.arange(round(1.9*beat*RATE))/RATE;f=frequency(chord[0]);env=(1-np.exp(-v/.012))*np.exp(-v/(beat*.9))
   add((np.sin(2*np.pi*f*v)+.18*np.sin(4*np.pi*f*v))*.085*env,(c*8+k)*beat,0)
  for k in range(16):
   note=chord[1+(k*3+c)%4]+12;f=frequency(note);v=np.arange(round(3*beat*RATE))/RATE
   env=(1-np.exp(-v/.007))*np.exp(-v/(beat*(.7 if pulse>.5 else 1.2)))
   bell=(np.sin(2*np.pi*f*v)+.22*np.sin(4*np.pi*f*v)*np.exp(-v/.18)+.09*np.sin(6*np.pi*f*v))*env*.035
   add(bell,(c*8+k*.5)*beat,(-1 if k%2 else 1)*.45)
 if pulse:
  for k in range(32):
   v=np.arange(round(.3*RATE))/RATE
   kick=np.sin(2*np.pi*(45*v+4*(1-np.exp(-v*30))))*np.exp(-v*18)*.045*pulse
   add(kick,k*beat,0)
  for k in range(64):
   noise=rng.standard_normal(round(.055*RATE));noise=sosfilt(butter(2,3500,fs=RATE,btype='highpass',output='sos'),noise)
   add(noise*np.exp(-np.arange(len(noise))/RATE*90)*.012*pulse,k*beat*.5,.2 if k%2 else -.2)
 dry=stereo.copy()
 for delay,gain in [(.375*beat,.23),(.75*beat,.16),(1.5*beat,.12),(2.25*beat,.07)]:stereo+=np.roll(dry,round(delay*RATE),axis=0)[:,::-1]*gain
 stereo=np.tanh(stereo*1.5);stereo*=min(2.2,.19/max(np.sqrt(np.mean(stereo**2)),1e-6));stereo=np.clip(stereo,-.85,.85)
 edge=round(.012*RATE);stereo[:edge]*=np.linspace(0,1,edge)[:,None];stereo[-edge:]*=np.linspace(1,0,edge)[:,None]
 sf.write(OUT/(name+'.wav'),stereo,RATE,subtype='PCM_16')
 print(name,round(duration,2),round(float(np.sqrt(np.mean(stereo**2))),3))
