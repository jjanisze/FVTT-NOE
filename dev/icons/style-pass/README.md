# Browser style revisions — Batches 102–105

Review outcome, 2026-10-17: **16 approved replacements installed; 13 revisions
remain**. Exact decisions and chosen pixels are archived in each batch's
`reviewed.json` and `reviewed-installed.json`. Approved browser flags now
record the new SVG hash as kept; remaining flags retain their original
notes. Nine unreferenced PNG siblings were archived in dev and retired in
favor of WEBP. Revisions continue in Batches 106–107.

The thirteen saved revisions are frozen by `prepare_106_107.py` and returned
to the same cards by `register_revisions.py`. Batch 106 has nine subjects;
Batch 107 has four with five empty cells. The waiter preserves the GM's
selected **current** icon as its primary reference and also supplies the
rejected candidate for the requested middle ground. All older choices and
verbatim notes remain available.

Validation for Batches 106–107: all 13 exact corrections are archived, 26
remaining production files retain their hashes, and 511 unrelated cards and
decisions are unchanged. The 16 approved deliveries and nine retired PNG
archives still match their recorded hashes. All 841 candidate pairs pass.
The published gallery has 13 cards and 39 options, with the new candidates
selected, no broken images and no browser errors. Evidence:
`progress-106-107.json` and `../review/candidates/batch-106/raw/review-preview.png`.

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

`accept.py --batches <numbers>` preflights every captured production variant,
the exact selected candidate, clean native targets and saved decisions.
It copies the exact approved SVG/WEBP pairs, updates only approved style flags,
and archives all completed decisions. Unreferenced legacy PNG siblings are
preserved under dev before retirement; referenced PNGs block that cleanup.
Use `--preflight` to inspect without writes and `--check` to verify delivered
pixels and retired-source archives. No runtime wiring, compendium rebuild
or world write is needed for exact native filenames.

- [Batch 102 assets](../review/candidates/batch-102/README.md) and [exact prompt](../review/candidates/batch-102/prompts.json).
- [Batch 103 assets](../review/candidates/batch-103/README.md) and [exact prompt](../review/candidates/batch-103/prompts.json).
- [Batch 104 assets](../review/candidates/batch-104/README.md) and [exact prompt](../review/candidates/batch-104/prompts.json).
- [Batch 105 assets](../review/candidates/batch-105/README.md) and [exact prompt](../review/candidates/batch-105/prompts.json).
- [Batch 106 revisions](../review/candidates/batch-106/README.md) and [exact prompt](../review/candidates/batch-106/prompts.json).
- [Batch 107 revisions](../review/candidates/batch-107/README.md) and [exact prompt](../review/candidates/batch-107/prompts.json).

Validation and browser evidence: `progress-102-105.json`.

Final checks: all 29 saved flags are represented once, all 58 existing SVG
and WEBP files retain their incoming hashes, and all 495 earlier cards and
decisions are unchanged. All 828 candidate pairs validate. The gallery has
29 pending cards with 58 current/candidate options, every new candidate
selected, zero broken images and zero browser errors. Contact sheets were
inspected at 64/32/24/16 px. All 153 original placeholder subjects remain
delivered at 155 exact native targets, with zero generated initials badges.
