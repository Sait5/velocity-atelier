"""Re-synthesise the CSR2 carbon twill normal map at k-times resolution, matching the original weave layout.

Usage: blender --background --python carbon.py -- <in_normal.png> <out_normal.png> <k>
"""
import bpy, sys, numpy as np
args = sys.argv[sys.argv.index('--') + 1:]
src, dst, k = args[0], args[1], int(args[2])
img = bpy.data.images.load(src)
w, h = img.size
a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[..., :3] * 2 - 1
gx, gy = np.abs(a[..., 0]), np.abs(a[..., 1])


def layout(cell):
    n = w // cell
    hor = np.zeros((n, n), bool)
    for i in range(n):
        for j in range(n):
            blk = slice(i * cell, (i + 1) * cell), slice(j * cell, (j + 1) * cell)
            hor[i, j] = gy[blk].mean() > gx[blk].mean()      # bumps across y -> tow runs along x
    return hor


def score(cell, hor):
    n = w // cell; syn = np.zeros((h, w, 2), np.float32)
    t = (np.arange(cell) + .5) / cell * 2 - 1; prof = -np.sin(t * np.pi / 2)
    for i in range(n):
        for j in range(n):
            ys, xs = slice(i * cell, (i + 1) * cell), slice(j * cell, (j + 1) * cell)
            if hor[i, j]: syn[ys, xs, 1] = prof[:, None]
            else: syn[ys, xs, 0] = prof[None, :]
    return float((syn[..., 0] * a[..., 0] + syn[..., 1] * a[..., 1]).mean())


cells = (int(args[3]),) if len(args) > 3 else (8, 16, 32)
src_a = a.copy(); best = None
for dy in range(0, 16, 4):
    for dx in range(0, 16, 4):
        a = np.roll(src_a, (-dy, -dx), axis=(0, 1)); gx, gy = np.abs(a[..., 0]), np.abs(a[..., 1])
        for c in cells:
            sc = score(c, layout(c))
            if best is None or abs(sc) > abs(best[0]): best = (sc, c, dy, dx)
sc, cell, DY, DX = best
a = np.roll(src_a, (-DY, -DX), axis=(0, 1)); gx, gy = np.abs(a[..., 0]), np.abs(a[..., 1])
hor = layout(cell); sign = 1 if sc > 0 else -1
n = w // cell; C = cell * k; W = w * k


def runs(line):
    """(start, length) of the run of equal cells containing each index, wrapping around the tile edge."""
    N = len(line); big = list(line) * 3; out, k0 = {}, 0
    for q in range(1, 3 * N + 1):
        if q == 3 * N or big[q] != big[k0]:
            for r in range(k0, q):
                if N <= r < 2 * N: out[r - N] = (k0 - N, q - k0)
            k0 = q
    return out


out = np.zeros((W, W, 2), np.float32)
rng = np.random.default_rng(7)
t = (np.arange(C) + .5) / C * 2 - 1
across = -np.sin(t * np.pi / 2) * .42 * sign           # rounded tow cross-section
stri = np.sin((np.arange(C) + .5) / C * np.pi * 2 * 12) * .035   # filament striations
rowruns = [runs([hor[i, j] for j in range(n)]) for i in range(n)]
colruns = [runs([hor[i, j] for i in range(n)]) for j in range(n)]
for i in range(n):
    for j in range(n):
        ys, xs = slice(i * C, (i + 1) * C), slice(j * C, (j + 1) * C)
        jitter = rng.normal(0, .01)
        if hor[i, j]:
            s0, L = rowruns[i][j]; u = ((j - s0) * C + np.arange(C) + .5) / (L * C) * 2 - 1
            fall = np.clip((1 - np.abs(u)) * L * 5, 0, 1)
            out[ys, xs, 1] = (across[:, None] + stri[:, None]) * fall[None, :] + jitter
            out[ys, xs, 0] = -np.sign(u)[None, :] * (1 - fall[None, :]) * .25
        else:
            s0, L = colruns[j][i]; u = ((i - s0) * C + np.arange(C) + .5) / (L * C) * 2 - 1
            fall = np.clip((1 - np.abs(u)) * L * 5, 0, 1)
            out[ys, xs, 0] = (across[None, :] + stri[None, :]) * fall[:, None] + jitter
            out[ys, xs, 1] = -np.sign(u)[:, None] * (1 - fall[:, None]) * .25
z = np.sqrt(np.clip(1 - out[..., 0] ** 2 - out[..., 1] ** 2, .05, 1))
nrm = np.dstack([out[..., 0], out[..., 1], z]); nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
nrm = np.roll(nrm, (DY * k, DX * k), axis=(0, 1))
rgba = np.dstack([(nrm + 1) / 2, np.ones((W, W, 1), np.float32)])
o = bpy.data.images.new('carbon', W, W, alpha=False)
o.pixels.foreach_set(rgba.astype(np.float32).ravel())
o.filepath_raw = dst; o.file_format = 'PNG'; o.save()
print('wrote', dst, W, 'cell', cell, 'sign', sign, 'score', round(best[0], 4), 'phase', DY, DX)
