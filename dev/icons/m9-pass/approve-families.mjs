/** Record the GM's family choice and activate the versioned profile; does not approve pixel exports. */
import fs from "node:fs";
import path from "node:path";
import { abs, sha256File } from "../../finish/lib/profile.mjs";

const activePath = abs("dev/icons/finish/style-profile.json");
const proposedPath = abs("dev/icons/m9-pass/style-profile.proposed.json");
const receiptPath = abs("dev/icons/m9-pass/family-approval.json");
const current = JSON.parse(fs.readFileSync(activePath, "utf8"));
const next = JSON.parse(fs.readFileSync(proposedPath, "utf8"));
if (current.id === next.id && fs.existsSync(receiptPath)) {
  console.log(`Family profile already active: ${current.id}`);
} else {
  if (next.status !== "proposed" || next.basedOn !== current.id) throw new Error("Proposal no longer matches the active profile");
  for (const key of ["geometry", "theme", "sources", "treatments", "actionCosts", "unavailability", "stateComposition"]) {
    if (JSON.stringify(current[key]) !== JSON.stringify(next[key])) throw new Error(`Unexpected visual change outside the family proposal: ${key}`);
  }
  for (const [key, family] of Object.entries(current.contentFamilies)) {
    if (JSON.stringify(next.contentFamilies[key]) !== JSON.stringify(family)) throw new Error(`Existing family changed: ${key}`);
  }
  const archive = abs(`dev/icons/finish/profiles/${current.id}.json`);
  fs.mkdirSync(path.dirname(archive), { recursive: true });
  if (fs.existsSync(archive) && sha256File(archive) !== sha256File(activePath)) throw new Error("Version archive already contains different source bytes");
  if (!fs.existsSync(archive)) fs.copyFileSync(activePath, archive);
  const beforeSha256 = sha256File(activePath), proposalSha256 = sha256File(proposedPath);
  next.status = "design-approved";
  next.approvedOn = "2026-11-17";
  next.approval = "GM selected 'Use the proposed family treatments (Recommended)' in the M9 graphics workflow.";
  next.implementationStatus = "family-rules-approved-full-library-pixel-review-next";
  next.assetInstallationApprovedByThisProfile = false;
  fs.writeFileSync(activePath, JSON.stringify(next, null, 2) + "\n");
  fs.writeFileSync(abs(`dev/icons/finish/profiles/${next.id}.json`), fs.readFileSync(activePath));
  fs.writeFileSync(receiptPath, JSON.stringify({ date: next.approvedOn, previousProfile: current.id, profile: next.id,
    decision: "Use the proposed family treatments (Recommended)", previousProfileSha256: beforeSha256,
    proposedProfileSha256: proposalSha256, approvedProfileSha256: sha256File(activePath),
    scope: "Missing-family semantics and existing-colour treatments only. Full-library output pixels remain for review.",
    families: { creature: "generic ground", shared: "existing shared generic ground", devices: "existing tools tint", documents: "existing salvage tint" }
  }, null, 2) + "\n");
  console.log(`Activated approved family profile: ${current.id} -> ${next.id}`);
}
