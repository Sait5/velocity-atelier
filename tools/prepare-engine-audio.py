"""Loop excerpts from Ed Pond's Ferrari 458 recording, CC BY-SA 3.0.
Source: https://commons.wikimedia.org/wiki/File:Ferrari_458_Italia.ogg
Edits: excerpting, 70 ms equal-power end crossfade, peak/RMS normalization.
Derived WAV files remain CC BY-SA 3.0. Requires numpy and soundfile.
"""
from pathlib import Path
import numpy as np
import soundfile as sf
base=Path(__file__).resolve().parents[1]/'public'/'audio'
audio,rate=sf.read(base/'ferrari-458-goodwood.ogg')
for name,start,end in [('low',.65,1.52),('mid',2.95,3.78),('high',3.93,4.69)]:
    clip=audio[int(start*rate):int(end*rate)].copy()
    n=int(.07*rate);t=np.linspace(0,np.pi/2,n)[:,None]
    joined=clip[-n:]*np.cos(t)+clip[:n]*np.sin(t)
    clip=np.concatenate((clip[n:-n],joined))
    gain=min(.17/np.sqrt(np.mean(clip**2)),.85/np.max(np.abs(clip)))
    clip*=gain
    sf.write(base/('ferrari-458-'+name+'.wav'),clip,rate,subtype='PCM_16')
    assert np.isfinite(clip).all() and np.max(np.abs(clip))<.86
    print(name,round(len(clip)/rate,3),'seconds; peak',round(float(np.max(np.abs(clip))),3))
