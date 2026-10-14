/**
 * Galeria (§5.6, P3): icons and art in context — generated journal pages: every shipped item icon per
 * pack at 64 / 32 / 16 px on light and dark, the status icons at token size; placeholders stand out.
 * Judges the shipped set's consistency; the icon review queue judges candidates one at a time.
 */

import { MOD, p } from "./_wspolne.mjs";
import { packDocs } from "../lib/packs.mjs";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));

function grid(entries) {
  const cell = (e, size, bg) => `<span title="${esc(e.name)}" style="display:inline-flex;width:${size + 8}px;height:${size + 8}px;align-items:center;justify-content:center;background:${bg};margin:1px;border-radius:3px;${/mystery-man|icons\/svg\//.test(e.img) ? "outline:2px solid #e53935;" : ""}"><img src="${esc(e.img)}" width="${size}" height="${size}" style="border:none;object-fit:contain"></span>`;
  const row = (size, bg) => `<div style="background:${bg};padding:4px;line-height:0">${entries.map(e => cell(e, size, bg)).join("")}</div>`;
  return `${row(64, "#1b1b1b")}${row(64, "#efe9dc")}${row(32, "#1b1b1b")}${row(32, "#efe9dc")}${row(16, "#1b1b1b")}${row(16, "#efe9dc")}`;
}

export default {
  id: "galeria", name: "Galeria", prio: "P3", icon: "fa-solid fa-images",
  opis: "Dziennik „Poligon · Galeria”: ikony każdej paczki w 64/32/16 px na ciemnym i jasnym tle (czerwona ramka = zaślepka), ikony stanów.",
  gracze: 0,
  async build(k) {
    const pages = [];
    for (const pack of ["bron", "pancerze", "amunicja", "magazynki", "granaty", "lekarstwa", "narzedzia", "sprzet", "sztuczki", "zdolnosci-klasowe", "zdolnosci-pochodzenia", "klasy", "profesje", "pochodzenia", "bestiariusz", "towarzysze"]) {
      const docs = await packDocs(pack);
      const seen = new Set();
      const entries = docs.filter(d => d.img && !seen.has(d.img) && seen.add(d.img)).map(d => ({ name: d.name, img: d.img }));
      const placeholders = docs.filter(d => !d.img || /mystery-man|icons\/svg\//.test(d.img)).length;
      pages.push({ name: `${pack} (${docs.length}, zaślepek ${placeholders})`, type: "text", text: { content: `<p>${docs.length} wpisów, ${entries.length} różnych ikon, zaślepek: ${placeholders}.</p>${grid(entries)}`, format: 1 } });
    }
    const statuses = CONFIG.statusEffects.filter(s => s.img).map(s => ({ name: game.i18n.localize(s.name ?? s.id), img: s.img }));
    pages.push({ name: `Stany (${statuses.length})`, type: "text", text: { content: grid(statuses), format: 1 } });
    const j = await JournalEntry.implementation.create({ name: "Poligon · Galeria", pages, flags: k.flags({ key: "galeria" }) });
    k.note(`Galeria: ${pages.length} stron`);
    j.sheet.render(true);
    return { strony: pages.length };
  },
  proby: [
    p("spojnosc", "Ikony", "Spójność ikon w paczce i między paczkami: grubość kreski, kadr, kolor", "Strony dziennika po kolei, jasne i ciemne tło."),
    p("male", "Ikony", "Czytelność przy 16 px (pasek makr, listy)", "Rząd 16 px."),
    p("zaslepki", "Ikony", "Zaślepki (czerwona ramka) — czy wszystkie są w dev/icons/MISSING.md?", "Porównaj z MISSING.md."),
    p("stany", "Ikony", "Ikony stanów na żetonach przy dwóch zbliżeniach", "Lazaret → żetony; tu wzorzec.")
  ]
};
