# Icon review queue

This local tool puts item context, the current icon and generated candidates on
one dark page. Every image is also shown at 64, 32 and 16 px. Decisions and free
text notes are written to `feedback.json`, so they survive browser restarts and
can be read by the next asset-generation pass.

```powershell
npm run review:icons
```

With Foundry already open in the Chrome debug session, refresh the read-only
world/module item inventory with `npm run audit:icons`. Its snapshot is written
to `audits/live-items.json`; it never opens Foundry's LevelDB files directly.

Open `http://127.0.0.1:41741/`. Select a candidate, choose **Approve selected**,
**Needs revision** or **Reject all**, write any notes, and press **Save feedback**.
For **Needs revision**, the selected image is the reference for the next generation;
the review page preserves that selection when it is reopened.
Saving feedback does not replace a shipped icon. Integration remains a separate,
reviewable pipeline step after approval.

## Adding candidates

1. Copy the raw generated image under `candidates/<batch>/raw/`.
2. Normalize it without touching live assets:

   ```powershell
   python dev/icons/review/prepare_candidate.py --input <raw.png> --output <candidate.png>
   ```

3. Add the item and candidate metadata to `manifest.json`.
4. Store the exact generation prompt beside the candidate.

Run `npm run validate:icon-candidates` before review. It checks 256×256 RGBA
output, pure-white visible pixels, the 20 px safe margin and a matching SVG.

The server has no dependencies, binds only to `127.0.0.1`, serves only the review
folder and `icons/`, limits feedback payloads, validates item/candidate ids, and
writes feedback atomically.

## Browse all current icons

Open **Browse all icons** in the review header, or `browser.html` on the same
local server. The library scans `icons/**`, including older icons outside the
generation queue. PNG/SVG/WEBP files with the same stem are grouped into one
entry; the preview-file selector lets you inspect each actual version. Names
come from local catalog/review metadata when available, otherwise filenames.

Search by name, path or saved notes, filter by category or review status, and
inspect each icon at 64/32/16 px. Search/filter/page position survives reloads.
Click **Review style**, select **Too detailed**, **Dithered / speckled**,
**Anime / cartoon**, **Wrong subject**, or **Other**, and add specific notes.
**Flag for redo & next** saves the request and advances through the filtered
list. **Keep & next** records acceptable icons; **Clear decision** returns an
entry to unreviewed. A file changed since its saved review is shown separately
so it can be checked again.

Style decisions persist in local `style-feedback.json`, independently of the
existing generation approvals. Flags automatically update only the marked
style-review section of `dev/icons/MISSING.md`, preserving the other queue
sections. Exact selected paths and source hashes are recorded for the next
asset pass. Unflagging removes the corresponding request. No icons, module
definitions, packs or world documents are changed by browser decisions.

The next asset pass reads the flagged rows and `style-feedback.json`, verifies
the selected source hashes, and generates the next free batch using Pipeline.md.
New replacements return to the normal candidate reviewer for GM approval.

## dnd5e style reference

The **5e styles** tab (`dnd5e.html`) shows 44 actual dnd5e reference images,
four per group: class emblems, subclass variations, background scenes, species
portraits, class features, feats, spells, equipment, activity glyphs, condition
glyphs and legacy class art. Several content groups share the stock illustration
style; the page labels that relationship instead of implying eleven independent
art directions.

Each card shows the original at 96 px and sheet previews at 64/32/16 px. Click
the original for a 256 px inspection. Controls select a group, light/dark sheet
surface, native raster framing and grayscale. SVG previews inherit native sheet
ink and remain unframed, reflecting the inventory component's `display: contents`
host. These are isolated style samples rather than a full Foundry sheet render.

The server reads only the curated images from the local dnd5e/core installation,
using the existing per-user `fvtt` configuration and its default profile. The
catalog and image routes are read-only; images are neither copied into the
module nor added to the GM's review queue. Missing installations are reported on
the page. Restart the review server after updating its backend, then open the
tab from either the review queue or icon browser.

```powershell
node --test dev/icons/review/browser.test.mjs dev/icons/review/dnd5e-reference.test.mjs
```

Validation, 2026-10-18: all nine targeted checks pass. Chrome loaded all 44
examples (152 raster-image elements and 24 themed inline SVG previews) without
broken images. Group filtering, sheet surface, framing, grayscale and the
enlargement dialog work. Desktop and narrow layouts have no horizontal overflow.
Local screenshots are in `audits/dnd5e-reference-dark.png` and
`audits/dnd5e-reference-light.png`; no Foundry world or review decision is changed
by this check.

Checks (all within the asset tools):

```powershell
node dev/icons/review/catalog.mjs
node --test dev/icons/review/browser.test.mjs
node dev/icons/review/browser-smoke.mjs
```

The first command counts local entries/files/categories. Unit/API checks use
isolated fixtures; the Chrome smoke check tests actual flag/save/reload/clear
controls and a narrow viewport against a temporary fixture, leaving real style
decisions unchanged. It inspects the real library read-only and saves local
evidence to `browser-preview.png`. Neither check opens or writes Foundry data.

Initial browser validation: 891 icon entries, 1,444 file variants, 16 categories;
five unit/API tests and the browser persistence round-trip pass. Existing known
glyph review cards are all resolved (342/342), including the final Batch 68
approvals. Painted-art source deliveries and GM wiring remain separate.

Coverage correction, 2026-10-15: the earlier 342-card review queue omitted
class/profession initials placeholders. The source audit confirms 155 badge
files: 131 abilities, six classes and 18 professions. Of these, 154 files are
still referenced by canonical definitions and represent 153 art subjects;
`kondycha_active.svg` is a legacy badge with no current definition match.
These are now queued in MISSING with exact filenames and evidence in
`dev/icons/class-placeholder-audit.json`. Reproduce the audit with
`node dev/icons/audit-class-placeholders.mjs`.

Use **Artwork → Generated placeholders** to see them directly. Detection matches
the exact initials-generator signature; it does not treat all SVG text or
native vector art as placeholders. Cards show a placeholder badge, and
**Placeholder / initials** is also available as a flag reason. The audit queues
referenced placeholders automatically; manual style notes can add art direction.
Existing history and other queue sections are preserved when updating the audit.
Seven unit/API checks, including CRLF preservation, and the actual browser
filter/save/reload/clear and narrow-layout checks cover this extension.
