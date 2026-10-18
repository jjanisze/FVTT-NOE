# Proficiency UI follow-up

Batch 112 freezes eight genuinely missing subjects, not new versions of every
existing skill or toolkit. `prepare.py` captures approved fallback/style hashes
and the generic atlas prompt. The final cell is intentionally empty.

Generated with the built-in OpenAI image tool. Raw atlas:
`../review/candidates/batch-112/raw/batch-112-atlas-a.png`.
No shipped artwork was replaced and no GM hand-edit is claimed.

Normalization and registration:

```powershell
python dev/icons/placeholder-pass/process.py --batch 112
python dev/icons/proficiency-pass/register.py
npm run validate:icon-candidates
```

Registration is one-time and refuses to overwrite later feedback. All 544
earlier review cards and their decisions are retained. Only saved GM approval
permits copying the chosen SVG/WEBP pairs to their exact delivery targets and
updating `scripts/config/proficiency-icons-data.mjs`. The mixed Trait image
shares `TRAIT_CATEGORY_ICONS.skills` automatically.

`check-sandbox.mjs` is a browser function, suitable for Chrome `evaluate_script`
with inline source or `sourcePath` where the MCP filesystem permits it. It
requires an agent world, compares actual native choices, checks asset fetches,
and constructs an in-memory Actor/Class with native TraitFlow rows. It creates
no stored documents. Close `__proficiencyCheck.flow` after inspecting it.
The evidence JSON and screenshot locations are listed in
[PROFICIENCY_COVERAGE.md](../PROFICIENCY_COVERAGE.md).

Batch 112 review consumed: four new SVG/WEBP pairs delivered, current Acrobatics
explicitly retained. `accept_112.py --check` verifies the exact delivered hashes.
`reviewed.json` retains all eight decisions; the feedback file is unchanged by
installation. No unused dedicated Acrobatics file is installed.

Batch 113 (`prepare_113.py`, `register_113.py`) revises only Intuition,
Intimidation and Sleight of Hand. Intimidation has two requested alternatives
on the same card. Older candidates remain selectable. The atlas repeated the
bad hand silhouette, so an isolated correction uses a clearer open five-digit
pose with the same hand/coin motif; its prompt and source remain with the batch.
