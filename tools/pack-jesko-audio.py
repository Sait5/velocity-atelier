"""Koenigsegg Jesko engine sound from the owner's "Koenigsegg Regera Sound" GTA V mod by Legacy DMC (lg91timreg; the
Regera has the twin-turbo 5.0 V8 the Jesko's is developed from), the same author and layout as the McLaren's sound.
Source: tools/source-assets/audio/jesko-regera-mod/lg91timreg.awc (the mod's PCM AWC container, as downloaded).

The mod's engine is the GTA V granular kind: an exhaust and an engine take of a full-throttle sweep from idle to the
limiter (streams 1f7402aa / 3ab9171) and of the overrun back down (18648298 / e804842), plus the idle (1d18b9a1), the
start (1d64b840) and the stop (1b393dea). The site plays an engine as loops at fixed revs (app/three/jeskoEngineAudio.ts),
so each loop is cut from the sweeps, as the McLaren's were:
  - the engine's crank frequency is tracked through each sweep (harmonic sum every 25 ms, median-filtered and made
    monotonic: up on load, down on overrun), rpm = 60 x that frequency (the sweeps run ~1800-7400 rpm; below ~2500 rpm,
    where the throttle snaps the revs up from idle, the pitch is not steady enough to cut, and the idle covers it);
  - at each loop's rpm a window round the moment the sweep passes it is re-timed sample by sample so its pitch holds
    that rpm the whole way (above it the take is read slower, below faster): a steady take;
  - the exhaust and engine takes at the same rpm are mixed (the engine 0.55 under the exhaust; the two are separate
    recordings, uncorrelated, as the game mixes them), the loop made seamless (last 60 ms crossfaded into its start);
  - each bank keeps the mod's own balance across the revs: one gain for all its loops (loudest peak 0.85).
The idle is looped the same way; the start and the stop are the mod's own, peaks at 0.9. Lossless FLAC at the mod's rates:
public/audio/jesko-load-<rpm>.flac, jesko-overrun-<rpm>.flac, jesko-idle.flac, jesko-start.flac, jesko-stop.flac.
Run: blender -b --factory-startup --python tools/pack-jesko-audio.py
"""
import os, struct
import aud
import numpy as np

AWC = os.path.join('tools', 'source-assets', 'audio', 'jesko-regera-mod', 'lg91timreg.awc')
OUT = os.path.join('public', 'audio')
LOAD = [2700, 3400, 4200, 5100, 6100, 7200]
OVERRUN = [2500, 3300, 4300, 5500, 6900]


def read_awc(path):
    """Every PCM stream of a GTA V AWC container: id -> (sample rate, float samples)."""
    b = open(path, 'rb').read()
    flags, count = struct.unpack_from('<H', b, 6)[0], struct.unpack_from('<I', b, 8)[0]
    p = 16 + (2 * count if flags & 1 else 0); streams = []
    for _ in range(count):
        v = struct.unpack_from('<I', b, p)[0]; p += 4; streams.append([v & 0x1fffffff, v >> 29, []])
    for s in streams:
        for _ in range(s[1]):
            v = struct.unpack_from('<Q', b, p)[0]; p += 8; s[2].append((v >> 56, (v >> 28) & 0xfffffff, v & 0xfffffff))
    out = {}
    for sid, _, chunks in streams:
        fmt = next((c for c in chunks if c[0] == 0xfa), None); data = next((c for c in chunks if c[0] == 0x55), None)
        if not fmt or not data: continue
        samples, rate, codec = struct.unpack_from('<I', b, fmt[2])[0], struct.unpack_from('<H', b, fmt[2] + 8)[0], b[fmt[2] + 23]
        if codec != 0: continue
        pcm = np.frombuffer(b, dtype='<i2', count=samples, offset=data[2]).astype(np.float64) / 32768
        out['%x' % sid] = (rate, pcm)
    return out


def track(x, rate, hop_s=.025, w=8192):
    """Crank frequency (harmonic sum over six harmonics, 14-140 Hz) every hop_s seconds."""
    hop = int(rate * hop_s); cand = np.arange(14, 140, .25); win = np.hanning(w); f = []
    for k in range(0, len(x) - w, hop):
        lsp = np.log(np.abs(np.fft.rfft(x[k:k + w] * win)) + 1e-9)
        idx = np.clip(np.round(np.outer(np.arange(1, 7), cand) * w / rate).astype(int), 1, len(lsp) - 2)
        f.append(cand[np.argmax(np.maximum(np.maximum(lsp[idx - 1], lsp[idx]), lsp[idx + 1]).mean(0))])
    t = (np.arange(len(f)) * hop + w / 2) / rate
    return t, np.array(f)


def clean(f, rising):
    """Octave slips mended by the smoothest path through each frame's reading, half it or double it (a Viterbi pass:
    the cost of a step is its jump in log pitch, a reading taken as it is slightly preferred), then a median filter,
    monotonic (the sweep only goes one way) and a light smoothing."""
    cand = np.stack([f / 2, f, f * 2], 1); lc = np.log(cand); n = len(f)
    cost = np.array([.3, 0, .3]); back = np.zeros((n, 3), int)
    for t in range(1, n):
        step = np.abs(lc[t][None, :] - lc[t - 1][:, None]) * 8 + cost[:, None]
        back[t] = np.argmin(step, 0); cost = step[back[t], range(3)] + np.array([.3, 0, .3])
    k = int(np.argmin(cost)); path = [k]
    for t in range(n - 1, 0, -1): k = back[t][k]; path.append(k)
    f = cand[np.arange(n), path[::-1]]
    k = 9; pad = np.pad(f, k // 2, mode='edge'); m = np.array([np.median(pad[i:i + k]) for i in range(len(f))])
    m = np.maximum.accumulate(m) if rising else np.minimum.accumulate(m)
    return np.convolve(np.pad(m, 4, mode='edge'), np.ones(9) / 9, mode='valid')


def steady_take(x, rate, t, f, target, half):
    """A take of 2*half seconds whose crank frequency holds `target`, re-timed from the sweep round where it passes it."""
    k = int(np.argmin(np.abs(f - target))); centre = t[k]
    pitch = lambda s: max(1e-3, np.interp(s / rate, t, f))
    n = int(2 * half * rate); pos = np.empty(n); s = centre * rate
    # reading target/pitch source samples per output sample brings the pitch to the target (a higher pitch is read
    # slower): walk back half the take from the centre, then forward
    for _ in range(n // 2): s -= target / pitch(s)
    for i in range(n): pos[i] = s; s += target / pitch(s)
    i0 = np.floor(pos).astype(int); fr = pos - i0; g = lambda i: x[np.clip(i, 0, len(x) - 1)]
    xm1, x0, x1, x2 = g(i0 - 1), g(i0), g(i0 + 1), g(i0 + 2)
    return x0 + .5 * fr * (x1 - xm1 + fr * (2 * xm1 - 5 * x0 + 4 * x1 - x2 + fr * (3 * (x0 - x1) + x2 - xm1))), centre


def seamless(y, rate, fade=.06):
    m = int(fade * rate); a = np.sin(np.linspace(0, np.pi / 2, m)); b = np.cos(np.linspace(0, np.pi / 2, m))
    return np.concatenate([y[m:-m], y[-m:] * b + y[:m] * a])


def write(name, y, rate):
    data = np.ascontiguousarray(np.clip(y, -1, 1).astype(np.float32).reshape(-1, 1))
    aud.Sound.buffer(data, rate).write(os.path.join(OUT, name + '.flac'), rate, aud.CHANNELS_MONO, aud.FORMAT_S16, aud.CONTAINER_FLAC, aud.CODEC_FLAC, 0, 4096)


s = read_awc(AWC)
banks = {}
for bank, rpms, exhaust, engine, rising, half in (('load', LOAD, '1f7402aa', '3ab9171', True, .17), ('overrun', OVERRUN, '18648298', 'e804842', False, .3)):
    rate = s[exhaust][0]; assert s[engine][0] == rate
    tx, fx = track(s[exhaust][1], rate); te, fe = track(s[engine][1], rate)
    fx, fe = clean(fx, rising), clean(fe, rising)
    print('JESKO %s sweep: exhaust %.0f-%.0f rpm, engine %.0f-%.0f rpm' % (bank, fx.min() * 60, fx.max() * 60, fe.min() * 60, fe.max() * 60))
    loops = []
    for rpm in rpms:
        target = rpm / 60
        a, ca = steady_take(s[exhaust][1], rate, tx, fx, target, half)
        e, ce = steady_take(s[engine][1], rate, te, fe, target, half)
        loops.append((rpm, seamless(a + .55 * e, rate)))
        print('JESKO %s %d rpm: exhaust at %.2f s, engine at %.2f s' % (bank, rpm, ca, ce))
    gain = .85 / max(np.abs(y).max() for _, y in loops)
    for rpm, y in loops: write('jesko-%s-%d' % (bank, rpm), y * gain, rate)
    banks[bank] = gain
rate, idle = s['1d18b9a1']; idle = seamless(idle, rate, .12); write('jesko-idle', idle * (.85 / np.abs(idle).max()), rate)
for name, sid in (('start', '1d64b840'), ('stop', '1b393dea')):
    rate, y = s[sid]; write('jesko-' + name, y * (.9 / np.abs(y).max()), rate)
print('JESKO bank gains', {k: round(v, 3) for k, v in banks.items()}, 'idle/start/stop rates', s['1d18b9a1'][0], s['1d64b840'][0], s['1b393dea'][0])
