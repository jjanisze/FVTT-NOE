# Batch 63 — GM revisions and the remaining origin features

Twenty-seven candidates in three 3×3 atlases: thirteen exact-selected-reference
revisions from Batches 61–62, twelve remaining canonical origin features, and
Aramis / Aspiryna i Miętusy beginning the next Sztuczka pass. All prompts and
contexts are generic. Batch 63 candidates require a fresh GM review.

Atlas A prioritises Handel, Bebeszenie, Szabrowanie and the teddy-bear correction,
then five origin revisions. Atlas B contains Ruch, Paszcza, Wychuchana spluwa and
the complete Samuraj redraw, followed by five new origin features. Atlas C has
the remaining seven origins and two Sztuczki.

Samuraj's first atlas draft omitted the scabbard hand. The isolated model correction
is preserved as `raw/standalone-samuraj.png` and its prompt is in `prompts.json`.
The processor uses this corrected source for that cell and keeps the original
atlas draft as evidence. Inspect the final gesture at 16 px before approval.

`references.json` archives each GM-selected candidate and the exact revision
note; Ruch deliberately uses the selected Batch 60 reference. `decisions.json`
records the full incoming active queue. `prompts.json` records all three exact
built-in OpenAI generation prompts. Raw PNG atlases, contact sheets and normalized
development previews stay local under the existing review gitignore rules.

```sh
node dev/icons/review/candidates/batch-63/inspect_queue.mjs
python dev/icons/review/candidates/batch-63/compose_reference.py
python dev/icons/review/candidates/batch-63/process_batch.py
python dev/icons/review/candidates/batch-63/validate_batch.py
python dev/icons/review/candidates/batch-63/register_review.py
npm run validate:icon-candidates
```

Do not rerun the incoming snapshot command after registering this batch: the
historical decisions belong to its exact source references. The registrar
archives the thirteen old notes, selects the new revision candidates as pending,
retains all unrelated GM feedback, and resolves only installed exact approvals.
Re-running it preserves new decisions already saved against Batch 63.

The separate `install_approved.py` installed 31 incoming GM-approved candidates
as lossless WEBP plus SVG masks embedding WEBP. It checks that the approval and
candidate are unchanged and refuses production files with unrelated working
changes. `installed.json` lists every explicit file and its source/output hash.
No Batch 63 candidate is installed, and no code, compendium or world is changed.
Older feat/bestiary repoints and pack rebuilds remain in MISSING's "Do podpięcia".
