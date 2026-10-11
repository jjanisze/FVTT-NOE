/** Read local canonical catalog and saved review decisions; no Foundry or code writes. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ORIGIN_ABILITIES } from "../../../../../scripts/config/pochodzenia-data.mjs";
import { SZTUCZKI } from "../../../../../scripts/config/sztuczki-data.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../../../..");
const review = path.resolve(here, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(review, "manifest.json"), "utf8"));
const feedback = JSON.parse(fs.readFileSync(path.join(review, "feedback.json"), "utf8"));
const active = manifest.items.filter(item => item.status !== "resolved").map(item => {
  const decision = feedback.items[item.id] ?? {};
  const selected = item.candidates.find(candidate => candidate.id === decision.candidateId);
  return { id: item.id, name: item.name, tier: item.tier, decision: decision.decision,
    candidateId: decision.candidateId, selectedSource: selected?.src,
    target: item.target, notes: decision.notes ?? "", context: item.context, request: item.request };
});
const represented = new Set(manifest.items.map(item => item.name.toLocaleLowerCase("pl")));
const catalog = [
  ...Object.entries(ORIGIN_ABILITIES).map(([key, item]) => ({ kind: "origin", key, ...item })),
  ...Object.entries(SZTUCZKI).map(([key, item]) => ({ kind: "feat", key, ...item }))
].map(item => ({kind:item.kind, key:item.key, label:item.label, text:item.text,
  origin:item.origin, represented:represented.has(item.label.toLocaleLowerCase("pl")),
  existingIcon:fs.existsSync(path.join(root,"icons","abilities",`${item.key}.svg`))}));
fs.writeFileSync(path.join(here,"decisions.json"), JSON.stringify({date:"2026-10-12",active},null,2)+"\n");
console.log(JSON.stringify({counts:active.reduce((all,item)=>(all[item.decision]=(all[item.decision]??0)+1,all),{}),
  revisions:active.filter(item=>item.decision==="revise").map(({id,name,selectedSource,notes})=>({id,name,selectedSource,notes})),
  newGaps:catalog.filter(item=>!item.represented&&!item.existingIcon)},null,2));
