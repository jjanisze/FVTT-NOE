/**
 * Neuroshima 5e — podkładanie min i ładunków (C4, IED) i ich detonacja.
 *
 * Zasady i decyzje MG: `charge-rules.mjs` (czyste funkcje, testowane). Tu przepływ:
 *
 * **Podłożenie** (gracz, z wiersza „Materiały wybuchowe" albo z kafelka pasa):
 *   1. dialog — sposób detonacji (tylko te, na które starcza zapalników), czas zapalnika,
 *      czym robi się Test (Zwinne dłonie, narzędzia ślusarza/rusznikarza, Survival);
 *   2. punkt na mapie, do 3 m (przekroczenie oznaczane, nie blokowane — jak przy rzucie);
 *   3. Test ST 10: sukces — uzbrojony; porażka — niewypał (leży, nie wybuchnie); porażka o 5+ —
 *      wybuch od razu, w punkcie podkładania;
 *   4. zużycie: ładunek −1, zapalnik −1 (radiowy/elektryczny);
 *   5. prośba do MG przez flagę na własnym aktorze (ten sam przekaźnik co rzut — gracz nie może
 *      tworzyć Tile'i), MG stawia Tile z flagą `pendingCharge` (`grenade-inventory.mjs`).
 *
 * **Detonacja** (MG 2026-09-25):
 *   - czasowy — zegar świata (`_sweepPendingCharges` w `grenade-inventory.mjs`);
 *   - radiowy — gracz z pilotem tego zestawu, do 200 m; elektryczny — podkładający, do 10 m
 *     (kabel). Ta sama scena i w zasięgu → od razu; ta sama scena i dalej → odmowa (RAW); aktor
 *     bez żetonu na tamtej scenie → prośba do MG z przyciskiem (zasięg ocenia MG);
 *   - wyzwalacz, nacisk — MG;
 *   - **MG może odpalić każdy ładunek**, bez względu na sposób: przycisk na karcie „Podłożono",
 *     w HUD-zie Tile'a i na liście „Podłożone ładunki" (pasek narzędzi żetonów).
 */

import { GRENADE_MAP } from "../config/ammo-data.mjs";
import { registerExplosiveAction, explosiveInternals as X, detonateCharge, listChargeTiles } from "./grenade-inventory.mjs";
import { provenanceBadge, isAtHand } from "./handy-items.mjs";
import { pickCanvasPoint, measureMeters, metersToPx } from "../scenes/area-picker.mjs";
import {
  PLANT_DC, PLANT_RANGE_M, availableMethods, plantOutcome, timerSeconds, formatDuration,
  chargeCaption, remoteAccess
} from "./charge-rules.mjs";
import {
  radioFuzeStacks, electricFuzeStacks, fuzeCounts, pilotKitIds, kitIdOf, kitTag,
  DETONATOR_ACTIVITY_IDENTIFIER
} from "../items/detonator.mjs";
import { formatWorldTime, formatWorldClock } from "../world-clock.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Flaga na aktorze gracza: „odpal te ładunki" — czyta ją MG (jak `explosivePendingCharge`). */
const FLAG_DETONATE_REQUEST = "explosiveDetonateRequest";

const PLANT_SKILLS = Object.freeze([
  { key: "zwi", label: "Zręczność (Zwinne dłonie)" },
  { key: "sur", label: "Mądrość (Survival)" }
]);
const PLANT_TOOLS = Object.freeze(["slusarza", "rusznikarza"]);

export function registerPlacedCharges() {
  registerExplosiveAction(def => !!def?.placed, plantCharge);
  Hooks.on("dnd5e.preUseActivity", _onPreUseActivity);
  Hooks.on("updateActor", _onUpdateActor);
  Hooks.on("renderChatMessageHTML", _onRenderChatMessage);
  Hooks.on("renderTileHUD", _onRenderTileHUD);
  for (const hook of ["renderCharacterActorSheet", "renderNPCActorSheet"]) Hooks.on(hook, _onRenderSheet);
  Hooks.on("getSceneControlButtons", controls => {
    const tools = controls.tokens?.tools;
    if (!tools) return;
    tools.neuroshimaCharges = {
      name: "neuroshimaCharges",
      title: "Podłożone ładunki (MG) — lista, detonacja",
      icon: "fa-solid fa-bomb",
      order: Object.keys(tools).length,
      button: true,
      visible: game.user?.isGM ?? false,
      onChange: () => openDetonationDialog(null)
    };
  });
  console.log("Neuroshima 5e | Placed charges registered");
}

/* -------------------------------------------- */
/*  Podłożenie                                    */
/* -------------------------------------------- */

/**
 * Podłóż jedną sztukę `item` (mina, C4, IED). Anulowanie na dowolnym kroku niczego nie zużywa.
 * @param {Actor} actor
 * @param {Item} item
 * @param {object} [def]  wpis `GRENADE_TYPES`
 */
export async function plantCharge(actor, item, def = GRENADE_MAP[item?.system?.type?.subtype]) {
  const qty = Number(item?.system?.quantity ?? 0);
  if (!def?.placed) return;
  if (qty <= 0) {
    ui.notifications.warn(`${item.name}: brak sztuk do podłożenia.`);
    return;
  }
  const token = X.actorToken(actor);
  if (!token) {
    ui.notifications.warn("Brak żetonu tej postaci na scenie. Zaznacz żeton i spróbuj ponownie.");
    return;
  }

  const methods = availableMethods(def, fuzeCounts(actor));
  if (!methods.some(m => m.available)) {
    ui.notifications.warn(`${item.name}: nie ma czym tego odpalić — `
      + methods.map(m => m.reason).filter(Boolean).join("; ") + ".");
    return;
  }

  const choice = await _plantDialog(actor, item, def, methods);
  if (!choice) return;

  const area = await X.resolveAreaSpec(def);
  if (!area) return;
  const side = metersToPx(Math.max(0.5, Number(area.side ?? (area.radius ?? 1.5) * 2)));
  const origin = { x: token.center.x, y: token.center.y };
  const point = await pickCanvasPoint({
    hint: `Gdzie podłożyć (${item.name}, do ${PLANT_RANGE_M} m): kliknij na mapie`,
    shape: area.kind === "cube" ? { kind: "rect", width: side, height: side } : { kind: "circle", radii: [side / 2] },
    origin, range: { long: PLANT_RANGE_M }
  });
  if (!point) return;
  const distance = measureMeters(origin, point);
  if (distance > PLANT_RANGE_M) {
    ui.notifications.warn(`Podłożenie poza zasięgiem ręki (${distance.toFixed(1)} m > ${PLANT_RANGE_M} m) — rozstrzyga MG.`);
  }

  const total = await _rollPlantTest(actor, item, choice.test);
  if (total === null) return;
  const outcome = plantOutcome(total);

  // Pochodzenie przed zużyciem — ubytek schodzi najpierw z pasa (`handy-items.mjs`).
  const fromBelt = isAtHand(item);
  await item.update({ "system.quantity": qty - 1 });
  const fuze = choice.fuze;
  if (fuze) await fuze.update({ "system.quantity": Math.max(0, Number(fuze.system.quantity ?? 0) - 1) });

  const subtype = item.system.type?.subtype;
  const damage = X.parseDamageSpec(def.effect);
  const marker = {
    sceneId: canvas.scene?.id ?? null,
    kind: "explosion",
    x: point.x, y: point.y,
    area, color: "#e06666",
    itemName: item.name,
    areaText: def.area ?? "",
    damageType: damage.type,
    hasDamageFormula: !!damage.formula
  };
  const card = {
    itemName: item.name,
    itemImg: item.img,
    badge: provenanceBadge(item, { atHand: fromBelt }),
    save: X.parseSaveSpec(def.save),
    damage,
    ignite: X.parseIgniteSpec(def.effect),
    isMine: /mine$/.test(subtype ?? ""),
    areaLabel: area.label,
    saveText: def.save ?? "—",
    effectText: def.effect ?? "—"
  };

  if (outcome === "blast") {
    await X.requestBlast(actor, marker, subtype);
    await X.postExplosiveCard(actor, card, {
      detonated: true,
      note: `<strong>Wybuch przy zakładaniu</strong> — Test podłożenia ${total} (ST ${PLANT_DC}), porażka o 5 lub więcej.`
    });
    return;
  }

  const now = game.time.worldTime;
  const anchor = _anchorFor(choice, actor, now);
  const chargeId = foundry.utils.randomID(12);
  const placed = {
    chargeId,
    method: choice.method,
    dud: outcome === "dud",
    hidden: !actor.hasPlayerOwner,
    planterUuid: actor.uuid,
    planterName: actor.name,
    plantedAt: now,
    test: total
  };
  await X.requestPendingCharge(actor, { anchor, marker, card, subtype, lit: false, placed });
  await _postPlacedCard(actor, { card, anchor, placed, outcome, total, fuze });
}

function _anchorFor(choice, actor, now) {
  switch (choice.method) {
    case "timer": return { type: "timer", at: now + choice.seconds, setAt: now, seconds: choice.seconds };
    case "radio": return { type: "remote", via: "radio", kitId: kitIdOf(choice.fuze) };
    case "electric": return { type: "remote", via: "electric", planterUuid: actor.uuid };
    default: return { type: "trigger", method: choice.method };
  }
}

function _escape(s) {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** Modyfikator, jeśli dnd5e go zna (narzędzia bez biegłości nie mają `total`). */
function _signed(n) {
  return Number.isFinite(n) ? ` (${n >= 0 ? "+" : ""}${n})` : "";
}

function _testOptions(actor) {
  const opts = PLANT_SKILLS.map(s => ({ value: `skill:${s.key}`, label: s.label, total: actor.system.skills?.[s.key]?.total }));
  for (const key of PLANT_TOOLS) {
    const tool = actor.items.find(i => i.type === "tool" && i.system.type?.baseItem === key);
    if (tool) opts.splice(1, 0, { value: `tool:${tool.id}`, label: tool.name, total: actor.system.tools?.[key]?.total });
  }
  return opts;
}

async function _plantDialog(actor, item, def, methods) {
  const tests = _testOptions(actor);
  const best = tests.reduce((a, b) => ((b.total ?? -99) > (a.total ?? -99) ? b : a), tests[0]);
  const firstAvailable = methods.find(m => m.available)?.id;
  const radioStacks = radioFuzeStacks(actor);

  const methodRows = methods.map(m => `
    <label style="display:flex; gap:6px; align-items:center; ${m.available ? "" : "opacity:0.5;"}">
      <input type="radio" name="method" value="${m.id}" ${m.id === firstAvailable ? "checked" : ""} ${m.available ? "" : "disabled"}>
      <span>${m.label}${m.fires === "gm" ? " — odpala MG" : ""}${m.reason ? ` <em>(${m.reason})</em>` : ""}</span>
    </label>`).join("");

  const kitSelect = radioStacks.length > 1 ? `
    <div class="form-group neuro-plant-radio">
      <label>Zapalnik radiowy</label>
      <select name="radioFuze">${radioStacks.map(s => `<option value="${s.id}">zestaw ${kitTag(kitIdOf(s))} — ${s.system.quantity} szt.</option>`).join("")}</select>
    </div>` : "";

  const content = `
    <p style="margin-top:0;"><strong>${_escape(item.name)}</strong> — ${_escape(def.area ?? "")}. Test ST ${PLANT_DC}:
      porażka = niewypał, porażka o 5+ = wybuch przy zakładaniu.</p>
    <fieldset><legend>Detonacja</legend>${methodRows}</fieldset>
    <div class="form-group neuro-plant-timer">
      <label>Czas zapalnika</label>
      <div class="form-fields">
        <input type="number" name="timerValue" value="10" min="1" step="1" style="width:5em;">
        <select name="timerUnit">
          <option value="rounds">rund</option>
          <option value="minutes" selected>minut</option>
          <option value="hours">godzin</option>
        </select>
      </div>
      <p class="hint">Zegar świata, do 24 h. Wybuch z efektami, jeśli na scenie są gracze — inaczej wiadomość dla MG.</p>
    </div>
    ${kitSelect}
    <div class="form-group">
      <label>Test</label>
      <select name="test">${tests.map(t => `<option value="${t.value}" ${t === best ? "selected" : ""}>${_escape(t.label)}${_signed(t.total)}</option>`).join("")}</select>
    </div>`;

  const { DialogV2 } = foundry.applications.api;
  const data = await DialogV2.wait({
    window: { title: `Podłóż: ${item.name}` },
    position: { width: 420 },
    content,
    render: (_event, dialog) => {
      const form = dialog.element.querySelector("form") ?? dialog.element;
      const sync = () => {
        const m = form.querySelector('input[name="method"]:checked')?.value;
        form.querySelector(".neuro-plant-timer")?.toggleAttribute("hidden", m !== "timer");
        form.querySelector(".neuro-plant-radio")?.toggleAttribute("hidden", m !== "radio");
      };
      form.addEventListener("change", sync);
      sync();
    },
    buttons: [
      {
        action: "plant", icon: "fa-solid fa-location-dot", label: "Wybierz miejsce", default: true,
        callback: (_event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
      },
      { action: "cancel", icon: "fa-solid fa-times", label: "Anuluj", callback: () => null }
    ]
  });
  if (!data?.method) return null;

  const method = data.method;
  const choice = { method, test: data.test };
  if (method === "timer") {
    choice.seconds = timerSeconds(data.timerValue, data.timerUnit);
    if (!choice.seconds) {
      ui.notifications.warn("Czas zapalnika: od jednej rundy do 24 godzin.");
      return null;
    }
  }
  if (method === "radio") choice.fuze = radioStacks.find(s => s.id === data.radioFuze) ?? radioStacks[0];
  if (method === "electric") choice.fuze = electricFuzeStacks(actor)[0];
  if ((method === "radio" || method === "electric") && !choice.fuze) {
    ui.notifications.warn("Brak zapalnika.");
    return null;
  }
  return choice;
}

/** Test podłożenia — rzut dnd5e (z jego dialogiem: Ułatwienie/Utrudnienie). null = anulowany. */
async function _rollPlantTest(actor, item, test) {
  const flavor = `Podłożenie: ${item.name} — ST ${PLANT_DC}`;
  const [kind, key] = String(test ?? "skill:zwi").split(":");
  let rolls;
  if (kind === "tool") {
    const tool = actor.items.get(key);
    rolls = tool ? await tool.rollToolCheck({ target: PLANT_DC }, {}, { data: { flavor } }) : null;
  } else {
    rolls = await actor.rollSkill({ skill: key, target: PLANT_DC }, {}, { data: { flavor } });
  }
  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  return Number.isFinite(roll?.total) ? roll.total : null;
}

function _methodLine(anchor, placed, fuze) {
  switch (anchor.type) {
    case "timer":
      return `Czasowy — wybuch <strong>${formatWorldTime(anchor.at) ?? formatWorldClock(anchor.at)}</strong> `
        + `(za ${formatDuration(anchor.seconds)}).`;
    case "remote":
      return anchor.via === "radio"
        ? `Radiowy — zapalnik z zestawu ${kitTag(anchor.kitId)}; odpala pilot tego zestawu, do 200 m.`
        : `Elektryczny — odpala ${_escape(placed.planterName)} z końca kabla, do 10 m.`;
    default:
      return anchor.method === "pressure" ? "Nacisk / wyzwalacz — odpala MG." : "Wyzwalacz / pułapka — odpala MG.";
  }
}

async function _postPlacedCard(actor, { card, anchor, placed, outcome, total, fuze }) {
  const result = outcome === "armed"
    ? "uzbrojony"
    : "porażka — ładunek leży, ale nie wybuchnie (niewypał)";
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    ...(placed.hidden ? { whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id) } : {}),
    content: `
      <div class="neuro-explosive-card neuro-placed-card" style="padding:8px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
          <img src="${card.itemImg}" alt="" width="28" height="28" style="border:none;" />
          <strong style="font-size:1.05em;">Podłożono: ${_escape(card.itemName)}</strong>
          ${card.badge}
        </div>
        <div><strong>Detonacja:</strong> ${_methodLine(anchor, placed, fuze)}</div>
        <div><strong>Test podłożenia:</strong> ${total} (ST ${PLANT_DC}) — ${result}.</div>
        <div><strong>Obszar:</strong> ${_escape(card.areaLabel)}</div>
        <div class="neuro-charge-gm" style="margin-top:6px;">
          <button type="button" class="neuro-charge-detonate" data-charge-id="${placed.chargeId}"
            style="padding:2px 8px; border:1px solid #9b5f5f; background:#3f2323; color:#ffe3e3; border-radius:4px;">
            <i class="fa-solid fa-burst"></i> Detonuj (MG)</button>
        </div>
      </div>`,
    flags: { [MODULE_ID]: { placedChargeCard: { chargeId: placed.chargeId } } }
  });
}

/* -------------------------------------------- */
/*  Detonacja                                     */
/* -------------------------------------------- */

function _findCharge(chargeId) {
  return listChargeTiles().find(c => c.charge?.placed?.chargeId === chargeId) ?? null;
}

/** Żeton aktora na danej scenie (połączony albo ten konkretny, niepołączony). */
function _actorTokenOn(scene, actor) {
  if (!actor) return null;
  if (actor.isToken) return actor.token?.parent?.id === scene.id ? actor.token : null;
  return scene.tokens.find(t => t.actorLink && t.actorId === actor.id) ?? null;
}

function _metersOnScene(scene, tokenDoc, point) {
  const g = Number(scene.grid?.size ?? 100);
  const c = tokenDoc.getCenterPoint?.() ?? { x: tokenDoc.x + tokenDoc.width * g / 2, y: tokenDoc.y + tokenDoc.height * g / 2 };
  return Math.hypot(c.x - point.x, c.y - point.y) / g * Number(scene.grid?.distance ?? 1.5);
}

/**
 * Stan jednego ładunku z punktu widzenia `actor`: czy może go odpalić i skąd.
 * @returns {{ok:boolean, status:"range"|"far"|"elsewhere"|"none", meters:number|null, via:string|null, rangeM:number|null}}
 */
function _accessFor(actor, entry) {
  const access = remoteAccess(entry.charge, { actorUuid: actor?.uuid, pilotKitIds: pilotKitIds(actor) });
  if (!access.ok) return { ...access, status: "none", meters: null };
  const tok = _actorTokenOn(entry.scene, actor);
  if (!tok) return { ...access, status: access.via === "electric" ? "far" : "elsewhere", meters: null };
  const meters = _metersOnScene(entry.scene, tok, entry.charge.marker);
  return { ...access, status: meters <= access.rangeM ? "range" : "far", meters };
}

/** Ładunki, które `actor` może odpalić sam (pilot, kabel). */
export function remoteChargesFor(actor) {
  return listChargeTiles().filter(e => remoteAccess(e.charge, { actorUuid: actor?.uuid, pilotKitIds: pilotKitIds(actor) }).ok);
}

/**
 * Lista ładunków z przyciskami „Detonuj". Z aktorem — te, które on może odpalić (pilot, kabel).
 * Bez aktora (MG, pasek narzędzi) — wszystkie leżące ładunki na wszystkich scenach.
 * @param {Actor|null} actor
 */
export async function openDetonationDialog(actor) {
  const gmAll = !actor && game.user.isGM;
  const entries = gmAll ? listChargeTiles() : remoteChargesFor(actor);
  if (!entries.length) {
    ui.notifications.info(gmAll ? "Na żadnej scenie nie leży żaden ładunek." : `${actor?.name ?? "Ta postać"}: brak ładunków, które można stąd odpalić.`);
    return;
  }

  const rows = entries.map(e => {
    const c = e.charge;
    const name = _escape(c.card?.itemName ?? "ładunek");
    const where = _escape(e.scene.name);
    let status = "", disabled = false;
    if (!gmAll) {
      const a = _accessFor(actor, e);
      if (a.status === "range") status = `${a.meters.toFixed(0)} m — w zasięgu`;
      else if (a.status === "far") { status = a.meters === null ? "brak żetonu przy kablu" : `${a.meters.toFixed(0)} m — poza zasięgiem (${a.rangeM} m)`; disabled = true; }
      else if (a.status === "elsewhere") status = "inna scena — zasięg oceni MG";
    }
    const gmBits = gmAll
      ? [c.placed?.planterName ? `podłożył: ${_escape(c.placed.planterName)}` : "rzucony", c.placed?.dud ? "<strong>niewypał</strong>" : "", c.placed?.hidden ? "ukryty" : ""].filter(Boolean).join(" · ")
      : "";
    return `
      <li style="display:flex; align-items:center; gap:8px; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
        <img src="${c.card?.itemImg ?? ""}" width="24" height="24" style="border:none;">
        <div style="flex:1; min-width:0; line-height:1.25;">
          <div><strong>${name}</strong> — ${_escape(chargeCaption(c, formatWorldClock))}</div>
          <div style="font-size:0.85em; opacity:0.8;">${where}${status ? ` · ${status}` : ""}${gmBits ? ` · ${gmBits}` : ""}</div>
        </div>
        <button type="button" data-action="detonate" data-scene-id="${e.scene.id}" data-tile-id="${e.tile.id}" ${disabled ? "disabled" : ""}
          style="flex:0 0 auto; width:auto;" ${gmAll && c.placed?.dud ? 'data-tooltip="Niewypał — ręka MG odpala go mimo to"' : ""}><i class="fa-solid fa-burst"></i> ${gmAll && c.placed?.dud ? "Mimo to" : "Detonuj"}</button>
      </li>`;
  }).join("");

  const { DialogV2 } = foundry.applications.api;
  await DialogV2.wait({
    window: { title: gmAll ? "Podłożone ładunki (MG)" : `Detonacja — ${actor.name}` },
    position: { width: 480 },
    content: `<ul style="list-style:none; margin:0; padding:0; max-height:420px; overflow-y:auto;">${rows}</ul>`,
    actions: {
      detonate: async (_event, target) => {
        target.disabled = true;
        const scene = game.scenes.get(target.dataset.sceneId);
        const tile = scene?.tiles.get(target.dataset.tileId);
        if (!tile) return;
        if (game.user.isGM) {
          // Lista MG = ręka MG (odpala i niewypał); pilot gracza w rękach MG działa jak pilot.
          await detonateCharge(scene, tile, { by: actor ? `${actor.name} (odpalone przez MG)` : "MG", force: !actor });
        } else {
          await actor.setFlag(MODULE_ID, FLAG_DETONATE_REQUEST, {
            sceneId: scene.id, tileId: tile.id, nonce: foundry.utils.randomID(8)
          });
          ui.notifications.info("Sygnał wysłany.");
        }
        target.closest("li")?.style.setProperty("opacity", "0.4");
      }
    },
    buttons: [{ action: "close", icon: "fa-solid fa-check", label: "Zamknij", default: true }]
  });
}

/** MG: prośba gracza o detonację — sprawdź pilot/kabel i zasięg, potem odpal albo zapytaj MG. */
async function _onUpdateActor(actor, changes) {
  if (!game.user.isActiveGM) return;
  const req = foundry.utils.getProperty(changes, `flags.${MODULE_ID}.${FLAG_DETONATE_REQUEST}`);
  if (!req?.tileId) return;
  try {
    const scene = game.scenes.get(req.sceneId);
    const tile = scene?.tiles.get(req.tileId);
    const charge = tile?.getFlag(MODULE_ID, "pendingCharge");
    if (!charge) return;
    const a = _accessFor(actor, { scene, tile, charge });
    const how = a.via === "radio" ? "pilot" : "kabel";
    if (a.status === "range") {
      await detonateCharge(scene, tile, { by: `${actor.name} — ${how}, ${a.meters.toFixed(0)} m` });
    } else if (a.status === "elsewhere") {
      await ChatMessage.create({
        speaker: { alias: "Ładunki" },
        whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
        content: `<div class="neuro-explosive-card neuro-placed-card" style="padding:8px;">
          <strong>${_escape(actor.name)} odpala ${_escape(charge.card?.itemName ?? "ładunek")}</strong> (${_escape(scene.name)}) pilotem,
          ale nie ma żetonu na tej scenie. Zasięg pilota: 200 m — oceń sam.
          <div class="neuro-charge-gm" style="margin-top:6px;">
            <button type="button" class="neuro-charge-detonate" data-charge-id="${charge.placed?.chargeId ?? ""}"
              data-by="${_escape(`${actor.name} — pilot (zatwierdził MG)`)}"><i class="fa-solid fa-burst"></i> Detonuj</button>
          </div></div>`,
        flags: { [MODULE_ID]: { placedChargeCard: { chargeId: charge.placed?.chargeId } } }
      });
    }
    // „far"/„none" — odmowa; dialog gracza już to pokazał, więc bez dodatkowej wiadomości.
  } finally {
    try { await actor.unsetFlag(MODULE_ID, FLAG_DETONATE_REQUEST); } catch (_e) { /* aktor mógł zniknąć */ }
  }
}

/** Pilot: aktywność „Detonuj" otwiera listę ładunków zamiast karty użycia. */
function _onPreUseActivity(activity) {
  if (activity?.visibility?.identifier !== DETONATOR_ACTIVITY_IDENTIFIER) return;
  const actor = activity.item?.actor;
  if (actor) openDetonationDialog(actor);
  return false;
}

/* -------------------------------------------- */
/*  Przyciski MG i karty                          */
/* -------------------------------------------- */

function _onRenderChatMessage(message, html) {
  if (!message.getFlag(MODULE_ID, "placedChargeCard")) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  if (!game.user.isGM) {
    root.querySelectorAll(".neuro-charge-gm").forEach(n => n.remove());
    return;
  }
  root.querySelectorAll(".neuro-charge-detonate").forEach(btn => {
    const found = _findCharge(btn.dataset.chargeId);
    if (!found) {
      btn.disabled = true;
      btn.title = "Tego ładunku już nie ma na mapie.";
      return;
    }
    btn.addEventListener("click", async ev => {
      ev.preventDefault();
      btn.disabled = true;
      const again = _findCharge(btn.dataset.chargeId);
      if (again) await detonateCharge(again.scene, again.tile, { by: btn.dataset.by || "MG", force: !btn.dataset.by });
    });
  });
}

function _onRenderTileHUD(hud, html) {
  if (!game.user.isGM) return;
  const tile = hud.document ?? hud.object?.document;
  if (!tile?.getFlag(MODULE_ID, "pendingCharge")) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const col = root?.querySelector(".col.right");
  if (!col || col.querySelector(".neuro-charge-hud")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "control-icon neuro-charge-hud";
  btn.dataset.tooltip = "Detonuj ładunek (MG)";
  btn.innerHTML = `<i class="fa-solid fa-burst" inert></i>`;
  btn.addEventListener("click", async ev => {
    ev.preventDefault();
    hud.close?.();
    await detonateCharge(tile.parent, tile, { by: "MG", force: true });
  });
  col.append(btn);
}

/** „Detonuj…" w stopce Materiałów wybuchowych — gdy aktor ma coś do odpalenia (pilot, kabel). */
function _onRenderSheet(app, html) {
  const actor = app.document ?? app.actor;
  const root = html instanceof HTMLElement ? html : html?.[0] ?? app.element;
  const footerBtn = root?.querySelector(".neuro-add-grenade-btn");
  if (!actor || !footerBtn || root.querySelector(".neuro-detonate-btn")) return;
  const count = remoteChargesFor(actor).length;
  if (!count) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "neuro-detonate-btn";
  btn.innerHTML = `<i class="fa-solid fa-tower-broadcast"></i> DETONUJ (${count})`;
  btn.title = "Ładunki, które ta postać może odpalić — pilotem albo kablem";
  btn.style.cssText = "flex:0 0 auto; padding:4px 10px; margin-left:4px; background:rgba(120,40,40,0.35); border:1px solid #9b5f5f; color:#ffe3e3; white-space:nowrap;";
  btn.addEventListener("click", ev => { ev.preventDefault(); openDetonationDialog(actor); });
  footerBtn.after(btn);
}

export const chargesApi = Object.freeze({
  plant: plantCharge,
  dialog: openDetonationDialog,
  list: listChargeTiles,
  detonate: async chargeId => {
    const found = _findCharge(chargeId);
    return found ? detonateCharge(found.scene, found.tile, { by: "MG", force: true }) : false;
  }
});
