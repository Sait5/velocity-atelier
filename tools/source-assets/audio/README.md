# Engine recording sources

The original WAV recordings the site's FLAC engine sounds are built from. They are not served by the site.

The site uses lossless FLAC copies in `public/audio/` (same samples, rate, bit depth and length). Rebuild them with
`blender -b --factory-startup --python tools/compress-engine-audio.py`; the script decodes every FLAC again and stops if
any sample differs from its WAV. Never replace these recordings with a lossy format.

`bugatti/user-acceleration.wav` and `bugatti/user-coast.wav` are the owner's decoded Bugatti takes that
`tools/prepare-bugatti-user-continuation.py` cuts into the `-continuous` files.

The older `tools/prepare-*.py` audio scripts still write their WAV into `public/audio/`. After re-running one, move that WAV
here and run the FLAC script again.

Credits and edit history: `public/audio/CREDITS.md`.
