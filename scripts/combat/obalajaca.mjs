export function registerObalajaca() {
  Hooks.on('renderChatMessage', (message, html, data) => {
    const itemUuid = message.getFlag('dnd5e', 'item')?.uuid || message.getFlag('dnd5e', 'roll')?.itemUuid || message.getFlag('dnd5e', 'use')?.itemUuid;
    if (!itemUuid) return;
    
    let item;
    try {
        item = fromUuidSync(itemUuid);
    } catch(e) {}
    
    if (!item) return;

    let hasObalajaca = item.system.description?.value?.toLowerCase().includes('obalająca');
    if (item.type === 'weapon' && item.system.consume?.target) {
        const ammoId = item.system.consume.target;
        const ammo = item.actor?.items.get(ammoId);
        if (ammo && ammo.system.description?.value?.toLowerCase().includes('obalająca')) {
            hasObalajaca = true;
        }
    }

    if (hasObalajaca) {
        const buttonHtml = `
          <button class="obalajaca-btn" data-item-uuid="" style="margin-top: 5px; color: #cc0000; border: 1px solid #cc0000; background: rgba(204, 0, 0, 0.1);">
            <i class="fas fa-hammer"></i> Cecha: Obalająca
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
        
        if (targets.length === 0) {
            ui.notifications.warn('Zaznacz (target) cel, który ma otrzymać efekt Obalająca.');
            return;
        }

        for (let target of targets) {
            const size = target.actor?.system?.traits?.size;
            const allowedSizes = ['tiny', 'sm', 'med'];
            let proceed = true;

            if (size && !allowedSizes.includes(size)) {
                proceed = await Dialog.confirm({
                    title: 'Obalająca - Duży Cel',
                    content: `<p>Cel <b>${target.name}</b> ma większy rozmiar niż Średni.</p><p>Cecha Obalająca normalnie dotyczy tylko istot do średniego rozmiaru. Czy chcesz wymusić RO na Siłę?</p>`
                });
            }

            if (proceed) {
                const saveDC = 10;
                const roll = await target.actor.rollAbilitySave('str', {
                    chatMessage: true,
                    fastForward: true,
                    targetValue: saveDC
                });

                if (roll) {
                    if (roll.total < saveDC) {
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
