# Origin icon coverage — 2026-10-17

Final delivery: **all 12 main origin emblems are approved and installed**.
Nowy Jork uses the GM-selected earlier Batch 110 design; Południowa
Hegemonia uses Batch 111. All 36 origin abilities and all four cleanup
icons from Batches 108–109 are delivered too. No origin art review remains.

The previous completed origin queue covered **36 origin abilities**, all of
which have existing custom SVGs. It omitted the **12 main Pochodzenie
background emblems**. The initial audit found no
`icons/pochodzenia/<id>.svg`; the pack builder consequently used the shared
core `icons/svg/village.svg` fallback. That historical audit is preserved.

The twelve emblems first entered Batches 108–109, alongside
four saved style corrections. All are broad white glyphs, 256×256 with
20 px margins, lossless WEBP plus theme-aware SVG embedding the same mask.
All selected candidates received fresh GM approval before delivery. Exact canonical
region descriptions, generic prompts, source/absence checks and review
history are archived with each batch.

The existing `buildPochodzenie` already calls `iconFor("pochodzenia", key)`.
With Foundry closed and the GM's explicit authorization, all 18 packs were
rebuilt and validated, including `pochodzenia` and its twelve new images.
Every record ID is preserved. See `pack-rebuild-2026-10-17.json`.
Existing world backgrounds are updated separately by the GM. The delivery
audit itself neither reads pack databases nor accesses campaign documents.

Reproduce the delivery audit without overwriting the initial snapshot:
`node dev/icons/audit-origin-icons.mjs --output=origin-icons-2026-10-17-complete.json`.
Current evidence: [origin-icons-2026-10-17-complete.json](origin-icons-2026-10-17-complete.json).
Earlier delivery evidence: [origin-icons-2026-10-17-delivery.json](origin-icons-2026-10-17-delivery.json).
Initial evidence: [origin-icons-2026-10-17.json](origin-icons-2026-10-17.json).

| Batch | Main origin emblems |
|---|---|
| 108 | Asgard, Człowiek Pustyni, Detroit, Federacja Appalachów, Miami |
| 109 | Missisipi, Nowy Jork, Południowa Hegemonia, Posterunek, Salt Lake City, Teksas, Vegas |
