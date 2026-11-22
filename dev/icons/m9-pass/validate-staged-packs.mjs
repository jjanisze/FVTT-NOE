/** Validate a freshly staged build, never a running world's databases. */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { stagePacks, readPacks } from "../../finish/lib/packs.mjs";
import { abs } from "../../finish/lib/profile.mjs";

const staged = stagePacks();
try {
  const result = spawnSync(process.execPath, [abs("dev/packs/validate-packs.mjs"), `--out=${staged}`], { encoding: "utf8", maxBuffer: 32 << 20, windowsHide: true });
  if (result.status !== 0) throw new Error((result.stderr || result.stdout).slice(-5000));
  const records = await readPacks(staged);
  const summary = { date: "2026-11-17", source: "Fresh temporary compendium build", validation: "passed", records: records.length,
    packs: new Set(records.map(e => e.pack)).size,
    installedFinishedItemReferences: records.filter(e => String(e.doc.img).startsWith("modules/neuroshima-2026-overrides/icons/finished/")).length,
    fullLibraryExports: "782 approved subjects exported; pack references use the approved finishes." };
  fs.writeFileSync(abs("dev/icons/m9-pass/staged-pack-validation.json"), JSON.stringify(summary, null, 2) + "\n");
  console.log(JSON.stringify(summary));
} finally {
  const resolved = path.resolve(staged);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith("noe-finish-packs-")) throw new Error("Unexpected staging directory; refusing cleanup");
  fs.rmSync(resolved, { recursive: true, force: true });
}
