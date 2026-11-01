# Vehicle sound delivery — M4

Delivered 2026-11-01: seven mono 44.1 kHz Vorbis OGG cues in `sounds/pojazdy/`,
from six verified Freesound CC0 originals. The Saturn recording supplies both start and stop.
The optional siren is included. The GM approved all seven cues on 2026-11-01;
[the approval receipt](audio/approval.json) pins their exact delivered hashes.

The shared graphics-review server has a **Dźwięki pojazdów** tab at
`/audio/pojazdy/index.html`. Native audio controls, one-at-a-time playback and a shared
volume slider compare the exact delivered files. No autoplay. The preview copies match
production hashes. Each recording links to its author and source.

| File in sounds/pojazdy/ | Length | Original source | Selected event |
|---|---|---|---|
| `start-benzyna.ogg` | 2.8 s | [Car Engine Start.wav](https://freesound.org/people/tbsounddesigns/sounds/405322/) — tbsounddesigns | Saturn Vue: starter, catch and brief idle. |
| `start-diesel.ogg` | 4.0 s | [FORD LTL 9000_engine start and idle.wav](https://freesound.org/people/YellowJacketStudios/sounds/435656/) — YellowJacketStudios | 1980s Ford LTL 9000 heavy-diesel start. |
| `start-motocykl.ogg` | 2.5 s | [Motorcycle - Harley Davidson vintage](https://freesound.org/people/Vrymaa/sounds/737775/) — Vrymaa | Vintage Harley-Davidson start and first throttle rise. |
| `zgaszenie.ogg` | 1.5 s | [Car Engine Start.wav](https://freesound.org/people/tbsounddesigns/sounds/405322/) — tbsounddesigns | The same Saturn shutting down. |
| `nieudane-odpalenie.ogg` | 2.95 s | [failed_car_start.wav](https://freesound.org/people/jerry.berumen/sounds/511685/) — jerry.berumen | Unsuccessful cranking attempt and release. |
| `alarm.ogg` | 2.9 s | [Alarm_Car_Parking.wav](https://freesound.org/people/cribbler/sounds/440419/) — cribbler | Actual car alarm pulses. |
| `syrena.ogg` | 5.0 s | [R18-43-Siren Recorded in Studio.wav](https://freesound.org/people/craigsmith/sounds/479899/) — craigsmith | Dry American mechanical siren; optional fire-engine cue. |

## Existing normalization pipeline

`import_audio.py` delegates to the existing [M5 importer](../m5/import_audio.py),
changing only its input/output declarations. The M5 implementation and its earlier
outputs remain untouched. Source pitch and tempo are preserved. Declared trims use
the real event boundaries and exclude long idle tails and unrelated later events.

The M5 profile uses a −3 dB sample-peak ceiling and −23 dB full-clip RMS ceiling,
5 ms fade-in and 30 ms fade-out, mono 44.1 kHz, libvorbis quality 4. Output levels are
measured again after Vorbis encoding: all seven pass the ceilings and duration ranges.
The seven production files total 221,267 bytes.

- [Verified pages, CC0 license links, descriptions and authors](audio-sources.json).
- [Original filenames, safe unsigned URLs and SHA-256 hashes](audio-originals.json).
- [Exact trims](audio-clips.json).
- [Encoded codec, duration, peak/RMS and delivery hashes](audio-report.json).
- [Independent delivery and audition-copy validation](audio/validation.json).
- [Chrome media loading, durations and served-file hashes](audio/browser-validation.json): 7/7,
  no decode errors and no horizontal overflow. Browser Vorbis duration includes roughly 3 ms
  of codec framing beyond the declared trim.
- [Source energy envelopes](audio/source-envelopes.png), [selection notes](audio/selection.json).

Authenticated download redirects were read in the GM's already logged-in browser.
Only original WAVs were imported; public previews were not shipped. Signed URL queries
are kept out of files. Original downloads remain under ignored `audio/in/`.

With the originals present:

```sh
python dev/art/m4/import_audio.py
python dev/art/m4/audio/prepare_review.py
```

For fresh downloads, obtain each current authenticated Download sound redirect and use
`--fetch-original <key> <signed-url>` for all six keys together. See [M5 audio instructions](../m5/AUDIO.md).
`python dev/art/m4/audio/inspect_sources.py` regenerates the energy-envelope QA.

The static audition page preloads each complete small OGG as a typed in-memory Blob.
This gives Chrome correct duration and seek metadata even when the shared image-review
server serves generic streamed binary responses. No playback-rate changes or extra encoding.

## Runtime use

`scripts/pojazdy/efekty-silnika.mjs` already references all seven exact filenames.
One missing integration link was fixed: selecting **Syrena** in the driver's palette
now sets the existing `pojazdDzwiek` chat-message flag in `scripts/pojazdy/paleta.mjs`.
The existing client hook plays the approved siren once; unrelated palette actions emit no sound.
The siren's game effect is unchanged. No new sound map, engine loop or compendium build is required.

[Sandbox integration evidence](audio/runtime-verification.json) covers an actual palette-button
click, exactly one siren playback request, the preserved siren effect, an unrelated silent
action and all seven approved audio hashes served from native module paths. Audio output was
intercepted during the test; all temporary actors, tokens and chat cards were removed and the
playback helper restored. Vehicle Quench: **60/60**; `npm test` passes.
The report omits browser/session and temporary-document identities. Automatic approval review
rejected publication of the Foundry session screenshot, so no such image is stored in the repository.

Existing clients that previously cached an absent file must reload once.
The Garaż `silnik` probe describes all seven cues; the station was not reset or reseeded.
