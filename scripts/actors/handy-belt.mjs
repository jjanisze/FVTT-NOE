/**
 * Neuroshima 5e — pasek przedmiotów podręcznych w nagłówku karty postaci.
 *
 * Model (co leży w którym slocie, limit, zużycie): `actors/handy-items.mjs`. Ten plik to tylko
 * widok i gesty. Plan i uzasadnienia: `PLAN_przedmioty_podreczne_v2.md`.
 *
 * Dlaczego nagłówek: pasek boczny karty dnd5e przewija się razem z treścią — Ulubione zaczynają
 * się pod krawędzią okna już przy otwarciu, a nawet PW znikają przy przewinięciu ekwipunku.
 * Nagłówek się nie przewija, a pod nazwą/klasą jest pusty pas ~446×40 px. Przedmioty podręczne
 * to mechanika, Ulubione — wygoda karty, więc pas stoi wyżej (decyzja MG 2026-09-25).
 *
 * Jeden kafelek = jedna **sztuka** (dwa Relanium przy pasie to dwa kafelki). Gesty:
 *   - przeciągnięcie wiersza z Ekwipunku/Zasobów na pas — +1 sztuka (na wskazany slot);
 *   - przeciągnięcie kafelka na inny slot — przestawienie (zajęty slot: zamiana miejscami);
 *   - przeciągnięcie kafelka poza pas (gdziekolwiek na karcie) albo × — z powrotem do plecaka;
 *   - klik — główne działanie przedmiotu; Shift+klik — karta przedmiotu; PPM — menu.
 * Upuszczenie poza kartą nic nie robi: `dragend` nie mówi wiarygodnie, czy „nigdzie".
 */

import {
  beltSlots, handyLimit, handyCount, handySlotSources, handyFamilyLabels, handyCaption, handyUse,
  addToBelt, removeFromBelt, moveBeltPiece, beltCount, HANDY_LIMIT
} from "./handy-items.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Trwa przeciąganie kafelka — `{actorUuid, slot}`; potrzebne w `dragover`, gdzie danych nie da się czytać. */
let _beltDrag = null;
const _boundRoots = new WeakSet();

export function registerHandyBelt() {
  Hooks.on("renderCharacterActorSheet", _onRenderSheet);
  console.log("Neuroshima 5e | Handy-items belt registered");
}

function _rootOf(html) {
  return html instanceof HTMLElement ? html
    : html?.[0] instanceof HTMLElement ? html[0]
    : html?.element instanceof HTMLElement ? html.element
    : null;
}

function _onRenderSheet(app, html) {
  const actor = app.document ?? app.actor;
  if (actor?.type !== "character") return;
  const root = _rootOf(html);
  if (!root) return;

  root.querySelectorAll(".neuro-belt").forEach(n => n.remove());
  const header = root.querySelector(".sheet-header");
  if (!header) return;
  const host = header.querySelector(".left") ?? header;
  host.appendChild(_buildStrip(actor));

  if (actor.isOwner && !_boundRoots.has(app.element)) {
    _boundRoots.add(app.element);
    _bindDragOff(app);
  }
}

/* -------------------------------------------- */
/*  Budowa                                       */
/* -------------------------------------------- */

function _esc(s) {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function _labelTooltip(actor, used, limit) {
  const sources = [`${HANDY_LIMIT} — RAW`, ...handySlotSources(actor).map(s => `+${s.slots} — ${s.name}`)];
  return `Przedmioty podręczne: ${used}/${limit} (${sources.join(", ")}). `
    + `Wyciągnięcie z pasa to Darmowa Interakcja; z plecaka — zazwyczaj akcja. `
    + `Przeciągnij przedmiot na pas; kafelek na inny slot — przestaw; poza pas albo × — do plecaka. `
    + `Klik: użyj · Shift+klik: karta · PPM: menu. Na pas: ${handyFamilyLabels().join("; ")}.`;
}

function _buildStrip(actor) {
  const slots = beltSlots(actor);
  const limit = handyLimit(actor);
  const used = handyCount(actor);
  const editable = actor.isOwner;

  const strip = document.createElement("div");
  strip.className = `neuro-belt${used > limit ? " is-overflow" : ""}${editable ? "" : " is-readonly"}`;
  strip.innerHTML = `
    <div class="neuro-belt-label" data-tooltip="${_esc(_labelTooltip(actor, used, limit))}" data-tooltip-direction="DOWN">
      <span class="neuro-belt-title">Pas</span>
      <span class="neuro-belt-count">${used}/${limit}</span>
    </div>
    <div class="neuro-belt-slots">${slots.map(s => _slotHtml(s, editable)).join("")}</div>
  `;
  if (editable) _bindStrip(strip, actor);
  return strip;
}

function _slotHtml({ slot, item, overflow }, editable) {
  if (!item) {
    return `<div class="neuro-belt-slot is-empty${overflow ? " is-overflow" : ""}" data-slot="${slot}"
      data-tooltip="Wolny slot — przeciągnij tu przedmiot z Ekwipunku albo Zasobów." data-tooltip-direction="DOWN">
      <i class="fas fa-plus" inert></i></div>`;
  }
  const caption = handyCaption(item);
  // Zapas w plecaku, nie ilość stosu: „×2" na kafelku czytało się jak „dwa przy pasie".
  const reserve = Number(item.system.quantity ?? 1) - beltCount(item);
  const stack = reserve > 0 ? `<span class="neuro-belt-stack" inert>+${reserve}</span>` : "";
  return `<div class="neuro-belt-slot is-filled${overflow ? " is-overflow" : ""}" data-slot="${slot}"
      data-item-id="${item.id}" role="button" tabindex="0" ${editable ? `draggable="true"` : ""}
      aria-label="${_esc(item.name)}"
      data-tooltip='<section class="loading" data-uuid="${item.uuid}"><i class="fas fa-spinner fa-spin-pulse"></i></section>'
      data-tooltip-class="dnd5e2 dnd5e-tooltip item-tooltip themed theme-light" data-tooltip-direction="DOWN">
      <img src="${_esc(item.img)}" alt="" inert>
      ${stack}
      ${caption ? `<span class="neuro-belt-caption" inert>${_esc(caption)}</span>` : ""}
      ${overflow ? `<span class="neuro-belt-flag" inert>nadmiar</span>` : ""}
      ${editable ? `<span class="neuro-belt-remove" data-tooltip="Odłóż do plecaka"><i class="fas fa-xmark" inert></i></span>` : ""}
    </div>`;
}

/* -------------------------------------------- */
/*  Gesty                                        */
/* -------------------------------------------- */

function _dragData(event) {
  try {
    const raw = event.dataTransfer?.getData("text/plain") || event.dataTransfer?.getData("application/json");
    return raw ? JSON.parse(raw) : null;
  } catch (_e) {
    return null;
  }
}

function _slotOf(el) {
  const n = Number(el?.closest?.("[data-slot]")?.dataset.slot);
  return Number.isInteger(n) ? n : null;
}

function _bindStrip(strip, actor) {
  const itemAt = el => actor.items.get(el.closest("[data-item-id]")?.dataset.itemId);

  strip.addEventListener("click", async ev => {
    const tile = ev.target.closest(".neuro-belt-slot.is-filled");
    if (!tile) return;
    ev.preventDefault();
    ev.stopPropagation();
    const item = itemAt(tile);
    if (!item) return;
    const slot = _slotOf(tile);
    if (ev.target.closest(".neuro-belt-remove")) return removeFromBelt(item, { slot });
    if (ev.shiftKey) return item.sheet.render(true);
    return handyUse(item, { slot, event: ev });
  });

  strip.addEventListener("keydown", ev => {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    const tile = ev.target.closest(".neuro-belt-slot.is-filled");
    if (!tile) return;
    ev.preventDefault();
    const item = itemAt(tile);
    if (item) handyUse(item, { slot: _slotOf(tile), event: ev });
  });

  strip.addEventListener("dragstart", ev => {
    const tile = ev.target.closest(".neuro-belt-slot.is-filled");
    const item = tile && itemAt(tile);
    if (!item) return;
    const slot = _slotOf(tile);
    _beltDrag = { actorUuid: actor.uuid, slot };
    // Standardowy ładunek `Item` + nasz znacznik: na innej karcie/na aktorze działa jak zwykłe
    // przeciągnięcie przedmiotu, na tej — przestawia albo odkłada.
    ev.dataTransfer.setData("text/plain", JSON.stringify({
      type: "Item", uuid: item.uuid, neuroshima: { beltFrom: slot, actorUuid: actor.uuid }
    }));
    ev.dataTransfer.effectAllowed = "move";
    tile.classList.add("is-dragging");
    strip.classList.add("is-dragging");
    game.tooltip?.deactivate?.();
  });

  strip.addEventListener("dragend", ev => {
    _beltDrag = null;
    ev.target.closest?.(".neuro-belt-slot")?.classList.remove("is-dragging");
    strip.classList.remove("is-dragging");
    strip.querySelectorAll(".is-drop-target").forEach(n => n.classList.remove("is-drop-target"));
  });

  strip.addEventListener("dragover", ev => {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = _beltDrag ? "move" : "copy";
    strip.querySelectorAll(".is-drop-target").forEach(n => n.classList.remove("is-drop-target"));
    ev.target.closest(".neuro-belt-slot")?.classList.add("is-drop-target");
    strip.classList.add("is-drop-hover");
  });

  strip.addEventListener("dragleave", ev => {
    if (strip.contains(ev.relatedTarget)) return;
    strip.classList.remove("is-drop-hover");
    strip.querySelectorAll(".is-drop-target").forEach(n => n.classList.remove("is-drop-target"));
  });

  strip.addEventListener("drop", async ev => {
    // Przed dnd5e: upuszczenie przedmiotu tego samego aktora jego karta traktuje jak sortowanie.
    ev.preventDefault();
    ev.stopPropagation();
    strip.classList.remove("is-drop-hover");
    const data = _dragData(ev);
    const target = _slotOf(ev.target);
    if (!data) return;

    if (data.neuroshima?.beltFrom != null && data.neuroshima.actorUuid === actor.uuid) {
      if (target == null) return;
      return moveBeltPiece(actor, data.neuroshima.beltFrom, target);
    }
    if (data.type !== "Item" || !data.uuid) return;
    const item = await fromUuid(data.uuid);
    if (!item) return;
    if (item.parent !== actor) {
      ui.notifications.warn(`${item.name}: najpierw przenieś przedmiot do ekwipunku ${actor.name}, potem na pas.`);
      return;
    }
    return addToBelt(item, { slot: target ?? undefined });
  });

  const ContextMenu = foundry.applications.ux.ContextMenu.implementation ?? foundry.applications.ux.ContextMenu;
  new ContextMenu(strip, ".neuro-belt-slot.is-filled", [
    {
      name: "Użyj", icon: '<i class="fas fa-hand-pointer"></i>',
      callback: el => { const i = itemAt(el); if (i) handyUse(i, { slot: _slotOf(el) }); }
    },
    {
      name: "Odłóż do plecaka", icon: '<i class="fas fa-boxes-packing"></i>',
      callback: el => { const i = itemAt(el); if (i) removeFromBelt(i, { slot: _slotOf(el) }); }
    },
    {
      name: "Odłóż cały stos", icon: '<i class="fas fa-box-open"></i>',
      condition: el => beltCount(itemAt(el)) > 1,
      callback: async el => {
        const i = itemAt(el);
        while (i && beltCount(actor.items.get(i.id)) > 0) await removeFromBelt(actor.items.get(i.id));
      }
    },
    {
      name: "Otwórz kartę", icon: '<i class="fas fa-file-lines"></i>',
      callback: el => itemAt(el)?.sheet.render(true)
    }
  ], { jQuery: false, fixed: true });
}

/**
 * Odkładanie przez przeciągnięcie kafelka **poza** pas — dowolne miejsce na karcie. Nasłuch w fazie
 * przechwytywania na korzeniu aplikacji (raz na okno — element przeżywa ponowne renderowanie), żeby
 * zdążyć przed obsługą upuszczenia dnd5e, która sortowałaby przedmiot.
 */
function _bindDragOff(app) {
  const el = app.element;
  el.addEventListener("dragover", ev => {
    if (_beltDrag && !ev.target.closest(".neuro-belt")) {
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "move";
    }
  }, { capture: true });
  el.addEventListener("drop", async ev => {
    if (ev.target.closest(".neuro-belt")) return;
    const data = _dragData(ev);
    const from = data?.neuroshima?.beltFrom;
    const actor = app.document;
    if (from == null || data.neuroshima.actorUuid !== actor?.uuid) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    const item = await fromUuid(data.uuid);
    if (item) await removeFromBelt(item, { slot: from });
  }, { capture: true });
}
