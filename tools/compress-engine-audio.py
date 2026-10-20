"""Lossless FLAC copies of the engine recordings the drive scene decodes.

The WAV originals stay in tools/source-assets/audio and are not served. FLAC keeps every
sample (same rate, channels, bit depth and length); decodeAudioData reads it in all browsers.
Run: blender -b --factory-startup --python tools/compress-engine-audio.py
Every FLAC is decoded again and compared sample by sample with its WAV; any difference stops the run.
"""
import os
import wave

import aud
import numpy

SOURCE = os.path.join('tools', 'source-assets', 'audio')
TARGET = os.path.join('public', 'audio')
NAMES = [
    'miura-user-driving', 'aventador-user-coast', 'aventador-ignition-exhaust',
    'ferrari-user-driving', 'ferrari-user-coast', 'ferrari-user-coast-end', 'ferrari-start',
    'porsche-start', 'porsche-idle', 'porsche-stop', 'porsche-load-low', 'porsche-load-high',
    'porsche-overrun-low', 'porsche-overrun-high',
    'bugatti/user-acceleration-continuous', 'bugatti/user-coast-continuous',
    'bugatti/user-coast-end', 'bugatti/user-ignition',
    'car-braking',
    'mclaren-start', 'mclaren-idle', 'mclaren-stop',
    'mclaren-load-1800', 'mclaren-load-3000', 'mclaren-load-4500', 'mclaren-load-6150', 'mclaren-load-7650',
    'mclaren-overrun-1350', 'mclaren-overrun-2250', 'mclaren-overrun-3600', 'mclaren-overrun-5400', 'mclaren-overrun-7500',
    'valhalla-exhaust-load', 'valhalla-exhaust-overrun', 'valhalla-engine-load', 'valhalla-engine-overrun', 'valhalla-idle',
]
FORMATS = {2: aud.FORMAT_S16, 3: aud.FORMAT_S24}

total_in = total_out = 0
for name in NAMES:
    source = os.path.join(SOURCE, name + '.wav')
    target = os.path.join(TARGET, name + '.flac')
    with wave.open(source) as w:
        rate, channels, width = w.getframerate(), w.getnchannels(), w.getsampwidth()
    aud.Sound(source).write(target, rate, channels, FORMATS[width], aud.CONTAINER_FLAC, aud.CODEC_FLAC, 0, 4096)
    original, packed = aud.Sound(source).data(), aud.Sound(target).data()
    if original.shape != packed.shape or not numpy.array_equal(original, packed):
        raise SystemExit(f'{name}: FLAC differs from the WAV')
    a, b = os.path.getsize(source), os.path.getsize(target)
    total_in += a
    total_out += b
    print(f'{name:40} {width * 8}-bit {rate} Hz {a / 1048576:6.2f} MB -> {b / 1048576:6.2f} MB')
print(f'total {total_in / 1048576:.1f} MB -> {total_out / 1048576:.1f} MB')
