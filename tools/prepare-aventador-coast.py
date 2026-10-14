from pathlib import Path
import hashlib, json
import numpy as np
import soundfile as sf

root = Path(__file__).resolve().parents[1]
source = Path('C:/Users/Admin/Downloads/Zvuk_dviguna_-_Lamborghini_Aventador_(Zvyki.com).mp3')
x, sr = sf.read(source, always_2d=True)
first = x[29 * sr:55 * sr].copy()
tail = x[48 * sr:55 * sr].copy()
n = int(.6 * sr)
t = np.linspace(0, np.pi / 2, n)[:, None]
splice = tail[-n:] * np.cos(t) + tail[:n] * np.sin(t)
cycle = np.concatenate((tail[n:-n], splice))
intro = np.concatenate((first[:-n], first[-n:] * np.cos(t) + cycle[:n] * np.sin(t), cycle[n:]))
buffer = np.concatenate((intro, cycle))
buffer[:int(.005 * sr)] *= np.linspace(0, 1, int(.005 * sr))[:, None]
gain = min(.4, .85 / np.max(np.abs(buffer)))
sf.write(root / 'public/audio/aventador-user-coast.wav', buffer * gain, sr, subtype='PCM_24')
timing = {'loopStart': len(intro) / sr, 'loopEnd': len(buffer) / sr}
(root / 'public/audio/aventador-user-coast-timing.json').write_text(json.dumps(timing, indent=2) + '\n')
sf.write(root / 'tools/generated/audio/Aventador_deceleration_from_28s.wav', first * gain, sr, subtype='PCM_24')
manifest = {'source': str(source), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'source_seconds': [29, 55], 'sustain_source_seconds': [48, 55],
            'crossfade_seconds': .6, 'gain': gain, 'pitch_change': False, 'tempo_change': False, **timing}
(root / 'tools/aventador-coast-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest, indent=2))
