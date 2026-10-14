from pathlib import Path
import numpy as np,soundfile as sf,json,hashlib,shutil
ROOT=Path(__file__).resolve().parents[1]
source=Path('C:/Users/Admin/Downloads/mizanstock-lamborghini-aventador-svj-racing-sound-effect-161994.mp3')
archive=ROOT/'tools/source-audio/pixabay-aventador-svj-161994.mp3';archive.parent.mkdir(exist_ok=True);shutil.copyfile(source,archive)
x,rate=sf.read(source,always_2d=True)
prefix=x[:round(4.4*rate)].copy();steady=x[round(6.1*rate):round(15.7*rate)].copy()
def splice(a,b):
 t=np.linspace(0,np.pi/2,len(a))[:,None]
 return a*np.cos(t)+b*np.sin(t)
circle=round(.9*rate);steady[-circle:]=splice(steady[-circle:],steady[:circle])
join=round(.4*rate);prefix[-join:]=splice(prefix[-join:],steady[:join])
driving=np.concatenate([prefix,steady[join:]])
gain=min(.25,.35/max(np.max(np.abs(driving)),1e-9));driving*=gain
sf.write(ROOT/'public/audio/aventador-svj-pixabay-driving.wav',driving,rate,subtype='PCM_16')
timing=dict(loopStart=(len(prefix)+circle-join)/rate,loopEnd=len(driving)/rate)
(ROOT/'public/audio/aventador-svj-pixabay-timing.json').write_text(json.dumps(timing),encoding='utf-8')
manifest=dict(title='Lamborghini Aventador SVJ Racing Sound effect',author='mizanstock / AH.Mizan Rahman',source='https://pixabay.com/sound-effects/film-special-effects-lamborghini-aventador-svj-racing-sound-effect-161994/',license='Pixabay Content License',license_url='https://pixabay.com/service/license-summary/',source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),original_duration=len(x)/rate,segments_seconds=[[0,4.4],[6.1,15.7]],gain_db=float(20*np.log10(gain)),transition_seconds=.4,circular_crossfade_seconds=.9,timing=timing,processing='Cuts, static attenuation and equal-power splices only. Playback rate 1; no pitch shifts, filters or time stretching. Exact recording attribution comes from publisher; not a Revuelto recording.')
(ROOT/'tools/pixabay-svj-audio-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
assert np.isfinite(driving).all() and np.max(abs(driving))<=.35001
loop=driving[round(timing['loopStart']*rate):];rms=[np.sqrt(np.mean(loop[i:i+rate//10]**2)) for i in range(0,len(loop)-rate//10,rate//10)]
assert min(rms)>.02
assert np.max(abs(driving[-1]-driving[round(timing['loopStart']*rate)]))<np.quantile(np.max(abs(np.diff(loop,axis=0)),axis=1),.995)
print('PASS: selected SVJ recording, no silent gaps or clipping, smooth circular splice.');print(timing)
