"""Bugatti owner-recording continuations for the site (see tools/bugatti-user-audio-manifest.json).

Sources (owner takes decoded from the supplied m4a): tools/source-assets/audio/bugatti/user-acceleration.wav, user-coast.wav.
The decode is clipped at full scale in a few places; those runs are rebuilt by cubic interpolation from their
neighbours, then the three outputs share one gain so the loudest peak sits at -1 dBFS (headroom for the music and
braking layers, same balance between the takes).
Run with any Python that has numpy, e.g. Blender's: "<Blender>/5.2/python/bin/python.exe" tools/prepare-bugatti-user-continuation.py
"""
from pathlib import Path
import json, wave
import numpy as np

SRC, OUT = Path('tools/source-assets/audio/bugatti'), Path('public/audio/bugatti')
PEAK = 10 ** (-1 / 20)


def read(path):
    with wave.open(str(path), 'rb') as f:
        return np.frombuffer(f.readframes(f.getnframes()), dtype='<i2').reshape(-1, f.getnchannels()).astype(float) / 32768, f.getframerate()


def write(path, x, rate):
    with wave.open(str(path), 'wb') as f:
        f.setnchannels(x.shape[1]); f.setsampwidth(2); f.setframerate(rate)
        f.writeframes(np.round(np.clip(x, -1, 32767 / 32768) * 32768).astype('<i2').tobytes())


def declip(x, level=.999):
    x = x.copy()
    for c in range(x.shape[1]):
        y, bad = x[:, c], np.abs(x[:, c]) >= level
        i = 0
        while i < len(y):
            if not bad[i]: i += 1; continue
            j = i
            while j < len(y) and bad[j]: j += 1
            known = [k for k in (i - 2, i - 1, j, j + 1) if 0 <= k < len(y)]
            if len(known) == 4:
                y[i:j] = np.polyval(np.polyfit(np.array(known) - i, y[known], 3), np.arange(j - i))
            i = j
    return x


rate = None; takes = {}
for name, start, end in [('acceleration', 15, 25), ('coast', 2, 6)]:
    raw, rate = read(SRC / f'user-{name}.wav'); raw = declip(raw)
    x = raw[:int(end * rate)].copy(); n = int(.12 * rate); a = int(start * rate) - n; w = np.linspace(0, 1, n)[:, None]
    x[-n:] = x[-n:] * (1 - w) + x[a:a + n] * w   # the loop end crossfades into the loop start
    takes[f'user-{name}-continuous'] = x
    if name == 'coast': takes['user-coast-end'] = raw[int(6 * rate):int(8 * rate)]
gain = PEAK / max(np.abs(x).max() for x in takes.values())
for name, x in takes.items():
    write(OUT / f'{name}.wav', x * gain, rate)
    print(name, 'peak', round(20 * np.log10(np.abs(x * gain).max()), 2), 'dBFS')
print('shared gain', round(20 * np.log10(gain), 2), 'dB')
(OUT / 'user-loop-timing.json').write_text(json.dumps({'acceleration': {'loopStart': 15, 'loopEnd': 25}, 'coast': {'loopStart': 2, 'loopEnd': 6}}, indent=2))
