# Velocity Atelier — музыка и звук · Music and sound

За основу звуков взяты записи и звуковые моды других авторов, а также записи, присланные владельцем проекта; остальное сделано и доработано для проекта. В каждой записи указаны автор, ссылка на источник и лицензия, если они известны. Ниже — технические заметки, которые велись по ходу работы (на английском); раздел «Архив» описывает звуки, которые сайт больше не проигрывает.

The sounds build on other authors' recordings and sound mods and on recordings supplied by the project owner; the rest was made and refined for the project. Each record names the author, the source and the licence where they are known. Below are the technical notes kept as the work went on; the "Archive" section describes sounds the site no longer plays.

Since 2026-10-15 the engine and braking recordings are served as lossless FLAC copies (`.flac`) of the WAV files named in the notes (`tools/compress-engine-audio.py`).

## Музыка · Music

Треки Scott Buckley звучат в полных авторских версиях (CC BY 4.0), громкость подобрана для сайта; Atelier Ambient и Soft Horizon сделаны для проекта.
Scott Buckley's tracks play in their full original mixes (CC BY 4.0) with the level set for the site; Atelier Ambient and Soft Horizon were made for the project.

### Scott Buckley — CC BY 4.0

- 'Neon' by Scott Buckley – released under CC-BY 4.0. www.scottbuckley.com.au
  https://www.scottbuckley.com.au/library/neon/
- 'Machina' by Scott Buckley – released under CC-BY 4.0. www.scottbuckley.com.au
  https://www.scottbuckley.com.au/library/machina/
- 'Chasing Daylight' by Scott Buckley – released under CC-BY 4.0. www.scottbuckley.com.au
  https://www.scottbuckley.com.au/library/chasing-daylight/
- 'Electric Dreams' by Scott Buckley – released under CC-BY 4.0. www.scottbuckley.com.au. https://www.scottbuckley.com.au/library/electric-dreams/
- 'Twilight Echo' by Scott Buckley – released under CC-BY 4.0. www.scottbuckley.com.au. https://www.scottbuckley.com.au/library/twilight-echo/
- 'Supernova' by Scott Buckley – released under CC-BY 4.0. www.scottbuckley.com.au. https://www.scottbuckley.com.au/library/supernova/
- Nightfall by Scott Buckley — CC BY 4.0. https://www.scottbuckley.com.au/library/nightfall/
- Tears in Rain by Scott Buckley — CC BY 4.0. https://www.scottbuckley.com.au/library/tears-in-rain/
- Hiraeth by Scott Buckley — CC BY 4.0. https://www.scottbuckley.com.au/library/hiraeth/
- Convergence by Scott Buckley — CC BY 4.0. https://www.scottbuckley.com.au/library/convergence/
- Catalyst by Scott Buckley — CC BY 4.0. https://www.scottbuckley.com.au/library/catalyst/
- Discovery by Scott Buckley — CC BY 4.0. https://www.scottbuckley.com.au/library/discovery/
- Titan by Scott Buckley — CC BY 4.0. https://www.scottbuckley.com.au/library/titan/

License: https://creativecommons.org/licenses/by/4.0/
Original full MP3 mixes, no editing or resampling; playback gain adjusted. Downloaded from the author's official track pages. Attribution is visible in the Music panel and Legal page. CC BY permits use with attribution; it does not waive copyright.

### Made for the project

atelier-ambient.wav: original harmonic ambient loop composed for this project; no third-party recording. Quiet four-chord pads, 32 seconds.
soft-horizon.wav: original synthesized instrumental composition made for Velocity Atelier. No third-party samples or recordings. Reproducible generator: tools/compose-music.py.

## Моторы · Engines

### Ferrari 458 Italia

За основу взяты запись Ferrari 458 Spider, присланная владельцем проекта, и запуск мотора от Oscar_Patrick (CC BY 4.0), остальное сделано и доработано для проекта.
An owner-supplied Ferrari 458 Spider recording and Oscar_Patrick's start-up (CC BY 4.0) were the starting point; the rest was made and refined for the project.

Driving uses ferrari-user-driving.wav, the owner-supplied 458 Spider recording from 3–19 s with a long 12–18.8 s continuation and a 750 ms circular overlap. Original pitch and speed, static gain 0.8, no synthesized layers. Cabin uses the same recording at half volume with low-pass muffling. Exact edit provenance: tools/ferrari-driving-manifest.json.
Startup: Ferrari Engine On Front by Oscar_Patrick, https://freesound.org/people/Oscar_Patrick/sounds/812434/ , CC BY 4.0 https://creativecommons.org/licenses/by/4.0/ . Exact Ferrari model unspecified. HQ MP3 preview excerpt 0.9–3.7 s, gain 1.2, onset/release fades, PCM24. Source hash and edits: tools/ferrari-start-manifest.json.

Deceleration: owner-supplied Звук двигателя Ferrari 458 Spider.mp3; authorship, license and vehicle identification not independently verified. Source excerpt 19–24.5 seconds. Source hash and edits: tools/ferrari-coast-manifest.json.
Current Ferrari coast: initial 19–23 s once, only 21–23 s repeated thereafter with a 250 ms circular join. Original five-second ending retained near stopping. Original playback speed and pitch, existing gain retained; Ferrari master volume 10% quieter.

### Lamborghini Revuelto

За основу взяты записи V12, присланные владельцем проекта, остальное сделано и доработано для проекта.
Owner-supplied V12 recordings were the starting point; the rest was made and refined for the project.

Driving: owner-supplied Lamborghini Miura - V12 engine MP3; original model, author and license
not verified. First four seconds removed; original first pass retained. Long continuation from
12.0-23.3 s, brief recorded drop 12.88-13.33 s removed from repeats only,
65 ms edit splice, 750 ms energy-preserving circular overlap. No pitch shift,
variable-rate resampling, time stretching or EQ. Static site gain 0.25.
Loop timing and exact edit provenance: tools/miura-user-audio-manifest.json.
Continuous playback under throttle; release and braking use the separately supplied
Aventador deceleration recording below. Silent at standstill, resumes the acceleration
source without restarting the opening. Cabin half volume.

Deceleration: Zvuk_dviguna_-_Lamborghini_Aventador_(Zvyki.com).mp3, provided by the owner.
Original authorship, license and exact recorded vehicle not verified.
Source 29-55 seconds for deceleration; 48-55 seconds sustained through a 600 ms
circular overlap when the car takes longer to stop. Static gain 0.4, PCM24 stereo,
original speed and pitch, no EQ. Plays after gas release or during braking while
moving; fades out at standstill or when throttle returns. Cabin half volume.
Exact source hash and edits: tools/aventador-coast-manifest.json.

Ignition: aventador-ignition-exhaust.wav, the owner-supplied Aventador SVJ ignition/exhaust MP3 recording, complete, 10.106 seconds, -12 dB, plays once on engine activation. Not a verified Revuelto recording; recording authorship and external license were not provided. Source hashes, exact excerpts and gain changes: tools/lamborghini-audio-manifest.json.

### Porsche 911 GT3

За основу взяты записи Porsche 997 GT3 RS от Pole Position Production (Sonniss), остальное сделано и доработано для проекта.
Pole Position Production's Porsche 997 GT3 RS recordings (Sonniss) were the starting point; the rest was made and refined for the project.

Engine: Pole Position Production, Porsche 997 GT3 RS 2008, onboard mix from Sonniss GDC 2020 free bundle. This is an earlier GT3 RS, not a verified recording of the 2025 992.2.
Source: https://ftpmirror.your.org/pub/misc/sonniss2020/individual/Pole%20Position%20-%20Porsche%20997%20GT3%20RS%202008/
License: https://sonniss.com/gdc-bundle-license/ . Project-integrated use, no standalone sound-library redistribution.
Short real-recording RPM banks for load and overrun, with smooth playback-rate response and equal-power crossfades. Original startup, idle and shutdown remain. No synthesized engine. Cabin uses the same recording at half volume with low-pass filtering. Source intervals, tuning and hashes: tools/porsche-audio-manifest.json.

### Bugatti Tourbillon

За основу взяты записи, присланные владельцем проекта, остальное сделано и доработано для проекта.
Owner-supplied recordings were the starting point; the rest was made and refined for the project.

Owner-supplied recordings `bugatti/user-ignition.wav`, `user-acceleration-continuous.wav`, `user-coast-continuous.wav`, `user-coast-end.wav` (see `tools/bugatti-user-audio-manifest.json`).
Level fix: the few full-scale (clipped) samples of the owner takes were rebuilt by interpolation and the acceleration/coast/coast-end files share a -1.78 dB gain, loudest peak -1 dBFS (`tools/prepare-bugatti-user-continuation.py`).

### McLaren 750S — 2026-10-17

За основу взят звуковой мод McLaren 720S от Legacy DMC, остальное сделано и доработано для проекта.
The Legacy DMC McLaren 720S sound mod was the starting point; the rest was made and refined for the project.

The active McLaren set (`mclaren-start|idle|stop`, `mclaren-load-1800…7650`, `mclaren-overrun-1350…7500`) derives from the exhaust takes of the "McLaren 720S" GTA V sound mod by Legacy DMC
(original instructions by Aquaphobic), supplied by the owner. Loops were cut at fixed rpm along its acceleration and
deceleration sweeps and resampled to one pitch each. The 720S shares the 750S's twin-turbo 4.0 V8 family (M840T); this is not a recording of a 750S.
Earlier the same day the set derived from "McLaren 720S" in the Internet Archive item
[Car Engine Sounds](https://archive.org/details/car-engines) (uploaded by JasonBurke, "free use"),
licence [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/); it was replaced at the owner's choice.
The Internet Archive WAVs stay in `tools/source-assets/audio/mclaren-720s-ia`.

### Mercedes-AMG GT 63 S — 2026-10-20

За основу взят звуковой мод Mercedes-AMG 4.0T V8 (M17x) Engine Sound Pack, остальное сделано и доработано для проекта.
The Mercedes-AMG 4.0T V8 (M17x) Engine Sound Pack mod was the starting point; the rest was made and refined for the project.

`amg-load-2500…6400.flac`, `amg-overrun-3000…5600.flac`, `amg-idle|start|stop.flac` derive from the M177 resource
(ta176m177) of the "Mercedes-AMG 4.0T V8 (M17x) Engine Sound Pack" GTA V sound mod, supplied by the owner (its AWC
container is kept in `tools/source-assets/audio/amg-m177-mod`). The M177 is the twin-turbo 4.0 V8 of the GT 63 S.
Loops were cut at fixed rpm along the mod's full-throttle and overrun sweeps (one spectral line followed through each
sweep, windows re-timed so each holds one rpm), exhaust and engine takes mixed, crossfaded loop points; idle, start and
stop are the mod's own. Built losslessly by `tools/pack-amg-audio.py` (Blender audaspace). Until then the AMG played the
site's synthetic engine.

### Koenigsegg Jesko — 2026-10-20

За основу взят звуковой мод Koenigsegg Regera от Legacy DMC, остальное сделано и доработано для проекта.
The Legacy DMC Koenigsegg Regera sound mod was the starting point; the rest was made and refined for the project.

`jesko-load-2700…7200.flac`, `jesko-overrun-2500…6900.flac`, `jesko-idle|start|stop.flac` derive from the
"Koenigsegg Regera Sound" GTA V sound mod by Legacy DMC (lg91timreg), supplied by the owner (its AWC container is kept in
`tools/source-assets/audio/jesko-regera-mod`). The Regera has the twin-turbo 5.0 V8 the Jesko's is developed from; this
is not a recording of a Jesko. Loops were cut at fixed rpm along the mod's full-throttle and overrun sweeps (each window
re-timed along the tracked engine pitch so it holds one rpm), exhaust and engine takes mixed, crossfaded loop points;
idle, start and stop are the mod's own. Built losslessly by `tools/pack-jesko-audio.py` (Blender audaspace).
(An earlier set from a GTA San Andreas Jesko mod was replaced the same day at the owner's word.)

### Aston Martin Valhalla — 2026-10-18

За основу взяты петли мотора из мода Aston Martin Valhalla для BeamNG.drive (S7471C), остальное сделано и доработано для проекта.
The engine loops of the Aston Martin Valhalla mod for BeamNG.drive (S7471C) were the starting point; the rest was made and refined for the project.

`valhalla-exhaust-load|exhaust-overrun|engine-load|engine-overrun.flac` hold, unchanged and one after another, the
rpm-stepped engine and exhaust loops (named M840T, one loop every ~400 rpm from 1100 to 8200 rpm) of the
"Aston Martin Valhalla" mod for BeamNG.drive by S7471C (gtmods.ru upload, supplied by the owner); `valhalla-idle.flac` mixes
its exhaust and engine idles. Not a recording of a Valhalla. Built by `tools/pack-valhalla-audio.cjs` (loop table in
`app/three/valhallaEngineAudio.ts`) and `tools/compress-engine-audio.py` (lossless, checked sample by sample). Start and
stop reuse the McLaren takes above.

## Двери, салон и тормоза · Doors, cabin and brakes

За основу взяты записи, присланные владельцем проекта, и визг шин Dorian Clair / BigSoundBank (CC0), остальное сделано и доработано для проекта.
Owner-supplied recordings and Dorian Clair's tyre squeal (BigSoundBank, CC0) were the starting point; the rest was made and refined for the project.

The same door clips play on every car.

### Opening and entering
- car-door-open.wav: user-supplied Звук открытия двери у Феррари.mp3, 0.000–0.220 s; onset/release fades and level normalization.
- seat-creak-entry.wav: user-supplied Звук скрипа сиденья внутри автомобиля Феррари.mp3, 0.530–0.960 s; soft entry cue.
No precise Ferrari recording provenance has been verified from the filenames.

### Door closing
car-door-close-ferrari.wav: supplied 1630988380_9b3e134585b048543.mp3, 0.000–0.320 s.
The publisher labels this exact file “Захлопнули дверь” in its Ferrari collection:
https://zvukipro.com/transport/2600-zvuki-avtomobilja-ferrari.html .
Exact Ferrari model and recording authorship remain unverified.
DC removal, static normalization, 0.5 ms onset and 10 ms release fades; PCM16 WAV.
The impact starts near the end of the closing animation.

### Braking
car-braking.wav: Screeching Tires #1, Dorian CLAIR / BigSoundBank, CC0. https://bigsoundbank.com/crissement-de-pneus-1-s2368.html . Source WAV: https://bigsoundbank.com/UPLOAD/bwf-en/2368.wav . License: https://bigsoundbank.com/licenses.html . Recorded car tires, 2.15 s; fades and level adjustment. Plays once when braking above 6 m/s, stops on brake release or standstill. Not identified as a Ferrari-specific recording.

## Архив · Archive

Звуки, которые сайт больше не проигрывает; записи оставлены для истории.
Sounds the site no longer plays; the records are kept for history.

### Earlier Ferrari engine bands and cabin

Engine and opening-door clips were prepared from files supplied by the user on 2026-10-03.
Exact external authorship and Ferrari model provenance were not provided or independently verified.

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

The former short cabin loops are inactive. ferrari-cabin-acceleration.wav used the supplied interior acceleration recording, 0.750–10.800 s, with DC removal, static level adjustment and fades. The full 10.05-second take played once per accelerator press (or entering the moving cockpit), without looping or changing its pitch. The steady exterior bed was muffled inside.

Exterior acceleration: ferrari-exterior-acceleration.wav used 3.000–20.000 s of the supplied zvuk-dvigatelja-ferrari-458-spider.mp3. High-pass/DC removal, fixed level normalization, onset/release fades. The 17-second exterior take played once per accelerator press, without looping or pitch changes. Short steady bands remained quieter beneath it and received subtle exterior-only pitch drift.

The previous Peugeot door-closing clip is inactive.

### Earlier Ferrari deceleration versions

Ferrari deceleration — owner-supplied 458 Spider: quiet ending from 21.5–23 seconds sustained with a 350 ms circular overlap while the car continues moving. Original pitch and speed; static gain 0.959 (raised from 0.7; peak-limited to avoid clipping). No EQ on the asset. Existing runtime cabin filtering retained. Separate CC0 tire brake recording retained.

Ferrari coast volume update: playback gain doubled; source-time tail envelope rises smoothly from 1 at 20 s to 6 at 22 s. Base gain 0.959 retained, with local 20 ms peak control instead of global renormalization. Original pitch and speed unchanged.

Latest Ferrari deceleration: single 10-second take, no ending loop and no retrigger after completion until a new gas-release event. Original 19–24.5 s stretched with pitch-preserving waveform-aligned overlap-add. Ferrari master gain reduced by 10%. Older circular coast edits are inactive.

Ferrari coast correction: time-stretched version withdrawn. Original five-second excerpt restored at original pitch and tempo. Duration extended only by repetition of the complete 19–24.5 s excerpt with a 350 ms join; prior tail-volume envelope retained. Ferrari master remains 10% quieter. No WSOLA, synthesis or short one-second tail loop.

Current Ferrari coast arrangement: original-speed 4-second circular continuation, 250 ms join. Estimated last five seconds before stopping use the separate original 19–24 s take once. No time stretching or new synthesis. Master volume remains 10% quieter.

### Earlier original music themes
Night Pulse, Midnight Glass, Afterglow: original synthesized instrumental compositions made for Velocity Atelier (tools/compose-music.py). Removed as unused.

### Revuelto interaction reuse — 2026-10-08
The existing user-supplied door and seat clips are reused for Revuelto interactions. They are not verified Revuelto recordings. The existing CC0 Screeching Tires #1 recording is now used for braking with the synthetic engine fallback. The engine remains synthetic pending owner-supplied exterior and cabin recordings.

### User-supplied Lamborghini audio — 2026-10-08

Aventador engine and Aventador SVJ ignition/exhaust MP3 recordings supplied by the project owner, reused for the Revuelto presentation. These are not verified Revuelto recordings; recording authorship and external license were not provided. Source hashes, exact excerpts and gain changes are recorded in tools/lamborghini-audio-manifest.json. Originals remain unchanged.

- aventador-engine-quiet.wav: complete 24.816-second first recording, static gain -14.301 dB, DC/high-pass removal, short onset/release fades; PCM16 stereo.
- aventador-engine-low/mid/high.wav: crossfaded excerpts for sustained driving; relative playback bands, not measured RPM.
- Cabin perspective: exterior recording played at half the outside level (-6.02 dB), low-pass 1900–2800 Hz. No separate cabin recording supplied.

### Runtime correction — 2026-10-08
Supersedes the earlier full acceleration playback for Revuelto. Runtime now uses aventador-engine-sustain.wav only: source range 18.15–18.85 seconds from the owner-supplied first Aventador recording, DC/high-pass removal, gentle envelope leveling, 90 ms linear circular crossfade and short seam slope correction; RMS -23.742 dBFS, PCM16 stereo 44.1 kHz. This relative steady timbre is pitched against the live presentation RPM (4500 reference, not measured source RPM). Recorded acceleration and recorded gear changes are no longer played during driving. Ignition/exhaust is used only for stationary activation and stopped on acceleration. All active audio is decoded before the driving scene becomes ready. Cabin remains -6.02 dB with low-pass filtering.

### Original-sound correction — 2026-10-08
Supersedes the RPM-pitched sustain implementation above. Active recordings now use static attenuation only, with no filtering, envelope leveling or playback-rate changes. Driving uses source 6–24.5 seconds and repeats the last section at original speed; only a 40 ms splice crossfade is applied. Complete quiet original is PCM24. Cabin is half volume without filtering. Ignition preserves the second recording at -12 dB. Preloading remains enabled.

### Longer continuation — 2026-10-08
Supersedes the 1.46-second driving loop. Source 18–24.4 seconds is extended 4x using stereo waveform-aligned overlap-add (WSOLA), preserving pitch without filters or resampling. Acceleration remains source 6–18 seconds. The driving file lasts 37.54 seconds; a 24.6-second continuation loop has a 1-second circular crossfade. Cabin attenuation and original static gain remain unchanged. Timing is generated alongside the WAV.

### Revuelto driving replacement — 2026-10-08
Performance Cars, sample 005, muted.io. CC0 1.0. Source: https://muted.io/performance-cars/ . Full-quality stereo WAV downloaded from the publisher archive. Source interval 0.6–6.8 seconds, 180 ms circular crossfade, static attenuation, converted from 96 kHz PCM24 to 48 kHz PCM16. No WSOLA/time stretching. Driving used sports-engine-cruise.wav; older Aventador driving/sustain files were inactive. Mild playback-rate range 0.85–1.15 followed live RPM; continuous playback across gear changes. Cabin volume was half the exterior volume, no filter. Exact source vehicle not identified; not a verified Revuelto recording. Full provenance in tools/free-engine-audio-manifest.json.

### Owner-selected SVJ recording — 2026-10-08
Lamborghini Aventador SVJ Racing Sound effect, mizanstock / AH.Mizan Rahman. Source: https://pixabay.com/sound-effects/film-special-effects-lamborghini-aventador-svj-racing-sound-effect-161994/ . Pixabay Content License: https://pixabay.com/service/license-summary/ . Superseded the Performance Cars driving loop. Source 0–4.4 seconds transitions over 400 ms into source 6.1–15.7 seconds; 900 ms equal-power circular crossfade. Static attenuation (see tools/pixabay-svj-audio-manifest.json), PCM16 stereo 44.1 kHz, no pitch alteration, filters or time stretching. Loop range 4.9–13.6 seconds. Cabin half volume. Exact model attribution taken from publisher; not represented as a verified Revuelto recording. Integrated as interactive engine audio, not offered as a standalone sound download.

### Revuelto driving audio - Pole Position Aventador V12
Replaced the Pixabay SVJ driving clip and all earlier Revuelto driving loops.
Lamborghini Aventador 2014, Pole Position Production; onboard right exhaust DPA4062.
Source: Sonniss GameAudioGDC 2020 free bundle. Royalty-free use in interactive projects.
https://sonniss.com/gameaudiogdc/
https://sonniss.com/gdc-bundle-license/
https://pole.se/product/lamborghini-aventador-2014/
Four recorded RPM beds: idle, low, medium and high. Rising-RPM excerpts are
normalized by variable-rate resampling, joined and circularly crossfaded.
No synthesized engine, EQ, WSOLA or pre-recorded acceleration replay.
Runtime crossfades adjacent RPM beds and follows current RPM; cabin half volume.
Not a recording of Revuelto itself.
Raw recording is private under tools/source-audio, never shipped as a sample pack.
Exact source excerpts and SHA256: tools/sonniss-aventador-manifest.json.

### Porsche door clips
Door opening/closing: Classic Porsche 911 Car Door Open Close by mincedbeats, CC0; MP3 preview excerpts, older 911 not verified 992.2. https://freesound.org/people/mincedbeats/sounds/630562/ . The Porsche now uses the same door clips as every car.

### Tourbillon provisional engine audio
Performance Cars, sample 005, muted.io, CC0 1.0. Used the existing sports-engine-cruise.wav. Engine identity unspecified: this is not a verified recording of the Tourbillon V16. Runtime pitch followed presentation RPM; cabin playback was quieter and filtered.
https://muted.io/performance-cars/

### Tourbillon audio correction
The unrelated sample 005 engine recording was disabled. No other vehicle recording was substituted. Existing CC0 tire braking remained active.

### Tourbillon procedural V16
Original generated audio: 16 combustion pulses per four-stroke cycle, presentation RPM 900–9000; continuous load/coast crossfade, shift cut, ignition spin-up and quieter filtered cabin. This was a simulation, not a real Tourbillon recording. Profile reference (not reused code): https://catalog.engine-sim.parts/parts/1488 .

### Bugatti engine audio — 2026-10-13
`bugatti/idle.wav`, `bugatti/load.wav`, `bugatti/coast.wav` derived from
[Bugatti Veyron Grand Sport](https://commons.wikimedia.org/wiki/File:Bugatti_Veyron_Grand_Sport.ogg),
recorded by Edvvc (Ed Pond), Goodwood, 3 July 2009.
License listed by Wikimedia Commons: [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
The derived WAV recordings were distributed under CC BY-SA 3.0.
Changes: mono conversion, band-pass filtering, excerpting, normalization and crossfaded loops.
These were real Veyron W16 samples adapted to the interactive engine, not a recording of the Tourbillon V16.
The startup was a faded engine-loop onset; this source does not contain a cold start.

### Asset cleanup — 2026-10-15
Recordings marked inactive above were removed from `public/audio` (they stay in git history): the earlier Aventador, Sonniss, Pixabay and Performance Cars engine files, Ferrari band and cabin loops, the exterior acceleration take, Porsche coast/drive previews, the Veyron-derived `bugatti/idle|load|coast.wav`, the Bugatti previews and non-continuous takes, the generic door close clip, and the unused original themes Night Pulse, Midnight Glass and Afterglow.
