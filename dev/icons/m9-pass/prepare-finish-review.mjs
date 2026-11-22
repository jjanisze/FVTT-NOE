/** Freeze the exact source/profile/pixel set shown by the completed full-library preview. */
import fs from "node:fs";
import { abs, loadManifest, loadProfile, sha256File } from "../../finish/lib/profile.mjs";

const profile = loadProfile(), manifest = loadManifest();
const rendered = JSON.parse(fs.readFileSync(abs("dev/finish/preview/review.json"), "utf8"));
if (rendered.profile !== profile.id || rendered.profileSha256 !== sha256File(abs("dev/icons/finish/style-profile.json"))) throw new Error("Preview profile is stale");
const icons = manifest.entries.filter(e => e.kind === "icon");
const byId = new Map(icons.map(e => [e.id, e]));
if (rendered.entries.length !== icons.length || new Set(rendered.entries.map(e => e.id)).size !== icons.length) throw new Error("Preview does not cover the complete assigned library");
const consumers = new Map();
for (const entry of icons) for (const c of entry.consumers.filter(c => c.type === "pack")) for (const id of c.ids ?? []) {
  const key = `${c.pack}:${c.via}:${id}`;
  if (consumers.has(key) && consumers.get(key) !== entry.id) throw new Error(`Ambiguous consumer: ${key}`);
  consumers.set(key, entry.id);
}
for (const entry of rendered.entries) {
  const expected = byId.get(entry.id);
  if (!expected || entry.error || entry.source !== expected.source || entry.sourceSha256 !== expected.sourceSha256 || entry.sourceSha256 !== sha256File(abs(entry.source))) throw new Error(`Stale or failed preview: ${entry.id}`);
  if (!/^[a-f0-9]{64}$/.test(entry.outputPixelSha256) || !/^[a-f0-9]{64}$/.test(entry.recipeSha256)) throw new Error(`Missing pixel or recipe hash: ${entry.id}`);
}
const byFamily = {};
for (const e of icons) byFamily[e.family] = (byFamily[e.family] ?? 0) + 1;
const approved = rendered.status === "approved";
const receipt = { ...rendered, date: "2026-11-17", status: approved ? "approved" : "pending-finish-review", subjectCount: icons.length,
  byFamily, packConsumers: consumers.size, familyApproval: "dev/icons/m9-pass/family-approval.json",
  note: approved ? "Exact approved export pixels; authority and requested corrections are recorded in finish-approval.json."
    : "Family treatments are approved. This freezes the exact proposed export pixels for the next full-library selection; it does not approve or install those exports." };
fs.writeFileSync(abs("dev/icons/m9-pass/finish-review.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify({ profile: profile.id, subjects: icons.length, families: Object.keys(byFamily).length, packConsumers: consumers.size, status: receipt.status }));
