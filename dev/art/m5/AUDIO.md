# Production and M5 sound delivery

Delivered 2026-10-11: 14 mono 44.1 kHz Vorbis OGGs from 13 Freesound CC0 recordings.
License and author credit for every final path are in [CREDITS.md](../../../CREDITS.md).
The browser was authenticated for the final import. Each original was downloaded
using its live signed URL, and all final files were rebuilt from originals.
Signed queries are never stored. Public HQ previews were only an initial audition.

Sources: `audio-sources.json`; original filenames and hashes: `audio-originals.json`;
exact trims: `audio-clips.json`; final codec, duration, peak and hash evidence:
`audio-report.json`. The local `audio/in/` download folder is ignored and not shipped.

With the original recordings present locally:

```sh
python dev/art/m5/import_audio.py
python dev/art/m5/import_audio.py --inspect
```

For a fresh original import, read each source's Download sound link in an already
logged-in Freesound browser, inspect the redirect's Location, and supply it with
`--fetch-original <key> <signed-url>` (repeat for all keys). These URLs expire;
obtain them at runtime, never put authentication queries in files or credits.
`--download` is an explicit public-preview fallback and reports that provenance;
prefer originals when available. The import script verifies CC0 metadata before
using any source, and preserves the original waveform's pitch and dynamics.

Short/transient clips use measured peak/RMS gain, since integrated-LUFS gating can
leave very brief foley too quiet. Targets are a -3 dB sample peak ceiling and
-23 dB full-clip RMS ceiling; fades are 5 ms in and 30 ms out. Vorbis may slightly
change measured peaks. Checks reject silent, clipped, wrong-codec or wrong-duration
output. This is technical validation; the GM can audition the artistic fit.

The M5 files use the requested exact names. The older production files need slot
repoints in `scripts/production/oprawa.mjs` by the GM; this asset delivery changes
no runtime code, compendium or campaign document. See MISSING's "Do podpięcia".

| File | Source and author | Cue |
|---|---|---|
| `sounds/postoj/szabrowanie.ogg` | [Bricks/Stones/Rocks/Gravel Falling](https://freesound.org/people/iwanPlays/sounds/567249/) — iwanPlays | Rubble being shifted and scattered; short scavenging cue. |
| `sounds/postoj/bebeszenie-mokre.ogg` | [260710- Squishing Fresh Celery - Moist Crunch 1](https://freesound.org/people/Valerie-Vivegnis/sounds/862077/) — Valerie-Vivegnis | Wet celery crack and squish used as organic salvage foley. |
| `sounds/postoj/bebeszenie-metal.ogg` | [Ratchet Wrench Fast Multiple](https://freesound.org/people/Rudmer_Rotteveel/sounds/591529/) — Rudmer_Rotteveel | Ratchet wrench removing machine hardware. |
| `sounds/postoj/autodestrukcja-beep.ogg` | [alarm4.wav](https://freesound.org/people/Krokulator/sounds/667365/) — Krokulator | One short alarm pulse, faded endpoints for repeated playback. |
| `sounds/postoj/wymiana.ogg` | [Heavy Book](https://freesound.org/people/IENBA/sounds/648959/) — IENBA | A padded heavy object lands on a wooden box: restrained barter acknowledgement. |
| `sounds/produkcja/kucie.ogg` | [Anvil - Lokomo 125 kg - Hammer on 3mm steel 4 times](https://freesound.org/people/ldezem/sounds/386110/) — ldezem | Four real anvil strikes shortened to roughly three seconds, pitch preserved. |
| `sounds/produkcja/warsztat.ogg` | [Ratchet Wrench Fast Multiple](https://freesound.org/people/Rudmer_Rotteveel/sounds/591529/) — Rudmer_Rotteveel | Ratchet wrench tightening hardware. |
| `sounds/produkcja/lutowanie.ogg` | [keyboard_typing_slow_loop2](https://freesound.org/people/peoplearehappy/sounds/841273/) — peoplearehappy | Keyboard clicks for the electronic/hacker work slot. |
| `sounds/produkcja/chemia.ogg` | [SCIENTIFIC LABORATORY AMBIENCE](https://freesound.org/people/Elenalostale/sounds/648662/) — Elenalostale | Laboratory bubbling and glass handling. |
| `sounds/produkcja/szycie.ogg` | [Scissors.wav](https://freesound.org/people/Swoboman87/sounds/108453/) — Swoboman87 | Several metal scissor snips. |
| `sounds/produkcja/drewno.ogg` | [Sawing Wood](https://freesound.org/people/Mateusz_Chenc/sounds/519661/) — Mateusz_Chenc | Short repeated sawing strokes. |
| `sounds/produkcja/gotowe.ogg` | [metal latch window or door lock catcher flip back and forth1.flac](https://freesound.org/people/kyles/sounds/455806/) — kyles | One practical metal latch click. |
| `sounds/produkcja/porazka.ogg` | [Wood Breaking](https://freesound.org/people/ominouswhoosh/sounds/679776/) — ominouswhoosh | Wood sticks crack and break. |
| `sounds/produkcja/iskra.ogg` | [Spark](https://freesound.org/people/elliott.klein/sounds/189630/) — elliott.klein | A brief real electric spark. |
