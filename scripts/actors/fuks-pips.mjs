/**
 * Neuroshima 5e — Fuks display in the sheet header.
 *
 * dnd5e renders a single Inspiration star next to the level badge, backed by the
 * boolean `system.attributes.inspiration`. Fuks is not a boolean — a character
 * holds 0–3 of them (RAW), each with a source and possibly a term (Fuksy v2,
 * PLAN_m5_postoj U24, D15), stored in `flags.<module>.fuksy` (`actors/fuksy.mjs`).
 *
 * The star is therefore removed and replaced with three clover pips: the colour of
 * the source, a ring for a permanent Fuks (like persistent Wyczerpanie), a tooltip
 * "Fuks: <origin> — do <time>". Permanent ones sit on the left; the rightmost is the
 * first to be spent or to expire. A GM click opens the Fuks window (add with source
 * and term, remove); players read, the reroll button spends.
 */

import { MAX_FUKSY, ZRODLA_FUKSOW, jestTrwaly as _trwaly } from "../config/fuksy-rules.mjs";
import { fuksy, dymekFuksa, oknoFuksow } from "./fuksy.mjs";
import { jestTowarzyszem } from "./towarzysze.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const PIPS_CLASS = "neuro-fuks-pips";

export function registerFuksPips() {
  Hooks.on("renderCharacterActorSheet", _onRenderCharacterSheet);
  console.log("Neuroshima 5e | Fuks pips registered");
}

function _onRenderCharacterSheet(app, html) {
  const actor = app.document ?? app.actor;
  if (actor?.type !== "character" || jestTowarzyszem(actor)) return; // towarzysz bez Fuksów (D5 M3)

  const root = html instanceof HTMLElement ? html
    : html?.[0] instanceof HTMLElement ? html[0]
    : html?.element instanceof HTMLElement ? html.element
    : null;
  if (!root) return;

  const right = root.querySelector(".sheet-header .right");
  if (!right) return;

  // Anchor on the level badge, not the star: the star is removed below, and a
  // detached node's `.after()` silently no-ops.
  const anchor = right.querySelector(".level-badge");

  // Drop the native boolean star — it is not the Fuks resource and toggling it
  // silently desynchronises the header from the reroll button.
  right.querySelector("button.inspiration")?.remove();
  right.querySelector(`.${PIPS_CLASS}`)?.remove();

  const lista = fuksy(actor);
  // Trwałe z lewej, potem „do końca sesji”, potem ulotne od najpóźniej wygasającego — skrajny prawy
  // schodzi pierwszy (zużycie i zegar), jak pipki Wyczerpania.
  const pokaz = [...lista].reverse();
  const count = pokaz.length;

  const wrap = document.createElement("div");
  wrap.className = PIPS_CLASS;
  wrap.dataset.tooltip = count
    ? pokaz.map(f => foundry.utils.escapeHTML(dymekFuksa(f))).join("<br>")
    : `Fuks: 0/${MAX_FUKSY}`;
  wrap.setAttribute("aria-label", `Fuks ${count} z ${MAX_FUKSY}`);

  for (let i = 1; i <= MAX_FUKSY; i++) {
    const f = pokaz[i - 1] ?? null;
    const pip = document.createElement("button");
    pip.type = "button";
    pip.className = ["neuro-fuks-pip", f ? "is-filled" : "", f && _trwaly(f) ? "is-trwaly" : ""].filter(Boolean).join(" ");
    pip.dataset.n = String(i);
    if (f) {
      pip.style.setProperty("--fuks-kolor", ZRODLA_FUKSOW[f.zrodlo]?.kolor ?? "#f3c969");
      pip.dataset.tooltip = foundry.utils.escapeHTML(dymekFuksa(f));
    }
    pip.innerHTML = `<i class="fa-solid fa-clover"></i>`;
    pip.setAttribute("aria-label", `Fuks ${i}`);
    if (game.user.isGM) {
      pip.addEventListener("click", ev => {
        ev.preventDefault();
        ev.stopPropagation();
        oknoFuksow(actor);
      });
    } else {
      pip.disabled = true;
    }
    wrap.appendChild(pip);
  }

  if (anchor) anchor.after(wrap);
  else right.prepend(wrap);
}
