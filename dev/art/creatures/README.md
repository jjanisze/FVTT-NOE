# Portrait → top-down token

Reusable, agent-operated image workflow and local GM reviewer. All 23 queued pairs
(4 companions, 3 horses, 16 Bestiary entries) are approved and delivered.
Versions and alternatives remain in [manifest.json](manifest.json).
Current state and next actions: [PLAN_grafiki_stworzen.md](../../../PLAN_grafiki_stworzen.md).

Current GM scope (2026-10-30): assets and explicitly authorized **review-tool grouping and
integration**. Foundry runtime code, pack builds and Claude's regressions remain outside
this pass. Create each token only after its portrait is
approved, then request token approval. The full portrait audit adds five more bestiary
entries that previously had token aliases. Queue: 4 companion pairs, 3 horse pairs and
16 other bestiary pairs. [Reference list and horse briefs](REFERENCJE.md).
All four companions have now been approved, including the GM's return to mammal p02/t01;
their exact reviewed final files were restored without rebuilding packs.

## Generate a matched pair

Generation uses the **built-in image_gen tool**, not a Python API client. The tool does
not expose a model identifier: metadata records the tool and `model: null`. Text produced
inside an image is not evidence of a particular model. No API key is needed by these scripts.

1. Read the creature description and inspect existing portrait/token references. Existing
   full-body portraits use a dark charcoal painted backdrop; tokens use a near-overhead
   camera, head south, readable earthy painting and genuine transparency.
2. Freeze a portrait prompt, inspect its references, then call image_gen with exactly that
   prompt and those image references. Use an opaque background for portraits.
3. Import the generated PNG. Inspect the portrait before deriving its token. A correction
   is a new candidate, never an overwrite. Save the actual edit prompt before calling the tool.
4. Freeze the token prompt against that exact portrait version. Image 1 supplies identity;
   image 2 supplies camera and painting only. Use `transparent_background: true`.
5. Inspect anatomy, silhouette, camera, equipment and markings against the portrait. Import
   the token, validate, then send the pair to the reviewer.

From the module root, for example:

```sh
python -X utf8 dev/art/creatures/prepare.py init
python -X utf8 dev/art/creatures/prepare.py prompt --id=towarzysz-psi-partner --kind=portrait --candidate=p02
# Call built-in image_gen with the emitted prompt and inspected references.
python -X utf8 dev/art/creatures/prepare.py add --id=towarzysz-psi-partner --kind=portrait --candidate=p02 --source="<generated portrait PNG>" --prompt=dev/art/creatures/prompts/towarzysz-psi-partner/portrait-p02.json
python -X utf8 dev/art/creatures/prepare.py prompt --id=towarzysz-psi-partner --kind=token --candidate=t02 --portrait=p02
# Call image_gen again, using the registered portrait as subject reference.
python -X utf8 dev/art/creatures/prepare.py add --id=towarzysz-psi-partner --kind=token --candidate=t02 --portrait=p02 --source="<generated token PNG>" --prompt=dev/art/creatures/prompts/towarzysz-psi-partner/token-t02.json
npm run validate:creatures
```

`prompt` refuses to replace an existing frozen prompt. It is a starting template: an agent
must check the subject and edit it **before** the model call when the creature needs a
specific pose, weapon or correction. Persist the prompt actually used. References are
relative to the module root; expand them only when invoking the image tool.

Learning from the first batch: even a style-only armored dog reference can transfer its
harness/cage to another mammal. Explicitly list forbidden equipment for biological
companions. Mammal p01 is retained with an agent rejection note; p02 removes the equipment,
and its token comes from p02. Dog t02 restores the portrait's dark saddle marking and
removes the misplaced chain from the top of the neck. Earlier versions remain available.
This is preparation feedback, not a GM rating.

The first GM review approved the dog pair at 5/5 and the insect portrait at 5/5. The insect
token was revised to match the portrait's six walking legs plus two digging forelimbs.
The GM requested a less combative mammal and a less crocodilian reptile. Revised briefs
are in the manifest and template; original frozen prompts/feedback remain unchanged.
The mammal's source statblock still says Large/Strength 18: this pass changes its visual
character, not its mechanics. A lizard portrait correction also removes the dog reference's
overly upright posture. Watch for posture transfer as well as equipment transfer.

## Files and framing

### Native-size inspection and surface detail

Click a portrait (keyboard: Enter) to inspect at **100% / 1:1**, scrolling rather than
shrinking to fit. The recorded generator PNG opens first when available and unchanged;
**Oceniany plik** switches to the reviewed WEBP. **Dopasuj** provides an overview. Escape
closes and restores focus without recreating the review form. Reference portraits fall
back to their native file. Original access is limited to catalog source paths with matching
SHA-256, not the whole `in/` directory. Raw PNGs remain local/ignored; checkouts without
them show the reviewed WEBP at its native size.

The sick-horse review exposed a failure mode: broad genre/condition language and repeated
rough-surface descriptions produced a uniform fine network over the animal. Direct editing
retained much of it. A new variant with a clean painting reference and positive instructions
for broad gradients reduced the pattern further. Describe illness/damage through macro
anatomy, a few large color patches and local defects, leaving chest/neck planes quiet.
Reserve fine detail for eyes, silhouette hair and selected seams. A material reference can
also transfer equipment: check that separately. Do not blur the delivered bitmap to hide
the problem. Inspect original pixels at 1:1 before approval; small previews conceal it.

The prompt template now describes the visual rendering rather than applying a setting-wide
genre label. Frozen historical prompts are unchanged. The original PNG and normalized WEBP
can have different dimensions; the viewer shows each file's actual size.

The GM confirmed that p06 removed the distracting noise. Subsequent local edits add skin
blisters and reduce body mass. The GM approved p09 at 5/5 and token t01 without a numeric
rating; the subsequent aligned t02 was approved at 4/5 and is now delivered with p09.
The older t01 remains in the version history and delivery backup. At identical 800 px / 90%
framing, a longer projecting tail can shrink the torso
and shift the saddle within the frame. Compare body landmarks and saddle placement as well
as the alpha bounding box; preserve the underweight anatomy when matching the horse template.

The Neobear review exposed cumulative editing artifacts after the silhouette, fur distribution,
loose skin and scars were established. On the GM's instruction, p05/p06/p07 restart independently
from the written concept, with no image inputs. The GM selected p07 at 5/5; its first overhead
token t01 was separately approved at 4/5 and delivered with p07. Other variants and their feedback remain intact. Broad smooth skin planes are the review
criterion, not simply a new filename or another edit pass.
Earlier preparation variants are retained with agent notes: direct editing left the mesh,
a new base improved it but transferred expensive tack,
then tack and the remaining body-surface curls were corrected separately. This is a practical
result from these trials, not proof that a particular word always causes the artifact.

- `manifest.json`: queue, final targets, candidate versions, dimensions and SHA-256 hashes.
- `prompts/`: exact prompts and reference roles; tracked.
- `in/`: original generated PNGs and backups of replaced deliveries; local, ignored.
- `candidates/`: normalized review WEBPs; tracked. Portraits fit within 1000 px, preserving
  aspect. Tokens are lossless RGBA WEBPs, square and centered.
- `review/feedback.json`: GM decisions, ratings, notes and prior decisions; created on first
  save. A `.bak` copy protects the previous save. Unsaved form drafts stay in browser storage.
- `out/`: contact sheets and local QA evidence; ignored.
- `installed.json`: exact installed candidate IDs and hashes, created on delivery.

Preparation performs only cropping, proportional resizing, padding and encoding. It never
paints anatomy, removes a generated background or calls a model. Tokens without real alpha
are rejected. Frame fill uses the longest alpha-bounded extent, ignoring alpha ≤8 for the
bounding box; it is not a Foundry texture-scale override.

| Creature size | Square px | Frame fill |
|---|---:|---:|
| Tiny | 200 | 60% |
| Small | 400 | 70% |
| Medium | 400 | 90% |
| Large | 800 | 90% |
| Huge | 1200 | 92% |
| Gargantuan | 1600 | 92% |

Each token records its source portrait ID **and hash**. Normalized bytes are what the GM
reviews and what installation copies. Original PNGs are retained for later edits.

## Review

```sh
npm run review:creatures
```

Open the printed URL, then **Portrety i żetony** at `/creatures/`. `review:graphics`,
`review:icons` and `review:creatures` start the same server, with shared icon/library,
reference and water-preview tabs. It does not require Foundry or a sandbox mutex.

Select a creature, compare the pair, and use the existing pairs tab as a style reference.
Check tokens at 70/140 px, on light/dark/checker backgrounds and rotated. Rate **portrait
and token independently**, optionally 1–5, choose a decision and save each form. Ratings
do not imply approval: the decision controls approval. Useful criteria:

After a new candidate arrives, reloading opens it by default if it is newer than the last
saved review. Its decision/rating start empty; the earlier review remains available beside
the form. An explicit version choice takes priority until the page reloads.

| Portrait | Token |
|---|---|
| Painting fits existing artwork | Same anatomy, colors, markings and equipment |
| Anatomy and pose make sense | Clear overhead camera, head south |
| All extremities fit | Clean alpha and readable silhouette |
| Character and material detail | Readable at 70 px; correct size-specific framing |

Use notes for the concrete defect rather than forcing each criterion into a numeric score.
Suggested overall ratings: 1 unusable, 2 major correction, 3 workable with issues, 4 good,
5 ready. The agent must not invent GM ratings or treat approval of a direction as approval
of the completed pair. Version changes invalidate the earlier approval.

## Deliver an approved pair

```sh
python -X utf8 dev/art/creatures/prepare.py install --id=towarzysz-psi-partner
```

For two-stage entries, token prompt creation and import require approval of that exact
source portrait and its current hash. Another approved version does not unlock this token.

Installation requires two approved, unchanged versions and matching portrait provenance.
It copies the selected WEBPs to the manifest targets and backs up prior final images.
It does not alter worlds, rebuild compendia or infer approval from a rating. After approval
and installation, add the final-art credit, remove delivered rows from MISSING, and use the
normal generators/`fvtt packs` workflow for affected companion/bestiary packs. Verify their
portrait/token paths there; existing campaign actors require a separate, deliberate update.

## Verification

```sh
npm run test:creature-art
npm run validate:creatures
```

Tests use temporary fixtures: rating/history persistence, stale hashes, source-portrait
mismatch, bounded image serving, alpha/framing, immutable candidate IDs and exact-byte
delivery after approval. They never save artificial approvals in the GM's real feedback.

Browser QA on 2026-10-30: four complete companion pairs loaded; all eight reference images
loaded; mammal defaults to p02; selecting p01 shows the mismatch warning; checker background,
rotation and small previews work. The real feedback file was absent and remained untouched.
Unsaved notes also survived a page reload; the test draft was then removed. No Foundry code
or world state changes are part of this pipeline. Full `npm test` reaches an existing
`deletion-syntax` finding in `scripts/scenes/poscig-tura.mjs:389` (also present in HEAD);
the seven creature-art tests and candidate validation pass independently.
