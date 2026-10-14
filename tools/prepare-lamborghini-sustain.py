"""Remove the supplied recording's own acceleration timeline from the runtime engine bed."""
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter,sosfilt
root=Path(__file__).resolve().parents[1]
source=next(Path('C:/Users/Admin/Downloads').glob('Lamborghini Aventador *hotplayer*mp3'))
x,rate=sf.read(source,always_2d=True)
# Short nearly steady spectral region, no complete acceleration or recorded gear change.
start,end=18.15,18.85
x=x[round(start*rate):round(end*rate)].copy()
x-=x.mean(axis=0);x=sosfilt(butter(2,35,fs=rate,btype='highpass',output='sos'),x,axis=0)
# Remove slow level modulation, keeping the combustion waveform and stereo image.
energy=np.mean(x*x,axis=1);width=round(.045*rate)
smooth=np.convolve(np.pad(energy,(width//2,width//2),mode='reflect'),np.ones(width)/width,mode='valid')[:len(x)]
envelope=np.sqrt(np.maximum(smooth,1e-8));target=np.median(envelope)
x*=np.clip(target/envelope,.75,1.3)[:,None]
n=round(.09*rate);blend=np.linspace(0,1,n)[:,None]
x=np.concatenate([x[n:-n],x[-n:]*(1-blend)+x[:n]*blend])
closing=x[0]-(x[1]-x[0]);correction=closing-x[-1]
x[-64:]+=(.5-.5*np.cos(np.linspace(0,np.pi,64)))[:,None]*correction
x*=min(.065/np.sqrt(np.mean(x*x)),.28/np.max(np.abs(x)))
out=root/'public/audio/aventador-engine-sustain.wav';sf.write(out,x,rate,subtype='PCM_16')
assert np.max(np.abs(x))<.281
assert np.max(np.abs(x[0]-x[-1]))<=np.percentile(np.abs(np.diff(x,axis=0)),99)
print('Sustain:',len(x)/rate,'seconds; RMS',20*np.log10(np.sqrt(np.mean(x*x))),'dBFS; seam',np.max(np.abs(x[0]-x[-1])))
