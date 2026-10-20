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


## New full-length music selections (2026-10-04)

- 'Neon' by Scott Buckley – released under CC-BY 4.0. www.scottbuckley.com.au
  https://www.scottbuckley.com.au/library/neon/
- 'Machina' by Scott Buckley – released under CC-BY 4.0. www.scottbuckley.com.au
  https://www.scottbuckley.com.au/library/machina/
- 'Chasing Daylight' by Scott Buckley – released under CC-BY 4.0. www.scottbuckley.com.au
  https://www.scottbuckley.com.au/library/chasing-daylight/

License: https://creativecommons.org/licenses/by/4.0/
Original full mixes are included without edits. Playback gain is reduced in the app.
Credits are visible in Settings. CC BY permits use with attribution; it does not waive copyright.

## Further album tracks

- 'Electric Dreams' by Scott Buckley – released under CC-BY 4.0. www.scottbuckley.com.au. https://www.scottbuckley.com.au/library/electric-dreams/

- 'Twilight Echo' by Scott Buckley – released under CC-BY 4.0. www.scottbuckley.com.au. https://www.scottbuckley.com.au/library/twilight-echo/

- 'Supernova' by Scott Buckley – released under CC-BY 4.0. www.scottbuckley.com.au. https://www.scottbuckley.com.au/library/supernova/

## Expanded showroom library — 2026-10-08

Original full MP3 mixes by Scott Buckley, released under CC BY 4.0. No editing or resampling; playback gain adjusted. Attribution is visible in the Music panel and Legal page. Downloaded from the author’s official track pages.

- Nightfall by Scott Buckley — CC BY 4.0. https://www.scottbuckley.com.au/library/nightfall/
- Tears in Rain by Scott Buckley — CC BY 4.0. https://www.scottbuckley.com.au/library/tears-in-rain/
- Hiraeth by Scott Buckley — CC BY 4.0. https://www.scottbuckley.com.au/library/hiraeth/
- Convergence by Scott Buckley — CC BY 4.0. https://www.scottbuckley.com.au/library/convergence/
- Catalyst by Scott Buckley — CC BY 4.0. https://www.scottbuckley.com.au/library/catalyst/
- Discovery by Scott Buckley — CC BY 4.0. https://www.scottbuckley.com.au/library/discovery/
- Titan by Scott Buckley — CC BY 4.0. https://www.scottbuckley.com.au/library/titan/

## Revuelto interaction reuse — 2026-10-08
The existing user-supplied door and seat clips are reused for Revuelto interactions. They are not verified Revuelto recordings. The existing CC0 Screeching Tires #1 recording is now used for braking with the synthetic engine fallback. The engine remains synthetic pending owner-supplied exterior and cabin recordings.


## User-supplied Lamborghini audio — 2026-10-08

Aventador engine and Aventador SVJ ignition/exhaust MP3 recordings supplied by the project owner, reused for the Revuelto presentation. These are not verified Revuelto recordings; recording authorship and external license were not provided. Source hashes, exact excerpts and gain changes are recorded in tools/lamborghini-audio-manifest.json. Originals remain unchanged.

- aventador-engine-quiet.wav: complete 24.816-second first recording, static gain -14.301 dB, DC/high-pass removal, short onset/release fades; PCM16 stereo.
- aventador-engine-low/mid/high.wav: crossfaded excerpts for sustained driving; relative playback bands, not measured RPM.
- aventador-ignition-exhaust.wav: complete second recording, 10.106 seconds, -12 dB, plays once on engine activation.
- Cabin perspective: exterior recording played at half the outside level (-6.02 dB), low-pass 1900–2800 Hz. No separate cabin recording supplied.
- Braking: existing Screeching Tires #1, Dorian CLAIR / BigSoundBank, CC0; https://bigsoundbank.com/crissement-de-pneus-1-s2368.html ; https://bigsoundbank.com/licenses.html .

## Runtime correction — 2026-10-08
Supersedes the earlier full acceleration playback for Revuelto. Runtime now uses aventador-engine-sustain.wav only: source range 18.15–18.85 seconds from the owner-supplied first Aventador recording, DC/high-pass removal, gentle envelope leveling, 90 ms linear circular crossfade and short seam slope correction; RMS -23.742 dBFS, PCM16 stereo 44.1 kHz. This relative steady timbre is pitched against the live presentation RPM (4500 reference, not measured source RPM). Recorded acceleration and recorded gear changes are no longer played during driving. Ignition/exhaust is used only for stationary activation and stopped on acceleration. All active audio is decoded before the driving scene becomes ready. Cabin remains -6.02 dB with low-pass filtering.


## Original-sound correction — 2026-10-08
Supersedes the RPM-pitched sustain implementation above. Active recordings now use static attenuation only, with no filtering, envelope leveling or playback-rate changes. Driving uses source 6–24.5 seconds and repeats the last section at original speed; only a 40 ms splice crossfade is applied. Complete quiet original is PCM24. Cabin is half volume without filtering. Ignition preserves the second recording at -12 dB. Preloading remains enabled.


## Longer continuation — 2026-10-08
Supersedes the 1.46-second driving loop. Source 18–24.4 seconds is extended 4x using stereo waveform-aligned overlap-add (WSOLA), preserving pitch without filters or resampling. Acceleration remains source 6–18 seconds. The driving file lasts 37.54 seconds; a 24.6-second continuation loop has a 1-second circular crossfade. Cabin attenuation and original static gain remain unchanged. Timing is generated alongside the WAV.


## Active Revuelto driving replacement — 2026-10-08
Performance Cars, sample 005, muted.io. CC0 1.0. Source: https://muted.io/performance-cars/ . Full-quality stereo WAV downloaded from the publisher archive. Source interval 0.6–6.8 seconds, 180 ms circular crossfade, static attenuation, converted from 96 kHz PCM24 to 48 kHz PCM16. No WSOLA/time stretching. Driving now uses sports-engine-cruise.wav; older Aventador driving/sustain files are inactive. Mild playback-rate range 0.85–1.15 follows live RPM; continuous playback across gear changes. Cabin volume is half the exterior volume, no filter. Exact source vehicle not identified; not a verified Revuelto recording. Existing owner-supplied ignition and CC0 braking retained. Full provenance in tools/free-engine-audio-manifest.json.

## Active owner-selected SVJ recording — 2026-10-08
Lamborghini Aventador SVJ Racing Sound effect, mizanstock / AH.Mizan Rahman. Source: https://pixabay.com/sound-effects/film-special-effects-lamborghini-aventador-svj-racing-sound-effect-161994/ . Pixabay Content License: https://pixabay.com/service/license-summary/ . Supersedes the Performance Cars driving loop. Source 0–4.4 seconds transitions over 400 ms into source 6.1–15.7 seconds; 900 ms equal-power circular crossfade. Static attenuation (see tools/pixabay-svj-audio-manifest.json), PCM16 stereo 44.1 kHz, no pitch alteration, filters or time stretching. Loop range 4.9–13.6 seconds. Cabin remains half volume. Existing supplied ignition and CC0 braking retained. Exact model attribution taken from publisher; not represented as a verified Revuelto recording. Integrated as interactive engine audio, not offered as a standalone sound download.


## Current Revuelto driving audio - Pole Position Aventador V12
Replaces the Pixabay SVJ driving clip and all earlier Revuelto driving loops.
Lamborghini Aventador 2014, Pole Position Production; onboard right exhaust DPA4062.
Source: Sonniss GameAudioGDC 2020 free bundle. Royalty-free use in interactive projects.
https://sonniss.com/gameaudiogdc/
https://sonniss.com/gdc-bundle-license/
https://pole.se/product/lamborghini-aventador-2014/
Four recorded RPM beds: idle, low, medium and high. Rising-RPM excerpts are
normalized by variable-rate resampling, joined and circularly crossfaded.
No synthesized engine, EQ, WSOLA or pre-recorded acceleration replay.
Runtime crossfades adjacent RPM beds and follows current RPM; cabin half volume.
Not a recording of Revuelto itself. Supplied ignition/exhaust and CC0 brake remain.
Raw recording is private under tools/source-audio, never shipped as a sample pack.
Exact source excerpts and SHA256: tools/sonniss-aventador-manifest.json.


## Current Revuelto driving sound - selected owner V12 recording
Owner-supplied Lamborghini Miura - V12 engine MP3; original model, author and license
not verified. Replaces every previous Revuelto driving sound.
First four seconds removed; original first pass retained. Long continuation from
12.0-23.3 s, brief recorded drop 12.88-13.33 s removed from repeats only,
65 ms edit splice, 750 ms energy-preserving circular overlap. No pitch shift,
variable-rate resampling, time stretching or EQ. Static site gain 0.25.
Loop timing and exact edit provenance: tools/miura-user-audio-manifest.json.
Continuous playback under throttle; release and braking use the separately supplied
Aventador deceleration recording below. Silent at standstill, resumes the acceleration
source without restarting the opening. Cabin half volume.
Supplied Aventador ignition/exhaust remains. Brake: Dorian CLAIR, Screeching Tires #1,
BigSoundBank, CC0: https://bigsoundbank.com/crissement-de-pneus-1-s2368.html .

## Current Revuelto deceleration - owner-supplied Aventador recording
Zvuk_dviguna_-_Lamborghini_Aventador_(Zvyki.com).mp3, provided by the owner.
Original authorship, license and exact recorded vehicle not verified.
Source 29-55 seconds for deceleration; 48-55 seconds sustained through a 600 ms
circular overlap when the car takes longer to stop. Static gain 0.4, PCM24 stereo,
original speed and pitch, no EQ. Plays after gas release or during braking while
moving; fades out at standstill or when throttle returns. Cabin half volume.
Exact source hash and edits: tools/aventador-coast-manifest.json.

## Ferrari deceleration — owner-supplied 458 Spider
Owner-supplied Звук двигателя Ferrari 458 Spider.mp3; authorship, license and vehicle identification not independently verified. Excerpt 19–24.5 seconds; quiet ending from 21.5–23 seconds sustained with a 350 ms circular overlap while the car continues moving. Original pitch and speed; static gain 0.959 (raised from 0.7; peak-limited to avoid clipping). No EQ on the asset. Existing runtime cabin filtering retained. Source hash and edits: tools/ferrari-coast-manifest.json. Separate CC0 tire brake recording retained.


## Current Ferrari single-recording engine and start
Driving now uses ferrari-user-driving.wav, the owner-supplied 458 Spider recording from 3–19 s with a long 12–18.8 s continuation and a 750 ms circular overlap. Original pitch and speed, static gain 0.8, no synthesized layers. Separate cabin recording and former low/mid/high bands are inactive. Cabin uses the same recording at half volume with low-pass muffling. Deceleration and separate tire brakes retained. Exact edit provenance: tools/ferrari-driving-manifest.json.
Startup: Ferrari Engine On Front by Oscar_Patrick, https://freesound.org/people/Oscar_Patrick/sounds/812434/ , CC BY 4.0 https://creativecommons.org/licenses/by/4.0/ . Exact Ferrari model unspecified. HQ MP3 preview excerpt 0.9–3.7 s, gain 1.2, onset/release fades, PCM24. Source hash and edits: tools/ferrari-start-manifest.json.



`nFerrari coast volume update: playback gain doubled; source-time tail envelope rises smoothly from 1 at 20 s to 6 at 22 s. Base gain 0.959 retained, with local 20 ms peak control instead of global renormalization. Original pitch and speed unchanged.

Latest Ferrari deceleration: single 10-second take, no ending loop and no retrigger after completion until a new gas-release event. Original 19–24.5 s stretched with pitch-preserving waveform-aligned overlap-add. Ferrari master gain reduced by 10%. Older circular coast edits are inactive.


Ferrari coast correction: time-stretched version withdrawn. Original five-second excerpt restored at original pitch and tempo. Duration extended only by repetition of the complete 19–24.5 s excerpt with a 350 ms join; prior tail-volume envelope retained. Ferrari master remains 10% quieter. No WSOLA, synthesis or short one-second tail loop.


Current Ferrari coast arrangement: original-speed 4-second circular continuation, 250 ms join. Estimated last five seconds before stopping use the separate original 19–24 s take once. No time stretching or new synthesis. Master volume remains 10% quieter.


Current Ferrari coast: initial 19–23 s once, only 21–23 s repeated thereafter with a 250 ms circular join. Original five-second ending retained near stopping. Original playback speed and pitch, existing gain retained.


## Porsche GT3 recordings — current integration
Engine: Pole Position Production, Porsche 997 GT3 RS 2008, onboard mix from Sonniss GDC 2020 free bundle. This is an earlier GT3 RS, not a verified recording of the 2025 992.2.
Source: https://ftpmirror.your.org/pub/misc/sonniss2020/individual/Pole%20Position%20-%20Porsche%20997%20GT3%20RS%202008/
License: https://sonniss.com/gdc-bundle-license/ . Project-integrated use, no standalone sound-library redistribution.
Short real-recording RPM banks for load and overrun, with smooth playback-rate response and equal-power crossfades. Original startup, idle and shutdown remain. No synthesized engine and no generic tyre braking effect in GT3 driving. Cabin uses the same recording at half volume with low-pass filtering. Source intervals, tuning and hashes: tools/porsche-audio-manifest.json.
Door opening/closing: Classic Porsche 911 Car Door Open Close by mincedbeats, CC0; MP3 preview excerpts, older 911 not verified 992.2. https://freesound.org/people/mincedbeats/sounds/630562/
Tire braking: existing car-braking.wav, Dorian CLAIR / BigSoundBank CC0, generic tire sound. https://bigsoundbank.com/crissement-de-pneus-1-s2368.html


## Tourbillon provisional engine audio
Performance Cars, sample 005, muted.io, CC0 1.0. Uses existing sports-engine-cruise.wav. Engine identity unspecified: this is not a verified recording of the Tourbillon V16. Runtime pitch follows presentation RPM; cabin playback is quieter and filtered.
https://muted.io/performance-cars/


## Tourbillon audio correction
The unrelated sample 005 engine recording is disabled. An authentic Tourbillon V16 source is still required for ignition, RPM load/overrun and stopping. No other vehicle recording is substituted. Existing CC0 tire braking remains active.


## Tourbillon procedural V16
Original generated audio: 16 combustion pulses per four-stroke cycle, presentation RPM 900–9000; continuous load/coast crossfade, shift cut, ignition spin-up and quieter filtered cabin. This is a simulation, not a real Tourbillon recording. Profile reference (not reused code): https://catalog.engine-sim.parts/parts/1488 . Earlier unrelated sample 005 remains disabled.

## Bugatti engine audio — 2026-10-13
`bugatti/idle.wav`, `bugatti/load.wav`, `bugatti/coast.wav` derive from
[Bugatti Veyron Grand Sport](https://commons.wikimedia.org/wiki/File:Bugatti_Veyron_Grand_Sport.ogg),
recorded by Edvvc (Ed Pond), Goodwood, 3 July 2009.
License listed by Wikimedia Commons: [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
The derived WAV recordings are distributed under CC BY-SA 3.0.
Changes: mono conversion, band-pass filtering, excerpting, normalization and crossfaded loops.
These are real Veyron W16 samples adapted to the interactive engine, not a recording of the Tourbillon V16.
The startup is a faded engine-loop onset; this source does not contain a cold start.
The previous procedural V16 is no longer used. Shared braking recording retains its existing credit.

## Asset cleanup — 2026-10-15
Recordings marked inactive above were removed from `public/audio` (they stay in git history): the earlier Aventador, Sonniss, Pixabay and Performance Cars engine files, Ferrari band and cabin loops, the exterior acceleration take, Porsche coast/drive previews, the Veyron-derived `bugatti/idle|load|coast.wav`, the Bugatti previews and non-continuous takes, the generic door close clip, and the unused original themes Night Pulse, Midnight Glass and Afterglow.
Active Bugatti audio: owner-supplied recordings `bugatti/user-ignition.wav`, `user-acceleration-continuous.wav`, `user-coast-continuous.wav`, `user-coast-end.wav` (see `tools/bugatti-user-audio-manifest.json`).
Bugatti level fix: the few full-scale (clipped) samples of the owner takes were rebuilt by interpolation and the acceleration/coast/coast-end files share a -1.78 dB gain, loudest peak -1 dBFS (`tools/prepare-bugatti-user-continuation.py`).

## McLaren 750S engine audio — 2026-10-17
`mclaren-start|idle|stop|load-low|load-high|overrun.wav` derive from "McLaren 720S" in the Internet Archive item
[Car Engine Sounds](https://archive.org/details/car-engines) (uploaded by JasonBurke, "free use"),
licence [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
The 720S shares the 750S's twin-turbo 4.0 V8 family (M840T); this is not a recording of a 750S.
Changes: excerpting, two load loops resampled along the tracked engine pitch so each holds one rpm, crossfaded loop
points, fades, normalisation (built by scratchpad tooling, FLAC via `tools/compress-engine-audio.py`).
Replaced the same day at the owner's choice: the active McLaren set (`mclaren-start|idle|stop`, `mclaren-load-1800…7650`,
`mclaren-overrun-1350…7500`) now derives from the exhaust takes of the "McLaren 720S" GTA V sound mod by Legacy DMC
(original instructions by Aquaphobic), supplied by the owner. Loops were cut at fixed rpm along its acceleration and
deceleration sweeps and resampled to one pitch each. The Internet Archive WAVs stay in `tools/source-assets/audio/mclaren-720s-ia`.

## Aston Martin Valhalla engine audio — 2026-10-18
`valhalla-exhaust-load|exhaust-overrun|engine-load|engine-overrun.flac` hold, unchanged and one after another, the
rpm-stepped engine and exhaust loops (named M840T, one loop every ~400 rpm from 1100 to 8200 rpm) of the
"Aston Martin Valhalla" mod for BeamNG.drive by S7471C (gtmods.ru upload, supplied by the owner); `valhalla-idle.flac` mixes
its exhaust and engine idles. Not a recording of a Valhalla. Built by `tools/pack-valhalla-audio.cjs` (loop table in
`app/three/valhallaEngineAudio.ts`) and `tools/compress-engine-audio.py` (lossless, checked sample by sample). Start and
stop reuse the McLaren takes above.

## Koenigsegg Jesko engine audio — 2026-10-20
`jesko-load-2700…7200.flac`, `jesko-overrun-2500…6900.flac`, `jesko-idle|start|stop.flac` derive from the
"Koenigsegg Regera Sound" GTA V sound mod by Legacy DMC (lg91timreg), supplied by the owner (its AWC container is kept in
`tools/source-assets/audio/jesko-regera-mod`). The Regera has the twin-turbo 5.0 V8 the Jesko's is developed from; this
is not a recording of a Jesko. Loops were cut at fixed rpm along the mod's full-throttle and overrun sweeps (each window
re-timed along the tracked engine pitch so it holds one rpm), exhaust and engine takes mixed, crossfaded loop points;
idle, start and stop are the mod's own. Built losslessly by `tools/pack-jesko-audio.py` (Blender audaspace).
(An earlier set from a GTA San Andreas Jesko mod was replaced the same day at the owner's word.)
