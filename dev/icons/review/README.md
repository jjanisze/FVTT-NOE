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
