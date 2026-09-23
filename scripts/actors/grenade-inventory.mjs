/**
 * Neuroshima 5e — grenade/explosive inventory UI, throw resolution, and battlefield markers.
 *
 * ## GM-relay for the blast marker (2026-09-06)
 *
 * `_placeExplosionTemplate`/`_placeArmedMineMarker` used to call
 * `canvas.scene.createEmbeddedDocuments("Drawing"/"MeasuredTemplate", …)` directly
 * from whoever threw the grenade — fine for a GM, silently fatal for a real player.
 * Confirmed live against this world's actual permissions (not assumed): every
 * catalog grenade's `area` is "Sześcian …" (cube — only the non-damaging signal
 * flare resolves to a circle), cube areas draw a `Drawing` (see the comment on
 * that branch in `_spawnExplosiveMarker` for why — a separate v14 MeasuredTemplate
 * rendering bug), and `DrawingDocument.canUserCreate` is a flat
 * `user.hasPermission("DRAWING_CREATE")` with NO per-document ownership escape
 * hatch — unlike `MeasuredTemplateDocument`, whose creation check passes for a
 * normal player as long as the template's own `author` is that player (Foundry's
 * default when a player creates their own). `DRAWING_CREATE` is granted to roles
 * `[TRUSTED, ASSISTANT, GAMEMASTER]` in this world; every player is plain
 * `PLAYER`. So: every real grenade throw, and every mine (always a Drawing,
 * regardless of area shape), failed for every player, always — not a rare edge
 * case. And because the failure was a rejected promise with nothing catching it,
 * and the item's quantity was decremented in the same function *before* that
 * failing call, the player's grenade vanished from their sheet with no marker,
 * no chat card, nothing — "the game stole the player's grenade."
 *
 * Fixed with the exact same idiom `flara.mjs` already uses for its own GM-only
 * `AmbientLight`: the throwing client only ever writes a plain, normal-permission
 * flag on their OWN actor (`FLAG_PENDING_EXPLOSIVE`) — always succeeds, no
 * permission involved — and every connected client reacts via `updateActor`;
 * only `game.user.isActiveGM` performs the actual privileged
 * `createEmbeddedDocuments`. Quantity is still decremented up front (unchanged
 * order) — that's no longer a desync risk now that the step after it can no
 * longer fail for a mundane reason, only for the same "actor got deleted
 * mid-flow" class of edge case nothing else in this file guards against either.
 *
 * ## Explosion VFX + two independent ways it disappears (2026-09-06, + follow-up)
 *
 * `_spawnExplosionVfx` plays a Sequencer sprite (see `config/explosion-vfx.mjs`
 * for the asset table and why two families exist) at the blast point,
 * `.persist()`ed and `.tieToDocuments(markerDoc)`ed to the SAME Drawing/
 * MeasuredTemplate the GM just created. Sequencer ends a tied effect the instant
 * any tied document is deleted — so the fire disappears together with the zone
 * marker the moment the GM manually deletes it, with no separate cleanup hook
 * to write for that case. Scoped to real blasts with a damage formula, never
 * mine placement (an armed mine hasn't exploded yet) and never a grenade whose
 * effect has no dice at all (smoke/gas/flashbang — no matching asset exists, so
 * it's silently skipped rather than shown wrong; see `explosion-vfx.mjs`'s own
 * doc comment).
 *
 * That covers "the GM is done with it right now," but a GM who just advances
 * world time (not the combat tracker's turn counter) and never clicks delete
 * found neither the rectangle nor the sprite ever went away by themselves —
 * "I don't see any reason as a GM why I'd want the explosion to stay there."
 * `_sweepExpiredExplosiveMarkers`, on `updateWorldTime`, is the second,
 * independent way out: every non-mine marker also carries a plain
 * `explosiveExpiresAt` (`EXPLOSIVE_MARKER_LIFETIME_SECONDS` from creation,
 * see that constant's own comment for why 60s), and whichever comes first —
 * the GM deleting the marker by hand, or the sweep finding its time is up —
 * ends the tied VFX the same way, because both paths ultimately delete the
 * same tied document.
 *
 * The marker itself is now drawn BARE (no border/fill/label) whenever VFX
 * will actually show, with the label baked onto the sprite instead — a GM
 * watching a real throw found the rectangle sitting BELOW the explosion
 * sprite with its own label half-hidden underneath it, wanted "a single
 * graphical representation." See the cube branch of `_spawnExplosiveMarker`.
 *
 * ## Scorch decal (2026-09-06, further follow-up)
 *
 * `_spawnScorchMark` plays a long-lived (~1 year of GAME time) Sequencer
 * effect under the ring/fire sprite, sized to a fraction of the blast's own
 * footprint. See that function's own doc comment for why it's a Sequencer
 * effect rather than a real Tile (TileDocument has no blend-mode field at
 * all — checked directly, not assumed) and `config/explosion-vfx.mjs` for
 * the asset/blend-mode/lifetime constants. Tracked independently of the
 * blast marker's own 60-second lifetime (`FLAG_ACTIVE_SCORCH`, a scene-flag
 * list mirroring flara.mjs's own expiry idiom) — a scorch mark is supposed
 * to massively outlive the explosion that made it, not vanish with it.
 */
import { GRENADE_TYPES, GRENADE_MAP } from "../config/ammo-data.mjs";
import { playExplosiveSoundForSubtype } from "../weapons/sounds.mjs";
import { seqEffect, seqEndEffect } from "../weapons/sequencer.mjs";
import {
  pickRingVariant, EXPLOSION_FIRE,
  SCORCH_MARK, SCORCH_SIZE_FRACTION, SCORCH_MARK_LIFETIME_SECONDS
} from "../config/explosion-vfx.mjs";

import { provenanceBadge, handyToggleHtml, bindHandyToggle } from "./handy-items.mjs";
import { pickCanvasPoint, measureMeters, metersToPx } from "../scenes/area-picker.mjs";
import { isMolotov, isLit, lightMolotov, clearLit, roundsLeft, molotovLight, MAX_LIT_ROUNDS } from "./molotov.mjs";
import { igniteFor, ignite as igniteDefault } from "../combat/podpalenie.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
// Actor flag — GM-consumed, mirrors flara.mjs's FLAG_PENDING idiom. Payload:
// {sceneId, kind: "explosion"|"mine", x, y, area, color, itemName, areaText,
//  damageType, hasDamageFormula, nonce}
const FLAG_PENDING_EXPLOSIVE = "explosivePendingPlacement";
// Actor flag — rzucony w walce ładunek, który czeka na koniec tury. GM zamienia go w Tile
// z flagą `pendingCharge` (trwały zapis: {anchor, marker, card, subtype, lit, actorUuid, lightId}).
const FLAG_PENDING_CHARGE = "explosivePendingCharge";
const PENDING_TILE_TEXTURE = `modules/${MODULE_ID}/vfx/grenade-thrown.webp`;
// Granat ma ~11 cm — w skali mapy byłby niewidoczny. Ok. 4× naturalnej wielkości; to, gdzie
// naprawdę jest niebezpiecznie, mówi pulsujący obrys obszaru, nie sam granat.
const PENDING_TILE_SQUARES = 0.3;
const PENDING_TILE_ASPECT = 86 / 128;

// How long a non-mine blast marker (+ its tied VFX) sticks around before the
// `updateWorldTime` sweep below removes it on its own (2026-09-06 follow-up —
// a GM advancing world time found neither the rectangle nor the explosion
// sprite ever went away by themselves). ~10 rounds at 6s/round, per the same
// math the GM used to describe the problem — and, conveniently, this also
// covers the catalog's own explicit durations without contradicting any of
// them: Koktajl Mołotowa's "pali się 1 rundę" (6s) and the smoke/gas/flashbang
// trio's "(1 min)" (60s) both finish at or before this fires, so nothing is
// ever swept away before its own written duration is up — only after.
// Mines are deliberately excluded (never get this flag) — an armed mine is
// meant to persist until triggered or defused, not time out.
const EXPLOSIVE_MARKER_LIFETIME_SECONDS = 60;

// Scene flag — list of still-live scorch decals (2026-09-06 follow-up), mirrors
// flara.mjs's FLAG_ACTIVE/_sweepExpiredFlareLights idiom exactly, just for a
// bare Sequencer effect instead of a real embedded Document (there's nothing
// to hang an expiry flag ON, so the list itself is the durable record).
// Payload: [{name, expiresAt}].
const FLAG_ACTIVE_SCORCH = "activeScorchMarks";

export function registerGrenadeInventory() {
  for (const hookName of ["renderActorSheet", "renderCharacterActorSheet", "renderNPCActorSheet"]) {
    Hooks.on(hookName, _onRenderActorSheetInjectGrenadeSection);
  }
  Hooks.on("renderChatMessageHTML", _onRenderExplosiveChatCard);
  Hooks.on("updateActor", onUpdateActor);
  Hooks.on("updateWorldTime", onWorldTime);
  // Wybuch na końcu tury — każda zmiana, która może tę turę skończyć.
  const sweep = () => _sweepPendingCharges().catch(e => console.warn(`${MODULE_ID} | grenade-inventory: pending sweep failed`, e));
  Hooks.on("updateCombat", sweep);
  Hooks.on("deleteCombat", sweep);
  Hooks.on("deleteCombatant", sweep);
  Hooks.once("ready", sweep); // tura mogła minąć, gdy klienta MG nie było
  console.log("Neuroshima 5e | Explosives inventory UI registered");
}

function onWorldTime() {
  _sweepPendingCharges().catch(e => console.warn(`${MODULE_ID} | grenade-inventory: pending sweep failed`, e));
  _sweepExpiredExplosiveMarkers().catch(e => console.warn(`${MODULE_ID} | grenade-inventory: expiry sweep failed`, e));
  _sweepExpiredScorchMarks().catch(e => console.warn(`${MODULE_ID} | grenade-inventory: scorch expiry sweep failed`, e));
}

/** GM-only: delete any blast marker (Drawing or MeasuredTemplate) whose time is up, on every scene. */
async function _sweepExpiredExplosiveMarkers() {
  if (!game.user.isActiveGM) return;
  const now = game.time.worldTime;

  for (const scene of game.scenes) {
    const isExpired = doc => {
      const exp = doc.getFlag(MODULE_ID, "explosiveExpiresAt");
      return Number.isFinite(exp) && exp <= now;
    };

    const drawingIds = scene.drawings.filter(isExpired).map(d => d.id);
    if (drawingIds.length) {
      await scene.deleteEmbeddedDocuments("Drawing", drawingIds)
        .catch(e => console.warn(`${MODULE_ID} | grenade-inventory: drawing expiry cleanup failed`, e));
    }

    const templateIds = scene.templates.filter(isExpired).map(t => t.id);
    if (templateIds.length) {
      await scene.deleteEmbeddedDocuments("MeasuredTemplate", templateIds)
        .catch(e => console.warn(`${MODULE_ID} | grenade-inventory: template expiry cleanup failed`, e));
    }
  }
}

/** GM-only: end any scorch decal whose (very long) time is up, on every scene. */
async function _sweepExpiredScorchMarks() {
  if (!game.user.isActiveGM) return;
  const now = game.time.worldTime;

  for (const scene of game.scenes) {
    const list = scene.getFlag(MODULE_ID, FLAG_ACTIVE_SCORCH);
    if (!list?.length) continue;

    const due = list.filter(s => now >= s.expiresAt);
    if (!due.length) continue;

    for (const s of due) seqEndEffect(s.name);

    const remaining = list.filter(s => now < s.expiresAt);
    await scene.setFlag(MODULE_ID, FLAG_ACTIVE_SCORCH, remaining)
      .catch(e => console.warn(`${MODULE_ID} | grenade-inventory: scorch expiry flag update failed`, e));
  }
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

    // Koktajl: jeden przycisk, który zmienia się ze stanem butelki (`_primaryAction`), plus
    // odliczanie płonącej butelki — to ono ma przypominać, że rzut wciąż czeka.
    const molotov = isMolotov(item);
    const lit = molotov && isLit(item);
    const litLeft = lit ? roundsLeft(item) : null;
    const litBadge = lit
      ? `<span class="neuro-molotov-lit" style="font-size:0.8em; color:#ffb35c;"><i class="fa-solid fa-fire"></i> płonie — zostało ${litLeft}/${MAX_LIT_ROUNDS} rund</span>`
      : "";
    const primary = molotov && !lit
      ? { icon: "fa-fire", title: "Podpal butelkę (Akcja Bonusowa lub Używanie + źródło ognia)", color: "#ccc", hint: "Kliknij: podpal butelkę" }
      : { icon: "fa-bomb", title: lit ? `Rzuć — płonie, zostało ${litLeft}/${MAX_LIT_ROUNDS} rund` : "Rzuć", color: lit ? "#ff9a3c" : "#ccc", hint: "Kliknij: rzuć ładunek" };

    const li = document.createElement("li");
    li.className = "item collapsible collapsed";
    li.setAttribute("data-item-id", item.id);
    li.style.listStyle = "none";
    li.style.marginBottom = "0";
    li.innerHTML = `
      <div class="item-row flexrow" style="display:flex; align-items:center; justify-content:space-between; background-color:#2f2222; min-height:42px; border-bottom:1px dotted #4a3a3a; padding:4px 5px; color:#cacdd5;">
        <div class="item-name item-action item-tooltip rollable flexrow" role="button" aria-label="${item.name}" title="${primary.hint} | Shift+Klik: edytuj" style="flex:1.6; align-items:center; gap:8px; min-width:180px; cursor:pointer;">
          ${iconHtml}
          <div class="name name-stacked flexcol">
            <span class="title" style="color:#cacdd5; font-weight:500;">${item.name}</span>
            ${litBadge}
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
        <div class="item-detail item-controls always-visible" style="flex:0 0 126px; text-align:right; display:flex; align-items:center; justify-content:flex-end; gap:8px;">
          ${handyToggleHtml(item)}
          <button type="button" class="unbutton config-button item-control item-throw" title="${primary.title}" style="color:${primary.color};"><i class="fas ${primary.icon}" inert></i></button>
          <button type="button" class="unbutton config-button item-control item-edit" title="Edytuj" style="color:#ccc;"><i class="fas fa-edit" inert></i></button>
          <button type="button" class="unbutton config-button item-control item-delete" title="Usuń" style="color:#ccc;"><i class="fas fa-trash" inert></i></button>
        </div>
      </div>
    `;

    bindHandyToggle(li, item);

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
      await _primaryAction(actor, item, def);
    });

    li.querySelector('.item-throw').addEventListener('click', async (e) => {
      e.preventDefault();
      await _primaryAction(actor, item, def);
    });

    li.querySelector('.item-edit').addEventListener('click', () => item.sheet.render(true));
    li.querySelector('.item-delete').addEventListener('click', () => item.deleteDialog());

    uiList.appendChild(li);

    const nativeLi = inventoryTab.querySelector(`li[data-item-id="${item.id}"]`);
    nativeLi?.remove();
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
      price: { value: def.price, denomination: "gb" },
      description: { value: description }
    }
  }, { parent: actor });

  ui.notifications.info(`Dodano ${quantity} szt. ${def.label}.`);
}

/**
 * Główna akcja wiersza. Dla koktajlu zależy od stanu butelki: niezapalona → tylko podpal,
 * zapalona → rzuć. Dwie akcje, dwa kliknięcia — nigdy oba naraz (decyzja MG, `actors/molotov.mjs`).
 */
async function _primaryAction(actor, item, def) {
  if (isMolotov(item) && !isLit(item)) return lightMolotov(item);
  return _throwExplosive(actor, item, def);
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

  // Rzuca się wyłącznie zapaloną butelkę. Podpalenie to osobna akcja i osobne kliknięcie
  // (`_primaryAction`) — tu tylko bezpiecznik dla ścieżek, które ominą przycisk.
  if (isMolotov(item) && !isLit(item)) {
    ui.notifications.warn(`${item.name}: butelka nie jest podpalona — najpierw ją podpal (Akcja Bonusowa lub Używanie).`);
    return;
  }

  const areaSpec = await _resolveAreaSpec(resolved);
  if (!areaSpec) return;

  // Wybór punktu wybuchu na scenie + pomiar odległości od rzucającego.
  const throwContext = await _selectExplosionPoint(actor, item, resolved, areaSpec);
  if (!throwContext) return;

  const throwClass = _getThrowBandClass(throwContext.distance, throwContext.range.max);
  const throwColor = _getThrowBandColor(throwClass);
  const isMine = subtype === "grenade-antipersonnel-mine" || subtype === "grenade-antivehicle-mine";

  const saveData = _parseSaveSpec(resolved.save);
  const damageData = _parseDamageSpec(resolved.effect);
  const ignite = _parseIgniteSpec(resolved.effect);

  const molotovLit = isMolotov(item) && isLit(item);
  await item.update({ "system.quantity": qty - 1 });
  if (molotovLit) await clearLit(item); // zapalona butelka poleciała — światło schodzi z ręki

  const marker = {
    sceneId: canvas.scene?.id ?? null,
    kind: isMine ? "mine" : "explosion",
    x: throwContext.target.x,
    y: throwContext.target.y,
    area: throwContext.area,
    color: throwColor,
    itemName: throwContext.itemName,
    areaText: resolved.area ?? "",
    damageType: damageData.type,
    hasDamageFormula: !!damageData.formula
  };

  const card = {
    itemName: item.name,
    itemImg: item.img,
    badge: provenanceBadge(item),
    save: saveData,
    damage: damageData,
    ignite,
    isMine,
    areaLabel: throwContext.area.label,
    saveText: resolved.save ?? "—",
    effectText: isMine ? "Mina uzbrojona na wskazanym polu." : (resolved.effect ?? "—"),
    distance: throwContext.distance,
    rangeMax: throwContext.range.max,
    rangeMod: throwContext.range.mod,
    throwColor,
    remaining: qty - 1
  };

  // RAW: „Granat eksploduje natychmiast po zakończeniu twojej tury". W walce — koniec tury, która
  // trwa teraz (czyjakolwiek: sługa rzucający na rozkaz też), poza walką — od razu. Miny nie
  // wybuchają same, więc nie czekają na nic.
  const anchor = isMine ? null : _currentTurnAnchor();
  if (anchor) {
    await _requestPendingCharge(actor, { anchor, marker, card, subtype, lit: molotovLit });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: _thrownCardHtml(card, anchor)
    });
    return;
  }

  playExplosiveSoundForSubtype(subtype);

  // Normal-permission flag write only — see this file's top doc comment,
  // "GM-relay for the blast marker", for why this replaced a direct
  // createEmbeddedDocuments call here.
  await actor.setFlag(MODULE_ID, FLAG_PENDING_EXPLOSIVE, { ...marker, nonce: foundry.utils.randomID(8) });
  await _postExplosiveCard(actor, card);
}

/* -------------------------------------------- */
/*  Karta wybuchu                                 */
/* -------------------------------------------- */

function _signed(n) {
  return `${n >= 0 ? "+" : ""}${n}`;
}

function _rangeLine(card) {
  return `<div><strong>Odległość rzutu:</strong> <span style="color:${card.throwColor}; font-weight:700;">${card.distance.toFixed(1)} m</span> / ${card.rangeMax.toFixed(1)} m (9 + 9 × mod. SIŁ ${_signed(card.rangeMod)}, min. 18)</div>`;
}

/** Krótka karta w chwili rzutu, gdy wybuch czeka na koniec tury. */
function _thrownCardHtml(card, anchor) {
  return `
    <div class="neuro-explosive-card" style="padding:8px;">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
        <img src="${card.itemImg}" alt="${card.itemName}" width="28" height="28" style="border:none;" />
        <strong style="font-size:1.05em;">Rzut: ${card.itemName}</strong>
        ${card.badge}
      </div>
      ${_rangeLine(card)}
      <div><strong>Obszar:</strong> ${card.areaLabel}</div>
      <div style="margin-top:4px;"><i class="fa-solid fa-hourglass-half"></i> <strong>Wybuch na końcu tury: ${anchor.combatantName ?? "bieżącej"}.</strong></div>
      <div><em>Pozostało:</em> ${card.remaining} szt.</div>
    </div>`;
}

/** Pełna karta wybuchu: RO, obrażenia, Podpalenie. */
function _explosiveCardHtml(card, { detonated = false } = {}) {
  const cardDataAttrs = [
    `data-item-name="${_escapeAttr(card.itemName)}"`,
    `data-save-ability="${_escapeAttr(card.save.ability ?? "")}"`,
    `data-save-dc="${Number.isFinite(card.save.dc) ? card.save.dc : ""}"`,
    `data-damage-formula="${_escapeAttr(card.damage.formula ?? "")}"`,
    `data-damage-type="${_escapeAttr(card.damage.type ?? "")}"`
  ].join(" ");

  const igniteRow = card.ignite ? `
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <strong style="font-size:0.92em;">Podpalenie:</strong>
          <span style="font-size:0.9em; opacity:0.9;">${card.ignite.label}</span>
          <button type="button" class="neuro-exp-ignite" style="padding:2px 8px; border:1px solid #b5762f; background:#3f2a14; color:#ffe6c7; border-radius:4px; cursor:pointer;">Podpal zaznaczonych</button>
        </div>` : "";

  return `
    <div class="neuro-explosive-card" ${cardDataAttrs} style="padding:8px;">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
        <img src="${card.itemImg}" alt="${card.itemName}" width="28" height="28" style="border:none;" />
        <strong style="font-size:1.05em;">${detonated ? "Wybuch" : "Rzut"}: ${card.itemName}</strong>
        ${card.badge}
      </div>
      ${detonated ? "" : _rangeLine(card)}
      <div><strong>Obszar:</strong> ${card.areaLabel}</div>
      <div><strong>RO:</strong> ${card.saveText}</div>
      <div><strong>Efekt:</strong> ${card.effectText}</div>
      <hr />
      <div class="neuro-explosive-controls" style="display:grid; gap:6px; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <strong style="font-size:0.92em;">RO:</strong>
          <span style="font-size:0.9em; opacity:0.9;">${card.save.label}</span>
          <button type="button" class="neuro-exp-roll-save" style="padding:2px 8px; border:1px solid #577a9f; background:#203345; color:#dbefff; border-radius:4px; cursor:pointer;">Rzuć RO na zaznaczonych</button>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <strong style="font-size:0.92em;">Obrażenia:</strong>
          <span style="font-size:0.9em; opacity:0.9;">${card.damage.label}</span>
          <button type="button" class="neuro-exp-roll-dmg" style="padding:2px 8px; border:1px solid #9b5f5f; background:#3f2323; color:#ffe3e3; border-radius:4px; cursor:pointer;">Rzuć obrażenia</button>
          <span style="font-size:0.8em; opacity:0.8;">Stopień i osłona: ustaw w panelu Apply Damage pod rzutem.</span>
        </div>${igniteRow}
      </div>
      ${detonated ? "" : `<div><em>Pozostało:</em> ${card.remaining} szt.</div>`}
    </div>
  `;
}

async function _postExplosiveCard(actor, card, { detonated = false } = {}) {
  await ChatMessage.create({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : undefined,
    content: _explosiveCardHtml(card, { detonated }),
    flags: { [MODULE_ID]: { explosiveCard: card } }
  });
}

/* -------------------------------------------- */
/*  Wybuch na końcu tury                          */
/* -------------------------------------------- */

/** Tura, której koniec odpali ładunek — albo null poza walką. */
function _currentTurnAnchor() {
  const combat = game.combat;
  if (!combat?.started) return null;
  return {
    combatId: combat.id,
    round: combat.round,
    turn: combat.turn,
    combatantId: combat.combatant?.id ?? null,
    combatantName: combat.combatant?.name ?? null,
    worldTime: game.time.worldTime
  };
}

/**
 * Czy tura z `anchor` już się skończyła. Dowolny z sygnałów wystarcza: tura/runda przeszła
 * dalej (także wstecz — MG cofający turę też ją kończy), walka zniknęła albo się zatrzymała,
 * aktywny uczestnik się zmienił (MG usunął go w trakcie jego tury — numer tury może zostać ten
 * sam, a tura i tak jest już czyjaś inna), albo czas świata poszedł o pełną rundę naprzód.
 * @param {object} anchor
 * @param {{started:boolean, round:number, turn:number, combatantId:string|null}|null} combat
 *   stan walki `anchor.combatId`, albo null, gdy już nie istnieje
 * @param {number} worldTime
 */
function _anchorPassed(anchor, combat, worldTime) {
  if (worldTime - anchor.worldTime >= 6) return true;
  if (!combat?.started) return true;
  if (combat.round !== anchor.round || combat.turn !== anchor.turn) return true;
  return (combat.combatantId ?? null) !== (anchor.combatantId ?? null);
}

/**
 * „Podpalenie (1 min)" w opisie efektu → przycisk na karcie. Czas z opisu (1 min = 10 rund),
 * bez niego — domyślny czas stanu.
 * @returns {{rounds:number|null, label:string}|null}
 */
function _parseIgniteSpec(effectText) {
  const raw = String(effectText ?? "");
  if (!/podpaleni/i.test(raw)) return null;
  const m = raw.match(/podpaleni\w*\s*\(\s*(\d+)\s*(min|rund)/i);
  if (!m) return { rounds: null, label: "Podpalenie" };
  const n = Number(m[1]);
  const isMin = /min/i.test(m[2]);
  const rounds = isMin ? n * 10 : n;
  return { rounds, label: isMin ? `Podpalenie na ${n} min (${rounds} rund)` : `Podpalenie na ${rounds} rund` };
}

async function _requestPendingCharge(actor, charge) {
  await actor.setFlag(MODULE_ID, FLAG_PENDING_CHARGE, { ...charge, nonce: foundry.utils.randomID(8) });
}

/**
 * GM: ładunek leży na ziemi do końca tury. Tile z grafiką granatu jest trwałym zapisem (przeżywa
 * F5 — cała reszta stanu siedzi w jego fladze), pulsujący obrys obszaru i podpis to Sequencer
 * przypięty do tego Tile'a, więc znika razem z nim. Zapalony koktajl dostaje jeszcze swój płomień
 * jako AmbientLight — to samo światło co w ręku, więc też tylko w Kolorze Kobaltu (`molotovLight()`).
 */
async function _spawnPendingCharge(actor, charge) {
  try {
    const scene = game.scenes.get(charge.marker.sceneId) ?? canvas.scene;
    if (!scene) return;
    const grid = Number(scene.grid?.size ?? 100);
    const height = Math.round(grid * PENDING_TILE_SQUARES);
    const width = Math.round(height * PENDING_TILE_ASPECT);

    let lightId = null;
    const lightConfig = charge.lit ? molotovLight() : null; // WKK: bez Kobaltu — null, bez światła
    if (lightConfig) {
      const [light] = await scene.createEmbeddedDocuments("AmbientLight", [{
        x: charge.marker.x, y: charge.marker.y, rotation: 0, walls: true,
        config: { ...lightConfig, angle: 360 },
        flags: { [MODULE_ID]: { pendingChargeLight: true } }
      }]);
      lightId = light?.id ?? null;
    }

    // v14 Tile x/y to ŚRODEK (jak w kolczatka.mjs) — bez odejmowania połowy wymiarów.
    const [tile] = await scene.createEmbeddedDocuments("Tile", [{
      x: charge.marker.x, y: charge.marker.y, width, height,
      rotation: Math.round(Math.random() * 360),
      locked: true,
      texture: { src: PENDING_TILE_TEXTURE },
      flags: { [MODULE_ID]: { pendingCharge: { ...charge, actorUuid: actor?.uuid ?? null, lightId } } }
    }]);
    if (tile) _playPendingVfx(scene, tile, charge);
  } catch (e) {
    console.warn(`${MODULE_ID} | grenade-inventory: pending charge spawn failed`, e);
  } finally {
    try { await actor.unsetFlag(MODULE_ID, FLAG_PENDING_CHARGE); } catch (_e) { /* aktor mógł zniknąć */ }
  }
}

/** Pulsujący obrys przyszłego wybuchu + podpis. Bez Sequencera zostaje sam granat na ziemi. */
function _playPendingVfx(scene, tile, charge) {
  if (!game.modules.get("sequencer")?.active || !window.Sequence) return;
  const area = charge.marker.area ?? { kind: "cube", side: 3 };
  const unitsPerGrid = Number(scene.grid?.distance ?? 1);
  const color = "#e06666";
  // Sequencer rysuje prostokąt od rogu (opcja `anchor` kształtu nic tu nie robi — sprawdzone na
  // żywo: obrys lądował pół boku w prawo-dół od punktu wybuchu), więc środek ustawiamy offsetem.
  // Koło rysuje od środka.
  const side = Number(area.side ?? 3) / unitsPerGrid;
  const shape = area.kind === "cube"
    ? ["rectangle", { width: side, height: side, offset: { x: -side / 2, y: -side / 2, gridUnits: true } }]
    : ["circle", { radius: Number(area.radius ?? 1.5) / unitsPerGrid }];
  const [type, dims] = shape;
  // Krótko — nazwa ładunku jest na karcie; na mapie liczy się tylko „kiedy".
  const label = charge.anchor.combatantName ? `wybuch po turze: ${charge.anchor.combatantName}` : "wybuch po tej turze";
  const grid = Number(scene.grid?.size ?? 100);

  new Sequence()
    .effect()
      .atLocation({ x: charge.marker.x, y: charge.marker.y })
      .shape(type, {
        ...dims, gridUnits: true, name: "zone",
        lineSize: 3, lineColor: color, fillColor: color, fillAlpha: 0.12
      })
      .loopProperty("shapes.zone", "alpha", { from: 0.35, to: 1, duration: 700, pingPong: true, ease: "easeInOutSine" })
      // Sequencer mnoży fontSize przez 150 / grid.size (patrz `seqEffect` w weapons/sequencer.mjs),
      // więc żeby dostać ~13 px na mapie, trzeba mu podać 13 × grid / 150.
      .text(label, {
        fill: "#ffd0d0", fontFamily: "Arial, sans-serif", fontWeight: "bold",
        fontSize: 13 * (grid / 150),
        stroke: "#000000", strokeThickness: 3, align: "center",
        // Kotwica tekstu względem jego własnej wysokości: jedna linia, dolna krawędź nad granatem,
        // żeby podpis nie przykrywał tego, co podpisuje.
        anchor: { x: 0.5, y: 1.9 }
      })
      .persist()
      .belowTokens()
      .name(`neuro-pending-charge-${tile.id}`)
      .tieToDocuments(tile)
    .play();
  if (charge.lit) {
    seqEffect("jb2a.flames.01.orange", { x: charge.marker.x, y: charge.marker.y }, {
      sizeSquares: 0.6, opacity: 0.9, persist: true, tieTo: tile, name: `neuro-pending-flame-${tile.id}`
    });
  }
}

/* GM: przegląd wszystkich leżących ładunków — wybuchają te, których tura minęła. */
const _detonating = new Set();

async function _sweepPendingCharges() {
  if (!game.user.isActiveGM) return;
  const now = game.time.worldTime;
  for (const scene of game.scenes) {
    for (const tile of scene.tiles) {
      const charge = tile.getFlag(MODULE_ID, "pendingCharge");
      if (!charge?.anchor) continue;
      const c = game.combats.get(charge.anchor.combatId);
      const combat = c ? { started: c.started, round: c.round, turn: c.turn, combatantId: c.combatant?.id ?? null } : null;
      if (!_anchorPassed(charge.anchor, combat, now)) continue;
      await _detonate(scene, tile, charge).catch(e => console.warn(`${MODULE_ID} | grenade-inventory: detonation failed`, e));
    }
  }
}

async function _detonate(scene, tile, charge) {
  if (_detonating.has(tile.uuid)) return;
  _detonating.add(tile.uuid);
  try {
    // Najpierw zdejmujemy Tile — to „rezerwacja" wybuchu (drugi przebieg już go nie znajdzie),
    // a przy okazji kończy przypięte do niego efekty Sequencera.
    await scene.deleteEmbeddedDocuments("Tile", [tile.id]);
    if (charge.lightId && scene.lights.get(charge.lightId)) {
      await scene.deleteEmbeddedDocuments("AmbientLight", [charge.lightId]).catch(() => {});
    }
    const actor = charge.actorUuid ? await fromUuid(charge.actorUuid) : null;
    playExplosiveSoundForSubtype(charge.subtype);
    await _spawnExplosiveMarker(null, { ...charge.marker, sceneId: scene.id });
    await _postExplosiveCard(actor, charge.card, { detonated: true });
  } finally {
    _detonating.delete(tile.uuid);
  }
}

function onUpdateActor(actor, changes) {
  if (!game.user.isActiveGM) return;
  const pending = foundry.utils.getProperty(changes, `flags.${MODULE_ID}.${FLAG_PENDING_EXPLOSIVE}`);
  if (pending) _spawnExplosiveMarker(actor, pending).catch(e => console.warn(`${MODULE_ID} | grenade-inventory: spawn failed`, e));
  const charge = foundry.utils.getProperty(changes, `flags.${MODULE_ID}.${FLAG_PENDING_CHARGE}`);
  if (charge?.anchor) _spawnPendingCharge(actor, charge).catch(e => console.warn(`${MODULE_ID} | grenade-inventory: charge spawn failed`, e));
}

/** GM-only: create the actual Drawing/MeasuredTemplate (+ paired VFX), then clear the request flag. */
async function _spawnExplosiveMarker(actor, pending) {
  try {
    const scene = game.scenes.get(pending.sceneId) ?? canvas.scene;
    if (!scene) return;

    const unitsPerGrid = Number(scene.grid?.distance ?? 1);
    const pxPerGrid = Number(scene.grid?.size ?? 100);
    const pxPerUnit = pxPerGrid / unitsPerGrid;
    const area = pending.area ?? { kind: "circle", radius: 1.5, label: "Koło 3 m" };
    const now = game.time.worldTime;
    // VFX only for a real, damaging blast (never a mine — arming isn't detonating)
    // and only when Sequencer is actually there to play it. When true, the
    // marker itself goes visually bare — see the cube branch below.
    const hasVfx = pending.kind !== "mine" && pending.hasDamageFormula && !!game.modules.get("sequencer")?.active;
    const label = _buildSceneLabel(pending.itemName);

    let markerDoc = null;

    if (pending.kind === "mine") {
      const sidePx = 1.5 * pxPerUnit;
      const [created] = await scene.createEmbeddedDocuments("Drawing", [{
        x: pending.x - (sidePx / 2),
        y: pending.y - (sidePx / 2),
        shape: { type: "r", width: sidePx, height: sidePx },
        strokeWidth: 2,
        strokeColor: pending.color,
        strokeAlpha: 0.9,
        fillType: 1,
        fillColor: pending.color,
        fillAlpha: 0.25,
        text: _buildSceneLabel(pending.itemName),
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
      markerDoc = created;
    } else if (area.kind === "cube") {
      // Foundry v14 potrafi źle renderować MeasuredTemplate typu "rect" (artefakty 3/6).
      // Dla sześcianu stawiamy Drawing (prostokąt), który jest stabilny i usuwalny jak zwykły rysunek.
      //
      // When `hasVfx`, this rectangle is deliberately drawn BARE (no border, no
      // fill, no label) — it still exists as the tieToDocuments anchor and the
      // expiry-sweep target, but the explosion sprite is the only thing anyone
      // actually sees, with the label baked onto the sprite itself (see
      // `_spawnExplosionVfx`). Without VFX (smoke/gas/flashbang, or Sequencer
      // inactive) it keeps the old visible style, since it's then the only
      // marker there is. 2026-09-06 follow-up: a GM watching a real throw found
      // the rectangle sitting BELOW the explosion sprite with its label
      // half-hidden underneath — this is what fixed that, not a z-index tweak,
      // since two independent rendering systems (core Drawing vs. a Sequencer
      // effect) don't share one paint order to tweak in the first place.
      const side = Math.max(0.5, Number(area.side ?? 3));
      const sidePx = side * pxPerUnit;
      const [created] = await scene.createEmbeddedDocuments("Drawing", [{
        x: pending.x - (sidePx / 2),
        y: pending.y - (sidePx / 2),
        shape: { type: "r", width: sidePx, height: sidePx },
        strokeWidth: hasVfx ? 0 : 2,
        strokeColor: pending.color,
        strokeAlpha: hasVfx ? 0 : 0.9,
        fillType: 1,
        fillColor: pending.color,
        // Foundry's DrawingDocument rejects one that has no visible text, fill,
        // OR line at all ("Joint Validation" — confirmed live: creation silently
        // no-ops, leaving an untied orphan VFX effect behind it). 0.02 keeps a
        // technically-nonzero fill so validation passes while staying
        // imperceptible — doubly so once the opaque explosion sprite is sitting
        // on top of it.
        fillAlpha: hasVfx ? 0.02 : 0.2,
        text: hasVfx ? "" : label,
        fontSize: 16,
        locked: false,
        flags: {
          [MODULE_ID]: {
            explosive: true,
            explosiveAreaText: pending.areaText ?? "",
            explosiveAreaResolved: area.label,
            explosiveDrawing: true,
            explosiveExpiresAt: now + EXPLOSIVE_MARKER_LIFETIME_SECONDS
          }
        }
      }]);
      markerDoc = created;
    } else {
      // Circle+damage doesn't occur anywhere in the current catalog (every
      // damaging grenade is cube-shaped; the only circle is the non-damaging
      // signal flare) — kept visually as before rather than chasing the same
      // bare-marker treatment through MeasuredTemplate's more limited styling
      // fields for a combination nothing today actually creates.
      const [created] = await scene.createEmbeddedDocuments("MeasuredTemplate", [{
        user: game.user.id,
        x: pending.x,
        y: pending.y,
        direction: 0,
        t: "circle",
        distance: Math.max(0.5, Number(area.radius ?? 1.5)),
        fillColor: pending.color,
        borderColor: pending.color,
        flags: {
          [MODULE_ID]: {
            explosive: true,
            explosiveAreaText: pending.areaText ?? "",
            explosiveAreaResolved: area.label,
            explosiveExpiresAt: now + EXPLOSIVE_MARKER_LIFETIME_SECONDS
          }
        }
      }]);
      markerDoc = created;
    }

    if (hasVfx) {
      const targetSquares = _computeTargetSquares(scene, area);
      // Scorch first: no explicit ordering guarantee between two Sequencer
      // effects otherwise, and this one needs to sit visually UNDER the
      // ring/fire sprite (also enforced explicitly via zIndex — see
      // `_spawnScorchMark` — not relied on implicitly here).
      _spawnScorchMark(scene, pending.x, pending.y, targetSquares)
        .catch(e => console.warn(`${MODULE_ID} | grenade-inventory: scorch spawn failed`, e));
      _spawnExplosionVfx(scene, pending.x, pending.y, targetSquares, pending.damageType, markerDoc, label);
    }
  } finally {
    try { await actor.unsetFlag(MODULE_ID, FLAG_PENDING_EXPLOSIVE); } catch (_e) { /* aktor mógł już zniknąć */ }
  }
}

/**
 * Blast diameter/side, converted from the area spec's meters into the TARGET
 * scene's own grid squares — shared by the ring/fire sprite and the scorch
 * decal so both size off the exact same number.
 */
function _computeTargetSquares(scene, area) {
  const distancePerSquare = Number(scene.grid?.distance ?? 1.5) || 1.5;
  const diameterMeters = area.kind === "cube"
    ? Number(area.side ?? 3)
    : Number(area.radius ?? 1.5) * 2;
  return Math.max(0.5, diameterMeters / distancePerSquare);
}

/**
 * Play the matching explosion sprite at (x,y) on `scene`, sized to the blast's
 * real footprint and tied to `markerDoc` — see this file's top doc comment,
 * "Explosion VFX" section, for why tieing beats a fixed-round timer. Carries
 * `label` itself (Sequencer's `.text()`) since the marker Drawing is drawn
 * bare whenever this is called — see the cube branch of `_spawnExplosiveMarker`.
 */
function _spawnExplosionVfx(scene, x, y, targetSquares, damageType, markerDoc, label) {
  const asset = damageType === "fire" ? EXPLOSION_FIRE : pickRingVariant(targetSquares);

  seqEffect(asset.file, { x, y }, {
    sizeSquares: targetSquares,
    persist: true,
    belowTokens: true,
    randomRotation: damageType === "fire",
    fadeIn: 150,
    fadeOut: 500,
    name: `neuro-explosion-${markerDoc?.id ?? foundry.utils.randomID(6)}`,
    tieTo: markerDoc ?? undefined,
    label
  });
}

/**
 * Permanent-ish scorch decal (2026-09-06 follow-up) — a Sequencer effect, NOT
 * a Tile: `TileDocument`'s own schema (checked directly, core's `tile.mjs`)
 * has no blend-mode field at all, only alpha/occlusion/video, so a real Tile
 * can't do the "darken"/"multiply" compositing an opaque-white-background
 * decal needs without fighting Foundry's own redraw on every refresh. A
 * persisted Sequencer effect gets `.blendMode()` natively and is exactly as
 * durable — `.persist()` already survives reloads for as long as it's told
 * to, which is all "should last about a year" actually needs.
 *
 * Tracked in its own scene-flag list (`FLAG_ACTIVE_SCORCH`), mirroring
 * flara.mjs's `FLAG_ACTIVE`/`_sweepExpiredFlareLights` idiom — there's no
 * backing Document to hang an expiry flag on this time (unlike the blast
 * marker's Drawing/MeasuredTemplate), so the list itself is the durable
 * record. Deliberately NOT tied to `markerDoc`/`EXPLOSIVE_MARKER_LIFETIME_
 * SECONDS` — the whole point of a scorch mark is outliving the blast and its
 * ring/fire VFX by orders of magnitude, not vanishing with them.
 *
 * Sized to a FRACTION of the blast's own footprint (`SCORCH_SIZE_FRACTION`),
 * with no minimum floor — a tiny charge is meant to leave a correspondingly
 * tiny mark, not one clamped to some "smallest usable" size the way the
 * label text is allowed to be.
 */
async function _spawnScorchMark(scene, x, y, targetSquares) {
  const name = `neuro-scorch-${foundry.utils.randomID(8)}`;
  const played = seqEffect(SCORCH_MARK.file, { x, y }, {
    sizeSquares: Math.max(0.25, targetSquares * SCORCH_SIZE_FRACTION),
    persist: true,
    belowTokens: true,
    zIndex: -1, // under the ring/fire sprite above (default zIndex 0) — pinned explicitly, not relied on implicitly.
    blendMode: SCORCH_MARK.blendMode,
    opacity: SCORCH_MARK.opacity,
    fadeIn: 300,
    name
  });
  if (!played) return; // no Sequencer active — nothing to track

  const list = foundry.utils.deepClone(scene.getFlag(MODULE_ID, FLAG_ACTIVE_SCORCH) ?? []);
  list.push({ name, expiresAt: game.time.worldTime + SCORCH_MARK_LIFETIME_SECONDS });
  await scene.setFlag(MODULE_ID, FLAG_ACTIVE_SCORCH, list);
}

function _getActorThrowToken(actor) {
  const controlled = canvas?.tokens?.controlled ?? [];
  const own = controlled.find(t => t.actor?.id === actor.id);
  if (own) return own;

  // Placeables, not documents (`getActiveTokens(true, true)` handed back a TokenDocument, which
  // has no `.center` — every throw without the thrower's token selected died on it silently).
  const active = actor.getActiveTokens?.(true) ?? [];
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

/**
 * RAW, *Sztuczki* → „Granaty i im podobne" (`8 SZTUCZKI/czesc-01.md`): „możesz rzucić granatem
 * na odległość równą 9 + (9 x modyfikator Siły) metrów (minimum 9)". Jeden próg — waga ładunku
 * nie gra roli, a podręcznik nie zna „optymalnego" pół-zasięgu. (Do 2026-09-23 był tu wymyślony
 * model `SIŁ × 2 / waga` z żółtym pasmem od połowy zasięgu: Alan, mod. +0, rzucał na 40 m.)
 *
 * **RAI — „minimum 9" dotyczy członu z modyfikatorem, nie całego zasięgu.** Podręcznik sam sobie
 * przeczy: reguła mówi „minimum 9", a przykład tuż pod nią — „Spec o Sile 8 (-1), może rzucić
 * granatem na odległość minimalną, czyli 18 metrów". Zgodne z konsultacją z autorem: minimum to
 * 18 m, czyli `9 + max(9, 9 × mod)`. Tylko to czytanie godzi oba zdania (Brutal +4 → 45 m jak w
 * przykładzie, Spec −1 → 18 m). Patrz `wkk/README.md`, „The third bucket: RAI".
 *
 * Przekroczenie jest oznaczane, nie blokowane — zasięg, jak okno czy pojazd, to sytuacja, którą
 * rozstrzyga MG.
 * @param {number} strMod
 * @returns {number} metry
 */
function _throwRangeMeters(strMod) {
  return 9 + Math.max(9, 9 * (Number(strMod) || 0));
}

function _computeThrowRange(actor) {
  const mod = Number(actor.system?.abilities?.str?.mod ?? 0);
  return { mod, max: _throwRangeMeters(mod) };
}

function _getThrowBandClass(distance, max) {
  return distance <= max ? "ok" : "danger";
}

function _getThrowBandColor(band) {
  return band === "ok" ? "#54c86a" : "#e06666";
}

async function _selectExplosionPoint(actor, item, def, areaSpec) {
  const originToken = _getActorThrowToken(actor);
  if (!originToken) {
    ui.notifications.warn("Brak aktywnego tokena tej postaci na scenie. Zaznacz token i spróbuj ponownie.");
    return null;
  }

  const origin = { x: originToken.center.x, y: originToken.center.y };
  const range = _computeThrowRange(actor);

  // Same footprint `_spawnExplosiveMarker` will draw, same bands `_getThrowBandClass` colours
  // the chat card with — the preview must not disagree with what lands.
  const subtype = item?.system?.type?.subtype;
  const isMine = subtype === "grenade-antipersonnel-mine" || subtype === "grenade-antivehicle-mine";
  let shape;
  if (isMine || areaSpec.kind === "cube") {
    const side = metersToPx(isMine ? 1.5 : Math.max(0.5, Number(areaSpec.side ?? 3)));
    shape = { kind: "rect", width: side, height: side };
  } else {
    shape = { kind: "circle", radii: [metersToPx(Math.max(0.5, Number(areaSpec.radius ?? 1.5)))] };
  }

  const target = await pickCanvasPoint({
    hint: isMine ? "Wybierz, gdzie uzbroić minę: kliknij na mapie" : "Wybierz punkt wybuchu: kliknij na mapie",
    shape, origin, range: { long: range.max }
  });
  if (!target) return null;

  const distance = measureMeters(origin, target);

  if (distance > range.max) {
    ui.notifications.warn(`Rzut poza zasięgiem (${distance.toFixed(1)} m > ${range.max.toFixed(1)} m).`);
  }

  return { origin, target, distance, range, token: originToken, def, area: areaSpec, itemName: item?.name ?? def?.label ?? "ładunek" };
}

/** Podpal aktorów wg specyfikacji z karty — z czasem z opisu albo domyślnym czasem stanu. */
async function _igniteActors(actors, ignite) {
  for (const actor of actors) {
    if (!actor) continue;
    if (ignite?.rounds) await igniteFor(actor, ignite.rounds);
    else await igniteDefault(actor);
  }
}

function _onRenderExplosiveChatCard(message, html) {
  const followUp = message.getFlag(MODULE_ID, "explosiveIgnite");
  if (followUp) {
    const root = html instanceof HTMLElement ? html : html?.[0];
    const btn = root?.querySelector(".neuro-exp-ignite-failed");
    if (btn && !game.user.isGM) btn.remove();
    else btn?.addEventListener("click", async ev => {
      ev.preventDefault();
      const actors = await Promise.all(followUp.actorUuids.map(u => fromUuid(u)));
      await _igniteActors(actors, followUp.ignite);
      btn.disabled = true;
    });
    return;
  }

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
  const igniteBtn = card.querySelector(".neuro-exp-ignite");

  if (igniteBtn && !game.user.isGM) igniteBtn.remove();
  else igniteBtn?.addEventListener("click", async ev => {
    ev.preventDefault();
    const targets = _getSelectedTokens();
    if (!targets.length) {
      ui.notifications.warn("Zaznacz lub wyceluj pionki, które mają się zapalić.");
      return;
    }
    await _igniteActors(targets.map(t => t.actor), payload.ignite);
  });

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

    const failed = [];
    for (const token of targets) {
      const actor = token.actor;
      if (!actor?.rollSavingThrow) continue;
      const speaker = ChatMessage.getSpeaker({ actor, scene: canvas.scene, token: token.document });
      const rolls = await actor.rollSavingThrow({
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
      const roll = Array.isArray(rolls) ? rolls[0] : rolls;
      if (roll && roll.total < dc) failed.push({ uuid: actor.uuid, name: token.name ?? actor.name });
    }

    // Wykrycie, nie zastosowanie: kto nie zdał, dostaje przycisk MG — nie stan z automatu.
    if (payload?.ignite && failed.length) {
      await ChatMessage.create({
        content: `<div class="neuro-fire-card is-burning">
          <div class="neuro-fire-head"><i class="fa-solid fa-fire"></i> ${payload.itemName} — PODPALENIE</div>
          <div class="neuro-fire-body">Nie zdali RO: <strong>${failed.map(f => f.name).join(", ")}</strong>. ${payload.ignite.label}.</div>
          <button type="button" class="neuro-exp-ignite-failed"><i class="fa-solid fa-fire"></i> Podpal ich</button>
        </div>`,
        flags: { [MODULE_ID]: { explosiveIgnite: { actorUuids: failed.map(f => f.uuid), ignite: payload.ignite } } }
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

  // Karty sprzed 2026-09-23 nie mają `parts` — wtedy jeden człon, jak dawniej.
  const parts = payload?.damage?.parts?.length ? payload.damage.parts : [{ formula, type: damageType }];
  const rolls = [];
  for (const part of parts) {
    const roll = new CONFIG.Dice.DamageRoll(part.formula, {}, { type: part.type });
    await roll.evaluate();
    rolls.push(roll);
  }
  const typeLabel = t => CONFIG.DND5E.damageTypes?.[t]?.label ?? t;
  const summary = parts.map(p => `${p.formula} ${typeLabel(p.type)}`).join(" + ");

  await CONFIG.Dice.DamageRoll.toMessage(rolls, {
    speaker: message?.speaker,
    flavor: `<i class="fa-solid fa-burst"></i> ${payload?.itemName ?? "Ładunek"} — ${summary}`,
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

const DAMAGE_TYPE_WORDS = [
  { re: /wybuchow/i, type: "explosive", label: "Wybuchowe" },
  { re: /ogie(?:ń|n)|ognia/i, type: "fire", label: "Od ognia" },
  { re: /ci(?:ę|e)t/i, type: "slashing", label: "Sieczne" },
  { re: /k(?:ł|l)ut/i, type: "piercing", label: "Kłute" },
  { re: /obuchow/i, type: "bludgeoning", label: "Obuchowe" },
  { re: /kwas/i, type: "acid", label: "Od kwasu" },
  { re: /trucizn/i, type: "poison", label: "Od trucizny" },
  { re: /elektryczn/i, type: "lightning", label: "Elektryczne" },
  { re: /zimn/i, type: "cold", label: "Od zimna" }
];

/**
 * Kości z opisu efektu. `formula`/`type` — suma i typ ogólny (pierwszy rozpoznany), jak dotąd.
 * `parts` — każdy człon z WŁASNYM typem: słowo typu szukane w tekście od tych kości do
 * następnych. Człon bez słowa dziedziczy typ poprzedniego. Rzut z karty idzie z `parts`, bo
 * „1k6 ogień + 1k6 obuchowe" to dwa typy obrażeń — odporność na ogień ma zdjąć tylko połowę.
 * (Do 2026-09-23 cała formuła szła jednym typem: koktajl rzucał 2k6 od ognia, odłamkowy
 * 4k6+4k6 wybuchowych zamiast wybuchowe + sieczne.)
 */
function _parseDamageSpec(effectText) {
  const raw = String(effectText ?? "");
  const diceMatches = [...raw.matchAll(/(\d+)\s*k\s*(\d+)/gi)];
  const formula = diceMatches.length
    ? diceMatches.map(m => `${Number(m[1])}d${Number(m[2])}`).join(" + ")
    : "";

  const foundType = DAMAGE_TYPE_WORDS.find(t => t.re.test(raw)) ?? { type: "explosive", label: "Wybuchowe" };

  let prev = foundType;
  const parts = diceMatches.map((m, idx) => {
    const end = diceMatches[idx + 1]?.index ?? raw.length;
    const segment = raw.slice(m.index + m[0].length, end);
    const own = DAMAGE_TYPE_WORDS.find(t => t.re.test(segment));
    if (own) prev = own;
    const t = own ?? prev;
    return { formula: `${Number(m[1])}d${Number(m[2])}`, type: t.type, label: t.label };
  });

  const label = parts.length ? parts.map(p => `${p.formula} ${p.label}`).join(" + ") : "—";
  return { formula, type: foundType.type, label, parts };
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

/**
 * Czyste predykaty/parsery wystawione dla testów Quench (`scripts/tests/`) — Warstwa 4
 * (TESTING.md). Wyłącznie funkcje bez efektów ubocznych: parsowanie tekstu katalogu
 * (`_parseSaveSpec`/`_parseDamageSpec` — regex na polskim opisie z `GRENADE_TYPES`, dokładnie
 * to, co żywi kartę czatu z przyciskami RO/obrażeń), progi kolorowania paska rzutu, i przeliczenie
 * obszaru wybuchu na kratki. Celowo NIE wystawia `_resolveAreaSpec` (dla dwuwartościowego
 * sześcianu otwiera prawdziwy DialogV2 — Warstwa 4 jest tylko dla funkcji bez UI) ani niczego, co
 * dotyka `canvas`/tworzy dokumenty (`pickCanvasPoint`, `_spawnExplosiveMarker`, VFX) — to
 * świadomie poza zasięgiem testów, patrz TESTING.md §4.
 */
export const __testing = Object.freeze({
  parseSaveSpec: _parseSaveSpec,
  parseDamageSpec: _parseDamageSpec,
  getThrowBandClass: _getThrowBandClass,
  getThrowBandColor: _getThrowBandColor,
  throwRangeMeters: _throwRangeMeters,
  anchorPassed: _anchorPassed,
  parseIgniteSpec: _parseIgniteSpec,
  computeTargetSquares: _computeTargetSquares
});
