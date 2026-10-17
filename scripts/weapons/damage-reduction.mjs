/**
 * Neuroshima 5e — Material Damage Reduction in dnd5e's damage tray.
 *
 * A row of material buttons under each target group of the `<damage-application>` tray on a damage card:
 *
 *   R: [Brak] [Drewno] [Beton] [SzkłoPC] [Stal] [Tytan]
 *
 * Cover-material flat reductions per neuroshima_5e_modifications.md §4.3 (shooting through cover):
 *   Level 1 wood/plastic −5 · 2 concrete −10 · 3 armored glass −15 · 4 steel −20 · 5 titanium −40.
 *
 * The reduction comes off the multiplied dice total BEFORE the actor's resistances and immunities. dnd5e has no
 * flat-reduction step there, so it is expressed as a scaled multiplier: `(dice × multiplier − R) / dice`.
 *
 * ## dnd5e 6.0 (PLAN_migracja_dnd5e6.md E5)
 *
 * 5.3's tray had one list entry per target and a `_onChangeOptions` handler; this file patched four of its
 * methods. 6.0 rewrote the tray: targets with the same result share one pill (grouping by computed damage),
 * corrections live in a private per-group pane, `_onChangeOptions` is gone, and every number — the pill, the
 * pane, the grouping key, the applied damage — comes from `actor.calculateDamage(damages, options)` with the
 * target's options. So the reduction now sits in the target options and one `dnd5e.preCalculateDamage` hook turns
 * it into the scaled multiplier: display, grouping and application agree by construction, and only
 * `buildTargetListEntry` is wrapped, to add the buttons. Trays are the GM's (D7).
 */

const PATCH_FLAG = Symbol("neuro-damage-reduction-patched");
const OPTION_KEY = "neuroReduction";        // in the tray's per-target options (`getTargetOptions(uuid)`)
const APPLIED_KEY = "neuroReductionApplied"; // set on an options object once its multiplier is scaled

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

/**
 * The multiplier that takes `reduction` off `damages` before resistances: `(dice × multiplier − R) / dice`.
 * Healing and multipliers ≤ 0 are left alone. Pure, for the tests.
 * @param {{value: number, type: string}[]} damages
 * @param {number} multiplier
 * @param {number} reduction
 * @returns {number}
 */
export function reducedMultiplier(damages, multiplier, reduction) {
  const dice = (damages ?? []).filter(d => !(d.type in (CONFIG.DND5E.healingTypes ?? {})))
    .reduce((s, d) => s + (Number(d.value) || 0), 0);
  if (!(reduction > 0) || !(multiplier > 0) || !(dice > 0)) return multiplier;
  return Math.max(0, dice * multiplier - reduction) / dice;
}

/** `dnd5e.preCalculateDamage`: the material reduction of these options becomes their multiplier (once). */
function _onPreCalculateDamage(actor, damages, options) {
  const reduction = options?.[OPTION_KEY] ?? 0;
  if (!(reduction > 0) || options[APPLIED_KEY]) return;
  options.multiplier = reducedMultiplier(damages, options.multiplier ?? 1, reduction);
  options[APPLIED_KEY] = true;
}

function _reductionMenu(current) {
  const menu = document.createElement("menu");
  menu.classList.add("neuro-reduction-buttons", "unlist");
  menu.insertAdjacentHTML("beforeend", `<li><span class="neuro-reduction-label" title="Redukcja materiału">R:</span></li>`);
  for (const mat of MATERIAL_REDUCTIONS) {
    menu.insertAdjacentHTML("beforeend", `<li>
      <button class="reduction-button" type="button" data-reduction="${mat.reduction}"
              title="${mat.label}${mat.reduction > 0 ? ` (−${mat.reduction})` : ""}"
              aria-pressed="${mat.reduction === current ? "true" : "false"}"><span>${mat.label}</span></button>
    </li>`);
  }
  if (current > 0) {
    menu.insertAdjacentHTML("beforeend", `<li><span class="neuro-reduction-badge" title="Redukcja materiału: −${current}">−${current}</span></li>`);
  }
  return menu;
}

function _patchBuildTargetListEntry(DamageApplicationElement) {
  const orig = DamageApplicationElement.prototype.buildTargetListEntry;
  // 6.0: `(targetList, {uuid, name})`; returns the group's `<li>` only when it opens a new group.
  DamageApplicationElement.prototype.buildTargetListEntry = function (targetList, entry = {}) {
    const li = orig.call(this, targetList, entry);
    if (!li || !game.user.isGM) return li;
    const current = this.getTargetOptions(entry.uuid)?.[OPTION_KEY] ?? 0;
    const menu = _reductionMenu(current);
    menu.addEventListener("click", event => {
      const button = event.target.closest("button.reduction-button");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation(); // not a click on the pill (the tray's own pane handler)
      const value = Number(button.dataset.reduction ?? 0);
      // The whole group: its targets are the options of the pill's datalist.
      for (const option of li.querySelectorAll("datalist option")) this.getTargetOptions(option.value)[OPTION_KEY] = value;
      targetList.buildTargetsList(); // regroup and recompute — a reduced target leaves its group
    });
    li.append(menu);
    return li;
  };
}

export function registerDamageReductionUI() {
  Hooks.on("dnd5e.preCalculateDamage", _onPreCalculateDamage);
  Hooks.once("ready", () => {
    const DamageApplicationElement = customElements.get("damage-application");
    if (!DamageApplicationElement) {
      console.warn("Neuroshima 5e | <damage-application> custom element not found — material reduction UI skipped");
      return;
    }
    if (DamageApplicationElement.prototype[PATCH_FLAG]) return;
    DamageApplicationElement.prototype[PATCH_FLAG] = true;
    _patchBuildTargetListEntry(DamageApplicationElement);
    console.log("Neuroshima 5e | Damage reduction UI registered (material buttons)");
  });
}
