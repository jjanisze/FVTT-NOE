# Origin icon coverage — 2026-10-17

Delivery update: **5 of 12 main origin emblems are approved and installed**:
Asgard, Miami, Missisipi, Salt Lake City and Teksas. The seven other origins
have saved revision requests and continue in Batch 110. All four cleanup
icons from Batches 108–109 are also delivered.

The previous completed origin queue covered **36 origin abilities**, all of
which have existing custom SVGs. It omitted the **12 main Pochodzenie
background emblems**. The initial audit found no
`icons/pochodzenia/<id>.svg`; the pack builder consequently used the shared
core `icons/svg/village.svg` fallback. That historical audit is preserved.

The twelve emblems first entered Batches 108–109, alongside
four saved style corrections. All are broad white glyphs, 256×256 with
20 px margins, lossless WEBP plus theme-aware SVG embedding the same mask.
Candidates require fresh GM approval before delivery. Exact canonical
region descriptions, generic prompts, source/absence checks and review
history are archived with each batch.

The existing `buildPochodzenie` already calls `iconFor("pochodzenia", key)`.
After approval and delivery, the GM rebuilds `pochodzenia`; no new code
wiring is needed. Existing world backgrounds are updated separately by the
GM. This audit neither reads pack databases nor accesses campaign documents.

Reproduce the delivery audit without overwriting the initial snapshot:
`node dev/icons/audit-origin-icons.mjs --output=origin-icons-2026-10-17-delivery.json`.
Current evidence: [origin-icons-2026-10-17-delivery.json](origin-icons-2026-10-17-delivery.json).
Initial evidence: [origin-icons-2026-10-17.json](origin-icons-2026-10-17.json).

| Batch | Main origin emblems |
|---|---|
| 108 | Asgard, Człowiek Pustyni, Detroit, Federacja Appalachów, Miami |
| 109 | Missisipi, Nowy Jork, Południowa Hegemonia, Posterunek, Salt Lake City, Teksas, Vegas |
