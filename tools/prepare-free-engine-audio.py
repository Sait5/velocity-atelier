from pathlib import Path
import soundfile as sf,numpy as np,json,hashlib
p=Path('tools/source-audio/performance-cars/005-performance-cars-mutedio.wav')
x,r=sf.read(p,always_2d=True)
a,b=.6,6.8;x=x[round(a*r):round(b*r)]
# A steady engine section: no acceleration timeline and no duration stretching.
n=round(.18*r);t=np.linspace(0,1,n)[:,None]
x=np.concatenate([x[n:-n],x[-n:]*(1-t)+x[:n]*t])
gain=min(.065/np.sqrt(np.mean(x*x)),.35/np.max(abs(x)))
x*=gain
from scipy.signal import resample_poly
x=resample_poly(x,1,2);r//=2
sf.write('public/audio/sports-engine-cruise.wav',x,r,subtype='PCM_16')
manifest=dict(title='Performance Cars — sample 005',source='https://muted.io/performance-cars/',download='https://mutedio.s3.us-east-2.amazonaws.com/sounds/sample-packs/performance-cars-free-sample-pack-mutedio.zip',license='CC0 1.0',license_url='https://creativecommons.org/publicdomain/zero/1.0/',original_sha256=hashlib.sha256(p.read_bytes()).hexdigest(),excerpt_seconds=[a,b],crossfade_seconds=.18,gain=float(gain),output_duration_seconds=len(x)/r,sample_rate=r,note='Real performance-car field recording. Exact vehicle model unspecified; not represented as Revuelto. No time stretching. Subtle RPM-controlled playback range 0.85–1.15.')
Path('tools/free-engine-audio-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps(manifest,indent=2))
