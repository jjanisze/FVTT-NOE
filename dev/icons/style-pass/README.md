# Browser style revisions — Batches 102–105

The 2026-10-17 browser review flagged 29 existing ability icons for excess
detail, dithering or unclear subject matter. All 29 requests are frozen in
`incoming-style-feedback.json`, with original source hashes and verbatim
notes. These are fresh style reviews after completion of the separate
153-subject placeholder pass.

Batches 102, 103 and 104 contain nine subjects each. Batch 105 contains two,
with seven empty atlas cells. The exact generic prompts and current/desired
reference roles live beside each batch. `motifs-102-105.json` records the
simplified motifs and generic mechanical context. No campaign personas or
recognizable characters are used. Fart uses a clover instead of dice;
Twierdzenie kąta prostego shows a melee interception instead of a wall diagram.

OpenAI's built-in image tool generates one atlas per batch. Existing
`../placeholder-pass/process.py` only splits, crops, resizes and converts.
Batch 103 also records isolated rifle-connection and spider-anatomy
corrections; the original atlas and rejected attempts remain available.
Candidates are 256×256 pure-white alpha masks with 20 px margins and exact
matching lossless WEBP and SVG-embedded WEBP. PNGs remain dev-only.

`register.py` checks exact saved style decisions, all current file variants
and validated candidate hashes, then adds fresh review cards. Earlier cards
and decisions remain unchanged. Browser flags remain marked for redo while
candidates await fresh approval. Production art stays unchanged.

After approval, installation must preflight every `incoming.json` production
file hash and preserve the exact selected mask. Existing WEBP sidecars need
replacement too; the placeholder accept helper intentionally rejects existing
sidecars and cannot be used unchanged for this pass. No runtime wiring,
compendium rebuild or world write is needed for exact native filenames.

- [Batch 102 assets](../review/candidates/batch-102/README.md) and [exact prompt](../review/candidates/batch-102/prompts.json).
- [Batch 103 assets](../review/candidates/batch-103/README.md) and [exact prompt](../review/candidates/batch-103/prompts.json).
- [Batch 104 assets](../review/candidates/batch-104/README.md) and [exact prompt](../review/candidates/batch-104/prompts.json).
- [Batch 105 assets](../review/candidates/batch-105/README.md) and [exact prompt](../review/candidates/batch-105/prompts.json).

Validation and browser evidence: `progress-102-105.json`.

Final checks: all 29 saved flags are represented once, all 58 existing SVG
and WEBP files retain their incoming hashes, and all 495 earlier cards and
decisions are unchanged. All 828 candidate pairs validate. The gallery has
29 pending cards with 58 current/candidate options, every new candidate
selected, zero broken images and zero browser errors. Contact sheets were
inspected at 64/32/24/16 px. All 153 original placeholder subjects remain
delivered at 155 exact native targets, with zero generated initials badges.
