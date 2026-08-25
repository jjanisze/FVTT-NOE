/**
 * Neuroshima 5e — Pochwycenie / Odepchnięcie / Wytrącenie (§1.13).
 *
 * Brat `weapon-save-properties.mjs`, nie jego rozszerzenie. Tam wyzwalaczem jest
 * właściwość broni na karcie czatu, a cecha sama narzuca, czym cel się broni;
 * tutaj wyzwalaczem jest akcja w turze, cechę RO wybiera **cel**, a ST bywa
 * podmieniane (istoty z Bestiariusza mają je stałe, np. nocny ghul ST 13).
 * Wspólne zostałoby wyłącznie wywołanie `rollSavingThrow`, więc słownik
 * `SAVE_PROPERTIES` musiałby dostać trzy nowe tryby, żeby opisać trzy wyjątki.
 *
 * Źródło zasad: `14 ZASADY SZCZEGÓŁOWE/czesc-01.md` (Atak bez broni, Wytrącenie,
 * Pochwycenie) oraz tabela akcji w `3 WALKA/czesc-01.md`.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/** Rozmiary od najmniejszego; różnica indeksów = różnica kategorii rozmiaru. */
const SIZE_ORDER = ["tiny", "sm", "med", "lg", "huge", "grg"];
const SIZE_LABELS = {
  tiny: "Drobny", sm: "Mały", med: "Średni", lg: "Duży", huge: "Wielki", grg: "Ogromny"
};

/**
 * @typedef {object} ManeuverDef
 * @property {string} label
 * @property {string} icon              Font Awesome, jak w `weapon-save-properties.mjs`.
 * @property {string} color
 * @property {"str"|"best"} dcAbility   Cecha atakującego wchodząca w ST.
 * @property {number|null} maxSizeDelta O ile kategorii cel może być większy (null = bez limitu).
 * @property {string} rule              Zdanie z podręcznika pokazywane w oknie.
 */

/** @type {Readonly<Record<string, ManeuverDef>>} */
export const MANEUVERS = Object.freeze({
  pochwycenie: {
    label: "Pochwycenie",
    icon: "fa-hand-fist",
    color: "#2f6f4f",
    dcAbility: "str",
    maxSizeDelta: 1,
    rule: "Cel zostaje Pochwycony. Możliwe tylko wobec istoty maksymalnie o jeden rozmiar większej "
      + "i przy jednej wolnej ręce. Jedno pochwycenie na rękę."
  },
  odepchniecie: {
    label: "Odepchnięcie",
    icon: "fa-hand-back-fist",
    color: "#8b4513",
    dcAbility: "str",
    maxSizeDelta: 1,
    rule: "Odpychasz cel o 1,5 m albo go przewracasz (twój wybór). Możliwe tylko wobec istoty "
      + "maksymalnie o jeden rozmiar większej."
  },
  wytracenie: {
    label: "Wytrącenie",
    icon: "fa-hand-scissors",
    color: "#b8860b",
    dcAbility: "best",
    maxSizeDelta: null,
    rule: "Przedmiot trzymany przez cel wypada mu z ręki. Zastępuje jeden z ataków akcji "
      + "Atakowania wręcz. Cel trzymający przedmiot oburącz ma Ułatwienie w RO."
  }
});

/* -------------------------------------------- */
/*  Arytmetyka                                   */
/* -------------------------------------------- */

/** ST = 8 + Premia Biegłości + modyfikator cechy atakującego. */
export function maneuverDC(actor, maneuverId) {
  const def = MANEUVERS[maneuverId];
  const prof = actor?.system?.attributes?.prof ?? 0;
  const str = actor?.system?.abilities?.str?.mod ?? 0;
  const dex = actor?.system?.abilities?.dex?.mod ?? 0;
  return 8 + prof + (def?.dcAbility === "best" ? Math.max(str, dex) : str);
}

/**
 * Cechę RO wybiera cel („sam wybiera, który woli"), więc bierzemy tę, która daje
 * mu wyższą premię — nie ma sensu pytać gracza o wybór bez alternatywy.
 */
function _targetSaveAbility(actor) {
  const str = actor?.system?.abilities?.str?.save?.value ?? 0;
  const dex = actor?.system?.abilities?.dex?.save?.value ?? 0;
  return dex > str ? "dex" : "str";
}

/** Czy cel jest odporny na dany stan (`system.traits.ci.value`). */
function _isImmuneToCondition(actor, statusId) {
  const ci = actor?.system?.traits?.ci?.value;
  if (ci instanceof Set) return ci.has(statusId);
  if (Array.isArray(ci)) return ci.includes(statusId);
  return false;
}

/** Czy atakujący posiada Sztuczkę Aramis (Utrudnienie do RO przy rozbrajaniu). */
export function hasAramis(actor) {
  return !!actor?.items?.some(i => i.getFlag(MODULE_ID, "sztuczka") === "aramis"
    || (i.type === "feat" && i.name?.trim().toLowerCase() === "aramis"));
}

/* -------------------------------------------- */
/*  Odepchnięcie — ruch żetonu                   */
/* -------------------------------------------- */

/** Przesuwa cel o 1,5 m w linii od atakującego; ściana zatrzymuje odepchnięcie. */
async function _pushToken(attackerToken, targetToken) {
  if (!attackerToken || !targetToken) return { moved: false, reason: "brak żetonu na scenie" };
  if (!targetToken.document.canUserModify(game.user, "update")) {
    return { moved: false, reason: "brak uprawnień do żetonu" };
  }

  const grid = canvas.grid;
  const step = grid.size * (1.5 / grid.distance);
  const from = attackerToken.center;
  const at = targetToken.center;

  let dx = at.x - from.x;
  let dy = at.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return { moved: false, reason: "żetony nakładają się — kierunek nieokreślony" };
  dx /= len; dy /= len;

  const dest = { x: at.x + dx * step, y: at.y + dy * step };
  if (CONFIG.Canvas.polygonBackends.move.testCollision(at, dest, { type: "move", mode: "any" })) {
    return { moved: false, reason: "ściana za plecami celu" };
  }

  const snapped = grid.isGridless
    ? dest
    : grid.getSnappedPoint(dest, { mode: CONST.GRID_SNAPPING_MODES.CENTER });
  await targetToken.document.update({
    x: Math.round(snapped.x - (targetToken.w / 2)),
    y: Math.round(snapped.y - (targetToken.h / 2))
  });
  return { moved: true };
}

/* -------------------------------------------- */
/*  Wytrącenie — wypuszczenie przedmiotu         */
/* -------------------------------------------- */

/** Wybór trzymanego przedmiotu i zdjęcie mu „założony"; brak modelu rąk w dnd5e. */
async function _dropHeldItem(actor) {
  const held = actor.items.filter(i => (i.type === "weapon") && (i.system?.equipped === true));
  if (!held.length) return { dropped: null, reason: "cel nie ma założonej broni — MG rozstrzyga, co wypadło" };
  if (!actor.canUserModify(game.user, "update")) {
    return { dropped: null, reason: "brak uprawnień do karty celu — MG zdejmuje przedmiot ręcznie" };
  }

  let item = held[0];
  if (held.length > 1) {
    const options = held.map(i => `<option value="${i.id}">${i.name}</option>`).join("");
    const id = await foundry.applications.api.DialogV2.prompt({
      window: { title: `Wytrącenie — ${actor.name}` },
      content: `<p>Który przedmiot wypada z ręki?</p><select name="item">${options}</select>`,
      ok: {
        label: "Wytrąć",
        callback: (event, button) => button.form.elements.item.value
      },
      rejectClose: false
    });
    if (!id) return { dropped: null, reason: "anulowano wybór przedmiotu" };
    item = held.find(i => i.id === id) ?? item;
  }

  await item.update({ "system.equipped": false });
  return { dropped: item, reason: null };
}

/* -------------------------------------------- */
/*  Rozstrzygnięcie                              */
/* -------------------------------------------- */

/**
 * Wykonuje manewr przeciw wskazanym celom.
 *
 * @param {Actor5e} attacker
 * @param {string} maneuverId                 Klucz z `MANEUVERS`.
 * @param {object} [options]
 * @param {Token[]} [options.targets]         Domyślnie wycelowane żetony.
 * @param {number} [options.dc]               Nadpisanie ST (istoty z Bestiariusza mają je stałe).
 * @param {boolean} [options.disadvantage]    Utrudnienie do RO celu (Aramis).
 * @param {boolean} [options.advantage]       Ułatwienie do RO celu (przedmiot trzymany oburącz).
 * @param {"push"|"prone"} [options.effect]   Wybór atakującego przy Odepchnięciu.
 * @param {Token} [options.attackerToken]
 */
export async function resolveManeuver(attacker, maneuverId, options = {}) {
  const def = MANEUVERS[maneuverId];
  if (!attacker || !def) return;

  const targets = options.targets ?? Array.from(game.user.targets);
  if (!targets.length) {
    ui.notifications.warn(`${def.label}: wyceluj (target) w cel.`);
    return;
  }

  const dc = Number.isFinite(options.dc) ? options.dc : maneuverDC(attacker, maneuverId);
  const attackerToken = options.attackerToken
    ?? attacker.getActiveTokens?.()[0]
    ?? canvas.tokens?.controlled?.[0]
    ?? null;

  for (const target of targets) {
    await _resolveTarget(attacker, attackerToken, target, maneuverId, dc, options);
  }
}

async function _resolveTarget(attacker, attackerToken, target, maneuverId, dc, options) {
  const def = MANEUVERS[maneuverId];
  const actor = target.actor;
  if (!actor) return;

  const speaker = ChatMessage.getSpeaker({ actor: attacker });
  const head = `<i class="fas ${def.icon}" style="color:${def.color}"></i> <strong>${def.label}</strong>`;
  const say = content => ChatMessage.create({
    speaker,
    content: `<div class="neuro-maneuver-result">${head} — ${content}</div>`
  });

  if (!actor.canUserModify(game.user, "update")) {
    ui.notifications.warn(`${def.label}: brak uprawnień do ${target.name} — rozstrzygnięcie po stronie MG.`);
    await say(`<b>${attacker.name}</b> próbuje wobec <b>${target.name}</b>. <b>ST ${dc}</b>, `
      + "RO na Siłę lub Zręczność (wybiera cel). Rozstrzyga MG.");
    return;
  }

  // Limit rozmiaru — poza zakresem pytamy MG, tak jak przy cechach broni.
  if (def.maxSizeDelta !== null) {
    const a = SIZE_ORDER.indexOf(attacker.system?.traits?.size ?? "med");
    const t = SIZE_ORDER.indexOf(actor.system?.traits?.size ?? "med");
    if ((t - a) > def.maxSizeDelta) {
      const proceed = await foundry.applications.api.DialogV2.confirm({
        window: { title: `${def.label} — nietypowy rozmiar` },
        content: `<p><b>${target.name}</b> (${SIZE_LABELS[SIZE_ORDER[t]] ?? "?"}) jest o ${t - a} kategorie `
          + `większy od <b>${attacker.name}</b>.</p><p>${def.rule}</p><p>Wymusić mimo to?</p>`,
        yes: { label: "Tak, wymuś RO" },
        no: { label: "Anuluj" },
        rejectClose: false
      });
      if (!proceed) return;
    }
  }

  const status = maneuverId === "pochwycenie" ? "grappled"
    : (maneuverId === "odepchniecie" && options.effect !== "push") ? "prone"
      : null;

  if (status && _isImmuneToCondition(actor, status)) {
    const label = CONFIG.DND5E.conditionTypes?.[status]?.name ?? status;
    await say(`<b>${target.name}</b> jest <b>odporny</b> na ${label} — manewr nie działa.`);
    return;
  }

  const ability = _targetSaveAbility(actor);
  const rolls = await actor.rollSavingThrow(
    { ability, target: dc, advantage: options.advantage === true, disadvantage: options.disadvantage === true },
    { configure: false },
    { create: true }
  );
  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!roll) return;

  const abbr = CONFIG.DND5E.abilities?.[ability]?.abbreviation?.toUpperCase() ?? ability.toUpperCase();
  if ((roll.total ?? 0) >= dc) {
    await say(`<b>${target.name}</b> zdał RO ${abbr} (${roll.total} vs ST ${dc}) — bez efektu.`);
    return;
  }

  await _applyEffect(attacker, attackerToken, target, maneuverId, dc, options, say,
    `<b>${target.name}</b> oblał RO ${abbr} (${roll.total} vs ST ${dc})`);
}

async function _applyEffect(attacker, attackerToken, target, maneuverId, dc, options, say, prefix) {
  const actor = target.actor;

  if (maneuverId === "pochwycenie") {
    await actor.toggleStatusEffect("grappled", { active: true });
    await say(`${prefix} i zostaje <b>Pochwycony</b>. ST Wyzwalania się: <b>${dc}</b>.`);
    return;
  }

  if (maneuverId === "odepchniecie") {
    if (options.effect === "push") {
      const { moved, reason } = await _pushToken(attackerToken, target);
      await say(moved
        ? `${prefix} i zostaje <b>odepchnięty o 1,5 m</b>.`
        : `${prefix} — odepchnięcie zatrzymane (${reason}). MG rozstrzyga skutek.`);
    } else {
      await actor.toggleStatusEffect("prone", { active: true });
      await say(`${prefix} i zostaje <b>Powalony</b>.`);
    }
    return;
  }

  const { dropped, reason } = await _dropHeldItem(actor);
  await say(dropped
    ? `${prefix} — z ręki wypada mu <b>${dropped.name}</b> (przedmiot odłożony jako niezałożony).`
    : `${prefix} — przedmiot wypada z ręki (${reason}).`);
}

/* -------------------------------------------- */
/*  Okno manewru                                 */
/* -------------------------------------------- */

function _currentActor() {
  return canvas.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null;
}

/**
 * Jedno okno na trzy manewry. ST jest polem edytowalnym, bo istoty z Bestiariusza
 * mają je podane wprost (nocny ghul ST 13) zamiast liczyć z 8 + SIŁ + PB.
 */
export async function openManeuverDialog({ maneuver = "pochwycenie", actor } = {}) {
  const attacker = actor ?? _currentActor();
  if (!attacker) {
    ui.notifications.warn("Zaznacz żeton wykonującego manewr.");
    return;
  }
  if (!game.user.targets.size) {
    ui.notifications.warn("Wyceluj (target) w cel manewru.");
    return;
  }

  const aramis = hasAramis(attacker);
  const opts = Object.entries(MANEUVERS)
    .map(([id, d]) => `<option value="${id}"${id === maneuver ? " selected" : ""}>${d.label}</option>`).join("");

  const content = `
    <fieldset class="neuro-maneuver-form">
      <div class="form-group"><label>Manewr</label>
        <div class="form-fields"><select name="maneuver">${opts}</select></div></div>
      <div class="form-group"><label>ST rzutu obronnego</label>
        <div class="form-fields"><input type="number" name="dc" value="${maneuverDC(attacker, maneuver)}"></div>
        <p class="hint">8 + mod. cechy + Premia Biegłości. Nadpisz dla istot z własnym ST.</p></div>
      <div class="form-group" data-only="odepchniecie"><label>Skutek</label>
        <div class="form-fields"><select name="effect">
          <option value="prone">Przewrócenie (Powalenie)</option>
          <option value="push">Odepchnięcie o 1,5 m</option>
        </select></div></div>
      <div class="form-group" data-only="wytracenie"><label>Cel trzyma oburącz</label>
        <div class="form-fields"><input type="checkbox" name="advantage"></div>
        <p class="hint">Ułatwienie w RO celu.</p></div>
      <div class="form-group"><label>Utrudnienie w RO celu</label>
        <div class="form-fields"><input type="checkbox" name="disadvantage"${aramis ? " checked" : ""}></div>
        ${aramis ? '<p class="hint">Aramis: Rozbrajanie daje celowi Utrudnienie.</p>' : ""}</div>
      <p class="notes" data-rule>${MANEUVERS[maneuver].rule}</p>
    </fieldset>`;

  const data = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Manewr — ${attacker.name}` },
    position: { width: 420 },
    content,
    ok: {
      label: "Wykonaj",
      callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
    },
    render: (event, dialog) => {
      const form = dialog.element.querySelector("form") ?? dialog.element;
      const select = form.querySelector('[name="maneuver"]');
      const sync = () => {
        const id = select.value;
        form.querySelector('[name="dc"]').value = maneuverDC(attacker, id);
        form.querySelector("[data-rule]").textContent = MANEUVERS[id].rule;
        for (const el of form.querySelectorAll("[data-only]")) {
          el.style.display = el.dataset.only === id ? "" : "none";
        }
      };
      select.addEventListener("change", sync);
      sync();
    },
    rejectClose: false
  });
  if (!data) return;

  await resolveManeuver(attacker, data.maneuver, {
    dc: Number(data.dc),
    effect: data.effect,
    advantage: data.advantage === true,
    disadvantage: data.disadvantage === true
  });
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

/** Zdolności, których cała mechanika sprowadza się do jednego z manewrów. */
const FEATURE_SHORTCUTS = { "z-bara": "odepchniecie" };

export function registerMeleeManeuvers() {
  Hooks.on("getSceneControlButtons", controls => {
    const tokenTools = controls.tokens?.tools;
    if (!tokenTools) return;
    tokenTools.neuroshimaManeuvers = {
      name: "neuroshimaManeuvers",
      title: "Manewry: Pochwycenie / Odepchnięcie / Wytrącenie",
      icon: "fa-solid fa-hand-fist",
      order: Object.keys(tokenTools).length,
      button: true,
      onChange: () => openManeuverDialog()
    };
  });

  // Zdolności, które są manewrem — przycisk wprost na ich karcie czatu.
  // `dnd5e.renderChatMessage`, nie `renderChatMessageHTML`: to drugie leci przed
  // `ChatMessageDataModel#getHTML`, które nadpisuje całe `.message-content`.
  Hooks.on("dnd5e.renderChatMessage", (message, html) => {
    const uuid = message.getFlag("dnd5e", "item")?.uuid ?? message.getFlag("dnd5e", "use")?.itemUuid;
    if (!uuid) return;
    let item;
    try { item = fromUuidSync(uuid); } catch { return; }
    const maneuverId = FEATURE_SHORTCUTS[item?.getFlag(MODULE_ID, "abilityId")];
    if (!maneuverId) return;

    const el = html instanceof HTMLElement ? html : html?.[0];
    if (!el || el.querySelector(".neuro-maneuver-btn")) return;

    const def = MANEUVERS[maneuverId];
    const container = el.querySelector(".card-buttons") ?? el.querySelector(".message-content");
    container?.insertAdjacentHTML("beforeend", `
      <button class="neuro-maneuver-btn" data-maneuver="${maneuverId}" data-actor="${item.actor?.id ?? ""}"
        style="margin-top:5px;color:${def.color};border:1px solid ${def.color};background:rgba(139,69,19,0.1);">
        <i class="fas ${def.icon}"></i> ${def.label} [ST ${maneuverDC(item.actor, maneuverId)}]
      </button>`);
  });

  Hooks.on("renderChatLog", (app, html) => {
    const el = html instanceof HTMLElement ? html : html?.[0];
    el?.addEventListener("click", event => {
      const btn = event.target.closest(".neuro-maneuver-btn");
      if (!btn) return;
      event.preventDefault();
      openManeuverDialog({
        maneuver: btn.dataset.maneuver,
        actor: game.actors.get(btn.dataset.actor) ?? undefined
      });
    });
  });
}

/** Publiczne API — `game.neuroshima.manewry`. */
export const maneuversApi = {
  all: MANEUVERS,
  dc: maneuverDC,
  open: openManeuverDialog,
  resolve: resolveManeuver,
  pochwycenie: opts => openManeuverDialog({ ...opts, maneuver: "pochwycenie" }),
  odepchniecie: opts => openManeuverDialog({ ...opts, maneuver: "odepchniecie" }),
  wytracenie: opts => openManeuverDialog({ ...opts, maneuver: "wytracenie" })
};
