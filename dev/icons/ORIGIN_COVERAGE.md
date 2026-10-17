# Origin icon coverage — 2026-10-17

The previous completed origin queue covered **36 origin abilities**, all of
which have existing custom SVGs. It omitted the **12 main Pochodzenie
background emblems**. No `icons/pochodzenia/<id>.svg` exists yet; consequently
the pack builder retains the shared core `icons/svg/village.svg` fallback.

These twelve missing emblems are now queued in Batches 108–109, alongside
four saved style corrections. All are broad white glyphs, 256×256 with
20 px margins, lossless WEBP plus theme-aware SVG embedding the same mask.
Candidates require fresh GM approval before delivery. Exact canonical
region descriptions, generic prompts, source/absence checks and review
history are archived with each batch.

The existing `buildPochodzenie` already calls `iconFor("pochodzenia", key)`.
After approval and delivery, the GM rebuilds `pochodzenia`; no new code
wiring is needed. Existing world backgrounds are updated separately by the
GM. This audit neither reads pack databases nor accesses campaign documents.

Reproduce: `node dev/icons/audit-origin-icons.mjs`.
Evidence: [origin-icons-2026-10-17.json](origin-icons-2026-10-17.json).

| Batch | Main origin emblems |
|---|---|
| 108 | Asgard, Człowiek Pustyni, Detroit, Federacja Appalachów, Miami |
| 109 | Missisipi, Nowy Jork, Południowa Hegemonia, Posterunek, Salt Lake City, Teksas, Vegas |
