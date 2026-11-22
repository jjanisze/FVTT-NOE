# Missing-asset queue

Full Bestiary audit, 2026-10-31: **52/52 native creature tokens and 52/52 native portraits**.
No creature graphics remain missing in this catalog. Spawacz p06/t10 is approved and delivered.
**No outstanding file requests remain in this queue as of 2026-11-01.**
All seven vehicle sounds, including the optional siren, are delivered and normalized
from six verified CC0 originals. The GM approved all seven; runtime integration is complete.
[Sources, trims, normalization and audition](../art/m4/AUDIO.md).
All ten M7 status glyphs and the explicitly requested primary-action reuse are approved
or explicitly authorized and delivered. Bonus Action uses the selected four-point star (A).
[Decisions, prompts and delivery hashes](m7-status-pass/README.md).

29 portrait/token pairs (22 Bestiary entries, 3 horses, 4 companions) are approved
and delivered to final paths. The latest is Spawacz p06/t10 (4/5, 5/5); previous portraits
are preserved in delivery backups.
[Versions and exact delivery hashes](../art/creatures/installed.json),
[portrait/token handoff](../art/creatures/REFERENCJE.md).
The 12 instrument glyphs and 2 water-status glyphs are also approved and delivered as
exact SVG/WEBP pairs from Batches 119–120. [Delivery receipt](m6-pass/reviewed-installed.json).
The GM rejected the old static water overlay because the animated silhouette effect
already replaces it; no static replacement is requested.

M7 status-image wiring is complete. Remaining M6 instrument/water image wiring,
pack builds and campaign updates are separate integration work in
[FINAL_HANDOFF.md](FINAL_HANDOFF.md).
Only outstanding asset requests belong here; delivery history is kept in the handoff.

**Next batch number: 129** (M9 delivered 124, 127 and deterministic cleanup 128; attempted 125–126 remain reserved).

## M9 — confirmed legacy cleanup, 2026-11-17

Nine GM-approved replacements from Batch 124 are installed: six armour subjects, two alcohol
glyphs and Anestix. Batch 127 successfully cleaned Neodrugs, Tornado, both Narkotyki glyphs
and Cygaro with the OpenAI image edit tool, under the GM's explicit request. The crop fallback
was not needed. Batch 128 closes the final poison-bottle speck and the two firearm cleanup
requests with the GM-approved deterministic normalizer after another image-service rejection.
The poison bottle's object pixels are unchanged; only its detached 25-pixel dot was removed.
The pistol's detached 99-pixel artifact was removed and firearm masks received the existing
safe-margin normalization. **No confirmed M9 artwork requests remain open.**
Exact target paths, briefs, prompts, validation and service results:
[m9-pass/README.md](m9-pass/README.md).

M9 has zero assignment gaps and all 782 finishes are approved:
[approval and exact corrected pixels](m9-pass/finish-approval.json),
[final cleanup revision](review/candidates/batch-128/finish-approval.json),
[current audit](review/m9-gap-audit.md).

<!-- class-placeholder-audit:start -->
<!-- class-placeholder-audit:end -->

<!-- icon-style-review:start -->
<!-- icon-style-review:end -->

## How an item gets added here

Add only a confirmed missing asset: final path, purpose, spec and prompt/brief link.
An existing correct image needing a repoint is a wiring task, kept in the handoff.
After delivery, validate the file, add its credit and remove the queue row.
For M5 catalog assets: `python dev/art/m5/pack.py`, then `--check`.
New white glyphs follow [Pipeline.md](Pipeline.md) and require GM review.
