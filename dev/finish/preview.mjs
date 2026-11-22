/**
 * Finish engine · preview — an offline page for judging real exports (PLAN_m9_style.md §7.4).
 *
 * Every icon result at 64/44/32/24/16 CSS px, at 1× and at 2× pixel counts (what a DPR-2 screen
 * draws), on --noe-surface and --noe-panel, in colour and in grayscale; banners in their slot
 * proportions with the fade mask; the UI signs. Numbers shown are measurements of the export,
 * not proof of legibility — that is the GM's call on this page and on the sheet.
 */
import fs from "node:fs";
import path from "node:path";
import { abs, recipeFor, sha256File, sha256 } from "./lib/profile.mjs";

const SIZES = [64, 44, 32, 24, 16];
const esc = s => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export function buildPreview({ profile, manifest, jobs, results }) {
  const dir = abs("dev/finish/preview");
  fs.mkdirSync(dir, { recursive: true });
  const theme = profile.theme;
  const byId = new Map(manifest.entries.map(e => [e.id, e]));
  const review = { schema: "noe-finish-review/v1", profile: profile.id,
    profileSha256: sha256File(abs("dev/icons/finish/style-profile.json")), status: "pending",
    entries: results.map((result, i) => ({ id: jobs[i].id, source: jobs[i].source, output: jobs[i].output,
      sourceSha256: result.sourceSha256, outputPixelSha256: result.pixelSha256,
      recipeSha256: sha256(JSON.stringify(jobs[i].recipe)), error: result.error })) };
  review.status = results.length && results.every((result, i) => {
    const approval = byId.get(jobs[i].id)?.review;
    return approval?.status === "approved" && approval.profileSha256 === review.profileSha256
      && approval.sourceSha256 === result.sourceSha256 && approval.recipeSha256 === review.entries[i].recipeSha256
      && approval.outputPixelSha256 === result.pixelSha256;
  }) ? "approved" : "pending";
  fs.writeFileSync(path.join(dir, "review.json"), JSON.stringify(review, null, 2) + "\n");

  const strip = (src, scale, gray) => SIZES.map(s => `<img src="${src}" width="${s * scale}" height="${s * scale}" alt="" style="${gray ? "filter:grayscale(1)" : ""}">`).join("");
  const cards = results.map((result, i) => {
    const job = jobs[i];
    const entry = byId.get(job.id);
    if (result.error) return `<article class="card bad"><h3>${esc(job.id)}</h3><p>${esc(result.error)}</p></article>`;
    const src = `data:image/png;base64,${result.png}`;
    const recipe = recipeFor(profile, entry.family);
    const c = result.checks;
    const m = c.margins;
    const facts = [
      `${entry.family} · ${recipe.role}`,
      `${result.size[0]} px`,
      recipe.role === "character" ? `kontrast ${c.contrast}:1` : `glif ${recipe.glyph}`,
      `marginesy mastera ${m.left}/${m.top}/${m.right}/${m.bottom}`,
      `pokrycie ${(c.coverage * 100).toFixed(1)}%`
    ];
    return `<article class="card" data-family="${esc(entry.family)}" data-status="${esc(entry.review.status)}" data-search="${esc(`${job.id} ${entry.source}`)}">
  <header><h3>${esc(job.id)}</h3><span class="status ${esc(entry.review.status)}">${esc(entry.review.status)}</span></header>
  <p class="facts">${facts.map(esc).join(" · ")}</p>
  <div class="rows">
    <div class="row surface"><span>surface 1×</span>${strip(src, 1, false)}</div>
    <div class="row panel"><span>panel 1×</span>${strip(src, 1, false)}</div>
    <div class="row surface"><span>szarość 1×</span>${strip(src, 1, true)}</div>
    <div class="row panel"><span>panel 2×</span>${strip(src, 2, false)}</div>
  </div>
  <p class="consumers">${esc(entry.source)} → ${esc(entry.outputs[0].path)}<br>${entry.consumers.map(k => esc(k.type === "pack" ? `${k.pack} (${k.via}, ${k.ids?.length ?? 0})` : `${k.file}`)).join(" · ")}</p>
</article>`;
  }).join("\n");

  const banners = manifest.entries.filter(e => e.kind === "banner").map(e => {
    const b = e.banner;
    const file = `../../../${e.outputs[0].path}`;
    const exists = fs.existsSync(abs(e.outputs[0].path));
    return `<article class="banner">
  <header><h3>${esc(e.id)}</h3><span>${esc(b.sheet)} · ${esc(b.slot)}</span></header>
  ${exists ? `<div class="slot" style="--w:${b.cssWidth}px;--h:${b.cssHeight}px;background-image:url('${file}');background-position:${esc(b.focus)}"><strong>ŻOŁNIERZ W OPORZĄDZENIU</strong><em>Twardziel 5 · Żołnierz</em></div>
  <div class="slot narrow" style="--w:${Math.min(b.cssWidth, 560)}px;--h:${b.cssHeight}px;background-image:url('${file}');background-position:${esc(b.focus)}"><strong>ŁOWCA MUTANTÓW Z BARDZO DŁUGIM IMIENIEM</strong><em>Zwiadowca 12</em></div>` : "<p>Brak eksportu.</p>"}
  <p class="facts">master ${esc(e.source)} · eksport ${e.size ? e.size.join(" × ") : "—"} px · ${e.bytes ? `${Math.round(e.bytes / 1024)} KiB` : "—"} · jakość ${b.quality} · slot ${b.cssWidth} × ${b.cssHeight} CSS px · maska ${b.maskSolid}% → 100%</p>
</article>`;
  }).join("\n");

  const signList = manifest.entries.filter(e => e.kind === "sign").map(e => {
    const file = `../../../${e.outputs[0].path}`;
    return `<figure><div class="signs">${[24, 16, 12, 10].map(s => `<img src="${file}" width="${s}" height="${s}" alt="">`).join("")}</div><figcaption>${esc(e.id)}</figcaption></figure>`;
  }).join("\n");

  const html = `<!doctype html>
<html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NOE · podgląd wykończeń · ${esc(profile.id)}</title>
<style>
:root{color-scheme:dark}
body{margin:0;background:${theme.surface};color:${theme.foreground};font:14px/1.5 system-ui,sans-serif}
main{max-width:1500px;margin:auto;padding:28px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:36px 0 12px;border-bottom:1px solid ${theme.divider};padding-bottom:6px}
h3{font:700 13px/1.3 ui-monospace,monospace;margin:0}
p{color:${theme.muted};max-width:100ch}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,430px),1fr));gap:16px}
.card,.banner{border:1px solid ${theme.divider};border-radius:4px;padding:12px;background:${theme.surface}}
.card header,.banner header{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.status{font:11px ui-monospace,monospace;text-transform:uppercase;letter-spacing:1px;color:${theme.muted}}
.facts,.consumers{font:11px/1.5 ui-monospace,monospace;margin:6px 0}
.rows{display:grid;gap:1px;background:${theme.divider};border:1px solid ${theme.divider}}
.row{display:flex;align-items:center;flex-wrap:wrap;gap:14px;padding:8px 10px}
.row span{width:76px;font:10px ui-monospace,monospace;text-transform:uppercase;letter-spacing:1px;color:${theme.muted};flex:none}
.surface{background:${theme.surface}}.panel{background:${theme.panel}}
.bad{border-color:${profile.unavailability.red}}
.banner{margin-bottom:16px}
.slot{width:var(--w);max-width:100%;height:var(--h);background-size:cover;background-repeat:no-repeat;-webkit-mask-image:linear-gradient(to bottom,#000 0,#000 36%,transparent 100%);mask-image:linear-gradient(to bottom,#000 0,#000 36%,transparent 100%);margin:10px 0;padding:14px 18px;box-sizing:border-box}
.slot strong{display:block;font:700 24px/1.1 "Roboto Condensed","Arial Narrow",sans-serif;text-transform:uppercase}
.slot em{font:400 13px "Roboto Condensed","Arial Narrow",sans-serif;font-style:normal;color:${theme.muted}}
.signrow{display:flex;gap:28px;flex-wrap:wrap}
figure{margin:0}.signs{display:flex;gap:10px;align-items:center;padding:10px;background:${theme.panel};border:1px solid ${theme.divider}}
figcaption{font:11px ui-monospace,monospace;color:${theme.muted};margin-top:4px}
.tools{display:flex;gap:16px;flex-wrap:wrap;position:sticky;top:0;padding:12px;background:${theme.surface};z-index:1;border:1px solid ${theme.divider}}
.tools label{display:grid;gap:4px}.tools select,.tools input{font:inherit;padding:7px;background:${theme.panel};color:${theme.foreground};border:1px solid ${theme.divider};border-radius:3px}.card[hidden]{display:none}
</style>
<main>
<nav class="asset-tabs" aria-label="Asset tools"></nav>
<h1>NOE · podgląd wykończeń</h1>
<p>Profil <code>${esc(profile.id)}</code>, zatwierdzony ${esc(profile.approvedOn)}. Strona offline z <code>npm run build:finish -- --preview</code>.
Ikony to rzeczywiste piksele eksportu (128 / 256 px), pomniejszane przez przeglądarkę do 64 / 44 / 32 / 24 / 16 CSS px — tak, jak zrobi to Foundry.
Wiersz „2×” pokazuje liczbę pikseli ekranu o DPR 2. Koszty, liczniki i stany nie są częścią plików. Metryki i próbki kolorów nie dowodzą czytelności.</p>
<h2>Ikony — ${results.length}</h2>
<div class="tools"><label>Rodzina<select id="family"><option value="">Wszystkie</option>${[...new Set(jobs.map(j => byId.get(j.id).family))].sort().map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join("")}</select></label><label>Szukaj<input id="search" type="search" placeholder="ID lub ścieżka mastera"></label><p id="count" aria-live="polite">${results.length} tematów</p></div>
<div class="grid">
${cards}
</div>
<h2>Banery kart (D14)</h2>
<p>Kadr w proporcjach slotu z maską zaniku (pełna do 36% wysokości). Drugi kadr: wąskie okno i długie imię — bezpieczny obszar tekstu.</p>
${banners || "<p>Brak wpisów.</p>"}
<h2>Znaki UI</h2>
<div class="signrow">
${signList}
</div>
</main><script>
const family=document.querySelector('#family'),search=document.querySelector('#search'),cards=[...document.querySelectorAll('.card')];
function filter(){const query=search.value.toLocaleLowerCase('pl');let shown=0;for(const card of cards){card.hidden=Boolean((family.value&&card.dataset.family!==family.value)||(query&&!card.dataset.search.toLocaleLowerCase('pl').includes(query)));if(!card.hidden)shown++;}document.querySelector('#count').textContent=shown+' / '+cards.length+' tematów';const params=new URLSearchParams();if(family.value)params.set('family',family.value);if(query)params.set('q',search.value);history.replaceState(null,'',location.pathname+(params.size?'?'+params:''));}
const params=new URLSearchParams(location.search);family.value=params.get('family')??'';search.value=params.get('q')??'';family.addEventListener('change',filter);search.addEventListener('input',filter);filter();
if(location.pathname==='/m9-finishes.html')import('/navigation.mjs');
</script></html>
`;
  const file = path.join(dir, "index.html");
  fs.writeFileSync(file, html);
  return file;
}
