/**
 * Galeria (§5.6, P3): icons and art in context — generated journal pages: every shipped item icon per
 * pack at 64 / 44 / 32 / 16 px on dark and light, the status icons at token size; placeholders stand out.
 * Judges the shipped set's consistency; the icon review queue judges candidates one at a time.
 *
 * M9 (PLAN_m9_style.md §7, HANDOFF_m9_graphics_to_code.md): 44 px is the sheet's working size; each
 * pack page counts finished vs white-master icons; one page per finish family (the journal's page list
 * is the family filter) and one page of shared glyphs — the same picture in several semantic finishes.
 * Family data comes from the module's generated runtime lookup, the same one the sheets use.
 *
 * Pages carry a stable key (`flags.<mod>.poligon.galeriaPage`), so **Odśwież galerię** rewrites the
 * existing journal in place — same journal and page ids, no station reset; pages it does not know
 * (a GM's own notes) are left alone.
 */

import { MOD, p } from "./_wspolne.mjs";
import { packDocs } from "../lib/packs.mjs";

const PACKS = ["bron", "pancerze", "amunicja", "magazynki", "granaty", "lekarstwa", "narzedzia", "sprzet", "schematy", "sztuczki", "zdolnosci-klasowe", "zdolnosci-pochodzenia", "klasy", "profesje", "pochodzenia", "bestiariusz", "towarzysze"];
const SIZES = [64, 44, 32, 16];
const DARK = "#191e23", LIGHT = "#efe9dc";
const PREFIX = `modules/${MOD}/`;
const JOURNAL = "Poligon · Galeria";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
const isPlaceholder = img => !img || /mystery-man|icons\/svg\//.test(img);
const isFinished = img => typeof img === "string" && img.includes("/icons/finished/");
const isMaster = img => typeof img === "string" && img.startsWith(`${PREFIX}icons/`) && !isFinished(img);

/** Red frame: placeholder. Dashed amber: a module white master with no finish (should be none after M9). */
function cell(e, size, bg) {
  const mark = isPlaceholder(e.img) ? "outline:2px solid #e53935;" : isMaster(e.img) && !e.master ? "outline:2px dashed #e0a030;" : "";
  return `<span title="${esc(e.name)}" style="display:inline-flex;width:${size + 8}px;height:${size + 8}px;align-items:center;justify-content:center;background:${bg};margin:1px;border-radius:3px;${mark}"><img src="${esc(e.img)}" width="${size}" height="${size}" style="border:none;object-fit:contain"></span>`;
}

function grid(entries, sizes = SIZES) {
  const row = (size, bg) => `<div style="background:${bg};padding:4px;line-height:0">${entries.map(e => cell(e, size, bg)).join("")}</div>`;
  return sizes.flatMap(size => [row(size, DARK), row(size, LIGHT)]).join("");
}

async function finishData() {
  const route = foundry.utils.getRoute(`modules/${MOD}/scripts/config/finished-icons-data.mjs`);
  return import(`${route}?v=${Date.now()}`);
}

/** Every page as `{key, name, content}` — pure data, shared by build and refresh. */
async function strony() {
  const pages = [];
  const coverage = [];
  for (const pack of PACKS) {
    const docs = await packDocs(pack);
    const seen = new Set();
    const entries = docs.filter(d => d.img && !seen.has(d.img) && seen.add(d.img)).map(d => ({ name: d.name, img: d.img }));
    const placeholders = docs.filter(d => isPlaceholder(d.img)).length;
    const finished = docs.filter(d => isFinished(d.img)).length;
    const masters = docs.filter(d => isMaster(d.img)).length;
    // Actor packs (Bestiariusz, Towarzysze) show portraits; their abilities' icons are on "Rodzina · creature".
    const actors = docs.some(d => ["npc", "character", "vehicle", "group"].includes(d.type));
    coverage.push({ pack, docs: docs.length, finished, masters, placeholders, actors });
    const summary = actors
      ? `<p>${docs.length} aktorów — portrety, nie ikony M9; ikony ich zdolności i ataków: strona „Rodzina · creature” (i rodziny broni).</p>`
      : `<p>${docs.length} wpisów, ${entries.length} różnych ikon. Wykończone M9: <strong>${finished}</strong>; białe mastery bez wykończenia (przerywana ramka): <strong>${masters}</strong>; zaślepki (czerwona ramka): <strong>${placeholders}</strong>.</p>`;
    pages.push({
      key: `pack:${pack}`, name: actors ? `${pack} (${docs.length} portretów)` : `${pack} (${docs.length}, wykończone ${finished}, zaślepek ${placeholders})`,
      content: `${summary}${grid(entries)}`
    });
  }

  const { FINISHED_ICONS_BY_FAMILY: byFamily } = await finishData();
  const families = Object.keys(byFamily).sort();
  const wrappers = new Map();
  for (const family of families) for (const [wrapper, out] of Object.entries(byFamily[family])) {
    (wrappers.get(wrapper) ?? wrappers.set(wrapper, []).get(wrapper)).push({ family, img: `${PREFIX}${out}` });
  }
  const total = families.reduce((n, f) => n + Object.keys(byFamily[f]).length, 0);
  const shared = [...wrappers].filter(([, list]) => list.length > 1).sort(([a], [b]) => a.localeCompare(b));

  const rows = coverage.map(c => c.actors
    ? `<tr><td>${c.pack}</td><td>${c.docs}</td><td colspan="3">aktorzy (portrety) — ikony: „Rodzina · creature”</td></tr>`
    : `<tr><td>${c.pack}</td><td>${c.docs}</td><td>${c.finished}</td><td>${c.masters ? `<strong style="color:#e0a030">${c.masters}</strong>` : 0}</td><td>${c.placeholders}</td></tr>`).join("");
  const famRows = families.map(f => `<tr><td>${f}</td><td>${Object.keys(byFamily[f]).length}</td></tr>`).join("");
  pages.unshift({
    key: "m9:pokrycie", name: `M9 · pokrycie (${total} wykończeń, ${families.length} rodzin)`,
    content: `<p>Wykończenia M9 z generowanej mapy modułu (<code>finished-icons-data.mjs</code>). Strony „Rodzina · …” to filtr rodzin; „Wspólne glify” — ten sam obraz w kilku semantycznych wykończeniach (${shared.length}).</p>
<h3>Paczki</h3><table><tr><th>paczka</th><th>wpisy</th><th>wykończone</th><th>białe mastery</th><th>zaślepki</th></tr>${rows}</table>
<h3>Rodziny</h3><table><tr><th>rodzina</th><th>tematy</th></tr>${famRows}</table>`
  });

  for (const family of families) {
    const entries = Object.entries(byFamily[family]).map(([wrapper, out]) => ({ name: wrapper.split("/").pop().replace(/\.\w+$/, ""), img: `${PREFIX}${out}` }))
      .sort((a, b) => a.name.localeCompare(b.name));
    pages.push({ key: `rodzina:${family}`, name: `Rodzina · ${family} (${entries.length})`, content: `<p>${entries.length} wykończeń rodziny <strong>${family}</strong>; 44 px to rozmiar wiersza karty.</p>${grid(entries, [64, 44, 16])}` });
  }

  const sharedHtml = shared.map(([wrapper, list]) => {
    const name = wrapper.split("/").pop().replace(/\.\w+$/, "");
    const items = [{ name: `${name} · master`, img: `${PREFIX}${wrapper}`, master: true }, ...list.map(x => ({ name: `${name} · ${x.family}`, img: x.img }))];
    return `<div style="margin:6px 0"><strong>${esc(name)}</strong> — ${list.map(x => x.family).join(", ")}<div style="background:${DARK};padding:4px;line-height:0">${items.map(e => cell(e, 44, DARK)).join("")}</div></div>`;
  }).join("");
  pages.push({ key: "m9:wspolne", name: `Wspólne glify (${shared.length})`, content: `<p>Pierwsza próbka to biały master; dalej jego wykończenia — rodzina wynika z roli dokumentu, nie z obrazu (np. C4 i Detonuj, Cygaro chemiczne i z Fantów, Naprawianie stworzenia i drona).</p>${sharedHtml}` });

  const statuses = CONFIG.statusEffects.filter(s => s.img).map(s => ({ name: game.i18n.localize(s.name ?? s.id), img: s.img }));
  pages.push({ key: "stany", name: `Stany (${statuses.length})`, content: grid(statuses) });
  return pages;
}

/** FNV-1a: Foundry normalises stored HTML, so "unchanged" is judged on the generated text's hash. */
const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193); return (h >>> 0).toString(16); };
const pageData = s => ({ name: s.name, type: "text", text: { content: s.content, format: 1 }, flags: { [MOD]: { poligon: { galeriaPage: s.key, galeriaHash: hash(s.content) } } } });

/** The legacy pages (before keys) were named "<pack> (…)" and "Stany (…)". */
function legacyKey(page) {
  const head = page.name.split(" (")[0];
  if (PACKS.includes(head)) return `pack:${head}`;
  if (head === "Stany") return "stany";
  return null;
}

function galeriaJournal() {
  return game.journal.find(j => j.getFlag(MOD, "poligon")?.station === "galeria") ?? game.journal.getName(JOURNAL) ?? null;
}

/**
 * Rewrite the existing gallery in place: same journal, same page ids where a page's key (or legacy name)
 * matches; new pages appended; unknown pages untouched. Returns the previous content of every page it
 * rewrote, so a caller can keep a backup (the `fvtt` icon refresh saves it beside its undo log).
 */
export async function odswiezGalerie({ dryRun = false } = {}) {
  const j = galeriaJournal();
  if (!j) return { ok: false, reason: "Brak dziennika „Poligon · Galeria” — zbuduj stanowisko (Reset) albo Idź." };
  const specs = await strony();
  const byKey = new Map();
  for (const page of j.pages) {
    const key = page.getFlag(MOD, "poligon")?.galeriaPage ?? legacyKey(page);
    if (key && !byKey.has(key)) byKey.set(key, page);
  }
  const updates = [], creates = [], backup = [];
  specs.forEach((s, i) => {
    const page = byKey.get(s.key);
    const data = { ...pageData(s), sort: (i + 1) * 100 };
    if (!page) return creates.push(data);
    const flags = page.getFlag(MOD, "poligon") ?? {};
    if (page.name === s.name && flags.galeriaPage === s.key && flags.galeriaHash === hash(s.content)) return;
    backup.push({ _id: page.id, name: page.name, content: page.text.content, sort: page.sort });
    updates.push({ _id: page.id, ...data });
  });
  if (!dryRun) {
    if (updates.length) await j.updateEmbeddedDocuments("JournalEntryPage", updates);
    if (creates.length) await j.createEmbeddedDocuments("JournalEntryPage", creates);
  }
  return { ok: true, dryRun, journal: j.id, updated: updates.length, created: creates.length, untouched: j.pages.size - updates.length, backup };
}

export default {
  id: "galeria", name: "Galeria", prio: "P3", icon: "fa-solid fa-images",
  opis: "Dziennik „Poligon · Galeria”: ikony każdej paczki w 64/44/32/16 px na ciemnym i jasnym tle (czerwona ramka = zaślepka, przerywana = biały master bez wykończenia M9), pokrycie i rodziny M9, wspólne glify, ikony stanów.",
  gracze: 0,
  async build(k) {
    const pages = (await strony()).map((s, i) => ({ ...pageData(s), sort: (i + 1) * 100 }));
    const j = await JournalEntry.implementation.create({ name: JOURNAL, pages, flags: k.flags({ key: "galeria" }) });
    k.note(`Galeria: ${pages.length} stron`);
    j.sheet.render(true);
    return { strony: pages.length };
  },
  odswiez: odswiezGalerie,
  narzedzia: [
    {
      label: "Odśwież galerię (M9)", icon: "fa-solid fa-arrows-rotate",
      run: async () => {
        const r = await odswiezGalerie();
        if (!r.ok) return ui.notifications.warn(r.reason);
        ui.notifications.info(`Galeria: ${r.updated} stron odświeżonych, ${r.created} nowych; dziennik i identyfikatory stron bez zmian.`);
        game.journal.get(r.journal)?.sheet.render(true);
      }
    }
  ],
  proby: [
    p("spojnosc", "Ikony", "Spójność ikon w paczce i między paczkami: grubość kreski, kadr, kolor", "Strony dziennika po kolei, jasne i ciemne tło."),
    p("male", "Ikony", "Czytelność przy 44 px (wiersz karty) i 16 px (pasek makr, listy)", "Rzędy 44 i 16 px."),
    p("zaslepki", "Ikony", "Zaślepki (czerwona ramka) — czy wszystkie są w dev/icons/MISSING.md? Przerywana ramka = biały master bez wykończenia M9: po wdrożeniu M9 ma jej nie być", "Porównaj z MISSING.md; strona „M9 · pokrycie”."),
    p("m9-rodziny", "Wygląd M9", "Rodziny wykończeń: czy rodzina czyta się jako jedna (kolor, tło), a różne rodziny dają się odróżnić przy 44 i 16 px?", "Strony „Rodzina · …” po kolei; „M9 · pokrycie” — liczby tematów."),
    p("m9-wspolne", "Wygląd M9", "Wspólne glify: ten sam obraz w różnych rolach (C4 ↔ Detonuj, Cygaro chemiczne ↔ z Fantów, Naprawianie stworzenia ↔ drona, zdolność klasy ↔ cecha stworzenia) — czy rola jest czytelna z samego wykończenia?", "Strona „Wspólne glify”."),
    p("stany", "Ikony", "Ikony stanów na żetonach przy dwóch zbliżeniach", "Lazaret → żetony; tu wzorzec.")
  ]
};
