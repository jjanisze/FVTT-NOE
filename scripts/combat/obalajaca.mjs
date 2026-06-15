const MODULE_ID = "neuroshima-2026-overrides";

export function registerObalajaca() {
  Hooks.on('renderChatMessageHTML', (message, html) => {
    const itemUuid = message.getFlag('dnd5e', 'item')?.uuid || message.getFlag('dnd5e', 'roll')?.itemUuid || message.getFlag('dnd5e', 'use')?.itemUuid;
    if (!itemUuid) return;
    
    let item;
    try {
        item = fromUuidSync(itemUuid);
    } catch(e) {}
    
    if (!item) return;

    // Check via property flag (primary) or fallback to description text
    const props = item.system?.properties ?? new Set();
    let hasObalajaca = props.has?.("obalajaca")
      || item.system.description?.value?.toLowerCase().includes('obalająca');

    // Check ammo properties too
    if (!hasObalajaca && item.type === 'weapon') {
        const ammoId = item.system.consume?.target;
        const ammo = ammoId ? item.actor?.items.get(ammoId) : null;
        if (ammo) {
            const ammoProps = ammo.system?.properties ?? new Set();
            hasObalajaca = ammoProps.has?.("obalajaca")
              || ammo.system.description?.value?.toLowerCase().includes('obalająca');
        }
    }

    // Check if weapon has Dociążenie addon installed (grants Utrudnienie on save)
    const addons = item.getFlag?.(MODULE_ID, "addons") ?? [];
    const hasDociazenie = Array.isArray(addons)
      ? addons.some(a => a.id === "dociazone")
      : "dociazone" in addons;

    // Compute save DC: 8 + proficiency + STR (or DEX for finesse)
    let saveDC = 10;
    if (item.actor) {
        const prof = item.actor.system?.attributes?.prof ?? 0;
        const strMod = item.actor.system?.abilities?.str?.mod ?? 0;
        const dexMod = item.actor.system?.abilities?.dex?.mod ?? 0;
        const isFinesse = (item.system?.properties instanceof Set)
            ? item.system.properties.has('fin')
            : !!item.system?.properties?.fin;
        const abilMod = (isFinesse && dexMod > strMod) ? dexMod : strMod;
        saveDC = 8 + prof + abilMod;
    }

    if (hasObalajaca) {
        const dcLabel = `ST ${saveDC}`;
        const modeLabel = hasDociazenie ? ` · Utrudnienie` : ``;
        const buttonHtml = `
          <button class="obalajaca-btn" data-has-dociazenie="${hasDociazenie}" data-save-dc="${saveDC}" style="margin-top: 5px; color: #cc0000; border: 1px solid #cc0000; background: rgba(204, 0, 0, 0.1);">
            <i class="fas fa-hammer"></i> Cecha: Obalająca [${dcLabel}${modeLabel}]
          </button>
        `;
        
        const el = html instanceof HTMLElement ? html : html[0];
        const buttonsContainer = el.querySelector('.card-buttons') ?? el.querySelector('.message-content');
        if (buttonsContainer) buttonsContainer.insertAdjacentHTML('beforeend', buttonHtml);
    }
  });

  Hooks.on('renderChatLog', (app, html, data) => {
    const el = html instanceof HTMLElement ? html : html[0];
    el.addEventListener('click', async (event) => {
      const btn = event.target.closest('.obalajaca-btn');
      if (!btn) return;
      event.preventDefault();
        const targets = Array.from(game.user.targets);
        const hasDociazenie = btn.dataset.hasDociazenie === "true";
        const saveDC = parseInt(btn.dataset.saveDc ?? "10", 10);
        
        if (targets.length === 0) {
            ui.notifications.warn('Zaznacz (target) cel, który ma otrzymać efekt Obalająca.');
            return;
        }

        for (let target of targets) {
            const size = target.actor?.system?.traits?.size;
            const allowedSizes = ['tiny', 'sm', 'med'];
            let proceed = true;

            if (size && !allowedSizes.includes(size)) {
                proceed = await foundry.applications.api.DialogV2.confirm({
                    window: { title: 'Obalająca - Duży Cel' },
                    content: `<p>Cel <b>${target.name}</b> ma większy rozmiar niż Średni.</p><p>Cecha Obalająca normalnie dotyczy tylko istot do średniego rozmiaru. Czy chcesz wymusić RO na Siłę?</p>`,
                    yes: { label: "Tak, wymuś RO" },
                    no: { label: "Anuluj" },
                    rejectClose: false,
                });
            }

            if (proceed) {
                const rollConfig = {
                    ability: "str",
                    targetValue: saveDC,
                };
                // Dociążenie: Utrudnienie na rzucie obronnym przeciwko Powaleniu
                if (hasDociazenie) {
                    rollConfig.disadvantage = true;
                }
                const rolls = await target.actor.rollSavingThrow(rollConfig, { configure: false }, { create: true });
                const roll = Array.isArray(rolls) ? rolls[0] : rolls;

                if (roll) {
                    if ((roll.total ?? 0) < saveDC) {
                        const proneEffect = CONFIG.statusEffects.find(e => e.id === 'prone');
                        if (proneEffect) {
                            await target.actor.toggleStatusEffect(proneEffect.id, { active: true });
                            ui.notifications.info(`Obalająca: ${target.name} oblał RO i zostaje powalony!`);
                        }
                    } else {
                        ui.notifications.info(`Obalająca: ${target.name} zdał RO i powstrzymał powalenie.`);
                    }
                }
            }
        }
    });
  });
}

