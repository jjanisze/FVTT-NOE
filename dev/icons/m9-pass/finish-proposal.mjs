/** Prepare a concrete family proposal for the GM; the active style profile stays untouched. */
import fs from "node:fs";
import { abs, loadProfile } from "../../finish/lib/profile.mjs";

const active = loadProfile();
const approvalPath = abs("dev/icons/m9-pass/family-approval.json");
const approved = fs.existsSync(approvalPath) && JSON.parse(fs.readFileSync(approvalPath, "utf8")).profile === active.id;
const finishApproval = abs("dev/icons/m9-pass/finish-approval.json");
if (approved && fs.existsSync(finishApproval)) {
  const receipt = JSON.parse(fs.readFileSync(finishApproval, "utf8"));
  const closeoutFile = abs("dev/icons/review/candidates/batch-128/installed.json");
  const finalCorrections = fs.existsSync(closeoutFile) ? JSON.parse(fs.readFileSync(closeoutFile, "utf8")).subjects.length : 0;
  const rollout = abs("dev/icons/m9-pass/rollout-verification.json");
  const integrated = fs.existsSync(rollout) && JSON.parse(fs.readFileSync(rollout, "utf8")).status === "complete";
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M9 · approved finishes</title>
<style>:root{color-scheme:dark;font:15px/1.6 system-ui,sans-serif;background:${active.theme.surface};color:${active.theme.foreground}}main{max-width:950px;margin:auto;padding:24px}a{color:inherit}li{margin:12px 0}code{font-size:13px}</style>
<main><nav class="asset-tabs"></nav><h1>M9 finishes ${integrated ? "exported and integrated" : "approved — export and integration in progress"}</h1>
<p>The complete ${receipt.subjectCount}-subject set is approved under <code>${active.id}</code>. Your requested corrections cover Neodrugs, Tornado, both Narkotyki glyphs and Cygaro. The OpenAI image edit succeeded; the crop fallback was not needed.</p>
<ol><li>${14 + finalCorrections} approved white-master corrections installed with archived originals.</li><li>All 22 families assigned, with zero gaps.</li><li>${receipt.correctedVariants.length + finalCorrections} corrected finish variants; the other ${receipt.unchangedVariants - finalCorrections} match the original reviewed pixels exactly.</li><li>${integrated ? "Approved exports checked, compendia rebuilt, runtime routing verified in the sandbox." : "The approved files are being exported and checked before pack integration."}</li></ol>
<p><a href="m9-finishes.html">Browse the finished library</a> · <a href="m9-audit.html">Assignment audit</a> · <a href="browser.html">Icon browser</a></p>
<p>${finalCorrections ? "The poison dot and firearm cleanup requests are closed with the explicitly approved deterministic normalizer. No confirmed M9 artwork requests remain. Poligon style/document rollout is the first coding task in HANDOFF_m9_graphics_to_code.md." : "Two minor firearm cleanup requests remain in the artwork queue."} Existing world-item image paths require a separate migration.</p></main><script type="module" src="/navigation.mjs"></script></html>\n`;
  fs.writeFileSync(abs("dev/icons/review/m9-process.html"), html);
  console.log(JSON.stringify({ status: integrated ? "complete" : "finish-approved", profile: active.id, subjects: receipt.subjectCount }));
  process.exit(0);
}
const proposal = structuredClone(active);
proposal.id = "noe-m9-r07-v2";
proposal.status = "proposed";
proposal.basedOn = active.id;
delete proposal.approvedOn;
proposal.approval = "Pending GM choice of missing-family treatments; existing v1 colours and recipes are reused.";
proposal.contentFamilies.creature = { role: "character", source: "generic" };
proposal.contentFamilies.devices = { role: "equipment", accent: active.contentFamilies.tools.accent };
proposal.contentFamilies.documents = { role: "equipment", accent: active.contentFamilies.salvage.accent };
proposal.implementationStatus = "proposal-only-not-active";
if (!approved) fs.writeFileSync(abs("dev/icons/m9-pass/style-profile.proposed.json"), JSON.stringify(proposal, null, 2) + "\n");

const groups = [
  { name: "Creature and companion abilities", count: 189, family: "creature", role: "character", glyph: active.sources.generic.foreground, ground: active.sources.generic.ground,
    source: "icons/abilities/agresja.svg", why: "White glyph on the existing neutral gray ground. Creature abilities gain a consistent identity without borrowing a player class colour." },
  { name: "Abilities granted by several classes", count: 5, family: "shared", role: "character", glyph: active.sources.generic.foreground, ground: active.sources.generic.ground,
    source: "icons/abilities/drugi-atak.svg", why: "Use the existing shared family with a neutral ground, so the same canonical feature does not arbitrarily claim one granting class." },
  { name: "General devices", count: "part of 35 utility-gear glyphs", family: "devices", role: "equipment", glyph: active.contentFamilies.tools.accent,
    source: "icons/items/loot/latarka.svg", why: "Bare glyph using the current tools tint. Explicit medical, chemical and explosive items use those existing families instead." },
  { name: "Crafting documents", count: 3, family: "documents", role: "equipment", glyph: active.contentFamilies.salvage.accent,
    source: "icons/items/loot/schemat_instrukcja.svg", why: "Bare glyph using the current salvage tint. A blueprint remains a document regardless of which item it describes." }
];
const esc = s => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const cards = groups.map(g => `<article><h2>${esc(g.name)}</h2><p>${esc(g.count)} · <code>${g.family}</code></p>
<div class="samples">${[64, 44, 32, 16].map(size => `<figure><span class="tile" style="width:${size}px;height:${size}px;border-radius:${size * 3 / 44}px;background:${g.ground ?? "transparent"}"><span class="mask" style="background:${g.glyph};mask-image:url('/${g.source}');-webkit-mask-image:url('/${g.source}')"></span></span><figcaption>${size} px</figcaption></figure>`).join("")}</div>
<p>${esc(g.why)}</p></article>`).join("\n");
const theme = active.theme;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M9 · next graphics decision</title>
<style>:root{color-scheme:dark;font:15px/1.5 system-ui,sans-serif;background:${theme.surface};color:${theme.foreground}}body{margin:0}main{max-width:1050px;margin:auto;padding:24px}h1{font-size:28px;margin:24px 0 12px}h2{font-size:18px}p,li{color:${theme.muted}}a{color:${theme.foreground}}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:16px}article,.callout{padding:16px;border:1px solid ${theme.divider};border-radius:4px}.callout{background:${theme.panel};margin:16px 0}.samples{display:flex;align-items:end;gap:24px;padding:16px;background:${theme.panel}}figure{margin:0;display:grid;gap:6px;justify-items:center}figcaption{font-size:11px;color:${theme.muted}}.tile,.mask{display:block}.mask{width:100%;height:100%;mask-size:contain;mask-position:center;mask-repeat:no-repeat;-webkit-mask-size:contain;-webkit-mask-position:center;-webkit-mask-repeat:no-repeat}code{font-size:13px}</style></head>
<body><main><nav class="asset-tabs"></nav><h1>${approved ? "Next: review the finished library" : "Next: choose the missing-family treatments"}</h1>
<div class="callout"><strong>Step 1 completed: nine approved replacements installed.</strong><p>The exact selected SVG/WEBP pairs are now the source masters. Their legacy PNGs are archived, the manifest is rebuilt, and the current finish check passes.</p></div>
${approved ? `<div class="callout"><strong>Step 2 completed: family choices applied under ${active.id}.</strong><p>All assignment gaps are resolved. <a href="m9-finishes.html">Open the actual full-library finish preview</a>, filter by family, and judge the 44 px and smaller views.</p></div>` : ""}
<p>These four samples reuse the existing palette and glyphs. ${approved ? "The chosen treatments are now active in the assignment rules." : "The proposal adds semantic families; it introduces no new colours."} This page shows CSS recipe samples; the full-library gallery shows the actual rendered pixels.</p><div class="cards">${cards}</div>
<h2>Other mappings I will handle from the item data</h2><ul><li>Defibrillator, tourniquet and disinfectant → medical; acid, poison and sedative → chemicals; detonator and fuses → explosives.</li><li>Weapon-addon actions, work markers and other operations → the existing utility treatment.</li><li>The mannequin illustration and scene target frame remain outside content-icon recipes.</li></ul>
<div class="callout"><strong>Your next choice</strong><p>${approved ? 'Review the <a href="m9-finishes.html">finished library</a>. You can approve the complete finish set or name specific subject IDs or families to adjust. Your family choice is already recorded.' : "Accept these treatments as a set, keep the unassigned icons white, or review one group at a time. Your nine artwork approvals are already processed; this is a separate choice about the source and role shown by a finish."}</p></div>
<h2>What follows</h2><ol>${approved ? "<li>Review the rendered 44 px and smaller views in the full-library gallery.</li><li>Approve the finish set or identify specific changes.</li>" : "<li>I apply the chosen rules and rebuild the semantic manifest.</li><li>I render the full library for a finish review at 44 px and smaller sizes.</li>"}<li>After the finish selection, I export the approved assets, rebuild and validate the relevant packs, then check them in the sandbox.</li></ol>
<p>The seven older glyphs awaiting cleanup have working source files and can use the selected recipes. They do not prevent running the finish pipeline.</p>
<p><a href="m9-audit.html">Detailed assignment audit</a> · <a href="browser.html">Icon library</a></p></main><script type="module" src="/navigation.mjs"></script></body></html>\n`;
fs.writeFileSync(abs("dev/icons/review/m9-process.html"), html);
console.log(JSON.stringify({ status: approved ? "families-applied-awaiting-finish-review" : "proposed", activeProfile: active.id, proposal: "dev/icons/m9-pass/style-profile.proposed.json", review: "dev/icons/review/m9-process.html" }));
