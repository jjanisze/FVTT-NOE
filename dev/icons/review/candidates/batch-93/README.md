# Batch 93 — four class revisions, two options each

Ten approved subjects from the Batch 90–92 review are installed, including
Spec A and Złodziej B. Four primary classes need revisions. Each receives
two new options with two main elements; all older choices remain selectable.

| Class | Exact saved direction |
|---|---|
| Brutal | Add a healed chest scar; replace knife with hand-held rail piledriver |
| Cwaniak | Replace megaphone with microphone; retain playing card |
| Twardziel | Replace SMG with LMG; retain aligned armor |
| Zwiadowca | Straighten the rifle barrel; retain compass and composition |

The first reference in each prompt is the exact selected edit target. The
second supplies established glyph style. Brutal has a third reference from
the existing `icons/weapons/kafar_piledriver.svg`, rendered without drawing;
the generated weapon simplifies that heavy rail-section striking tool.
The scar is a closed old scar, with no wound, blood or gore.

OpenAI's built-in image generator produces one two-option comparison image
per class at `raw/<class>-pair.png`. Every exact prompt and reference path
is archived in `prompts.json`. Verbatim saved decisions, selected-source
hashes and native targets are retained in `batch.json` and
`revision-feedback-before.json`.

The processor splits equal left/right halves, rejects foreground crossing
the center gutter, normalizes to 256×256 pure white with alpha and 20 px safe
margins, then writes lossless WEBP and SVG wrappers. Embedded WEBP, external
WEBP and PNG pixels match exactly. It does not draw or edit the motifs.
Options are in sibling `batch-93-a/` and `batch-93-b/` folders, each with
its own `validated.json` hashes. Dev-only PNGs and raw sources are not shipped.

```sh
python dev/icons/placeholder-pass/class_pair_batch.py check --batch=93
python dev/icons/placeholder-pass/class_pair_batch.py register --batch=93
```

Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
Registration runs once, archives exact feedback, prepends both options to
the existing four cards and keeps them first in review. No new class
candidate is installed before approval. Original Batch 90–91 deliveries
have already been consumed; use Batch 93 for these class approvals.

Validation: eight class options pass exact format and margin checks, and
both choices were inspected at 64/32/24/16 px. All 784 candidate pairs pass
collection validation. The full review has 22 pending cards, 65 options,
all new candidates selected and no broken images or browser errors. Every
remaining placeholder is represented; all 22 native hashes are unchanged.
All 26 new choices resolve through the existing approval provenance helper.
Evidence: `raw/review-preview.png` and
`../../../placeholder-pass/progress-93-95.json`.

Saved GM review: Cwaniak A, Twardziel B and Zwiadowca B are installed.
Brutal A carries the exact Halligan-bar request into Batch 96. `reviewed.json`
and `reviewed-installed.json` preserve the selections and delivered hashes.
