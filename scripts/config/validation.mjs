const MODULE_ID = "neuroshima-2026-overrides";

/**
 * Register validation hooks to catch broken data structures (like missing damage dice).
 */
export function registerValidation() {
  const originalItemUse = CONFIG.Item.documentClass.prototype.use;
  
  // Zabezpieczenie przed pokazaniem okna wyboru akcji dla broni, z których system i tak nie pozwoli strzelać
  CONFIG.Item.documentClass.prototype.use = async function(config = {}, dialog = {}, message = {}) {
    if (this.type === "weapon" && !this.pack) { // nie sprawdzamy z kompendiów
      const qty = this.system?.quantity ?? 0;
      const equipped = this.system?.equipped ?? false;
      
      if (qty <= 0 || !equipped) {
        ui.notifications?.warn(`Sięgasz po ${this.name}, a tam nic!`);
        return null; // Zablokuj całkowicie dalszy proces
      }
    }
    return originalItemUse.call(this, config, dialog, message);
  };

  Hooks.on("dnd5e.preUseActivity", (activity, usageConfig, dialogConfig, messageConfig) => {
    const item = activity.item;
    
    // Zapobiegaj użyciu broni, gdy jej fizyczna ilość wynosi 0 lub nie jest wyposażona (dodatkowo broni przed użyciem aktywności z np. makr czy chat card)
    if (item && item.type === "weapon") {
      const qty = item.system?.quantity ?? 0;
      const equipped = item.system?.equipped ?? false;
      
      if (qty <= 0 || !equipped) {
        ui.notifications?.warn(`Sięgasz po ${item.name}, a tam nic!`);
        return false;
      }
    }

    // Check if the activity has damage parts but they are malformed
    if (activity.damage?.parts?.length) {
      for (const [index, part] of activity.damage.parts.entries()) {
        if (!part.denomination && part.number) {
          console.warn(`${MODULE_ID} | OSTRZEŻENIE: Aktywność "${activity.name}" w przedmiocie "${activity.item?.name}" ma uszkodzone obrażenia (brak parametru \`denomination\` dla rzutu kO). Część #${index}:`, part);
          ui.notifications?.warn(`Uszkodzona konfiguracja obrażeń w broni: ${activity.item?.name}. Zobacz konsolę F12.`);
        }
      }
    }
  });

  // Also hook chat rendering to warn if damage button is present but will fail
  Hooks.on("renderChatMessageHTML", (message, html) => {
    const activityInfo = message.flags?.dnd5e?.activity;
    if (!activityInfo) return;
    
    const itemId = message.flags?.dnd5e?.item?.id || activityInfo.item?.id;
    if (!itemId) return;
    
    // We defer slightly if we need DOM
    setTimeout(() => {
      const actor = message.getAssociatedActor();
      if (!actor) return;
      
      const item = actor.items.get(itemId);
      if (!item) return;

      const activity = item.system.activities?.get(activityInfo.id);
      if (!activity) return;

      if (activity.damage?.parts?.length) {
        let isBroken = false;
        for (const part of activity.damage.parts) {
          if (!part.denomination && part.number) isBroken = true;
        }

        if (isBroken) {
          const el = html instanceof HTMLElement ? html : html?.[0];
          const dmgButton = el?.querySelector('button[data-action="rollDamage"]');
          if (dmgButton) {
            dmgButton.style.backgroundColor = "#ffdddd";
            dmgButton.style.color = "red";
            dmgButton.style.border = "1px solid red";
            dmgButton.title = "Ostrzeżenie: Ta aktywność posiada uszkodzone dane obrażeń!";
          }
        }
      }
    });
  });
}
