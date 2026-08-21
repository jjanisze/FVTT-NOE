/**
 * Neuroshima 5e — Fuks display in the sheet header.
 *
 * dnd5e renders a single Inspiration star next to the level badge, backed by the
 * boolean `system.attributes.inspiration`. Fuks is not a boolean — a character
 * holds 0–3 of them (RAW), and the real resource already lives in
 * `flags.<module>.fuksy`, where `combat/rerolls.mjs` spends it.
 *
 * The star is therefore removed and replaced with three clickable clover pips
 * bound to that flag, so the header shows the same number the reroll button
 * offers. Clicking pip N sets the count to N; clicking the highest filled pip
 * steps back down, matching how the Zranienie pips behave.
 */

import { getFuksy, setFuksy, MAX_FUKSY } from "../combat/rerolls.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const PIPS_CLASS = "neuro-fuks-pips";

export function registerFuksPips() {
  Hooks.on("renderCharacterActorSheet", _onRenderCharacterSheet);
  console.log("Neuroshima 5e | Fuks pips registered");
}

function _onRenderCharacterSheet(app, html) {
  const actor = app.document ?? app.actor;
  if (actor?.type !== "character") return;

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

  const editable = actor.isOwner && app.isEditable !== false;
  const count = getFuksy(actor);

  const wrap = document.createElement("div");
  wrap.className = PIPS_CLASS;
  wrap.dataset.tooltip = `Fuks: ${count}/${MAX_FUKSY}`;
  wrap.setAttribute("aria-label", `Fuks ${count} z ${MAX_FUKSY}`);

  for (let i = 1; i <= MAX_FUKSY; i++) {
    const pip = document.createElement("button");
    pip.type = "button";
    pip.className = `neuro-fuks-pip ${i <= count ? "is-filled" : ""}`.trim();
    pip.dataset.n = String(i);
    pip.innerHTML = `<i class="fa-solid fa-clover"></i>`;
    pip.setAttribute("aria-label", `Fuks ${i}`);
    if (editable) {
      pip.addEventListener("click", async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        const n = Number(ev.currentTarget.dataset.n);
        await setFuksy(actor, n === count ? n - 1 : n);
      });
    } else {
      pip.disabled = true;
    }
    wrap.appendChild(pip);
  }

  if (anchor) anchor.after(wrap);
  else right.prepend(wrap);
}
