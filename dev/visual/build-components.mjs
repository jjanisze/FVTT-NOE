/**
 * M9 · makieta tokenów i komponentów K1–K18 (PLAN_m9_style.md E1b, O2).
 *
 *   node dev/visual/build-components.mjs  →  dev/visual/m9-components/index.html
 *
 * Statyczna strona offline, ale nie rysunek: ładuje **prawdziwe** arkusze `styles/noe/*.css`
 * i składa znaczniki **prawdziwymi** pomocnikami `scripts/ui/noe.mjs`. Co MG zaakceptuje tutaj,
 * to dostanie w Foundry. Liczby w próbkach stanów są niezależnymi przykładami; makieta karty
 * na dole ma jeden spójny budżet tury. Nie udaje pomiaru z działającego Foundry.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { badge, button, chip, costSign, counter, emptyState, esc, glyph, meter, readout, row } from "../../scripts/ui/noe.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "dev/visual/m9-components");
const profile = JSON.parse(fs.readFileSync(path.join(ROOT, "dev/icons/finish/style-profile.json"), "utf8"));
const tokensCss = fs.readFileSync(path.join(ROOT, "styles/noe/tokens.css"), "utf8");
const token = name => tokensCss.match(new RegExp(`--noe-${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];

/* ---- colour maths for the O2 table: CIEDE2000 and WCAG contrast ---- */
function lab(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const X = r * 0.4124 + g * 0.3576 + b * 0.1805, Y = r * 0.2126 + g * 0.7152 + b * 0.0722, Z = r * 0.0193 + g * 0.1192 + b * 0.9505;
  const f = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(X / 0.95047), f(Y), f(Z / 1.08883)];
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz), Y };
}
function de00(h1, h2) {
  const A = lab(h1), B = lab(h2), rad = Math.PI / 180;
  const C1 = Math.hypot(A.a, A.b), C2 = Math.hypot(B.a, B.b), Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1 = (1 + G) * A.a, a2 = (1 + G) * B.a, C1p = Math.hypot(a1, A.b), C2p = Math.hypot(a2, B.b);
  const hue = (x, y) => ((Math.atan2(y, x) / rad) + 360) % 360;
  const hp1 = hue(a1, A.b), hp2 = hue(a2, B.b);
  let dh = hp2 - hp1; if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
  const dL = B.L - A.L, dC = C2p - C1p, dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh / 2) * rad);
  const Lm = (A.L + B.L) / 2, Cmp = (C1p + C2p) / 2, hm = Math.abs(hp1 - hp2) <= 180 ? (hp1 + hp2) / 2 : (hp1 + hp2 + 360) / 2;
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
  const Sl = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2), Sc = 1 + 0.045 * Cmp, Sh = 1 + 0.015 * Cmp * T;
  const Rt = -2 * Math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hm - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}
const contrast = (a, b) => { const [hi, lo] = [lab(a).Y, lab(b).Y].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

/* ---- fragments ---- */
const icon = id => `../../../icons/finished/${id}.webp`;
const swatch = (name, value, note = "") => `<div class="sw"><span class="sw__chip" style="background:var(--noe-${name})"></span><code>--noe-${name}</code><span class="sw__val">${esc(value ?? "")}</span>${note ? `<span class="sw__note">${esc(note)}</span>` : ""}</div>`;
const SOURCE_NAMES = { brutal: "Brutal", cwaniak: "Cwaniak", spec: "Spec", twardziel: "Twardziel", zlodziej: "Złodziej", zwiadowca: "Zwiadowca", generic: "Generic", origin: "Pochodzenia" };
const srcToken = id => (id === "origin" ? "pochodzenia" : id);
const EQ_NAMES = { weapon: "Broń", ammo: "Amunicja", armor: "Pancerze", tools: "Narzędzia", medical: "Medycyna", chemicals: "Chemia", explosives: "Wybuchowe / paliwo", survival: "Żywność / woda", salvage: "Fanty / wartościowe" };

const sources = Object.entries(profile.sources).map(([id, s]) => `<div class="src" data-noe-source="${srcToken(id)}">
  <span class="src__ground" style="background:var(--noe-src-${srcToken(id)}-ground);color:var(--noe-src-${srcToken(id)}-glyph)">Aa</span>
  <span class="src__name">${SOURCE_NAMES[id]}</span>
  <span class="src__bar"></span>
  <code>${s.ground} · ${s.foreground} · ${s.accent}</code>
</div>`).join("\n");

const equipment = Object.entries(profile.contentFamilies).filter(([, f]) => f.role === "equipment").map(([id, f]) => swatch(`eq-${id}`, f.accent, EQ_NAMES[id])).join("\n");

/* O2: semantic colours against the action costs, the slash and the surfaces. */
const START = { ok: "#7fe08f", warn: "#f3d98b", danger: "#ff7b6e", info: "#b9c7d6" };
const SEM_LABEL = { ok: "ok — sukces, mieści się, gotowe", warn: "warn — ostrzeżenie (budżet M8)", danger: "danger — porażka, zakaz, zagrożenie", info: "info — informacja, wartość zmieniona" };
const REF = { A: profile.actionCosts.A.color, B: profile.actionCosts.B.color, R: profile.actionCosts.R.color, I: profile.actionCosts.I.color, skos: profile.unavailability.red, "tekst muted": profile.theme.muted };
const semRow = (name, hex, kind) => {
  const d = Object.fromEntries(Object.entries(REF).map(([k, v]) => [k, de00(hex, v)]));
  const min = Math.min(...Object.values(d));
  return `<tr><td><span class="sw__chip" style="background:${hex}"></span> <code>${hex}</code></td><td>${kind}</td>${Object.values(d).map(v => `<td class="num${v < 10 ? " low" : ""}">${v.toFixed(1)}</td>`).join("")}<td class="num${min < 10 ? " low" : ""}">${min.toFixed(1)}</td><td class="num">${contrast(hex, profile.theme.surface).toFixed(1)}</td><td class="num">${contrast(hex, profile.theme.panel).toFixed(1)}</td><td><span style="color:${hex}">${name === "ok" ? "Sukces · mieści się" : name === "warn" ? "Ostrzeżenie · możesz użyć" : name === "danger" ? "Porażka · zakaz" : "Zmienione przez efekt"}</span></td></tr>`;
};
const semTable = Object.keys(START).map(name => `<tr class="grp"><th colspan="${Object.keys(REF).length + 6}">${SEM_LABEL[name]}</th></tr>
${semRow(name, START[name], "punkt wyjścia (M8)")}
${semRow(name, token(name), "<strong>propozycja</strong>")}`).join("\n");

/* K6 — the mandatory cases of §3. Independent examples, not one character's turn. */
const A = costSign("a"), B = costSign("b"), R = costSign("r"), I = costSign("i");
const cases = [
  ["Gotowe — akcja bonusowa z licznikiem", row({ img: icon("twardziel/kondycha"), name: "Kondycha", caption: "Twardziel · zdolność klasowa", costs: [B], count: counter(1, 1), state: badge("ok", "Gotowe", { icon: null }) })],
  ["Aramis: korzyści stałe + operacja Wytrącenie [B] — koszt przy operacji, nie przy rodzicu", row({ img: icon("feat/aramis"), name: "Aramis", caption: "Sztuczka · korzyści stałe + 1 operacja", state: `<span class="noe-badge">Stałe działają</span>` }) + row({ operation: true, name: "Wytrącenie", caption: "po trafieniu bronią białą", costs: [B], state: badge("ok", "Gotowe", { icon: null }) })],
  ["Wyzwalacz bez prostej litery akcji", row({ img: icon("brutal/wsciekly-cios"), name: "Wściekły cios", caption: "Brutal · zdolność klasowa", costs: [costSign("other", { text: "raz na turę · po trafieniu" })], count: counter("k6"), state: `<span class="noe-badge">Dolicz po trafieniu</span>` })],
  ["Kilka aktywności o różnych kosztach — znak przy każdej operacji", row({ img: icon("weapon/ak_47"), name: "AK (Kałach)", caption: "Broń · palna pośrednia", count: counter(24, 30), state: `<span class="noe-badge">Magazynek</span>` }) + row({ operation: true, name: "Strzał pojedynczy", costs: [A], state: badge("ok", "Gotowe", { icon: null }) }) + row({ operation: true, name: "Wymień magazynek", costs: [I], state: `<span class="noe-badge">Kolejne użycie: A</span>` })],
  ["Brak aktywności — korzyść stała; pasywności nie zgadujemy z braku kosztu", row({ img: icon("origin/gambling-we-krwi"), name: "Gambling we krwi", caption: "Pochodzenie · Nowy Jork", state: `<span class="noe-badge">Korzyść stała</span>` })],
  ["Nieznany stan — znak zapytania, bez skosu", row({ img: icon("utility/activity_reload"), name: "Interakcja z przedmiotem", caption: "Czynność · brak danych budżetu", costs: [I], count: counter("?", 1), state: badge("unknown", "Nieznany stan") })],
  ["0 użyć — skos + powód w wierszu", row({ img: icon("spec/inteligentna-obrona"), name: "Inteligentna obrona", caption: "Spec · zdolność klasowa", costs: [R], count: counter(0, 3), state: badge("ban", "Brak użyć · długi odpoczynek", { icon: "fa-solid fa-hourglass-end" }), unavailable: true })],
  ["Duża liczba użyć nie łamie wiersza", row({ img: icon("ammo/ammo_9_mm"), name: "9 mm", caption: "Amunicja · luzem", count: counter(1240, null, { unit: "szt." }), state: `<span class="noe-badge">W ekwipunku</span>` })],
  ["Aktywne i zarazem wyczerpane: WŁ. zostaje, skos dotyczy kolejnego użycia", row({ img: icon("feat/wrestler"), name: "Unik w zwarciu", caption: "Sztuczka · efekt do końca tury", costs: [A], count: counter(0, 1), state: `${badge("on")} ${badge("ban", "Kolejne użycie: brak", { icon: null })}`, unavailable: true })],
  ["Zakaz mimo niewydanej puli", row({ img: icon("medical/medpak"), name: "Medpak", caption: "Medycyna · zestaw", costs: [A], count: counter(2, 2), state: badge("ban", "Zakaz · jesteś w zwarciu"), unavailable: true })],
  ["Brak warunku", row({ img: icon("feat/gunfight"), name: "Gunfight", caption: "Sztuczka", costs: [B], state: badge("cond", "Warunek · potrzebna broń krótka w ręce"), unavailable: true })],
  ["Ostrzeżenie M8 mimo pozostałych użyć — ostrzega, nie blokuje, bez skosu", row({ img: icon("twardziel/zolnierz"), name: "Przycelowanie", caption: "Czynność · Akcja Bonusowa", costs: [costSign("b", { count: "0/1" })], count: counter(2, 3), state: badge("warn", "Ostrzeżenie · możesz użyć") })],
  ["Zaznaczony wiersz (wybór ≠ aktywny efekt)", row({ img: icon("armor/kamizelka-taktyczna"), name: "Kamizelka taktyczna", caption: "Pancerz lekki · założona", count: counter(1, null, { unit: "szt." }), state: `<span class="noe-badge">TT +2</span>`, selected: true })]
].map(([title, html]) => `<div class="case"><p class="case__t">${esc(title)}</p>${html}</div>`).join("\n");

const k = (id, name, replaces, body) => `<section class="k" id="${id.toLowerCase()}"><header><h3><span>${id}</span> ${esc(name)}</h3><p>Zastępuje: ${esc(replaces)}</p></header><div class="k__body">${body}</div></section>`;

const sheetRows = [
  row({ img: icon("twardziel/kondycha"), name: "Kondycha", caption: "Twardziel · zdolność klasowa", costs: [B], count: counter(1, 1), state: badge("ok", "Gotowe", { icon: null }) }),
  row({ img: icon("twardziel/zolnierz"), name: "Przycelowanie", caption: "Czynność · Akcja Bonusowa", costs: [B], count: "", state: badge("ok", "Gotowe", { icon: null }) }),
  row({ img: icon("spec/inteligentna-obrona"), name: "Stalowe jaja", caption: "Twardziel · reakcja na trafienie", costs: [R], count: counter(0, 1), state: badge("ban", "Brak użyć · krótki odpoczynek", { icon: "fa-solid fa-hourglass-end" }), unavailable: true }),
  row({ img: icon("feat/aramis"), name: "Aramis", caption: "Sztuczka · korzyści stałe + 1 operacja", state: `<span class="noe-badge">Stałe działają</span>` }),
  row({ operation: true, name: "Wytrącenie", caption: "po trafieniu bronią białą", costs: [B], state: badge("ok", "Gotowe", { icon: null }) })
].join("\n");

const html = `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NOE M9 · tokeny i komponenty K1–K18</title>
<!-- Piktogramy: przez serwer Foundry — Font Awesome rdzenia; z dysku — kopia z sieci. Bez obu znikają tylko piktogramy. -->
<link rel="stylesheet" href="../../../../../fonts/fontawesome/css/all.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" media="print" onload="if(location.protocol==='file:')this.media='all'">
<style>
/* Roboto i Roboto Condensed dostarcza dnd5e; w standardowym układzie Data/ ścieżka względna trafia w jego czcionki
   (z dysku i przez serwer Foundry). Bez nich strona używa krojów zastępczych — układ pozostaje ten sam. */
@font-face{font-family:Roboto;font-weight:400;src:local("Roboto"),url("../../../../../systems/dnd5e/fonts/roboto/Roboto-Regular.woff2") format("woff2")}
@font-face{font-family:Roboto;font-weight:700;src:local("Roboto Bold"),url("../../../../../systems/dnd5e/fonts/roboto/Roboto-Bold.woff2") format("woff2")}
@font-face{font-family:"Roboto Condensed";font-weight:400;src:local("Roboto Condensed"),url("../../../../../systems/dnd5e/fonts/roboto-condensed/RobotoCondensed-Regular.woff2") format("woff2")}
@font-face{font-family:"Roboto Condensed";font-weight:700;src:local("Roboto Condensed Bold"),url("../../../../../systems/dnd5e/fonts/roboto-condensed/RobotoCondensed-Bold.woff2") format("woff2")}
</style>
<link rel="stylesheet" href="../../../styles/noe/tokens.generated.css">
<link rel="stylesheet" href="../../../styles/noe/tokens.css">
<link rel="stylesheet" href="../../../styles/noe/components.css">
<style>
/* Tylko układ tej strony. Wygląd komponentów pochodzi z arkuszy powyżej.
   Uwaga: url() w zmiennej CSS przeglądarka rozwiązuje względem arkusza, który zmiennej UŻYWA —
   --noe-banner-image liczymy więc od styles/noe/ (components.css), nie od tej strony. */
html{font-size:16px}
body{margin:0;background:var(--noe-surface);color:var(--noe-text);font:var(--noe-fs-13)/1.5 var(--noe-font-ui)}
body.gray main{filter:grayscale(1)}
main{max-width:1280px;margin:auto;padding:28px 28px 80px}
h1{font:700 var(--noe-fs-24)/1.2 var(--noe-font-label);text-transform:uppercase;margin:0 0 6px}
h2{font:700 var(--noe-fs-20)/1.2 var(--noe-font-label);margin:44px 0 6px;padding-bottom:6px;border-bottom:1px solid var(--noe-line)}
h3{font:700 var(--noe-fs-14)/1.2 var(--noe-font-label);margin:0}
h3 span{font-family:var(--noe-font-num);color:var(--noe-text-muted);margin-right:6px}
p{max-width:96ch;color:var(--noe-text-muted);margin:6px 0}
p strong,li strong{color:var(--noe-text)}
code{font:var(--noe-fs-11) var(--noe-font-num);color:var(--noe-text-muted)}
.bar{position:sticky;top:0;z-index:5;display:flex;gap:12px;align-items:center;padding:8px 28px;background:var(--noe-panel);border-bottom:1px solid var(--noe-line)}
.bar nav{display:flex;gap:14px;flex-wrap:wrap;flex:1;font:var(--noe-fs-12) var(--noe-font-label)}
.bar a{color:var(--noe-text-muted);text-decoration:none}.bar a:hover{color:var(--noe-text)}
.decide{border:1px solid var(--noe-line);border-left:2px solid var(--noe-warn);background:var(--noe-panel);padding:12px 16px;margin:16px 0;border-radius:var(--noe-r-panel)}
.decide ol{margin:6px 0 0;padding-left:20px;color:var(--noe-text-muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:6px 20px;margin:10px 0}
.sw{display:grid;grid-template-columns:28px 1fr auto;align-items:center;gap:2px 10px;padding:3px 0}
.sw__chip{display:inline-block;width:28px;height:18px;border:1px solid var(--noe-line);border-radius:2px;vertical-align:middle}
.sw__val{font:var(--noe-fs-11) var(--noe-font-num)}
.sw__note{grid-column:2/4;font-size:var(--noe-fs-11);color:var(--noe-text-muted)}
.srcs{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px 20px;margin:10px 0}
.src{display:grid;grid-template-columns:44px 1fr;gap:2px 12px;align-items:center}
.src__ground{grid-row:1/3;width:44px;height:44px;border-radius:var(--noe-r-glyph);display:grid;place-items:center;font:700 16px var(--noe-font-label)}
.src__name{font:700 var(--noe-fs-13) var(--noe-font-ui)}
.src__bar{display:none}
.src code{grid-column:2}
.src::after{content:"";grid-column:1/3;height:1px;background:var(--noe-source-accent)}
table{border-collapse:collapse;width:100%;margin:10px 0;font-size:var(--noe-fs-12)}
th,td{padding:5px 8px;border-bottom:1px solid var(--noe-line);text-align:left;vertical-align:middle}
th{font:400 var(--noe-fs-10) var(--noe-font-num);letter-spacing:1px;text-transform:uppercase;color:var(--noe-text-muted)}
tr.grp th{color:var(--noe-text);background:var(--noe-panel);font-size:var(--noe-fs-11)}
td.num{font-family:var(--noe-font-num);text-align:right;font-variant-numeric:tabular-nums}
td.low{color:var(--noe-danger);font-weight:700}
.type td:first-child{white-space:nowrap}
.k{border:1px solid var(--noe-line);border-radius:var(--noe-r-panel);margin:14px 0;overflow:hidden}
.k>header{display:flex;justify-content:space-between;gap:16px;align-items:baseline;padding:8px 12px;background:var(--noe-panel);border-bottom:1px solid var(--noe-line)}
.k>header p{margin:0;font-size:var(--noe-fs-11)}
.k__body{padding:14px;display:flex;flex-wrap:wrap;gap:14px 22px;align-items:flex-start}
.k__body>.wide{flex:1 1 100%}
.stack{display:flex;flex-direction:column;gap:8px}
.inline{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.cap{font:var(--noe-fs-10) var(--noe-font-num);letter-spacing:1px;text-transform:uppercase;color:var(--noe-text-muted);margin:0 0 4px}
.case{flex:1 1 100%;border-top:1px dashed var(--noe-line);padding-top:6px}
.case:first-child{border-top:0;padding-top:0}
.case__t{font:var(--noe-fs-10) var(--noe-font-num);letter-spacing:1px;text-transform:uppercase;margin:0 0 2px}
.on-panel{background:var(--noe-panel);padding:10px;border-radius:var(--noe-r-panel)}
.mock{display:grid;grid-template-columns:230px 1fr 38px;border:1px solid var(--noe-line);border-radius:var(--noe-r-panel);overflow:hidden;--noe-banner-image:url("../../ui/noe/banners/pc.webp")}
.mock__head{grid-column:1/4;padding:16px 18px 14px;display:flex;justify-content:space-between;gap:20px;align-items:flex-start;min-height:128px}
.mock__side{padding:12px;display:flex;flex-direction:column;gap:10px;border-right:1px solid var(--noe-line);background:var(--noe-scrim)}
.mock__main{padding:12px;display:flex;flex-direction:column;gap:8px;min-width:0;background:var(--noe-scrim)}
.mock__portrait{aspect-ratio:1;background:var(--noe-inset);border:1px solid var(--noe-line);display:grid;place-items:center;color:var(--noe-text-muted)}
.budget{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px}
.budget>span{padding:5px 9px;border:1px solid var(--noe-line);border-radius:var(--noe-r-chip);background:var(--noe-panel)}
.chatlog{width:300px;background:var(--noe-inset);padding:8px;border:1px dashed var(--noe-line)}
.chatlog>p{margin:0 0 6px}
.dlg{width:420px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
footer{margin-top:50px;color:var(--noe-text-muted);font-size:var(--noe-fs-11)}
@media (max-width:900px){.mock{grid-template-columns:1fr}.mock__head,.mock__side{grid-column:1}.mock>nav{display:none}}
</style>
</head>
<body class="noe">
<div class="bar"><nav><a href="#tokeny">Tokeny</a><a href="#o2">O2 · semantyczne</a><a href="#typografia">Typografia</a><a href="#komponenty">K1–K18</a><a href="#przypadki">Przypadki §3</a><a href="#karta">Makieta karty</a><a href="#czat">Czat i dialog</a></nav>
<button class="noe-btn" type="button" onclick="document.body.classList.toggle('gray');this.setAttribute('aria-pressed',document.body.classList.contains('gray'))">Skala szarości</button></div>
<main>
<h1>NOE M9 · tokeny i komponenty</h1>
<p>Etap <strong>E1b</strong> planu M9. Strona ładuje prawdziwe arkusze <code>styles/noe/tokens.generated.css</code>, <code>tokens.css</code> i <code>components.css</code>
oraz składa znaczniki pomocnikami <code>scripts/ui/noe.mjs</code> — to nie rysunek, tylko te same reguły, które dostanie Foundry. Profil <code>${esc(profile.id)}</code> bez zmian.
Przełącznik „Skala szarości” sprawdza zasadę P4: znaczenie ma przetrwać bez koloru.</p>

<div class="decide"><strong>Do decyzji MG (warunek przejścia E1b):</strong>
<ol>
<li><strong>O2 — kolory semantyczne</strong> ok / warn / danger / info: propozycja kontra punkt wyjścia M8, z pomiarem odległości od A/B/R/I i od czerwieni skosu (<a href="#o2">tabela</a>).</li>
<li><strong>Kolory mierników</strong> PW / KW / tymczasowe — nowe wartości spoza profilu (<a href="#k11">K11</a>).</li>
<li><strong>Powierzchnie pochodne</strong> <code>--noe-raised</code> i <code>--noe-inset</code> (<a href="#tokeny">tokeny</a>) oraz wygląd komponentów K1–K18.</li>
</ol></div>

<h2 id="tokeny">Tokeny</h2>
<p class="cap">Powierzchnie, tekst, linie — profil + pochodne</p>
<div class="grid">
${swatch("surface", profile.theme.surface, "powierzchnia okna")}
${swatch("panel", profile.theme.panel, "panel, nagłówek sekcji")}
${swatch("raised", "color-mix(panel, accent 10%)", "hover, wybór — pochodny")}
${swatch("inset", "color-mix(surface, czerń 30%)", "pola, tory mierników — pochodny")}
${swatch("text", profile.theme.foreground)}
${swatch("text-muted", profile.theme.muted)}
${swatch("text-disabled", "color-mix(muted, surface 45%)", "tylko nieaktywne pola; nigdy glif")}
${swatch("line", profile.theme.divider)}
${swatch("accent", profile.theme.accent, "akcent interfejsu = focus")}
</div>
<p class="cap">Osiem źródeł — tło ikony · glif · akcent (linia pod próbką)</p>
<div class="srcs">
${sources}
</div>
<p class="cap">Sprzęt — kolor gołego glifu rodziny</p>
<div class="grid">
${equipment}
</div>
<p class="cap">Koszty i niedostępność</p>
<div class="inline" style="margin:8px 0 4px">
${costSign("a", { large: true })} ${costSign("b", { large: true })} ${costSign("r", { large: true })} ${costSign("i", { large: true })}
<span style="width:24px"></span>
${glyph(icon("spec/inteligentna-obrona"), { size: "id", unavailable: true })} ${glyph(icon("spec/inteligentna-obrona"), { unavailable: true })} ${glyph(icon("origin/asgard"), { unavailable: true })} ${glyph(icon("weapon/ak_47"), { unavailable: true })} ${glyph(icon("brutal/brutal"), { size: "sm", unavailable: true })}
<code>skos ${profile.unavailability.red} · obrys ${profile.unavailability.outline} · ${profile.unavailability.angleDegrees}° · ${Math.round(profile.unavailability.lengthRatio * 100)}% · clamp(2px, 5,5%, 4px)</code>
</div>

<h2 id="o2">O2 — kolory semantyczne</h2>
<p>Semantyczne zawsze idą z tekstem albo ikoną i nie zastępują kosztów: zielone koło A nie znaczy „gotowe”.
Tabela mierzy różnicę barwy ΔE (CIEDE2000; poniżej 10 — łatwo pomylić, zaznaczone) względem figur kosztów, czerwieni skosu i tekstu drugorzędnego
oraz kontrast tekstu na <code>surface</code> i <code>panel</code>. Punkt wyjścia M8: zieleń 7 od koła A, czerwień 7 od skosu, „informacja” 3,5 od zwykłego tekstu muted.
Propozycja przesuwa „ok” ku żółtozielonemu, „danger” ku jasnemu koralowi, „info” ku niebieskofioletowemu; ostrzeżenie zostaje jasnożółte.</p>
<table>
<tr><th>Wartość</th><th>Wariant</th>${Object.keys(REF).map(n => `<th>ΔE ${esc(n)}</th>`).join("")}<th>min ΔE</th><th>kontrast surface</th><th>kontrast panel</th><th>Próbka</th></tr>
${semTable}
</table>
<div class="inline on-panel">${badge("ok", "Gotowe")} ${badge("warn", "Ostrzeżenie · możesz użyć")} ${badge("ban", "Zakaz · jesteś w zwarciu")} ${badge("info", "Zmienione przez efekt")} <span style="width:18px"></span> ${costSign("a")} ${costSign("b")} ${costSign("r")} ${costSign("i")} ${glyph(icon("feat/gunfight"), { size: "sm", unavailable: true })}</div>

<h2 id="typografia">Typografia (D11)</h2>
<table class="type">
<tr><th>Rola</th><th>Krój · rozmiar / waga</th><th>Próbka</th></tr>
<tr><td>Imię postaci, tytuł karty</td><td><code>Roboto Condensed 24/700, wersaliki</code></td><td><span class="noe-title" style="display:inline-block">Żołnierz w oporządzeniu</span></td></tr>
<tr><td>Tytuł okna i dialogu</td><td><code>Roboto Condensed 14/700</code></td><td><span class="noe-window__title">Strzał pojedynczy — AK (Kałach)</span></td></tr>
<tr><td>Podtytuł</td><td><code>Roboto Condensed 13/400, muted</code></td><td><span class="noe-subtitle">Twardziel 5 · Żołnierz · Nowy Jork</span></td></tr>
<tr><td>Etykieta sekcji i kolumny</td><td><code>Roboto Mono 10–11/400, wersaliki, +1 px</code></td><td><span class="noe-label">Zdolności klasowe · użycia · odnowienie</span></td></tr>
<tr><td>Nazwa w wierszu</td><td><code>Roboto 13/700</code></td><td><span class="noe-row__name">Zażółć gęślą jaźń — Łowca Mutantów</span></td></tr>
<tr><td>Podpis wiersza</td><td><code>Roboto 11/400, muted</code></td><td><span class="noe-row__caption">Zdolność klasowa · Zwiadowca</span></td></tr>
<tr><td>Liczby, liczniki, koszty</td><td><code>Roboto Mono 11–20/700, tabelaryczne</code></td><td><span class="noe-num" style="font-size:var(--noe-fs-20)">37/37</span> &nbsp; <span class="noe-num">1 240 szt. · 9 m · +3 · k20 = 17</span></td></tr>
<tr><td>Tekst opisu</td><td><code>Roboto 13/400</code></td><td>Po trafieniu bronią białą możesz wytrącić przeciwnikowi broń z ręki.</td></tr>
<tr><td>Przycisk</td><td><code>Roboto Condensed 12/700, wersaliki</code></td><td>${button("Rzuć obrażenia")}</td></tr>
</table>
<p class="cap">Odstępy 2 · 4 · 8 · 12 · 16 · 24 px — promienie 2 (chip) · 3 (tło ikony) · 4 (panel) — linia 1 px, wybór 2 px — wiersz 52 px z glifem 44 px — cel kliknięcia ≥ 24 px — przycisk i pole 28 px</p>

<h2 id="komponenty">Komponenty K1–K18</h2>

${k("K1", "Rama okna", "denim, pergamin, banery ui/official/*", `<div class="noe-window" style="width:420px"><div class="noe-window__header"><span class="noe-window__title">AK (Kałach)</span>${button("Zamknij", { icon: "fa-solid fa-xmark", iconOnly: true })}</div><div class="noe-dialog__body"><span class="noe-subtitle">Broń · palna pośrednia</span>Okno NOE: grafit, linia 1 px, bez złota i cienia. Baner tylko na kartach (D14).</div></div>
<div class="noe-window noe-banner" style="width:520px;--noe-banner-image:url('../../ui/noe/banners/item.webp');--noe-banner-height:150px"><div class="noe-dialog__body" style="min-height:118px"><div class="inline">${glyph(icon("weapon/ak_47"), { size: "id" })}<div class="stack"><span class="noe-title" style="font-size:var(--noe-fs-20)">AK (Kałach)</span><span class="noe-subtitle">Broń · palna pośrednia · 7,62×39 mm</span></div></div></div></div>`)}

${k("K2", "Nagłówek karty", "czerwona kreska pod imieniem, złote ramki", `<div class="stack" data-noe-source="twardziel" style="min-width:340px"><h1 class="noe-title">Żołnierz w oporządzeniu</h1><span class="noe-subtitle">Twardziel 5 · Żołnierz</span></div>
<div class="stack" data-noe-source="zwiadowca" style="min-width:340px"><h1 class="noe-title">Łowca Mutantów z bardzo długim imieniem</h1><span class="noe-subtitle">Zwiadowca 12 · Łowca Mutantów</span></div>
<div class="stack" style="min-width:240px"><h1 class="noe-title">Gangus Kapo</h1><span class="noe-subtitle">BN · neutralny akcent</span></div>`)}

${k("K3", "Tabliczka odczytu (D18)", "tarcza TT, heksy inicjatywy / szybkości / biegłości, pierścień poziomu", `${readout("TT", 18)} ${readout("Inicjatywa", "+2")} ${readout("Szybkość", 9, { unit: "m" })} ${readout("Biegłość", "+3")} ${readout("Poziom", 5)} ${readout("TT", 20, { modified: true, title: "Kamizelka taktyczna +2" })} ${readout("SW", "1/2", { small: true })} ${readout("PD", "6 500", { small: true })}
<p class="wide">Wartość zmieniona efektem dostaje znak ± przy liczbie; źródło w tooltipie. Edycja jak dziś.</p>`)}

${k("K4", "Zakładki", "złote i pergaminowe zakładki", `<nav class="noe-tabs" style="min-width:380px"><a class="noe-tab is-active">Opis</a><a class="noe-tab">Szczegóły</a><a class="noe-tab">Aktywności</a><a class="noe-tab">Efekty</a></nav>
<nav class="noe-tabs noe-tabs--rail"><a class="noe-tab"><i class="fa-solid fa-suitcase"></i></a><a class="noe-tab"><i class="fa-solid fa-boxes-stacked"></i></a><a class="noe-tab is-active"><i class="fa-solid fa-list"></i></a><a class="noe-tab"><i class="fa-solid fa-bolt"></i></a><a class="noe-tab"><i class="fa-solid fa-feather"></i></a></nav>`)}

${k("K5", "Nagłówek sekcji", "bordowe belki --dnd5e-card-header-*", `<div class="stack wide"><div class="noe-section" data-noe-source="twardziel"><h3 class="noe-section__title">Zdolności klasowe — Twardziel</h3><span class="noe-section__col" style="width:70px">Użycia</span><span class="noe-section__col" style="width:96px">Odnowienie</span></div>
<div class="noe-section" data-noe-source="pochodzenia"><h3 class="noe-section__title">Pochodzenie — Nowy Jork</h3><span class="noe-section__col" style="width:70px">Użycia</span><span class="noe-section__col" style="width:96px">Odnowienie</span></div>
<div class="noe-section"><h3 class="noe-section__title">Broń</h3><span class="noe-section__col" style="width:70px">Waga</span><span class="noe-section__col" style="width:96px">Ilość</span></div></div>`)}

${k("K6", "Wiersz treści", "wiersze z gold-icon", `<div class="wide">${row({ img: icon("twardziel/kondycha"), name: "Kondycha", caption: "Twardziel · zdolność klasowa", costs: [B], count: counter(1, 1), state: badge("ok", "Gotowe", { icon: null }) })}${row({ img: icon("weapon/ak_47"), name: "AK (Kałach)", caption: "Broń · palna pośrednia", count: counter(24, 30), state: `<span class="noe-badge">Magazynek</span>` })}${row({ img: icon("utility/activity_single_fire"), name: "Strzał pojedynczy", caption: "Czynność broni", costs: [A], state: badge("ok", "Gotowe", { icon: null }) })}</div>
<p class="wide">Glif 44 px bez obudowy · znaki kosztu przed nazwą · nazwa i podpis · po prawej licznik i powód/stan. Hover: tło akcentu 8%; wybór: obrys 1 px akcentu. Wszystkie stany — <a href="#przypadki" style="color:var(--noe-info)">przypadki §3</a>.</p>`)}

${k("K7", "Znak kosztu", "tekst „Akcja dodatkowa” w podpisie", `<div class="inline">${costSign("a")} ${costSign("b")} ${costSign("r")} ${costSign("i")} ${costSign("other", { text: "1 min" })} ${costSign("other", { text: "wyzwalacz" })}</div>
<div class="inline">${costSign("a", { count: "1/1" })} ${costSign("b", { count: "0/1" })} ${costSign("r", { count: "1/1" })} ${costSign("i", { count: "0/1" })} <span class="noe-badge">I 0/1 → kolejne Używanie kosztuje A</span></div>
<div class="inline on-panel">${costSign("a", { large: true })} ${costSign("b", { large: true })} ${costSign("r", { large: true })} ${costSign("i", { large: true })}</div>`)}

${k("K8", "Licznik", "kolumna „Użycia”", `<div class="stack" style="align-items:flex-end">${counter(1, 1)}${counter(0, 3)}${counter(24, 30)}${counter(1240, null, { unit: "szt." })}${counter("6/9", null, { unit: "m" })}</div>
<p>Mono, cyfry tabelaryczne, wyrównanie do prawej, min. 5 znaków. Zero zawsze z powodem obok (K9).</p>`)}

${k("K9", "Plakietka stanu", "— (nowy komponent)", `<div class="stack">${badge("on")}${badge("warn", "Ostrzeżenie · możesz użyć")}${badge("cond", "Warunek · brak wyzwalacza")}${badge("ban", "Zakaz · jesteś w zwarciu")}${badge("unknown", "Nieznany stan")}${badge("ok", "Gotowe")}</div>
<p>Tekst + ikona. WŁ. = działający efekt, niezależny od gotowości kolejnego użycia. Ostrzeżenie budżetu M8 nigdy nie dostaje skosu i niczego nie blokuje.</p>`)}

${k("K10", "Skos niedostępności", "opacity i filtry na glifie", `<div class="inline">${[["twardziel/twardziel", "id"], ["spec/inteligentna-obrona", "row"], ["origin/nowy-jork", "row"], ["feat/aramis", "row"], ["weapon/ak_47", "row"], ["medical/medpak", "row"], ["utility/activity_reload", "row"], ["brutal/wsciekly-cios", "sm"]].map(([id, size]) => glyph(icon(id), { size, unavailable: true })).join(" ")}</div>
<div class="inline on-panel">${["spec/inteligentna-obrona", "origin/nowy-jork", "weapon/ak_47", "ammo/ammo_9_mm"].map(id => glyph(icon(id), { unavailable: true })).join(" ")}</div>
<p class="wide">Glif zachowuje pełną nieprzezroczystość. Skos to <code>::after</code> na opakowaniu <code>.noe-glyph</code>: −45°, 112% boku, grubość clamp(2 px, 5,5%, 4 px), obrys 1 px.</p>`)}

${k("K11", "Miernik i tor", "kapsuły PW/KW, --dnd5e-color-hp-*", `<div class="stack" style="width:230px"><span class="noe-label">Punkty Wytrzymałości</span>${meter(37, 37, { kind: "pw" })}${meter(12, 37, { kind: "pw" })}<span class="noe-label">Kości Wytrzymałości</span>${meter(5, 5, { kind: "kw" })}${meter(2, 5, { kind: "kw" })}<span class="noe-label">Tymczasowe</span>${meter(6, 10, { kind: "temp" })}</div>
<div class="stack" style="width:230px"><span class="noe-label">Paliwo</span>${meter(34, 60)}<span class="noe-label">Ładownia</span>${meter(412, 800)}<span class="noe-label">Udźwig</span>${meter(55, 60, { thin: true })}</div>
<div class="grid" style="flex:1 1 260px">${swatch("meter-pw", token("meter-pw"), "Punkty Wytrzymałości")}${swatch("meter-kw", token("meter-kw"), "Kości Wytrzymałości")}${swatch("meter-temp", token("meter-temp"), "punkty tymczasowe")}${swatch("meter-neutral", token("meter-neutral"), "paliwo, ładownia, zapasy")}</div>
<p class="wide">Tor <code>--noe-inset</code>, płaskie wypełnienie, liczba mono; bez gradientów. Pipki panelu Stan zachowują <code>--neuro-color-*</code>.</p>`)}

${k("K12", "Przycisk", "złote przyciski czatu, --control-button-text-color", `<div class="inline">${button("Rzuć atak", { variant: "primary", icon: "fa-solid fa-dice-d20" })} ${button("Obrażenia")} ${button("Usuń przedmiot", { variant: "danger", icon: "fa-solid fa-trash" })} ${button("Edytuj", { icon: "fa-solid fa-pen", iconOnly: true })} ${button("Rzuć obrażenia", { disabled: true, title: "Najpierw rzut ataku" })}</div>
<div class="noe-seg"><button class="noe-btn" type="button">Ułatwienie</button><button class="noe-btn is-active" type="button" aria-pressed="true">Normalnie</button><button class="noe-btn" type="button">Utrudnienie</button></div>
<p class="wide">Podstawowy (akcent), drugorzędny (panel + linia), niebezpieczny (obrys i tekst danger), ikonowy. Wysokość 28 px. Nieaktywny: tekst disabled i powód w tooltipie.</p>`)}

${k("K13", "Pola formularza", "złoty slide-toggle i legendy", `<fieldset class="noe-fieldset" style="width:340px"><legend>Zużycie</legend><div class="stack"><div class="noe-field"><label>Amunicja</label><select class="noe-input"><option>7,62×39 mm AK — 24 szt.</option></select></div><div class="two"><div class="noe-field"><label>Premia sytuacyjna</label><input class="noe-input noe-input--num" value="+2"></div><div class="noe-field"><label>Zablokowane</label><input class="noe-input noe-input--num" value="—" disabled></div></div><label class="inline"><input type="checkbox" checked style="accent-color:var(--noe-accent)"> Zużyj akcję bonusową</label></div></fieldset>
<p>W Foundry pola pochodzą z rdzenia i dnd5e — most przypisuje tokeny do <code>--input-*</code>, <code>--checkbox-*</code>, <code>--slide-toggle-*</code>.</p>`)}

${k("K14", "Tooltip, popover, menu", "pergaminowe tooltipy dnd5e", `<div class="noe-tip"><p class="noe-tip__title">TT 20</p><div class="noe-tip__row"><span>Podstawa</span><span>10</span></div><div class="noe-tip__row"><span>Zręczność</span><span>+2</span></div><div class="noe-tip__row"><span>Plate carrier typ II</span><span>+6</span></div><div class="noe-tip__row"><span>Kamizelka taktyczna</span><span>+2</span></div></div>
<div class="noe-tip">Zakaz: jesteś w zwarciu z Gangusem Kapo. Odstąp albo wygraj zwarcie, zanim sięgniesz po medpak.</div>
<div class="noe-menu"><div class="noe-menu__item"><i class="fa-solid fa-pen"></i>Edytuj</div><div class="noe-menu__item"><i class="fa-solid fa-copy"></i>Duplikuj</div><div class="noe-menu__item is-danger"><i class="fa-solid fa-trash"></i>Usuń</div></div>`)}

${k("K15", "Powłoka dialogu", "126 wywołań DialogV2 z różną oprawą", `<div class="noe-window dlg"><div class="noe-window__header"><span class="noe-window__title">Wyrzucić granat?</span></div><div class="noe-dialog__body">Granat odłamkowy zostanie zużyty. Tej czynności nie da się cofnąć.<dl class="noe-summary"><dt>Zasięg</dt><dd>9/18 m</dd><dt>Zostanie</dt><dd>1 szt.</dd></dl></div><div class="noe-dialog__footer">${button("Anuluj")}${button("Rzuć granat", { variant: "danger" })}</div></div>`)}

${k("K16", "Karta czatu", "denim, bordowe nagłówki, złote przyciski", `<p class="wide">Pełne karty — w sekcji <a href="#czat" style="color:var(--noe-info)">Czat i dialog</a>.</p>`)}

${k("K17", "Pusty stan / strefa upuszczania", "„UPUŚĆ TU ULUBIONE”", `<div style="width:230px">${emptyState("Przeciągnij tu ulubione", { icon: "fa-solid fa-bookmark" })}</div><div style="width:230px"><div class="noe-empty is-drop-target"><i class="fa-solid fa-bookmark"></i><span>Upuść, aby dodać</span></div></div><div style="width:300px">${emptyState("Brak zdolności z tej kategorii")}</div>`)}

${k("K18", "Chip, pill, tag", "pills z --pill-underlay-*", `<div class="inline">${chip("Palna pośrednia")} ${chip("7,62×39 mm")} ${chip("Seria", { variant: "muted" })} ${chip("Zacięta", { variant: "danger" })} ${chip("Do konserwacji", { variant: "warn" })} ${chip("Zakonserwowana", { variant: "ok" })}</div>`)}

<h2 id="przypadki">Przypadki obowiązkowe (§3)</h2>
<p>Niezależne przykłady stanów — każdy wiersz to osobna sytuacja, nie tura jednej postaci.</p>
<section class="k"><div class="k__body">
${cases}
</div></section>

<h2 id="karta">Makieta karty — jeden spójny budżet tury</h2>
<p>Układ koncepcyjny, nie zrzut z Foundry: nagłówek K2 nad banerem Field kit, tabliczki K3, mierniki K11, szyna K4, sekcja K5 z akcentem klasy, wiersze K6–K10.
Tura: A 1/1, B 1/1, R 0/1 (wydana), I 1/1, ruch 6/9 m.</p>
<div class="mock noe-banner" data-noe-source="twardziel">
  <div class="mock__head"><div class="stack"><h1 class="noe-title">Żołnierz w oporządzeniu</h1><span class="noe-subtitle">Twardziel 5 · Żołnierz · Nowy Jork</span></div><div class="inline">${readout("Poziom", 5, { small: true })}${readout("Fuksy", "2/3", { small: true })}</div></div>
  <aside class="mock__side"><div class="mock__portrait"><i class="fa-solid fa-user fa-3x"></i></div><div class="inline">${readout("TT", 18)}${readout("Inicj.", "+2")}${readout("Szybk.", 9, { unit: "m" })}</div><span class="noe-label">Punkty Wytrzymałości</span>${meter(37, 37, { kind: "pw" })}<span class="noe-label">Kości Wytrzymałości</span>${meter(5, 5, { kind: "kw" })}${emptyState("Przeciągnij tu ulubione", { icon: "fa-solid fa-bookmark" })}</aside>
  <div class="mock__main"><div class="budget"><span>${costSign("a", { count: "1/1" })}</span><span>${costSign("b", { count: "1/1" })}</span><span>${costSign("r", { count: "0/1" })}</span><span>${costSign("i", { count: "1/1" })}</span><span class="noe-num">Ruch 6/9 m</span></div>
  <div class="noe-section"><h3 class="noe-section__title">Zdolności klasowe — Twardziel</h3><span class="noe-section__col">Użycia · stan</span></div>
${sheetRows}
  </div>
  <nav class="noe-tabs noe-tabs--rail" style="border-radius:0;border-width:0 0 0 1px"><a class="noe-tab"><i class="fa-solid fa-suitcase"></i></a><a class="noe-tab"><i class="fa-solid fa-boxes-stacked"></i></a><a class="noe-tab"><i class="fa-solid fa-hammer"></i></a><a class="noe-tab"><i class="fa-solid fa-gear"></i></a><a class="noe-tab is-active"><i class="fa-solid fa-list"></i></a><a class="noe-tab"><i class="fa-solid fa-bolt"></i></a></nav>
</div>

<h2 id="czat">Czat i dialog użycia</h2>
<div class="k__body" style="padding:14px 0">
<div class="chatlog"><p class="cap">Pełna karta — atak</p>
<div class="noe-card"><div class="noe-card__header">${glyph(icon("weapon/ak_47"), { size: "chat" })}<div class="noe-card__title"><span class="noe-card__name">AK (Kałach)</span><span class="noe-card__caption">${costSign("a")} Strzał pojedynczy · 7,62×39 mm</span></div></div>
<div class="noe-card__result"><div class="stack"><span class="noe-card__total">19</span><span class="noe-card__formula">k20 (14) + 5</span></div><span class="noe-card__outcome is-success">Trafienie</span></div>
<div class="noe-card__notes">${badge("info", "Ułatwienie: Przycelowanie")} ${badge("on", "Fuks 2/3", { icon: "fa-solid fa-clover" })}</div>
<div class="noe-card__actions">${button("Obrażenia", { variant: "primary" })}${button("Przerzut (Fuks)")}</div></div></div>

<div class="chatlog"><p class="cap">Porażka + Forsowanie</p>
<div class="noe-card"><div class="noe-card__header">${glyph(icon("medical/medpak"), { size: "chat" })}<div class="noe-card__title"><span class="noe-card__name">Pierwsza pomoc</span><span class="noe-card__caption">${costSign("a")} Test Medycyny · ST 15</span></div></div>
<div class="noe-card__result"><div class="stack"><span class="noe-card__total">11</span><span class="noe-card__formula">k20 (8) + 3</span></div><span class="noe-card__outcome is-failure">Porażka</span></div>
<div class="noe-card__notes">${badge("warn", "Forsowanie: 1 poziom Wyczerpania")}</div>
<div class="noe-card__actions">${button("Forsuj")}</div></div></div>

<div class="chatlog"><p class="cap">Zwinięta — wynik i adnotacje zostają (PM13)</p>
<div class="noe-card"><div class="noe-card__header">${glyph(icon("weapon/ak_47"), { size: "sm" })}<div class="noe-card__title"><span class="noe-card__name">AK (Kałach) — obrażenia</span></div><span class="noe-card__total" style="font-size:var(--noe-fs-16)">14</span></div>
<div class="noe-card__notes">${chip("przebijające")} ${badge("on", "Fuks 2/3", { icon: "fa-solid fa-clover" })}</div></div>
<p class="cap" style="margin-top:10px">Pusty magazynek → plakietka, nie pasek</p>
<div class="noe-card"><div class="noe-card__header">${glyph(icon("utility/activity_reload"), { size: "sm", unavailable: true })}<div class="noe-card__title"><span class="noe-card__name">AK (Kałach)</span><span class="noe-card__caption">Strzał pojedynczy</span></div></div><div class="noe-card__notes">${badge("ban", "Pusty magazynek · wymień [I]", { icon: "fa-solid fa-circle-exclamation" })}</div></div></div>

<div class="noe-window dlg"><div class="noe-window__header"><span class="noe-window__title">Strzał pojedynczy — AK (Kałach)</span>${button("Zamknij", { icon: "fa-solid fa-xmark", iconOnly: true })}</div>
<div class="noe-dialog__body"><div class="inline">${glyph(icon("weapon/ak_47"))}<div class="stack"><span class="noe-row__name">AK (Kałach)</span><span class="noe-row__caption">${costSign("a", { count: "1/1" })} &nbsp; Magazynek ${counter(24, 30)}</span></div></div>
<fieldset class="noe-fieldset"><legend>Rzut</legend><div class="stack"><div class="noe-seg"><button class="noe-btn" type="button">Ułatwienie</button><button class="noe-btn is-active" type="button" aria-pressed="true">Normalnie</button><button class="noe-btn" type="button">Utrudnienie</button></div><div class="noe-field"><label>Premia sytuacyjna</label><input class="noe-input noe-input--num" value="+0"></div></div></fieldset>
<dl class="noe-summary"><dt>Formuła</dt><dd>k20 + 5</dd><dt>Zasięg</dt><dd>30/90 m</dd><dt>Zużyje</dt><dd>1 × 7,62×39 mm</dd></dl></div>
<div class="noe-dialog__footer">${button("Anuluj")}${button("Rzuć atak", { variant: "primary", icon: "fa-solid fa-dice-d20" })}</div></div>
</div>

<footer>Generowane przez <code>node dev/visual/build-components.mjs</code>. Ikony: rzeczywiste eksporty pilota E2 z <code>icons/finished/</code>; banery z <code>ui/noe/banners/</code>.
Piktogramy Font Awesome: przez serwer Foundry z rdzenia, z dysku — z sieci; bez nich znikają same piktogramy, układ i teksty zostają.</footer>
</main>
</body>
</html>
`;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "index.html"), html);
console.log(`Makieta: dev/visual/m9-components/index.html (${Math.round(html.length / 1024)} KiB)`);
