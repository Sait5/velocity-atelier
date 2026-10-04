# Active vehicle audio

Engine and opening-door clips were prepared from files supplied by the user on 2026-10-03.
Exact external authorship and Ferrari model provenance were not provided or independently verified.

## Engine
Source: zvuk-dvigatelja-ferrari-458-spider.mp3.
Its second supplied copy, 1630989687_zvuk-dvigatelja-ferrari-458-spider.mp3, is byte-identical.
Files and original ranges:
- ferrari-458-user-low.wav: 14.000–16.000 s.
- ferrari-458-user-mid.wav: 15.000–17.000 s.
- ferrari-458-user-high.wav: 16.500–18.500 s.
Inside-camera source: Звук разгона машины изнутри записано внутри салона Феррари.mp3.
- ferrari-cabin-low.wav: 1.400–3.500 s.
- ferrari-cabin-mid.wav: 3.700–5.800 s.
- ferrari-cabin-high.wav: 6.200–8.500 s.
Processing: DC/high-pass removal, dominant-band pitch stabilization, envelope leveling, 160 ms equal-power loop crossfade, peak limit 0.65, PCM16 stereo 44.1 kHz. Source authorship and exact vehicle provenance are not independently verified. These are processed sound bands, not measured engine RPM.
Runtime pitch range 0.88–1.18; exterior/cabin crossfade 220 ms. Stationary playback is silent. Old quiet tail is inactive.
The supplied Ferrari 246 Dino recording was excluded.

## Opening and entering
- car-door-open.wav: user-supplied Звук открытия двери у Феррари.mp3, 0.000–0.220 s; onset/release fades and level normalization.
- seat-creak-entry.wav: user-supplied Звук скрипа сиденья внутри автомобиля Феррари.mp3, 0.530–0.960 s; soft entry cue.
No precise Ferrari recording provenance has been verified from the filenames.

## Door closing
car-door-close-ferrari.wav: supplied 1630988380_9b3e134585b048543.mp3, 0.000–0.320 s.
The publisher labels this exact file “Захлопнули дверь” in its Ferrari collection:
https://zvukipro.com/transport/2600-zvuki-avtomobilja-ferrari.html .
Exact Ferrari model and recording authorship remain unverified.
DC removal, static normalization, 0.5 ms onset and 10 ms release fades; PCM16 WAV.
The impact starts near the end of the closing animation. The previous Peugeot clip is inactive.

## Background music
atelier-ambient.wav: original harmonic ambient loop composed for this project; no third-party recording. Quiet four-chord pads, 32 seconds.

## Current cabin playback and braking
The former short cabin loops are inactive. ferrari-cabin-acceleration.wav uses the supplied interior acceleration recording, 0.750–10.800 s, with DC removal, static level adjustment and fades. The full 10.05-second take plays once per accelerator press (or entering the moving cockpit), without looping or changing its pitch. The steady exterior bed is muffled inside.
car-braking.wav: Screeching Tires #1, Dorian CLAIR / BigSoundBank, CC0. https://bigsoundbank.com/crissement-de-pneus-1-s2368.html . Source WAV: https://bigsoundbank.com/UPLOAD/bwf-en/2368.wav . Recorded car tires, 2.15 s; fades and level adjustment. Plays once when braking above 6 m/s, stops on brake release or standstill. Not identified as a Ferrari-specific recording.

Exterior acceleration: ferrari-exterior-acceleration.wav uses 3.000–20.000 s of the supplied zvuk-dvigatelja-ferrari-458-spider.mp3. High-pass/DC removal, fixed level normalization, onset/release fades. The 17-second exterior take plays once per accelerator press, without looping or pitch changes. Short steady bands remain quieter beneath it and receive subtle exterior-only pitch drift.


## Additional original music themes
Night Pulse, Soft Horizon, Midnight Glass, Afterglow: original synthesized instrumental compositions made for Velocity Atelier. No third-party samples or recordings. Reproducible generator: tools/compose-music.py. Atelier Ambient remains available.
