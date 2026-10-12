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
