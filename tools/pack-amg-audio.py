"""Mercedes-AMG GT 63 S engine sound from the owner's "Mercedes-AMG 4.0T V8 (M17x) Engine Sound Pack" GTA V mod (its
M177 resource ta176m177: the twin-turbo 4.0 V8 of the GT 63 S 4-Door; the pack's other download, the GT 63 S car mod,
carries no sound of its own). Source: tools/source-assets/audio/amg-m177-mod/ta176m177.awc (the mod's PCM AWC container,
as downloaded). Its streams are laid out as the Jesko's Legacy DMC sound (tools/pack-jesko-audio.py) and cut the same way
into loops that each hold one rpm, except for how the revs are followed through the sweeps:
  - this recording's lowest harmonics trade places through the sweep, so the crank tracker of the Jesko's script jumped
    between them; here one continuous spectral line (55-175 Hz) is followed through each sweep instead (a Viterbi path
    over the spectrogram, monotonic: up on load, down on overrun). It is the engine's 1.5 order: rpm = 40 x its frequency
    (the full-throttle sweep runs ~2300-6600 rpm and holds at the limiter for its last 2 s, the overrun ~6100-2800);
  - the exhaust's overrun take is broken up by pops, too irregular to follow; it is as long as the engine's overrun take
    (12.9 s, recorded together), so the engine take's line is used for it, by time.
Output: public/audio/amg-load-<rpm>.flac, amg-overrun-<rpm>.flac, amg-idle.flac, amg-start.flac, amg-stop.flac.
Run: blender -b --factory-startup --python tools/pack-amg-audio.py
"""
import os, struct
import aud
import numpy as np

AWC = os.path.join('tools', 'source-assets', 'audio', 'amg-m177-mod', 'ta176m177.awc')
OUT = os.path.join('public', 'audio')
LOAD = [2500, 3200, 4000, 4800, 5600, 6400]
OVERRUN = [3000, 3800, 4700, 5600]
RPM_PER_HZ = 40


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


def line(x, rate, rising, lo=55, hi=175, hop_s=.05, w=16384):
    """The strongest continuous spectral line between lo and hi Hz: a Viterbi path over the log spectrogram, moving at most
    three bins a frame and only one way (up on load, down on overrun), lightly smoothed."""
    hop = int(rate * hop_s); df = rate / w; b0, b1 = int(lo / df), int(hi / df); E = []
    for k in range(-w // 2, len(x) - w // 2, hop):
        seg = x[max(0, k):k + w]; seg = np.pad(seg, (max(0, -k), w - len(seg) - max(0, -k)))
        sp = np.log(np.abs(np.fft.rfft(seg * np.hanning(w)))[b0:b1] + 1e-9); E.append(sp - sp.mean())
    E = np.array(E); n, m = E.shape; cost = E[0].copy(); back = np.zeros((n, m), int)
    for t in range(1, n):
        best = np.full(m, -1e9); arg = np.zeros(m, int)
        for d in range(4):
            src = np.arange(m) - (d if rising else -d); ok = (src >= 0) & (src < m)
            cand = np.full(m, -1e9); cand[ok] = cost[src[ok]] - .15 * d
            upd = cand > best; best[upd] = cand[upd]; arg[upd] = src[upd]
        back[t] = arg; cost = best + E[t]
    k = int(np.argmax(cost)); path = [k]
    for t in range(n - 1, 0, -1): k = back[t][k]; path.append(k)
    f = (np.array(path[::-1]) + b0 + .5) * df
    f = np.convolve(np.pad(f, 5, mode='edge'), np.ones(11) / 11, mode='valid')
    return (np.arange(n) * hop + w / 2 - w // 2) / rate, f


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
    te, fe = line(s[engine][1], rate, rising)
    tx, fx = line(s[exhaust][1], rate, rising) if rising else (te, fe)
    print('AMG %s sweep: exhaust %.0f-%.0f rpm, engine %.0f-%.0f rpm' % (bank, fx.min() * RPM_PER_HZ, fx.max() * RPM_PER_HZ, fe.min() * RPM_PER_HZ, fe.max() * RPM_PER_HZ))
    loops = []
    for rpm in rpms:
        target = rpm / RPM_PER_HZ
        a, ca = steady_take(s[exhaust][1], rate, tx, fx, target, half)
        e, ce = steady_take(s[engine][1], rate, te, fe, target, half)
        loops.append((rpm, seamless(a + .55 * e, rate)))
        print('AMG %s %d rpm: exhaust at %.2f s, engine at %.2f s' % (bank, rpm, ca, ce))
    gain = .85 / max(np.abs(y).max() for _, y in loops)
    for rpm, y in loops: write('amg-%s-%d' % (bank, rpm), y * gain, rate)
    banks[bank] = gain
rate, idle = s['1d18b9a1']; idle = seamless(idle, rate, .12); write('amg-idle', idle * (.85 / np.abs(idle).max()), rate)
for name, sid in (('start', '1d64b840'), ('stop', '1b393dea')):
    rate, y = s[sid]; write('amg-' + name, y * (.9 / np.abs(y).max()), rate)
print('AMG bank gains', {k: round(v, 3) for k, v in banks.items()}, 'idle/start/stop rates', s['1d18b9a1'][0], s['1d64b840'][0], s['1b393dea'][0])
