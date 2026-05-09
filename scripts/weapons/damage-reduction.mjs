/**
 * Neuroshima 5e — Material Damage Reduction UI.
 *
 * Patches DamageApplicationElement (the <damage-application> web component
 * inside dnd5e damage-roll chat cards) to add a second row of buttons below
 * the existing multiplier buttons (-1 0 ¼ ½ 1 2).
 *
 * New row: "Redukcja:" [Brak] [Drewno] [Beton] [SzkłoPC] [Stal] [Tytan]
 *
 * These correspond to cover-material flat damage reductions per
 * neuroshima_5e_modifications.md §4.3 (shoot-through-cover rules):
 *   Level 1 wood/plastic  → −5
 *   Level 2 concrete      → −10
 *   Level 3 armored glass → −15
 *   Level 4 steel         → −20
 *   Level 5 titanium      → −40
 *
 * Reduction is applied BEFORE actor resistances/immunities (flat subtraction
 * on the multiplied dice total), matching the Neuroshima rules intent.
 *
 * Implementation strategy: monkey-patch four prototype methods of
 * DamageApplicationElement after "ready" (when the custom element is defined).
 * Existing multiplier-button state management is preserved untouched.
 */

const PATCH_FLAG = Symbol("neuro-damage-reduction-patched");
const OPTION_KEY  = "neuroReduction";  // key stored in getTargetOptions() result

/**
 * Ordered list of cover materials with their flat damage reduction values.
 * @type {readonly { key: string, label: string, reduction: number }[]}
 */
export const MATERIAL_REDUCTIONS = Object.freeze([
  { key: "none",  label: "Brak",    reduction: 0  },
  { key: "wood",  label: "Drewno",  reduction: 5  },
  { key: "beton", label: "Beton",   reduction: 10 },
  { key: "glass", label: "SzkłoPC", reduction: 15 },
  { key: "steel", label: "Stal",    reduction: 20 },
  { key: "titan", label: "Tytan",   reduction: 40 },
]);

/* ─────────────────────────────────────────────────────────────────── */
/*  Public registration                                                 */
/* ─────────────────────────────────────────────────────────────────── */

export function registerDamageReductionUI() {
  Hooks.once("ready", () => {
    const DamageApplicationElement = customElements.get("damage-application");
    if (!DamageApplicationElement) {
      console.warn("Neuroshima 5e | <damage-application> custom element not found — material reduction UI skipped");
      return;
    }
    if (DamageApplicationElement.prototype[PATCH_FLAG]) return;
    DamageApplicationElement.prototype[PATCH_FLAG] = true;

    _patchBuildTargetListEntry(DamageApplicationElement);
    _patchOnChangeOptions(DamageApplicationElement);
    _patchRefreshListEntry(DamageApplicationElement);
    _patchOnApplyDamage(DamageApplicationElement);

    console.log("Neuroshima 5e | Damage reduction UI registered (material buttons)");
  });
}

/* ─────────────────────────────────────────────────────────────────── */
/*  1. buildTargetListEntry — add reduction buttons row                */
/* ─────────────────────────────────────────────────────────────────── */

function _patchBuildTargetListEntry(DamageApplicationElement) {
  const orig = DamageApplicationElement.prototype.buildTargetListEntry;

  DamageApplicationElement.prototype.buildTargetListEntry = function({ uuid, name }) {
    const li = orig.call(this, { uuid, name });
    if (!li) return li;

    /* Read the CURRENT reduction so buttons reflect persisted state after re-open */
    const currentReduction = this.getTargetOptions(uuid)[OPTION_KEY] ?? 0;

    /* Build the reduction menu — same grid layout as .damage-multipliers */
    const menu = document.createElement("menu");
    menu.classList.add("neuro-reduction-buttons", "unlist");

    /* First grid cell: "R:" label to match the "×" prefix in the multiplier row */
    const labelLi = document.createElement("li");
    labelLi.innerHTML = `<span class="neuro-reduction-label" title="Redukcja materiału">R:</span>`;
    menu.append(labelLi);

    for (const mat of MATERIAL_REDUCTIONS) {
      const entry = document.createElement("li");
      entry.innerHTML = `
        <button class="reduction-button" type="button"
                data-reduction="${mat.reduction}"
                title="${mat.label}${mat.reduction > 0 ? ` (−${mat.reduction})` : ''}"
                aria-pressed="${mat.reduction === currentReduction ? "true" : "false"}">
          <span>${mat.label}</span>
        </button>
      `;
      menu.append(entry);
    }

    /* Insert directly after the .damage-multipliers menu */
    const multipliersMenu = li.querySelector("menu.damage-multipliers");
    if (multipliersMenu) multipliersMenu.after(menu);
    else li.append(menu);

    return li;
  };
}

/* ─────────────────────────────────────────────────────────────────── */
/*  2. _onChangeOptions — handle reduction button clicks               */
/* ─────────────────────────────────────────────────────────────────── */

function _patchOnChangeOptions(DamageApplicationElement) {
  const orig = DamageApplicationElement.prototype._onChangeOptions;

  DamageApplicationElement.prototype._onChangeOptions = async function(event) {
    const button = event.target.closest("button.reduction-button");
    if (!button) return orig.call(this, event);  // delegate multiplier / change-source buttons

    event.preventDefault();
    const uuid = event.target.closest("[data-target-uuid]")?.dataset.targetUuid;
    if (!uuid) return;

    const options = this.getTargetOptions(uuid);
    options[OPTION_KEY] = Number(button.dataset.reduction ?? 0);

    const actor = fromUuidSync(uuid);
    if (!actor) return;
    const entry = this.targetList?.querySelector(`[data-target-uuid="${actor.uuid}"]`);
    if (entry) this.refreshListEntry(actor, entry, options);
  };
}

/* ─────────────────────────────────────────────────────────────────── */
/*  3. refreshListEntry — sync pressed state + update damage total     */
/* ─────────────────────────────────────────────────────────────────── */

function _patchRefreshListEntry(DamageApplicationElement) {
  const orig = DamageApplicationElement.prototype.refreshListEntry;

  DamageApplicationElement.prototype.refreshListEntry = function(actor, entry, options) {
    /* Let the original run first — it sets multiplier pressed states, totals, etc. */
    orig.call(this, actor, entry, options);

    const reduction = options[OPTION_KEY] ?? 0;

    /* Sync reduction button pressed states */
    entry.querySelectorAll(".reduction-button").forEach(btn => {
      btn.ariaPressed = Number(btn.dataset.reduction) === reduction ? "true" : "false";
    });

    if (reduction <= 0) {
      /* Clean up badge if reduction was cleared */
      entry.querySelector(".neuro-reduction-badge")?.remove();
      return;
    }

    /* Re-calculate the damage display total accounting for the flat reduction.
     *
     * Order of operations (Neuroshima rules):
     *   1. dice total × multiplier  = rawTotal
     *   2. rawTotal − reduction     = reducedRaw   (clamped ≥ 0)
     *   3. reducedRaw × resist/imm  = final HP delta  (handled by actor)
     *
     * We pass a scaled multiplier to actor.calculateDamage so that
     * resistances/immunities still apply to the post-reduction value.
     */
    const rawDiceTotal = this.damages?.reduce((s, d) => s + (d.value ?? 0), 0) ?? 0;
    const multiplier   = options.multiplier ?? 1;

    /* Only apply material reduction to positive-multiplier damage rolls */
    if (multiplier > 0 && rawDiceTotal > 0) {
      const rawTotal   = rawDiceTotal * multiplier;
      const reducedRaw = Math.max(0, rawTotal - reduction);
      const scaledMult = reducedRaw / rawDiceTotal;  // scaledMult × dice = reducedRaw

      const { total: adjustedTotal } = this.calculateDamage(actor, {
        ...options,
        multiplier: scaledMult,
      });

      const calcEl = entry.querySelector(".calculated.damage");
      if (calcEl) {
        calcEl.innerText = _formatDamageTotal(adjustedTotal);
        calcEl.classList.toggle("healing", adjustedTotal < 0);
      }
    }

    /* Show / update the reduction badge */
    let badge = entry.querySelector(".neuro-reduction-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.classList.add("neuro-reduction-badge");
      const calcEl = entry.querySelector(".calculated.damage");
      if (calcEl) calcEl.after(badge);
      else entry.append(badge);
    }
    badge.title = `Redukcja materiału: −${reduction}`;
    badge.textContent = `−${reduction}`;
  };
}

/* ─────────────────────────────────────────────────────────────────── */
/*  4. _onApplyDamage — apply reduction via scaled multiplier          */
/* ─────────────────────────────────────────────────────────────────── */

function _patchOnApplyDamage(DamageApplicationElement) {
  /* Full replacement — keeps parity with dnd5e v5.3 original
   * (same collapse-tray logic) but scales the multiplier per target
   * to achieve flat pre-resistance reduction. */
  DamageApplicationElement.prototype._onApplyDamage = async function(event) {
    event.preventDefault();

    for (const target of this.targetList?.querySelectorAll("[data-target-uuid]") ?? []) {
      const actor   = fromUuidSync(target.dataset.targetUuid);
      if (!actor) continue;

      const options   = this.getTargetOptions(target.dataset.targetUuid);
      const reduction = options[OPTION_KEY] ?? 0;

      if (reduction > 0) {
        const rawDiceTotal = this.damages?.reduce((s, d) => s + (d.value ?? 0), 0) ?? 0;
        const multiplier   = options.multiplier ?? 1;

        if (multiplier > 0 && rawDiceTotal > 0) {
          const rawTotal   = rawDiceTotal * multiplier;
          const reducedRaw = Math.max(0, rawTotal - reduction);
          const scaledMult = reducedRaw / rawDiceTotal;

          await actor.applyDamage(this.damages, {
            ...options,
            multiplier: scaledMult,
            isDelta: true,
            origin: this.chatMessage,
          });
        }
        /* If reduction >= rawTotal → 0 damage, nothing to apply */
      } else {
        /* No reduction: identical to the original dnd5e behaviour */
        await actor.applyDamage(this.damages, {
          ...options,
          isDelta: true,
          origin: this.chatMessage,
        });
      }
    }

    if (game.settings.get("dnd5e", "autoCollapseChatTrays") !== "manual") {
      this.open = false;
    }
  };
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Helpers                                                             */
/* ─────────────────────────────────────────────────────────────────── */

/**
 * Format a damage total for display, mirroring dnd5e's
 * `formatNumber(-total, { signDisplay: "exceptZero" })` for integer values.
 *
 * @param {number} total  HP impact (positive = damage taken, negative = healing).
 * @returns {string}
 */
function _formatDamageTotal(total) {
  const val = -Math.round(total); // displayed as HP delta (negative = losing HP)
  if (val === 0)  return "0";
  if (val > 0)    return `\u2212${val}`;  // "−10"  (minus sign U+2212)
  return `+${Math.abs(val)}`;             // "+5"   (healing)
}
