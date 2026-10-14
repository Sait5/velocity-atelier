"""Build RPM beds from the licensed GDC onboard exhaust take, not pass-by clips.

Variable-rate resampling removes the recorded acceleration from each selected
engine ramp. It retains the recorded waveform; no synthesis, EQ or WSOLA.
Only adjacent RPM beds are mixed by the runtime. Raw source stays private.
"""
from pathlib import Path
import hashlib, json
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly, stft, savgol_filter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'tools/source-audio/sonniss/aventador-onboard-exhaust.wav'
OUT = ROOT / 'public/audio'
raw, sr = sf.read(SOURCE)
audio = resample_poly(raw, 1, 2)
sr //= 2
# These are uninterrupted rising-RPM takes: no gear change or throttle release.
ramps = [(100.5, 118.3, 190, 655), (160, 177.5, 235, 724), (410, 417.5, 275, 655)]
manifest = {'source': (SOURCE.parent / 'source-url.txt').read_text(),
            'sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
            'publisher': 'Pole Position Production', 'vehicle': 'Lamborghini Aventador 2014',
            'bundle': 'Sonniss GameAudioGDC 2020',
            'license': 'https://sonniss.com/gdc-bundle-license/',
            'processing': 'RPM-normalized recorded ramps, smooth splices, static level; no synthesized engine',
            'bands': []}

def join(a, b, seconds=.25):
    n = min(int(seconds*sr), len(a)//4, len(b)//4)
    blend = (.5-.5*np.cos(np.linspace(0, np.pi, n)))
    return np.concatenate((a[:-n], a[-n:]*(1-blend)+b[:n]*blend, b[n:]))

def circular(a):
    n = int(.25*sr)
    blend = .5-.5*np.cos(np.linspace(0, np.pi, n))
    # First sample follows a[n-1]; last sample precedes a[n].
    return np.concatenate((a[n:-n], a[-n:]*(1-blend)+a[:n]*blend))

for name, target in [('idle',100), ('low',240), ('mid',420), ('high',640)]:
    clips=[]; excerpts=[]
    if name == 'idle':
        clips=[audio[int(502*sr):int(518*sr)]]
        excerpts=[{'seconds':[502,518], 'rate':'original'}]
    else:
        selected = ramps if name != 'high' else [ramps[0], (173.5,177.5,568,724), ramps[2]]
        width = .22 if name == 'low' else .14
        for lo, hi, flo, fhi in selected:
            a = lo+(target*(1-width)-flo)/(fhi-flo)*(hi-lo)
            b = lo+(target*(1+width)-flo)/(fhi-flo)*(hi-lo)
            a, b = max(lo,a), min(hi,b)
            if b-a < .8: continue
            x=audio[int(a*sr):int(b*sr)]
            f,t,z=stft(resample_poly(x,1,4), sr//4, nperseg=4096, noverlap=3584)
            expected=np.interp(t+a,[lo,hi],[flo,fhi])
            tracked=[]
            for i,exp in enumerate(expected):
                candidates=np.flatnonzero((f>exp*.93)&(f<exp*1.07))
                k=candidates[np.argmax(np.abs(z[candidates,i]))]
                # Sub-bin interpolation for continuous engine-order tracking.
                v=np.log(np.abs(z[k-1:k+2,i])+1e-12)
                delta=np.clip(.5*(v[0]-v[2])/(v[0]-2*v[1]+v[2]+1e-12),-.5,.5)
                tracked.append(f[k]+delta*(f[1]-f[0]))
            tracked=savgol_filter(tracked, min(11,len(tracked)//2*2-1), 2)
            freq=np.interp(np.arange(len(x))/sr,t,tracked)
            # Integrated pulse phase provides source positions at constant RPM.
            phase=np.cumsum(freq)/sr
            positions=np.interp(np.arange(phase[0],phase[-1],target/sr),phase,np.arange(len(x)))
            y=np.interp(positions,np.arange(len(x)),x)
            y*=.085/max(np.sqrt(np.mean(y*y)),1e-6)
            clips.append(y);excerpts.append({'seconds':[round(a,3),round(b,3)], 'frequency_hz':target})
    combined=clips[0]
    for clip in clips[1:]: combined=join(combined,clip)
    combined=circular(combined)
    # Leave ample headroom when two adjacent layers overlap.
    combined*=min(.60, .32/max(np.max(np.abs(combined)),1e-6))
    file=OUT / f'aventador-sonniss-{name}.wav'
    sf.write(file,combined,sr,subtype='PCM_16')
    manifest['bands'].append({'name':name,'file':file.name,'duration':len(combined)/sr,
                              'excerpts':excerpts,'peak':float(np.max(np.abs(combined))),
                              'rms':float(np.sqrt(np.mean(combined**2)))})
(ROOT/'tools/sonniss-aventador-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest['bands'],indent=2))
