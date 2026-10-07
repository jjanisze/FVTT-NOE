/**
 * Neuroshima 5e — zagrożenia środowiska: Przemarznięcie, brak snu, Uduszenie (PLAN_m1_walka.md §7.7, E7).
 *
 * Otoczenia moduł nie zna (R5) — to wie MG. Jedno narzędzie MG w kontrolkach żetonów (obok „Zachodu
 * słońca” i „Spadania”) działa na zaznaczonych żetonach (T1); moduł rzuca, prowadzi źródła Wyczerpania
 * i pamięta, kiedy poziomy schodzą (`config/rekonwalescencja-rules.mjs`, U10):
 *
 *   - **Przemarznięcie** (s. 258) — temperatura i liczba godzin; per postać: ciepło ubrany (pomija),
 *     śpiwór (s. 142, automatyczny sukces), koc (s. 140, Ułatwienie). RO na Kondycję ST 5 + 1 za
 *     każdy °C poniżej zera co godzinę; porażka — poziom `przemarznie`. Wszystkie te poziomy zdejmuje
 *     Długi odpoczynek w cieple (pole w oknie DO, `config/rest.mjs`).
 *   - **Doba bez snu** (s. 45) — RO na Kondycję ST 20; porażka — poziom `bezsennosc`.
 *   - **Uduszenie** (s. 194, 259) — status `suffocation` z fazą: „wstrzymuje oddech” (1 + mod. KON
 *     minut, min. 30 s, w turach) albo „dusi się”. Koniec tury istoty w walce: odliczanie, potem
 *     poziom `uduszenie` na końcu każdej tury (T4). Obrażenia przy wstrzymanym oddechu — karta z
 *     [RO na Kondycję ST 10] dla właściciela; porażka — zaczyna się dusić. Zdjęcie statusu (HUD,
 *     przycisk „Złap oddech” w panelu Stan) = ponowne oddychanie: schodzą wszystkie poziomy z duszenia.
 *
 * RO to Testy k20 — Fuks wolno (s. 17). Przerzut porażki na sukces cofa jej skutek
 * (`neuroshima.rerolled`; Fuks przerzuca dany rzut najwyżej raz).
 */

import { addExhaustion, removeExhaustion, zdejmijWyjsciem } from "../config/exhaustion.mjs";
import {
  oddechTur, stMrozu, stSnu, planMrozu, poTurzeOddechu, ST_ODDECHU_PRZY_OBRAZENIACH
} from "../config/umieranie-rules.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Flaga efektu `suffocation`: `{ faza: "oddech"|"dusi", tury, karta }`. */
const ODDECH = "oddech";
/** Wiadomość RO zagrożenia: `{ rodzaj: "mroz"|"sen"|"oddech", actorUuid, zrodlo?, turyPrzed? }`. */
const RZUT = "zagrozenieRzut";
/** Karta „obrażenia przy wstrzymanym oddechu”: `{ actorUuid }`. */
const KARTA_ODDECHU = "oddechKarta";
const STATUS = "suffocation";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

function _jedynyZapisujacy(actor) {
  const gm = game.users.activeGM;
  return gm ? gm.isSelf : Boolean(actor?.isOwner);
}

/** Aktorzy zaznaczonych żetonów (bez powtórzeń). */
function _zaznaczeni() {
  const out = new Map();
  for (const t of canvas.tokens?.controlled ?? []) if (t.actor) out.set(t.actor.uuid, t.actor);
  return [...out.values()];
}

/** RO na Kondycję bez okna, z flagą zagrożenia na wiadomości (Fuks czyta ją w `neuroshima.rerolled`). */
async function _roKondycji(actor, { st, tryb = 0, flavor, flaga }) {
  const rolls = await actor.rollSavingThrow(
    { ability: "con", target: st, advantage: tryb > 0, disadvantage: tryb < 0 },
    { configure: false },
    { data: { flavor, flags: { [MODULE_ID]: { [RZUT]: { ...flaga, actorUuid: actor.uuid, st } } } } }
  );
  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  return roll ? { roll, sukces: roll.total >= st } : null;
}

/* -------------------------------------------- */
/*  Przemarznięcie                              */
/* -------------------------------------------- */

const _maPrzedmiot = (actor, re) => actor.items.some(i => re.test(i.name ?? ""));

/**
 * Godziny na mrozie dla wielu postaci (§7.7). Wołane z okna MG; eksportowane dla testów.
 * @param {{actor: Actor, cieplo?: boolean, spiwor?: boolean, koc?: boolean}[]} postacie
 * @param {{tempC: number, godziny: number}} warunki
 * @returns {Promise<{actor: Actor, porazki: number, rzuty: number}[]>}
 */
export async function przemarzniecie(postacie, { tempC, godziny }) {
  const wyniki = [];
  for (const p of postacie) {
    const plan = planMrozu({ tempC, godziny, cieplo: p.cieplo, spiwor: p.spiwor, koc: p.koc });
    let porazki = 0;
    if (!plan.automatycznie) {
      for (let h = 1; h <= plan.rzuty; h++) {
        const w = await _roKondycji(p.actor, {
          st: plan.st, tryb: plan.tryb,
          flavor: `Przemarznięcie — ${tempC} °C, godzina ${h}/${plan.rzuty}: RO na Kondycję ST ${plan.st}${plan.tryb > 0 ? " (koc: Ułatwienie)" : ""}`,
          flaga: { rodzaj: "mroz", zrodlo: "przemarznie" }
        });
        if (w && !w.sukces) {
          porazki++;
          await addExhaustion(p.actor, "przemarznie", { chat: false });
        }
      }
    }
    wyniki.push({ actor: p.actor, porazki, rzuty: plan.rzuty, plan });
  }
  const st = stMrozu(tempC);
  await ChatMessage.create({
    content: `<div class="neuro-zagrozenie-card is-mroz"><header><i class="fa-solid fa-snowflake" inert></i>
      <strong>Przemarznięcie</strong><span>${tempC} °C · ${godziny} h${st ? ` · RO na Kondycję ST ${st} co godzinę` : " · bez mrozu"}</span></header>
      ${wyniki.map(w => `<p><strong>${esc(w.actor.name)}</strong> — ${
        !w.rzuty ? "ciepło ubrany albo bez mrozu: bez testu"
          : w.plan.automatycznie ? `śpiwór: ${w.rzuty} × sukces`
            : w.porazki ? `<span class="neuro-zle">${w.porazki} × porażka — +${w.porazki} Wyczerpanie (Przemarznięcie)</span>`
              : `${w.rzuty} × sukces`}</p>`).join("")}
      <p class="neuro-zagrozenie-stopka">Wszystkie poziomy z Przemarznięcia zdejmuje Długi odpoczynek w cieple (s. 258).</p></div>`
  });
  return wyniki;
}

async function _oknoMrozu() {
  const aktorzy = _zaznaczeni();
  if (!aktorzy.length) return ui.notifications.warn("Zaznacz żetony postaci wystawionych na mróz.");
  const wiersze = aktorzy.map((a, i) => `<tr>
      <td>${esc(a.name)}</td>
      <td><input type="checkbox" name="cieplo-${i}"></td>
      <td><input type="checkbox" name="spiwor-${i}"${_maPrzedmiot(a, /śpiw[oó]r/i) ? " checked" : ""}></td>
      <td><input type="checkbox" name="koc-${i}"${_maPrzedmiot(a, /\bkoc\b/i) ? " checked" : ""}></td></tr>`).join("");
  const wynik = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Przemarznięcie (MG)", icon: "fa-solid fa-snowflake" },
    position: { width: 460 },
    content: `<div class="neuro-zagrozenie-okno">
      <div class="form-group"><label>Temperatura (°C)</label><div class="form-fields"><input type="number" name="temp" value="-5" step="1"></div></div>
      <div class="form-group"><label>Godziny na mrozie</label><div class="form-fields"><input type="number" name="godziny" value="1" min="1" step="1"></div></div>
      <p class="hint">RO na Kondycję ST 5 + 1 za każdy °C poniżej zera, co godzinę; porażka — poziom Wyczerpania (s. 258).
        Śpiwór i koc zaznaczone, gdy postać je ma — decyduje MG.</p>
      <table><thead><tr><th>Postać</th><th>Ciepło ubrany</th><th>Śpiwór</th><th>Koc</th></tr></thead><tbody>${wiersze}</tbody></table></div>`,
    ok: {
      label: "Rzucaj", icon: "fa-solid fa-dice-d20",
      callback: (_ev, btn) => {
        const f = btn.form.elements;
        return {
          tempC: Number(f.temp.value), godziny: Math.max(1, Math.trunc(Number(f.godziny.value) || 1)),
          postacie: aktorzy.map((actor, i) => ({
            actor, cieplo: f[`cieplo-${i}`].checked, spiwor: f[`spiwor-${i}`].checked, koc: f[`koc-${i}`].checked
          }))
        };
      }
    },
    rejectClose: false
  });
  if (!wynik) return;
  if (stMrozu(wynik.tempC) === null) return ui.notifications.info("Temperatura nie jest ujemna — Przemarznięcia nie ma.");
  return przemarzniecie(wynik.postacie, wynik);
}

/* -------------------------------------------- */
/*  Doba bez snu                                */
/* -------------------------------------------- */

/**
 * Doba bez snu (s. 45) dla podanych postaci.
 * @param {Actor[]} aktorzy
 */
export async function dobaBezSnu(aktorzy) {
  const st = stSnu();
  const wyniki = [];
  for (const actor of aktorzy) {
    const w = await _roKondycji(actor, {
      st, flavor: `Doba bez snu — RO na Kondycję ST ${st}`, flaga: { rodzaj: "sen", zrodlo: "bezsennosc" }
    });
    if (w && !w.sukces) await addExhaustion(actor, "bezsennosc", { chat: false });
    wyniki.push({ actor, sukces: w?.sukces ?? null });
  }
  await ChatMessage.create({
    content: `<div class="neuro-zagrozenie-card is-sen"><header><i class="fa-solid fa-moon" inert></i>
      <strong>Doba bez snu</strong><span>RO na Kondycję ST ${st}</span></header>
      ${wyniki.map(w => `<p><strong>${esc(w.actor.name)}</strong> — ${w.sukces ? "trzyma się"
        : `<span class="neuro-zle">+1 Wyczerpanie (Bezsenność)</span>`}</p>`).join("")}</div>`
  });
  return wyniki;
}

/* -------------------------------------------- */
/*  Uduszenie                                   */
/* -------------------------------------------- */

/** Efekt Uduszenia aktora (status `suffocation`) albo null. */
export function efektUduszenia(actor) {
  return actor?.effects.find(e => e.statuses?.has(STATUS)) ?? null;
}

/** Faza Uduszenia: `{ faza, tury, karta }` albo null (bez statusu). */
export function stanOddechu(actor) {
  const e = efektUduszenia(actor);
  if (!e) return null;
  const f = e.getFlag(MODULE_ID, ODDECH) ?? {};
  return { faza: f.faza === "dusi" ? "dusi" : "oddech", tury: Number(f.tury) || 0, karta: f.karta ?? null };
}

const _nazwaOddechu = ({ faza, tury }) => (faza === "dusi"
  ? "Uduszenie — dusi się"
  : `Uduszenie — wstrzymuje oddech (zostało ${tury} ${tury === 1 ? "tura" : (tury % 10 >= 2 && tury % 10 <= 4 && (tury % 100 < 12 || tury % 100 > 14)) ? "tury" : "tur"})`);

async function _ustawOddech(actor, stan) {
  const e = efektUduszenia(actor);
  const dane = { name: _nazwaOddechu(stan), [`flags.${MODULE_ID}.${ODDECH}`]: { ...stan } };
  if (e) return e.update(dane);
  const effect = await ActiveEffect.implementation.fromStatusEffect(STATUS);
  effect.updateSource({ name: _nazwaOddechu(stan), flags: { [MODULE_ID]: { [ODDECH]: { ...stan } } } });
  return ActiveEffect.implementation.create(effect.toObject(), { parent: actor, keepId: true });
}

/**
 * Wstrzymuje oddech (1 + mod. KON minut, min. 30 s) albo — `dusi` — od razu bez powietrza.
 * @param {Actor} actor
 * @param {{dusi?: boolean}} [opts]
 */
export async function wstrzymajOddech(actor, { dusi = false } = {}) {
  const tury = oddechTur(actor.system?.abilities?.con?.mod ?? 0);
  return _ustawOddech(actor, dusi ? { faza: "dusi", tury: 0, karta: null } : { faza: "oddech", tury, karta: null });
}

/** Ponowne oddychanie: zdjęcie statusu; poziomy z duszenia schodzą w haku `deleteActiveEffect`. */
export async function zlapOddech(actor) {
  const e = efektUduszenia(actor);
  if (e) await e.delete();
}

/** Koniec tury istoty w walce (aktywny MG). */
async function _onTurnChange(combat, previous) {
  if (!game.users.activeGM?.isSelf) return;
  await koniecTuryOddechu(combat.combatants.get(previous?.combatantId)?.actor);
}

/**
 * Koniec tury istoty z Uduszeniem: odliczanie albo poziom Wyczerpania (`poTurzeOddechu`).
 * @param {Actor} actor
 */
export async function koniecTuryOddechu(actor) {
  const stan = stanOddechu(actor);
  if (!stan) return;
  const po = poTurzeOddechu(stan);
  await _ustawOddech(actor, { ...po, karta: po.faza === "oddech" ? stan.karta : null });
  if (po.wyczerpanie) {
    await addExhaustion(actor, "uduszenie", { chat: false });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<strong>${esc(actor.name)}</strong> dusi się — +1 Wyczerpanie (Uduszenie) na końcu tury.`
    });
  } else if (po.faza === "dusi") {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<strong>${esc(actor.name)}</strong> — skończyło się powietrze. Od następnej tury +1 Wyczerpanie na końcu każdej tury.`
    });
  }
}

/** Złapanie oddechu: wszystkie poziomy z duszenia naraz (s. 259). */
async function _onDeleteEffect(effect) {
  if (!effect.statuses?.has(STATUS)) return;
  const actor = effect.parent;
  if (!(actor instanceof Actor) || !_jedynyZapisujacy(actor)) return;
  await zdejmijWyjsciem(actor, "oddech", { powod: "oddycha znowu" });
}

/** Obrażenia przy wstrzymanym oddechu (s. 194): karta z RO ST 10 dla właściciela. Klient nakładający. */
async function _onApplyDamage(actor, amount, options = {}) {
  if (!(amount > 0)) return;
  const stan = stanOddechu(actor);
  if (stan?.faza !== "oddech") return;
  const rolls = (options?.origin ?? options?.originatingMessage)?.rolls ?? [];
  if (rolls.length && rolls.every(r => (r?.options?.type ?? "") in (CONFIG.DND5E.healingTypes ?? {}))) return;
  const msg = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-zagrozenie-card is-oddech"><header><i class="fa-solid fa-lungs" inert></i>
      <strong>Obrażenia przy wstrzymanym oddechu</strong><span>${esc(actor.name)}</span></header>
      <p>RO na Kondycję ST ${ST_ODDECHU_PRZY_OBRAZENIACH} albo zaczyna się dusić (s. 194).</p>
      <div class="neuro-zagrozenie-actions"><button type="button" data-oddech="ro"><i class="fa-solid fa-dice-d20" inert></i> RO na Kondycję ST ${ST_ODDECHU_PRZY_OBRAZENIACH}</button></div></div>`,
    flags: { [MODULE_ID]: { [KARTA_ODDECHU]: { actorUuid: actor.uuid } } }
  });
  await _ustawOddech(actor, { ...stan, karta: msg.id });
}

/**
 * RO przy obrażeniach (karta). Porażka — dusi się od teraz.
 * @param {Actor} actor
 */
export async function roOddechu(actor) {
  const stan = stanOddechu(actor);
  if (stan?.faza !== "oddech") return null;
  const w = await _roKondycji(actor, {
    st: ST_ODDECHU_PRZY_OBRAZENIACH, flavor: `Wstrzymany oddech — RO na Kondycję ST ${ST_ODDECHU_PRZY_OBRAZENIACH}`,
    flaga: { rodzaj: "oddech", turyPrzed: stan.tury }
  });
  if (!w) return null;
  await _ustawOddech(actor, w.sukces ? { ...stan, karta: null } : { faza: "dusi", tury: 0, karta: null });
  if (!w.sukces) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<strong>${esc(actor.name)}</strong> traci oddech — dusi się (+1 Wyczerpanie na końcu każdej tury).`
    });
  }
  return { sukces: w.sukces };
}

/* -------------------------------------------- */
/*  Karty, przerzuty, panel Stan                */
/* -------------------------------------------- */

function _onRenderMessage(message, html) {
  const k = message.getFlag(MODULE_ID, KARTA_ODDECHU);
  if (!k) return;
  const el = html instanceof HTMLElement ? html : html?.[0];
  const actor = fromUuidSync(k.actorUuid);
  const aktualna = actor && stanOddechu(actor)?.karta === message.id;
  for (const btn of el?.querySelectorAll("[data-oddech]") ?? []) {
    if (!aktualna || !actor.isOwner) { btn.remove(); continue; }
    btn.addEventListener("click", async ev => {
      ev.preventDefault();
      btn.disabled = true;
      try { await roOddechu(actor); } finally { if (btn.isConnected) btn.disabled = false; }
    });
  }
  if (!aktualna) el?.querySelector(".neuro-zagrozenie-actions")?.remove();
}

function _onUpdateEffect(effect, changes) {
  if (!effect.statuses?.has(STATUS) || !changes?.flags?.[MODULE_ID]?.[ODDECH]) return;
  const actor = effect.parent;
  for (const m of game.messages.contents.slice(-50)) {
    if (m.getFlag(MODULE_ID, KARTA_ODDECHU)?.actorUuid === actor?.uuid) ui.chat?.updateMessage?.(m);
  }
}

/** Fuks zamienił porażkę RO zagrożenia w sukces: cofnij jej skutek (raz — Fuks przerzuca rzut raz). */
async function _onRerolled({ message, roll } = {}) {
  const r = message?.getFlag?.(MODULE_ID, RZUT);
  if (!r || !roll) return;
  const actor = fromUuidSync(r.actorUuid);
  if (!actor?.isOwner) return;
  const przed = message.rolls?.[0]?.total ?? 0;
  if (przed >= r.st || !(roll.total >= r.st)) return;
  if (r.rodzaj === "oddech") {
    const stan = stanOddechu(actor);
    if (stan?.faza === "dusi") await _ustawOddech(actor, { faza: "oddech", tury: Math.max(1, Number(r.turyPrzed) || 1), karta: null });
  } else if (r.zrodlo) {
    await removeExhaustion(actor, r.zrodlo, { chat: false });
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<strong>${esc(actor.name)}</strong> — przerzut zmienia wynik: RO zdany, skutek porażki cofnięty.`
  });
}

/**
 * Wiersz Uduszenia w panelu Stan (`actors/sheet-shell.mjs`): faza i „Złap oddech” dla właściciela.
 * @param {Actor} actor
 * @param {boolean} editable
 * @returns {HTMLElement|null}
 */
export function wierszUduszenia(actor, editable) {
  const stan = stanOddechu(actor);
  if (!stan) return null;
  const row = document.createElement("div");
  row.className = `neuro-stan-row neuro-stan-oddech is-${stan.faza}`;
  const opis = document.createElement("span");
  opis.className = "neuro-oddech-opis";
  opis.innerHTML = `<i class="fa-solid fa-lungs" inert></i> ${stan.faza === "dusi"
    ? "Dusi się: +1 Wyczerpanie na końcu każdej tury"
    : `Wstrzymuje oddech: ${stan.tury} ${stan.tury === 1 ? "tura" : "tur"}`}`;
  row.appendChild(opis);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "neuro-oddech-btn";
  btn.textContent = "Złap oddech";
  btn.setAttribute("data-tooltip", "Ponowne oddychanie: koniec Uduszenia, schodzą wszystkie poziomy Wyczerpania z duszenia się (s. 259).");
  btn.disabled = !editable;
  if (editable) btn.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); zlapOddech(actor); });
  row.appendChild(btn);
  return row;
}

async function _oknoUduszenia() {
  const aktorzy = _zaznaczeni();
  if (!aktorzy.length) return ui.notifications.warn("Zaznacz żetony postaci.");
  const wybor = await foundry.applications.api.DialogV2.wait({
    window: { title: "Uduszenie (MG)", icon: "fa-solid fa-lungs" },
    content: `<p>${aktorzy.map(a => esc(a.name)).join(", ")}</p>
      <p class="hint">Wstrzymanie oddechu: 1 + mod. Kondycji minut (min. 30 s), odliczane na końcu każdej tury w walce.
      Potem — albo od razu, gdy powietrza nie ma — +1 Wyczerpanie na końcu każdej tury (s. 259).</p>`,
    buttons: [
      { action: "oddech", label: "Wstrzymuje oddech", icon: "fa-solid fa-hourglass-half", default: true },
      { action: "dusi", label: "Dusi się", icon: "fa-solid fa-lungs-virus" },
      { action: "wdech", label: "Łapie oddech", icon: "fa-solid fa-wind" }
    ],
    rejectClose: false
  });
  if (!wybor) return;
  for (const a of aktorzy) {
    if (wybor === "wdech") await zlapOddech(a);
    else await wstrzymajOddech(a, { dusi: wybor === "dusi" });
  }
}

/* -------------------------------------------- */
/*  Rejestracja                                 */
/* -------------------------------------------- */

async function _oknoZagrozen() {
  const wybor = await foundry.applications.api.DialogV2.wait({
    window: { title: "Zagrożenia środowiska (MG)", icon: "fa-solid fa-temperature-low" },
    content: `<p>Dla zaznaczonych żetonów (${_zaznaczeni().length}).</p>`,
    buttons: [
      { action: "mroz", label: "Przemarznięcie", icon: "fa-solid fa-snowflake", default: true },
      { action: "sen", label: "Doba bez snu", icon: "fa-solid fa-moon" },
      { action: "oddech", label: "Uduszenie", icon: "fa-solid fa-lungs" }
    ],
    rejectClose: false
  });
  if (wybor === "mroz") return _oknoMrozu();
  if (wybor === "oddech") return _oknoUduszenia();
  if (wybor === "sen") {
    const aktorzy = _zaznaczeni();
    if (!aktorzy.length) return ui.notifications.warn("Zaznacz żetony postaci.");
    return dobaBezSnu(aktorzy);
  }
}

export function registerZagrozenia() {
  Hooks.on("getSceneControlButtons", controls => {
    const tools = controls.tokens?.tools;
    if (!tools) return;
    tools.neuroshimaZagrozenia = {
      name: "neuroshimaZagrozenia",
      title: "Zagrożenia: Przemarznięcie, doba bez snu, Uduszenie (MG)",
      icon: "fa-solid fa-temperature-low",
      order: Object.keys(tools).length,
      button: true,
      visible: game.user?.isGM ?? false,
      onChange: () => _oknoZagrozen()
    };
  });
  Hooks.on("combatTurnChange", _onTurnChange);
  Hooks.on("deleteActiveEffect", _onDeleteEffect);
  Hooks.on("updateActiveEffect", _onUpdateEffect);
  Hooks.on("dnd5e.applyDamage", _onApplyDamage);
  Hooks.on("renderChatMessageHTML", _onRenderMessage);
  Hooks.on("neuroshima.rerolled", _onRerolled);
  console.log("Neuroshima 5e | Zagrożenia (Przemarznięcie, sen, Uduszenie) registered");
}

export const zagrozeniaApi = Object.freeze({
  przemarzniecie, dobaBezSnu, wstrzymajOddech, zlapOddech, roOddechu, stanOddechu, koniecTuryOddechu, okno: _oknoZagrozen
});
