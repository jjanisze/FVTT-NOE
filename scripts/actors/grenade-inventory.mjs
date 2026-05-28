import { GRENADE_TYPES, GRENADE_MAP } from "../config/ammo-data.mjs";
import { playExplosiveSoundForSubtype } from "../weapons/sounds.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

export function registerGrenadeInventory() {
  for (const hookName of ["renderActorSheet", "renderCharacterActorSheet", "renderNPCActorSheet"]) {
    Hooks.on(hookName, _onRenderActorSheetInjectGrenadeSection);
  }
  Hooks.on("renderChatMessageHTML", _onRenderExplosiveChatCard);
  console.log("Neuroshima 5e | Explosives inventory UI registered");
}

function _onRenderActorSheetInjectGrenadeSection(app, html) {
  const actor = app.document ?? app.actor;
  if (!actor || !["character", "npc"].includes(actor.type)) return;

  const root = html instanceof HTMLElement ? html
    : html?.[0] instanceof HTMLElement ? html[0]
    : html?.element instanceof HTMLElement ? html.element
    : null;
  if (!root) return;

  const inventoryTab = root.querySelector('.tab.inventory')
    ?? root.querySelector('.inventory-element')
    ?? root.querySelector('section[data-tab="inventory"]')
    ?? root.querySelector('div[data-tab="inventory"]');
  if (!inventoryTab) return;

  if (inventoryTab.querySelector('.neuro-add-grenade-btn')) return;

  let totalPrice = 0;
  let totalWeightKg = 0;

  const grenadeItems = (actor.items || []).filter(i =>
    i.type === "consumable" &&
    i.system.type?.value === "ammo" &&
    i.system.type?.subtype?.startsWith("grenade-")
  );

  const uiList = document.createElement("ul");
  uiList.className = "item-list neuro-grenade-list";
  uiList.style.marginTop = "0";
  uiList.style.padding = "0";
  uiList.style.listStyle = "none";

  for (const item of grenadeItems) {
    const qty = item.system.quantity ?? 0;
    const weight = item.system.weight?.value ?? item.system.weight ?? 0;
    const price = item.system.price?.value ?? 0;
    const subtype = item.system.type?.subtype;
    const def = GRENADE_MAP[subtype];

    let weightStr = "0 g";
    if (!isNaN(weight)) {
      const wKg = weight * qty;
      weightStr = wKg < 1 ? Math.round(wKg * 1000) + " g" : wKg.toFixed(2) + " kg";
      totalWeightKg += wKg;
    }
    totalPrice += price * qty;

    const area = def?.area ?? "—";
    const save = def?.save ?? "—";
    const effect = def?.effect ?? "—";

    const iconHtml = `<dnd5e-icon draggable="false" src="${item.img}" aria-label="${item.name}" class="item-image gold-icon" style="--icon-fill: #9f9275"></dnd5e-icon>`;

    const li = document.createElement("li");
    li.className = "item collapsible collapsed";
    li.setAttribute("data-item-id", item.id);
    li.style.listStyle = "none";
    li.style.marginBottom = "0";
    li.innerHTML = `
      <div class="item-row flexrow" style="display:flex; align-items:center; justify-content:space-between; background-color:#2f2222; min-height:42px; border-bottom:1px dotted #4a3a3a; padding:4px 5px; color:#cacdd5;">
        <div class="item-name item-action item-tooltip rollable flexrow" role="button" aria-label="${item.name}" title="Kliknij: rzuć ładunek | Shift+Klik: edytuj" style="flex:1.6; align-items:center; gap:8px; min-width:180px; cursor:pointer;">
          ${iconHtml}
          <div class="name name-stacked flexcol">
            <span class="title" style="color:#cacdd5; font-weight:500;">${item.name}</span>
          </div>
        </div>
        <div class="item-detail" style="flex:0 0 74px; text-align:center;">${price} gb</div>
        <div class="item-detail" style="flex:0 0 70px; text-align:center;">${weightStr}</div>
        <div class="item-detail" style="flex:0 0 74px; display:flex; align-items:center; justify-content:space-evenly;">
          <a class="adjustment-button always-interactive" data-action="decrease"><i class="fa-solid fa-minus" inert></i></a>
          <input type="text" class="always-interactive" value="${qty}" placeholder="0" data-dtype="Number" data-name="system.quantity" inputmode="numeric" pattern="^(\\+|-|=)?\\d*" min="0" aria-label="Ilość" style="width:34px; text-align:center;">
          <a class="adjustment-button always-interactive" data-action="increase"><i class="fa-solid fa-plus" inert></i></a>
        </div>
        <div class="item-detail" style="flex:0 0 150px; text-align:center; font-size:0.85em;">${area}</div>
        <div class="item-detail" style="flex:0 0 130px; text-align:center; font-size:0.85em;">${save}</div>
        <div class="item-detail" style="flex:2; text-align:left; font-size:0.83em; line-height:1.2; padding:0 8px;">${effect}</div>
        <div class="item-detail item-controls always-visible" style="flex:0 0 102px; text-align:right; display:flex; align-items:center; justify-content:flex-end; gap:8px;">
          <button type="button" class="unbutton config-button item-control item-throw" title="Rzuć" style="color:#ccc;"><i class="fas fa-bomb" inert></i></button>
          <button type="button" class="unbutton config-button item-control item-edit" title="Edytuj" style="color:#ccc;"><i class="fas fa-edit" inert></i></button>
          <button type="button" class="unbutton config-button item-control item-delete" title="Usuń" style="color:#ccc;"><i class="fas fa-trash" inert></i></button>
        </div>
      </div>
    `;

    const qtyInput = li.querySelector('input[data-name="system.quantity"]');
    qtyInput.addEventListener('change', async (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val)) await item.update({ "system.quantity": val });
    });

    li.querySelectorAll('.adjustment-button[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.dataset.action;
        const min = qtyInput.min !== "" ? Number(qtyInput.min) : -Infinity;
        const current = Number(qtyInput.value) || 0;
        qtyInput.value = Math.max(min, current + (action === 'increase' ? 1 : -1));
        qtyInput.dispatchEvent(new Event('change'));
      });
    });

    li.querySelector('.item-name').addEventListener('click', async (e) => {
      e.preventDefault();
      if (e.shiftKey) {
        item.sheet.render(true);
        return;
      }
      await _throwExplosive(actor, item, def);
    });

    li.querySelector('.item-throw').addEventListener('click', async (e) => {
      e.preventDefault();
      await _throwExplosive(actor, item, def);
    });

    li.querySelector('.item-edit').addEventListener('click', () => item.sheet.render(true));
    li.querySelector('.item-delete').addEventListener('click', () => item.deleteDialog());

    uiList.appendChild(li);

    const nativeLi = inventoryTab.querySelector(`li[data-item-id="${item.id}"]`);
    if (nativeLi && nativeLi.parentElement) nativeLi.style.display = "none";
  }

  const panel = document.createElement("div");
  panel.innerHTML = `
    <div class="items-header header flexrow" style="display:flex; align-items:center; justify-content:space-between; background-color:#4a1f1f; min-height:30px; border-bottom:2px solid #FFFFFF; color:#FFFFFF; font-size:0.9em; font-weight:bold; padding:0 5px;">
      <h3 class="item-name" style="flex:1.6; margin:0; padding-left:5px; color:#FFFFFF; font-size:1.1em; text-decoration:none; border:none;">Materiały wybuchowe</h3>
      <div style="flex:0 0 74px; text-align:center;">Cena</div>
      <div style="flex:0 0 70px; text-align:center;">Waga</div>
      <div style="flex:0 0 74px; text-align:center;">Ilość</div>
      <div style="flex:0 0 150px; text-align:center;">Obszar</div>
      <div style="flex:0 0 130px; text-align:center;">RO</div>
      <div style="flex:2; text-align:left; padding-left:8px;">Działanie</div>
      <div style="flex:0 0 102px;"></div>
    </div>
  `;
  panel.appendChild(uiList);

  const totalWeightFooterStr = totalWeightKg < 1
    ? Math.round(totalWeightKg * 1000) + " g"
    : totalWeightKg.toFixed(2) + " kg";

  const footer = document.createElement("div");
  footer.style.cssText = "display:flex; align-items:center; margin-top:4px; gap:0;";

  const footerBtn = document.createElement("button");
  footerBtn.type = "button";
  footerBtn.className = "neuro-add-grenade-btn";
  footerBtn.innerHTML = `<i class="fas fa-bomb"></i> DODAJ ŁADUNEK`;
  footerBtn.style.cssText = "flex:1; text-align:left; padding:4px 12px; background:rgba(72,45,45,0.25); border:1px solid #7d5f5f; color:var(--color-text-light-primary); white-space:nowrap;";
  footerBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    _showGrenadeDialog(actor);
  });

  const summary = document.createElement("div");
  summary.style.cssText = "flex:0 0 auto; display:flex; align-items:center; font-size:0.85em; color:var(--color-text-secondary, #aaa);";
  summary.innerHTML = `
    <span style="padding:0 10px; text-align:right;">Cena: <strong style="color:var(--color-text-light-primary, #e0e0e0);">${Math.round(totalPrice)} gb</strong></span>
    <span style="display:inline-block; width:1px; height:16px; background:#7d5f5f; margin:0;"></span>
    <span style="padding:0 10px; text-align:right;">Waga: <strong style="color:var(--color-text-light-primary, #e0e0e0);">${totalWeightFooterStr}</strong></span>
  `;

  footer.appendChild(footerBtn);
  footer.appendChild(summary);

  const wrapper = document.createElement("div");
  wrapper.className = "neuro-grenade-wrapper";
  wrapper.appendChild(panel);
  wrapper.appendChild(footer);

  const ammoWrapper = inventoryTab.querySelector('.neuro-ammo-wrapper');
  if (ammoWrapper) {
    ammoWrapper.before(wrapper);
  } else {
    const currencyHeader = inventoryTab.querySelector('.currency');
    if (currencyHeader) currencyHeader.after(wrapper);
    else inventoryTab.prepend(wrapper);
  }
}

async function _showGrenadeDialog(actor) {
  const options = GRENADE_TYPES.map(g => `<option value="${g.id}">${g.label} (${g.price} gb)</option>`).join("");

  const content = `
    <form>
      <div class="form-group">
        <label>Typ ładunku</label>
        <div class="form-fields">
          <select name="grenadeId" style="width:100%;">${options}</select>
        </div>
      </div>
      <div class="form-group">
        <label>Sztuk</label>
        <div class="form-fields">
          <input type="number" name="quantity" value="1" min="1" max="999">
        </div>
      </div>
    </form>
  `;

  const { DialogV2 } = foundry.applications.api;
  await DialogV2.wait({
    window: { title: "Dodaj materiały wybuchowe" },
    content,
    buttons: [
      {
        action: "add",
        icon: "fa-solid fa-check",
        label: "Dodaj",
        callback: async (_event, _button, dialog) => {
          const grenadeId = dialog.element.querySelector('[name="grenadeId"]')?.value;
          const quantity = parseInt(dialog.element.querySelector('[name="quantity"]')?.value || "0", 10);
          if (grenadeId && quantity > 0) await _addGrenadeToActor(actor, grenadeId, quantity);
        }
      },
      {
        action: "cancel",
        icon: "fa-solid fa-times",
        label: "Anuluj"
      }
    ]
  });
}

async function _addGrenadeToActor(actor, grenadeId, quantity) {
  const def = GRENADE_MAP[grenadeId];
  if (!def) return;

  const existing = actor.items.find(i =>
    i.type === "consumable" &&
    i.system.type?.value === "ammo" &&
    i.system.type?.subtype === def.id
  );

  if (existing) {
    const newQty = (existing.system.quantity ?? 0) + quantity;
    await existing.update({ "system.quantity": newQty });
    ui.notifications.info(`Zwiększono ilość ${def.label} do ${newQty}.`);
    return;
  }

  const description = `<p><strong>Obszar:</strong> ${def.area ?? "—"}</p><p><strong>RO:</strong> ${def.save ?? "—"}</p><p>${def.effect ?? ""}</p>`;

  await Item.create({
    name: def.label,
    type: "consumable",
    img: `modules/${MODULE_ID}/icons/weapons/${def.icon}`,
    system: {
      type: { value: "ammo", subtype: def.id },
      quantity,
      weight: { value: def.weight, units: "kg" },
      price: { value: def.price, denomination: "gp" },
      description: { value: description }
    }
  }, { parent: actor });

  ui.notifications.info(`Dodano ${quantity} szt. ${def.label}.`);
}

async function _throwExplosive(actor, item, def) {
  const qty = Number(item.system.quantity ?? 0);
  if (qty <= 0) {
    ui.notifications.warn(`${item.name}: brak sztuk do rzutu.`);
    return;
  }

  const subtype = item.system.type?.subtype;
  const resolved = def ?? GRENADE_MAP[subtype] ?? {
    area: "—",
    save: "—",
    effect: item.system.description?.value || "Brak opisu efektu."
  };

  const areaSpec = await _resolveAreaSpec(resolved);
  if (!areaSpec) return;

  // Wybór punktu wybuchu na scenie + pomiar odległości od rzucającego.
  const throwContext = await _selectExplosionPoint(actor, item, resolved, areaSpec);
  if (!throwContext) return;

  const throwClass = _getThrowBandClass(throwContext.distance, throwContext.range.max);
  const throwColor = _getThrowBandColor(throwClass);
  const isMine = subtype === "grenade-antipersonnel-mine" || subtype === "grenade-antivehicle-mine";

  await item.update({ "system.quantity": qty - 1 });

  playExplosiveSoundForSubtype(subtype);

  if (isMine) {
    await _placeArmedMineMarker(throwContext, throwColor, item.name);
  } else {
    await _placeExplosionTemplate(throwContext, throwColor);
  }

  const saveData = _parseSaveSpec(resolved.save);
  const damageData = _parseDamageSpec(resolved.effect);
  const chatPayload = {
    itemName: item.name,
    save: saveData,
    damage: damageData,
    isMine,
    areaLabel: throwContext.area.label,
    effectText: isMine ? "Mina uzbrojona na wskazanym polu." : (resolved.effect ?? "—")
  };

  const cardDataAttrs = [
    `data-item-name="${_escapeAttr(chatPayload.itemName)}"`,
    `data-save-ability="${_escapeAttr(chatPayload.save.ability ?? "")}"`,
    `data-save-dc="${Number.isFinite(chatPayload.save.dc) ? chatPayload.save.dc : ""}"`,
    `data-damage-formula="${_escapeAttr(chatPayload.damage.formula ?? "")}"`,
    `data-damage-type="${_escapeAttr(chatPayload.damage.type ?? "")}"`
  ].join(" ");

  const content = `
    <div class="neuro-explosive-card" ${cardDataAttrs} style="padding:8px;">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
        <img src="${item.img}" alt="${item.name}" width="28" height="28" style="border:none;" />
        <strong style="font-size:1.05em;">Rzut: ${item.name}</strong>
      </div>
      <div><strong>Odległość rzutu:</strong> <span style="color:${throwColor}; font-weight:700;">${throwContext.distance.toFixed(1)} m</span> / ${throwContext.range.max.toFixed(1)} m (SIŁ ${throwContext.range.str}, ${throwContext.range.weight.toFixed(1)} kg)</div>
      <div><strong>Obszar:</strong> ${throwContext.area.label}</div>
      <div><strong>RO:</strong> ${resolved.save ?? "—"}</div>
      <div><strong>Efekt:</strong> ${chatPayload.effectText}</div>
      <hr />
      <div class="neuro-explosive-controls" style="display:grid; gap:6px; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <strong style="font-size:0.92em;">RO:</strong>
          <span style="font-size:0.9em; opacity:0.9;">${chatPayload.save.label}</span>
          <button type="button" class="neuro-exp-roll-save" style="padding:2px 8px; border:1px solid #577a9f; background:#203345; color:#dbefff; border-radius:4px; cursor:pointer;">Rzuć RO na zaznaczonych</button>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <strong style="font-size:0.92em;">Obrażenia:</strong>
          <span style="font-size:0.9em; opacity:0.9;">${chatPayload.damage.label}</span>
          <button type="button" class="neuro-exp-roll-dmg" style="padding:2px 8px; border:1px solid #9b5f5f; background:#3f2323; color:#ffe3e3; border-radius:4px; cursor:pointer;">Rzuć obrażenia</button>
          <span style="font-size:0.8em; opacity:0.8;">Stopień i osłona: ustaw w panelu Apply Damage pod rzutem.</span>
        </div>
      </div>
      <div><em>Pozostało:</em> ${qty - 1} szt.</div>
    </div>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    flags: {
      [MODULE_ID]: {
        explosiveCard: chatPayload
      }
    }
  });
}

async function _placeArmedMineMarker(throwContext, color, name) {
  if (!canvas?.scene) return;
  const unitsPerGrid = Number(canvas.scene?.grid?.distance ?? 1);
  const pxPerGrid = Number(canvas.grid?.size ?? 100);
  const pxPerUnit = pxPerGrid / unitsPerGrid;
  const side = 1.5;
  const sidePx = side * pxPerUnit;

  await canvas.scene.createEmbeddedDocuments("Drawing", [{
    x: throwContext.target.x - (sidePx / 2),
    y: throwContext.target.y - (sidePx / 2),
    shape: {
      type: "r",
      width: sidePx,
      height: sidePx
    },
    strokeWidth: 2,
    strokeColor: color,
    strokeAlpha: 0.9,
    fillType: 1,
    fillColor: color,
    fillAlpha: 0.25,
    text: _buildSceneLabel(name),
    fontSize: 16,
    locked: false,
    flags: {
      [MODULE_ID]: {
        explosive: true,
        explosiveMine: true,
        explosiveAreaResolved: "Pole miny (1.5 m)"
      }
    }
  }]);
}

function _getActorThrowToken(actor) {
  const controlled = canvas?.tokens?.controlled ?? [];
  const own = controlled.find(t => t.actor?.id === actor.id);
  if (own) return own;

  const active = actor.getActiveTokens?.(true, true) ?? [];
  return active[0] ?? null;
}

function _parseAreaMeters(areaText) {
  if (!areaText || typeof areaText !== "string") return 3;
  const m = areaText.match(/(\d+(?:[\.,]\d+)?)\s*m/i);
  if (!m) return 3;
  return Number(String(m[1]).replace(",", ".")) || 3;
}

function _extractAreaValues(areaText) {
  if (!areaText || typeof areaText !== "string") return [];
  const matches = [...areaText.matchAll(/(\d+(?:[\.,]\d+)?)\s*m/gi)];
  return matches
    .map(m => Number(String(m[1]).replace(",", ".")))
    .filter(v => Number.isFinite(v) && v > 0);
}

async function _resolveAreaSpec(def) {
  const areaText = String(def?.area ?? "").trim();
  if (!areaText || areaText === "—") {
    return { kind: "circle", radius: 1.5, label: "Koło 3 m" };
  }

  const values = _extractAreaValues(areaText);
  const isCube = /sze(?:ś|s)cian/i.test(areaText);

  if (isCube) {
    if (values.length >= 2) {
      const chosen = await _pickCubeVariant(values[0], values[1]);
      if (!chosen) return null;
      return { kind: "cube", side: chosen.value, label: chosen.label };
    }

    const side = values[0] ?? 3;
    return { kind: "cube", side, label: `Sześcian ${side} m` };
  }

  const diameter = values[0] ?? _parseAreaMeters(areaText);
  return { kind: "circle", radius: Math.max(0.5, diameter / 2), label: `Koło ${diameter} m` };
}

async function _pickCubeVariant(openMeters, indoorMeters) {
  const { DialogV2 } = foundry.applications.api;
  return DialogV2.wait({
    window: { title: "Wariant obszaru" },
    content: `<p>Wybierz wariant obszaru dla ładunku:</p>`,
    buttons: [
      {
        action: "open",
        icon: "fa-solid fa-wind",
        label: `Teren otwarty (${openMeters} m)`,
        callback: () => ({ value: openMeters, label: `Sześcian ${openMeters} m (otwarty teren)` })
      },
      {
        action: "indoor",
        icon: "fa-solid fa-house",
        label: `W budynku (${indoorMeters} m)`,
        callback: () => ({ value: indoorMeters, label: `Sześcian ${indoorMeters} m (budynek)` })
      },
      {
        action: "cancel",
        icon: "fa-solid fa-times",
        label: "Anuluj",
        callback: () => null
      }
    ]
  });
}

function _computeThrowRange(actor, item) {
  const str = Number(actor.system?.abilities?.str?.value ?? 8);
  const weight = Number(item.system?.weight?.value ?? item.system?.weight ?? 0.5);
  const safeWeight = Math.max(0.2, weight);

  // Prosty model: im większa SIŁ i lżejszy ładunek, tym dalszy rzut.
  const max = Math.max(2, Math.round((str * 2) / safeWeight));
  const green = Math.max(1, Math.round(max * 0.5));
  const yellow = max;

  return { str, weight: safeWeight, green, yellow, max };
}

function _measureMeters(from, to) {
  if (!canvas?.grid) return 0;

  try {
    if (typeof canvas.grid.measurePath === "function") {
      const ray = { A: from, B: to };
      const path = canvas.grid.measurePath([ray]);
      const d = Number(path?.distance ?? path?.totalDistance ?? 0);
      if (!Number.isNaN(d) && d > 0) return d;
    }
  } catch (_e) {
    // fallback poniżej
  }

  try {
    if (typeof canvas.grid.measureDistance === "function") {
      const d = Number(canvas.grid.measureDistance(from, to, { gridSpaces: true }));
      if (!Number.isNaN(d) && d > 0) return d;
    }
  } catch (_e) {
    // fallback geometryczny poniżej
  }

  const dx = (to.x ?? 0) - (from.x ?? 0);
  const dy = (to.y ?? 0) - (from.y ?? 0);
  const px = Math.hypot(dx, dy);
  const unitsPerGrid = Number(canvas.scene?.grid?.distance ?? 1);
  const pxPerGrid = Number(canvas.grid?.size ?? 100);
  return (px / pxPerGrid) * unitsPerGrid;
}

function _getThrowBandClass(distance, max) {
  if (distance <= max * 0.5) return "ok";
  if (distance <= max) return "warn";
  return "danger";
}

function _getThrowBandColor(band) {
  if (band === "ok") return "#54c86a";
  if (band === "warn") return "#d8b24a";
  return "#e06666";
}

async function _pickCanvasPoint() {
  if (!canvas?.app?.stage) {
    ui.notifications.warn("Brak aktywnej sceny do wyboru punktu wybuchu.");
    return null;
  }

  ui.notifications.info("Wybierz punkt wybuchu: kliknij na mapie (ESC aby anulować).");

  return new Promise(resolve => {
    const stage = canvas.app.stage;

    const cleanup = () => {
      stage.off("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };

    const onPointerDown = (event) => {
      cleanup();
      const p = event.data.getLocalPosition(stage);
      resolve({ x: p.x, y: p.y });
    };

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      cleanup();
      resolve(null);
    };

    stage.once("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
  });
}

async function _selectExplosionPoint(actor, item, def, areaSpec) {
  const originToken = _getActorThrowToken(actor);
  if (!originToken) {
    ui.notifications.warn("Brak aktywnego tokena tej postaci na scenie. Zaznacz token i spróbuj ponownie.");
    return null;
  }

  const target = await _pickCanvasPoint();
  if (!target) return null;

  const origin = { x: originToken.center.x, y: originToken.center.y };
  const distance = _measureMeters(origin, target);
  const range = _computeThrowRange(actor, item);

  if (distance > range.max) {
    ui.notifications.warn(`Rzut poza optymalnym zasięgiem (${distance.toFixed(1)} m > ${range.max.toFixed(1)} m).`);
  }

  return { origin, target, distance, range, token: originToken, def, area: areaSpec, itemName: item?.name ?? def?.label ?? "ładunek" };
}

async function _placeExplosionTemplate(throwContext, color) {
  const area = throwContext.area ?? { kind: "circle", radius: 1.5, label: "Koło 3 m" };
  if (!canvas?.scene) return;

  const unitsPerGrid = Number(canvas.scene?.grid?.distance ?? 1);
  const pxPerGrid = Number(canvas.grid?.size ?? 100);
  const pxPerUnit = pxPerGrid / unitsPerGrid;

  const doc = {
    user: game.user.id,
    x: throwContext.target.x,
    y: throwContext.target.y,
    direction: 0,
    fillColor: color,
    borderColor: color,
    flags: {
      [MODULE_ID]: {
        explosive: true,
        explosiveAreaText: throwContext.def?.area ?? "",
        explosiveAreaResolved: area.label
      }
    }
  };

  if (area.kind === "cube") {
    // Foundry v14 potrafi źle renderować MeasuredTemplate typu "rect" (artefakty 3/6).
    // Dla sześcianu stawiamy Drawing (prostokąt), który jest stabilny i usuwalny jak zwykły rysunek.
    const side = Math.max(0.5, Number(area.side ?? 3));
    const sidePx = side * pxPerUnit;
    await canvas.scene.createEmbeddedDocuments("Drawing", [{
      x: throwContext.target.x - (sidePx / 2),
      y: throwContext.target.y - (sidePx / 2),
      shape: {
        type: "r",
        width: sidePx,
        height: sidePx
      },
      strokeWidth: 2,
      strokeColor: color,
      strokeAlpha: 0.9,
      fillType: 1,
      fillColor: color,
      fillAlpha: 0.2,
      text: _buildSceneLabel(throwContext.itemName),
      fontSize: 16,
      locked: false,
      flags: {
        [MODULE_ID]: {
          explosive: true,
          explosiveAreaText: throwContext.def?.area ?? "",
          explosiveAreaResolved: area.label,
          explosiveDrawing: true
        }
      }
    }]);
  } else {
    doc.t = "circle";
    doc.distance = Math.max(0.5, Number(area.radius ?? 1.5));
    await canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [doc]);
  }
}

function _onRenderExplosiveChatCard(message, html) {
  const payload = message.getFlag(MODULE_ID, "explosiveCard");
  if (!payload) return;

  const root = html instanceof HTMLElement ? html
    : html?.[0] instanceof HTMLElement ? html[0]
    : null;
  if (!root) return;

  const card = root.querySelector(".neuro-explosive-card");
  if (!card || card.dataset.neuroBound === "1") return;
  card.dataset.neuroBound = "1";

  const saveBtn = card.querySelector(".neuro-exp-roll-save");
  const dmgBtn = card.querySelector(".neuro-exp-roll-dmg");

  saveBtn?.addEventListener("click", async ev => {
    ev.preventDefault();
    await _rollExplosiveSavesFromCard(ev, card, payload);
  });

  dmgBtn?.addEventListener("click", async ev => {
    ev.preventDefault();
    await _rollExplosiveDamageFromCard(card, payload, message);
  });
}

async function _rollExplosiveSavesFromCard(event, card, payload) {
  try {
    const targets = _getSelectedTokens();
    if (!targets.length) {
      ui.notifications.warn("Zaznacz lub wyceluj pionki, aby rzucić RO.");
      return;
    }

    const ability = payload?.save?.ability ?? card.dataset.saveAbility;
    const dc = Number(payload?.save?.dc ?? card.dataset.saveDc);
    if (!ability || !Number.isFinite(dc)) {
      ui.notifications.warn("Ta karta nie ma poprawnie zdefiniowanego RO.");
      return;
    }

    for (const token of targets) {
      const actor = token.actor;
      if (!actor?.rollSavingThrow) continue;
      const speaker = ChatMessage.getSpeaker({ actor, scene: canvas.scene, token: token.document });
      await actor.rollSavingThrow({
        event,
        ability,
        target: dc
      }, {
        configure: false
      }, {
        data: {
          flavor: `${payload?.itemName ?? "Ładunek"} — ${payload?.save?.label ?? "RO"}`,
          speaker
        }
      });
    }
  } catch (error) {
    console.error("Neuroshima 5e | Explosive RO failed", error);
    ui.notifications.error("Nie udało się wykonać RO z karty granatu. Zobacz konsolę (F12).");
  }
}

async function _rollExplosiveDamageFromCard(card, payload, message) {
  const formula = payload?.damage?.formula ?? card.dataset.damageFormula;
  const damageType = payload?.damage?.type ?? card.dataset.damageType ?? "explosive";

  if (!formula) {
    ui.notifications.warn("Ta karta nie ma formuły obrażeń.");
    return;
  }

  const roll = new CONFIG.Dice.DamageRoll(formula, {}, { type: damageType });
  await roll.evaluate();

  const typeLabel = CONFIG.DND5E.damageTypes?.[damageType]?.label ?? damageType;

  await roll.toMessage({
    speaker: message?.speaker,
    flavor: `<i class="fa-solid fa-burst"></i> ${payload?.itemName ?? "Ładunek"} — ${formula} ${typeLabel}`,
    flags: { dnd5e: { roll: { type: "damage" } } }
  });
}

function _getSelectedTokens() {
  const targeted = game.user.targets?.size ? [...game.user.targets] : [];
  if (targeted.length) return targeted;
  return [...(canvas?.tokens?.controlled ?? [])].filter(t => t.actor);
}

function _parseSaveSpec(saveText) {
  const raw = String(saveText ?? "");
  const lower = raw.toLowerCase();

  const dcMatch = lower.match(/st\s*(\d+)/i);
  const dc = dcMatch ? Number(dcMatch[1]) : null;

  const abilityMap = [
    { re: /zr(?:ę|e)czno(?:ś|s)[ćc]/i, key: "dex", label: "Zręczność" },
    { re: /kondycj/i, key: "con", label: "Kondycja" },
    { re: /si(?:ł|l)a/i, key: "str", label: "Siła" },
    { re: /m(?:ą|a)dro(?:ś|s)[ćc]/i, key: "wis", label: "Mądrość" },
    { re: /inteligencj/i, key: "int", label: "Inteligencja" },
    { re: /charyzm/i, key: "cha", label: "Charyzma" }
  ];

  const foundAbility = abilityMap.find(a => a.re.test(lower)) ?? null;
  const ability = foundAbility?.key ?? null;
  const label = ability && Number.isFinite(dc)
    ? `RO ${foundAbility.label} ST ${dc}`
    : (raw || "—");

  return { ability, dc, label };
}

function _parseDamageSpec(effectText) {
  const raw = String(effectText ?? "");
  const diceMatches = [...raw.matchAll(/(\d+)\s*k\s*(\d+)/gi)];
  const formula = diceMatches.length
    ? diceMatches.map(m => `${Number(m[1])}d${Number(m[2])}`).join(" + ")
    : "";

  const lower = raw.toLowerCase();
  const typeMap = [
    { re: /wybuchow/i, type: "explosive", label: "Wybuchowe" },
    { re: /ogie(?:ń|n)/i, type: "fire", label: "Od ognia" },
    { re: /ci(?:ę|e)t/i, type: "slashing", label: "Sieczne" },
    { re: /k(?:ł|l)ut/i, type: "piercing", label: "Kłute" },
    { re: /obuchow/i, type: "bludgeoning", label: "Obuchowe" },
    { re: /kwas/i, type: "acid", label: "Od kwasu" },
    { re: /trucizn/i, type: "poison", label: "Od trucizny" },
    { re: /elektryczn/i, type: "lightning", label: "Elektryczne" },
    { re: /zimn/i, type: "cold", label: "Od zimna" }
  ];

  const foundType = typeMap.find(t => t.re.test(lower)) ?? { type: "explosive", label: "Wybuchowe" };
  const label = formula ? `${formula} ${foundType.label}` : "—";

  return {
    formula,
    type: foundType.type,
    label
  };
}

function _buildSceneLabel(itemName) {
  const name = String(itemName ?? "ładunek").trim().toLowerCase();
  return name || "ładunek";
}

function _escapeAttr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
