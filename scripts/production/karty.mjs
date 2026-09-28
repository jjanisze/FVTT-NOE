/**
 * Neuroshima 5e — karty czatu produkcji (PLAN_produkcja §1.4: każda zmiana Roboty to wiadomość).
 *
 * Czysty HTML, bez importów lejka — przyciski niosą `data-neuro-robota="<akcja>"` i `data-uuid`,
 * a kliknięcia łapie jeden nasłuch w fazie capture na `document` (`robota.mjs`; ARCHITECTURE §9 —
 * nasłuch w fazie bąbelkowania na `renderChatLog` potrafi nigdy nie dostać kliknięcia).
 * Przyciski z `gm: true` znikają graczom przy renderze.
 */

import { fmtGGMM } from "../config/production-rules.mjs";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/**
 * @param {object} o
 * @param {string} o.ikona
 * @param {string} o.tytul
 * @param {string} [o.podtytul]
 * @param {"praca"|"test"|"sukces"|"porazka"|"porzucenie"|"szybka"|"info"} [o.rodzaj]
 * @param {{postep: number, wymagane: number}|null} [o.pasek]
 * @param {string[]} [o.linie]        HTML (zaufany — budowany w module)
 * @param {string[]} [o.ostrzezenia]  tekst
 * @param {{akcja: string, label: string, uuid?: string, gm?: boolean, dane?: Record<string, string|number>, ikona?: string}[]} [o.przyciski]
 */
export function kartaProdukcji({ ikona, tytul, podtytul = "", rodzaj = "praca", pasek = null, linie = [], ostrzezenia = [], przyciski = [] }) {
  const pct = pasek && pasek.wymagane > 0 ? Math.min(100, Math.round((pasek.postep / pasek.wymagane) * 100)) : null;
  const bar = pasek ? `
    <div class="neuro-robota-pasek" title="${pct}%"><div style="width:${pct}%"></div></div>
    <div class="neuro-robota-postep">${fmtGGMM(pasek.postep)} / ${fmtGGMM(pasek.wymagane)}</div>` : "";
  const warn = ostrzezenia.map(t => `<div class="neuro-robota-ostrzezenie"><i class="fa-solid fa-triangle-exclamation" inert></i> ${esc(t)}</div>`).join("");
  const btns = przyciski.map(b => {
    const dane = Object.entries(b.dane ?? {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join("");
    return `<button type="button" class="neuro-robota-btn${b.gm ? " neuro-gm-only" : ""}" data-neuro-robota="${esc(b.akcja)}"`
      + `${b.uuid ? ` data-uuid="${esc(b.uuid)}"` : ""}${dane}>`
      + `${b.ikona ? `<i class="${esc(b.ikona)}" inert></i> ` : ""}${esc(b.label)}</button>`;
  }).join("");
  return `<div class="neuro-robota-card is-${esc(rodzaj)}">
    <header class="neuro-robota-head">
      <img src="${esc(ikona)}" alt="">
      <div class="neuro-robota-tytul"><strong>${esc(tytul)}</strong>${podtytul ? `<span>${esc(podtytul)}</span>` : ""}</div>
    </header>
    ${bar}
    ${linie.map(l => `<p class="neuro-robota-linia">${l}</p>`).join("")}
    ${warn}
    ${btns ? `<div class="neuro-robota-przyciski">${btns}</div>` : ""}
  </div>`;
}

/** „30 CH · 4 CZ · 1 MK” */
export function fmtSurowce(map) {
  const parts = Object.entries(map ?? {}).filter(([, v]) => v > 0).map(([k, v]) => `${Math.round(v * 100) / 100} ${k}`);
  return parts.length ? parts.join(" · ") : "—";
}

/** Ukrywa przyciski MG u graczy — hak `renderChatMessageHTML`. */
export function ukryjPrzyciskiMG(message, html) {
  if (game.user.isGM) return;
  const el = html instanceof HTMLElement ? html : html?.[0];
  el?.querySelectorAll(".neuro-robota-card .neuro-gm-only").forEach(b => b.remove());
}
