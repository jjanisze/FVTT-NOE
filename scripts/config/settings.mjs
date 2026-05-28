const MODULE_ID = "neuroshima-2026-overrides";

export function registerSettings() {
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
