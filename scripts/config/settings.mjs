const MODULE_ID = "neuroshima-2026-overrides";

/**
 * Kolor Kobaltu — see `docs/Kobalt.md` (player/GM-facing rule catalog, Polish) and
 * `PLAN_kobalt.md` (dev-side architecture) for the full writeup. Unlike the book's own Kolory
 * (Rdza/Stal/Rtęć/Chrom — mutually exclusive campaign-start profiles, undeveloped in code),
 * Kobalt is a stackable set of home-rule patches to mechanics that are untested or don't hold up
 * on a VTT. One world-scope boolean, same shape as `forsowanieEnabled` in `combat/rerolls.mjs`.
 * Default `true`: the GM's assumption is 80%+ of tables play with it on.
 */
/**
 * `game` doesn't exist outside a running Foundry client — `dev/packs/build-packs.mjs` calls
 * this (via `latarka.mjs`'s `_light()`/`_descriptionTail()`) from plain Node to bake a
 * flavor-text description into the compendium, and until now that threw `ReferenceError: game
 * is not defined`, unnoticed because nobody had rebuilt the `bron`/`sprzet` packs since Kobalt
 * shipped. Falls back to the setting's own registered default (see below) rather than crashing.
 */
export function isKobaltEnabled() {
  if (typeof game === "undefined") return true; // matches `kobaltEnabled`'s own `default: true`
  return game.settings.get(MODULE_ID, "kobaltEnabled");
}

export function registerSettings() {
  game.settings.register(MODULE_ID, "kobaltEnabled", {
    name: "Kolor Kobaltu",
    hint: "Włącza zestaw domowych poprawek zasad (zob. docs/Kobalt.md) — zasięgi latarek, "
      + "doładowanie pochodni itp. Można łączyć z dowolnym innym Kolorem.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, "weaponSoundVolume", {
    name: "Głośność efektów dźwiękowych",
    hint: "Ustawienie głośności (od 0 do 1) dla efektów dźwiękowych broni (np. strzał, przeładowanie, zacięcie).",
    scope: "client",
    config: true,
    type: Number,
    range: {
      min: 0,
      max: 1,
      step: 0.05
    },
    default: 0.5
  });

  // Inject a Reset button for the volume
  Hooks.on("renderSettingsConfig", (app, html) => {
    // We look for our setting in the rendered HTML
    const input = html[0].querySelector(`input[name="${MODULE_ID}.weaponSoundVolume"]`);
    if (!input) return;

    const formGroup = input.closest(".form-group");
    if (!formGroup) return;

    const formFields = formGroup.querySelector(".form-fields");
    if (!formFields) return;

    // Create the Reset button
    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.title = "Zresetuj do 50%";
    resetBtn.innerHTML = '<i class="fas fa-undo"></i>';
    resetBtn.style.flex = "0 0 30px";
    resetBtn.style.marginLeft = "8px";

    resetBtn.addEventListener("click", () => {
      input.value = 0.5;
      // Trigger vanilla Foundry range slider update manually
      const event = new Event("change", { bubbles: true });
      input.dispatchEvent(event);
      
      // Foundry's range span has a corresponding class .range-value
      const rangeValue = formFields.querySelector(".range-value");
      if (rangeValue) {
        rangeValue.textContent = "0.5";
      }
    });

    formFields.appendChild(resetBtn);
  });
}
