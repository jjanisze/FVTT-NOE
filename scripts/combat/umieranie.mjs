/**
 * Neuroshima 5e — umieranie i stabilizacja (PLAN_m1_walka.md §7.2–7.3, E1–E2).
 *
 * Czyste zasady: `config/umieranie-rules.mjs`. Tutaj maszyna stanów per aktor
 * **przytomny → umierający → stabilny → przytomny**, plus **martwy**, i jej lejek zapisu.
 *
 * ## Jeden magazyn (U1)
 *
 * Stan żyje w natywnych polach dnd5e: `hp.value`, `death.success/failure`, statusy `unconscious`,
 * `stable`, `dead`. Moduł dokłada tylko lejek i widoki. Flaga `flags.<mod>.umieranie` niesie to,
 * czego dnd5e nie ma: kartę epizodu, termin 1 PW stabilnego (U5) i znacznik BN wprowadzonego do
 * maszyny kartą (D2). Nieprzytomność z zejścia do 0 PW nosi znacznik pochodzenia — kończy się tylko
 * ona (U4); Sen i Nokautowanie zostają nietknięte.
 *
 * ## Kto pisze: aktywny MG
 *
 * Każda zmiana stanu wykonuje się u aktywnego MG. Klient gracza kładzie prośbę na **własnym**
 * aktorze (`flags.<mod>.umieranieProsba`, idiom `combat/obrona.mjs`), a `updateActor` u MG ją
 * wykonuje i zdejmuje. Trzeci sukces w rzucie przeciw śmierci jedzie tą samą drogą — prośba
 * wchodzi do `details.updates` dnd5e, więc idzie jednym zapisem z jego licznikami.
 *
 * ## Wejścia
 *
 *   - `updateActor` (MG): PW > 0 → 0 (wejście albo, dla BN, śmierć — D2), 0 → > 0 (`ocuc`),
 *     trzecia porażka (karta „Śmierć”), Wyczerpanie 6, maks. PW 0; stare PW z `options.dnd5e.hp`.
 *   - `dnd5e.preApplyDamage` / `dnd5e.applyDamage` (klient nakładający): PW sprzed ciosu i kwota
 *     przed obcięciem do 0 — porażki przy 0 PW i Olbrzymie obrażenia (F8). Przy 0 PW dnd5e nie
 *     zmienia PW, więc `updateActor` tego nie widzi.
 *   - `dnd5e.preRollDeathSave` (rzucający): blokada stabilnego, czysta k20 (U12).
 *   - `dnd5e.rollDeathSave` (rzucający): trzeci sukces → `stabilizuj` zamiast gołego resetu dnd5e.
 *   - `updateWorldTime` (MG): stabilny po 1k8 h odzyskuje 1 PW (U5). Zegar stoi — nic się nie dzieje.
 *   - `dnd5e.preLongRest`: odmowa przy 0 PW (U6).
 *
 * ## Karty
 *
 *   - **„Umiera”** — jedna na epizod, przepisywana przez MG przy każdej zmianie: tor, stan, przyciski
 *     (rzut — właściciel; stabilizacja — każdy z postacią; „+1 porażka (wręcz)” — MG, U2).
 *   - **„Śmierć”** (D1) — tylko dla MG: przyczyna, liczby, [Potwierdź] / [Cofnij]. Śmierć to decyzja
 *     człowieka (R6). Przy trzech porażkach — przypomnienie o Ostatniej akcji (s. 34).
 *   - **„BN pada”** (D2) — tylko dla MG: BN już martwy, [Rzuty przeciw śmierci] wprowadza go do maszyny.
 */

import {
  PRZYCZYNY_SMIERCI, RZUT_PRZECIW_SMIERCI, porazkiZaObrazenia, olbrzymieObrazenia, smiercZMaksPW,
  stabilnyGodziny, stanUmierania
} from "../config/umieranie-rules.mjs";
import { applyZranienie, getZranienieLvl, ZRANIENIE_LEVELS } from "./zranienie.mjs";
import { obronaOf, attackMessageFor, isMeleeAttack } from "./trafienie.mjs";
import { seqScrollText } from "../weapons/sequencer.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Flaga aktora: `{ karta, przyczyna, bn, stabilnyDo }`. */
const FLAG = "umieranie";
/** Prośba do MG, na aktorze, którego proszący jest właścicielem. */
const PROSBA = "umieranieProsba";
/** Flagi kart czatu. */
const KARTA = "umieranieKarta";
const KARTA_SMIERC = "umieranieSmierc";
const KARTA_BN = "umieranieBN";
/** Znacznik pochodzenia na Nieprzytomności z zejścia do 0 PW (U4). */
const ZRODLO_PW0 = "pw0";
/** Klucz w `options` aktualizacji/obrażeń. */
const OPT = MODULE_ID;

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const _num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerUmieranie() {
  Hooks.on("preUpdateActor", _onPreUpdateActor);
  Hooks.on("updateActor", _onUpdateActor);
  Hooks.on("createActiveEffect", _onEffectChange);
  Hooks.on("deleteActiveEffect", _onEffectChange);
  Hooks.on("updateActiveEffect", _onEffectChange);
  Hooks.on("dnd5e.preApplyDamage", _onPreApplyDamage);
  Hooks.on("dnd5e.applyDamage", _onApplyDamage);
  Hooks.on("dnd5e.preRollDeathSave", _onPreRollDeathSave);
  Hooks.on("dnd5e.rollDeathSave", _onRollDeathSave);
  Hooks.on("dnd5e.preLongRest", _onPreLongRest);
  Hooks.on("updateWorldTime", _onUpdateWorldTime);
  Hooks.on("renderChatMessageHTML", _onRenderMessage);
  _bezAutomatycznejSmierciZWyczerpania();
  console.log(`${MODULE_ID} | Umieranie registered`);
}

/**
 * dnd5e przy 6. poziomie Wyczerpania dopisuje efektowi Wyczerpania status `dead`
 * (`ActiveEffect5e#_prepareExhaustionLevel`) — śmierć bez człowieka. D1: każdą śmierć BG potwierdza
 * MG, więc status zdejmujemy, a karta „Śmierć” pyta (`_sprawdzWyczerpanie`). Owinięcie metody
 * chronionej, bo to dane pochodne — hak ich nie dosięga (wzorzec `actors/pw.mjs`).
 */
function _bezAutomatycznejSmierciZWyczerpania() {
  const proto = CONFIG.ActiveEffect.documentClass?.prototype;
  const original = proto?._prepareExhaustionLevel;
  if (typeof original !== "function" || original.neuroUmieranie) return;
  const wrapped = function (...args) {
    const result = original.apply(this, args);
    const dead = CONFIG.specialStatusEffects?.DEFEATED ?? "dead";
    this.statuses?.delete(dead);
    return result;
  };
  wrapped.neuroUmieranie = true;
  proto._prepareExhaustionLevel = wrapped;
}

/* -------------------------------------------- */
/*  Odczyt stanu                                 */
/* -------------------------------------------- */

/** Haki odpalają u wszystkich — wykonuje jeden klient. Funkcje lejka wołane wprost: dowolny MG. */
const _jestWykonawca = () => game.users.activeGM?.isSelf ?? false;
const _flaga = actor => actor?.getFlag(MODULE_ID, FLAG) ?? {};
const _martwy = actor => !!actor?.statuses?.has(CONFIG.specialStatusEffects?.DEFEATED ?? "dead");
const _stabilny = actor => !!actor?.statuses?.has("stable");
const _pw = actor => _num(actor?.system?.attributes?.hp?.value);
const _maksPW = actor => {
  const hp = actor?.system?.attributes?.hp ?? {};
  return Number.isFinite(Number(hp.effectiveMax)) ? Number(hp.effectiveMax) : _num(hp.max);
};
const _tor = actor => {
  const d = actor?.system?.attributes?.death ?? {};
  return { sukcesy: _num(d.success), porazki: _num(d.failure) };
};

/** BG albo BN wprowadzony do maszyny kartą (D2). */
export function wMaszynie(actor) {
  if (!actor || !["character", "npc"].includes(actor.type)) return false;
  return actor.type === "character" || _flaga(actor).bn === true;
}

/** Stan maszyny umierania aktora. */
export function stan(actor) {
  return stanUmierania({ pw: _pw(actor), stabilny: _stabilny(actor), martwy: _martwy(actor) });
}

/* -------------------------------------------- */
/*  Haki dokumentów                              */
/* -------------------------------------------- */

/** Na kliencie inicjującym: to, czego `updateActor` u MG już nie zobaczy (opcje są rozgłaszane). */
function _onPreUpdateActor(actor, changes, options) {
  const opt = (options[OPT] ??= {});
  if (foundry.utils.hasProperty(changes, "system.attributes.death.failure")) {
    opt.porazkiPrzed = _tor(actor).porazki;
  }
  if (foundry.utils.hasProperty(changes, "system.attributes.exhaustion")) {
    opt.wyczerpaniePrzed = _num(actor.system.attributes?.exhaustion);
  }
}

async function _onUpdateActor(actor, changes, options) {
  if (!_jestWykonawca()) return;
  if (!["character", "npc"].includes(actor.type)) return;

  const prosba = foundry.utils.getProperty(changes, `flags.${MODULE_ID}.${PROSBA}`);
  if (prosba?.nonce) await _wykonajProsbe(actor, prosba);

  // PW: stare z dnd5e (`AttributesFields.preUpdateHP` → `options.dnd5e.hp`), nowe z dokumentu.
  if (foundry.utils.hasProperty(changes, "system.attributes.hp.value")) {
    const przed = options?.dnd5e?.hp?.value;
    const po = _pw(actor);
    if (Number.isFinite(przed)) {
      if (przed > 0 && po <= 0) await _naZero(actor);
      else if (przed <= 0 && po > 0) await ocuc(actor);
    }
  }

  const porazki = foundry.utils.getProperty(changes, "system.attributes.death.failure");
  const porazkiPrzed = options?.[OPT]?.porazkiPrzed;
  if (porazki >= RZUT_PRZECIW_SMIERCI.tor && !(porazkiPrzed >= RZUT_PRZECIW_SMIERCI.tor) && wMaszynie(actor)) {
    await zaproponujSmierc(actor, "rzuty", { porazkiPrzed: Number.isFinite(porazkiPrzed) ? porazkiPrzed : RZUT_PRZECIW_SMIERCI.tor - 1 });
  }

  const wyczerpanie = foundry.utils.getProperty(changes, "system.attributes.exhaustion");
  const wyczerpaniePrzed = options?.[OPT]?.wyczerpaniePrzed;
  if (wyczerpanie >= 6 && !(wyczerpaniePrzed >= 6)) await zaproponujSmierc(actor, "wyczerpanie", { wyczerpanie });

  await _sprawdzMaksPW(actor);
  if (_flaga(actor).karta) _odswiezKarte(actor);
}

/** Statusy to efekty — `updateActor` ich nie widzi. Maks. PW zmienia się też efektami. */
async function _onEffectChange(effect) {
  if (!_jestWykonawca()) return;
  const actor = effect?.parent;
  if (!(actor instanceof Actor)) return;
  await _sprawdzMaksPW(actor);
  if (_flaga(actor).karta) _odswiezKarte(actor);
}

/** Maks. PW = 0 → karta „Śmierć” (s. 34), raz na każde zejście. */
async function _sprawdzMaksPW(actor) {
  if (!["character", "npc"].includes(actor.type) || _martwy(actor)) return;
  const zero = smiercZMaksPW(_maksPW(actor)) && _num(actor.system.attributes?.hp?.max) > 0;
  const byla = _flaga(actor).maksPW0 === true;
  if (zero === byla) return;
  await actor.setFlag(MODULE_ID, FLAG, { ..._flaga(actor), maksPW0: zero });
  if (zero) await zaproponujSmierc(actor, "maksPW", { maksPW: _maksPW(actor) });
}

/* -------------------------------------------- */
/*  Obrażenia (F8)                               */
/* -------------------------------------------- */

/** PW sprzed ciosu — ten sam obiekt `options` dociera do `dnd5e.applyDamage`. */
function _onPreApplyDamage(actor, amount, updates, options) {
  if (!options || typeof options !== "object") return;
  (options[OPT] ??= {}).pwPrzed = _pw(actor);
}

function _onApplyDamage(actor, amount, options = {}) {
  if (!["character", "npc"].includes(actor?.type)) return;
  if (!(amount > 0)) return; // leczenie kończy umieranie przez `updateActor` (PW > 0)
  const pwPrzed = options?.[OPT]?.pwPrzed;
  if (!Number.isFinite(pwPrzed)) return;
  zglosObrazenia(actor, { obrazenia: amount, pwPrzed, wrecz: _wrecz(options) });
}

/**
 * Czy obrażenia przyszły z ataku wręcz: stempel karty ataku (`obrona.melee`, ten sam, który rozstrzyga
 * trafienie), inaczej typ akcji aktywności. `null` — bez kontekstu (pasek PW, makro): jedna porażka,
 * a MG ma na karcie „+1 porażka (wręcz)” (U2).
 */
function _wrecz(options) {
  const message = options?.origin ?? options?.originatingMessage ?? null;
  if (!message) return null;
  const obrona = obronaOf(attackMessageFor(message));
  if (obrona) return !!obrona.melee;
  const activity = message.getAssociatedActivity?.() ?? null;
  if (activity?.type === "attack") return isMeleeAttack(activity, message.flags?.dnd5e?.roll?.attackMode);
  return null;
}

/**
 * Jedno nałożenie obrażeń (U3) — z haka dnd5e albo z Nokautowania, które nakłada je samo. U MG
 * wykonuje się od razu; u gracza (nakłada obrażenia na własną postać) idzie prośbą.
 * @param {Actor} actor
 * @param {{obrazenia: number, pwPrzed: number, wrecz: boolean|null}} z
 */
export function zglosObrazenia(actor, z) {
  return _wyslij(actor, { typ: "obrazenia", obrazenia: _num(z.obrazenia), pwPrzed: _num(z.pwPrzed), wrecz: z.wrecz ?? null });
}

async function _obrazenia(actor, { obrazenia, pwPrzed, wrecz }) {
  if (_martwy(actor)) return;
  if (wMaszynie(actor) && olbrzymieObrazenia({ obrazenia, maksPW: _maksPW(actor) })) {
    await zaproponujSmierc(actor, "olbrzymie", { obrazenia, maksPW: _maksPW(actor) });
  }
  const n = porazkiZaObrazenia({ pwPrzed, obrazenia, wrecz: wrecz === true });
  if (n > 0 && wMaszynie(actor) && _pw(actor) <= 0) {
    await dodajPorazki(actor, n, wrecz ? "obrażenia od ataku wręcz przy 0 PW" : "obrażenia przy 0 PW");
  }
}

/* -------------------------------------------- */
/*  Lejek                                        */
/* -------------------------------------------- */

/** PW > 0 → 0. BG i BN w maszynie: Stopień + umieranie. Zwykły BN: martwy + karta MG (D2). */
async function _naZero(actor) {
  if (_martwy(actor)) return;
  if (!wMaszynie(actor)) return _bnPada(actor);
  await applyZranienie(actor, "PW spadły do 0");
  await wejdzWUmieranie(actor, "PW spadły do 0");
}

/**
 * Wejście w umieranie: Nieprzytomność ze znacznikiem pochodzenia (U4), czysty tor, karta epizodu.
 * Stopień Zranienia nakłada wołający (zejście do 0 PW to także Stopień — `zranienie.mjs`).
 */
export async function wejdzWUmieranie(actor, przyczyna = "PW spadły do 0") {
  if (!game.user.isGM) return;
  await _nieprzytomnosc(actor);
  const { sukcesy, porazki } = _tor(actor);
  if (sukcesy || porazki) {
    await actor.update({ "system.attributes.death.success": 0, "system.attributes.death.failure": 0 });
  }
  const karta = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: _trescKarty(actor, { przyczyna }),
    flags: { [MODULE_ID]: { [KARTA]: { actorUuid: actor.uuid, przyczyna } } }
  });
  await actor.setFlag(MODULE_ID, FLAG, { ..._flaga(actor), karta: karta.id, przyczyna, stabilnyDo: null });
  seqScrollText("UMIERA", actor, { color: "#c0392b", fontSize: 30, duration: 2000 });
}

async function _nieprzytomnosc(actor) {
  if (actor.statuses.has("unconscious")) return;
  const effect = await ActiveEffect.implementation.fromStatusEffect("unconscious", { parent: actor });
  effect.updateSource({ [`flags.${MODULE_ID}.zrodlo`]: ZRODLO_PW0 });
  await ActiveEffect.implementation.create(effect.toObject(), { parent: actor, keepId: true });
}

/**
 * Porażki w Rzutach Przeciw Śmierci (obrażenia przy 0 PW, przycisk MG). Stabilny wraca do umierania —
 * „ponownie musi rozpocząć cykl” (s. 34). Trzecia porażka — karta „Śmierć” z `updateActor`.
 */
export async function dodajPorazki(actor, n = 1, powod = "") {
  if (!game.user.isGM || _martwy(actor) || _pw(actor) > 0) return;
  if (_stabilny(actor)) {
    await actor.toggleStatusEffect("stable", { active: false });
    await actor.setFlag(MODULE_ID, FLAG, { ..._flaga(actor), stabilnyDo: null });
  }
  const { porazki } = _tor(actor);
  const nowe = Math.min(RZUT_PRZECIW_SMIERCI.tor, porazki + n);
  await actor.update({ "system.attributes.death.failure": nowe });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p><strong>${esc(actor.name)}</strong>: +${n} ${n === 1 ? "porażka" : "porażki"} w Rzutach Przeciw Śmierci`
      + `${powod ? ` (${esc(powod)})` : ""} — ${nowe}/${RZUT_PRZECIW_SMIERCI.tor}.</p>`
  });
}

/**
 * Stabilizacja (s. 34): status `stable`, tor od zera, ślepy rzut MG 1k8 h do 1 PW (U5).
 * @param {Actor} actor
 * @param {{zrodlo: string, kto?: string}} [o]  `zrodlo`: rzuty | medycyna | maly-medyk | staza | mg
 * @returns {Promise<{ok: boolean, powod?: string}>}
 */
export async function stabilizuj(actor, { zrodlo = "mg", kto = "" } = {}) {
  if (!game.user.isGM) return { ok: false, powod: "stabilizację zapisuje MG" };
  const s = stan(actor);
  if (s !== "umierajacy") return { ok: false, powod: { martwy: "nie żyje", przytomny: "nie umiera", stabilny: "już stabilny" }[s] };
  if (!wMaszynie(actor)) return { ok: false, powod: "BN poza maszyną umierania" };

  await actor.toggleStatusEffect("stable", { active: true });
  const { sukcesy, porazki } = _tor(actor);
  if (sukcesy || porazki) {
    await actor.update({ "system.attributes.death.success": 0, "system.attributes.death.failure": 0 });
  }
  const roll = await new Roll(stabilnyGodziny()).evaluate();
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${actor.name} — stabilny: godziny do odzyskania 1 PW bez leczenia (1k8, s. 34)`
  }, { messageMode: "gm" }); // v14: tryby wiadomości (`CONFIG.ChatMessage.modes`), nie `rollMode`
  const stabilnyDo = game.time.worldTime + roll.total * 3600;
  await actor.setFlag(MODULE_ID, FLAG, { ..._flaga(actor), stabilnyDo });

  const jak = ZRODLA_STABILIZACJI[zrodlo] ?? zrodlo;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p><strong>${esc(actor.name)}</strong> — stan ustabilizowany (${esc(jak)}${kto ? `: ${esc(kto)}` : ""}). `
      + `Wciąż Nieprzytomny; bez leczenia odzyska 1 PW w ciągu 1k8 godzin.</p>`
  });
  seqScrollText("Stabilizacja", actor, { color: "#7fd1ff", fontSize: 28 });
  _odswiezKarte(actor);
  return { ok: true };
}

const ZRODLA_STABILIZACJI = Object.freeze({
  rzuty: "trzy sukcesy w Rzutach Przeciw Śmierci",
  medycyna: "Pomaganie, Medycyna ST 10",
  "maly-medyk": "narzędzia małego medyka",
  staza: "staza",
  mg: "decyzja MG"
});

/** PW > 0: koniec umierania. Zdejmuje tylko Nieprzytomność z zejścia do 0 (U4) i stan `stable`. */
export async function ocuc(actor) {
  if (!game.user.isGM) return;
  const nasza = actor.effects.filter(e => e.statuses.has("unconscious") && e.getFlag(MODULE_ID, "zrodlo") === ZRODLO_PW0);
  if (nasza.length) await actor.deleteEmbeddedDocuments("ActiveEffect", nasza.map(e => e.id));
  if (_stabilny(actor)) await actor.toggleStatusEffect("stable", { active: false });
  const f = _flaga(actor);
  if (f.karta || f.stabilnyDo) {
    await _odswiezKarte(actor, { koniec: true });
    await actor.setFlag(MODULE_ID, FLAG, { ...f, karta: null, stabilnyDo: null });
  }
}

/* -------------------------------------------- */
/*  Śmierć (D1) i BN (D2)                        */
/* -------------------------------------------- */

/**
 * Karta „Śmierć” dla MG. Nic nie zapisuje na aktorze — śmierć nakłada dopiero [Potwierdź].
 * Jedna otwarta propozycja na przyczynę.
 * @param {Actor} actor
 * @param {"rzuty"|"olbrzymie"|"maksPW"|"stopien"|"wyczerpanie"} przyczyna
 * @param {object} [liczby]
 */
export async function zaproponujSmierc(actor, przyczyna, liczby = {}) {
  if (!game.user.isGM || _martwy(actor)) return null;
  const otwarta = game.messages.contents.findLast(m => {
    const k = m.getFlag(MODULE_ID, KARTA_SMIERC);
    return k?.actorUuid === actor.uuid && k.przyczyna === przyczyna && k.stan === "proponowana";
  });
  if (otwarta) return otwarta;
  const karta = { actorUuid: actor.uuid, przyczyna, liczby, stan: "proponowana" };
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: game.users.filter(u => u.isGM).map(u => u.id),
    content: _trescSmierci(actor, karta),
    flags: { [MODULE_ID]: { [KARTA_SMIERC]: karta } }
  });
}

/** [Potwierdź]: `dead` (tracker pomija — `Combatant#isDefeated`), koniec epizodu, linia dla stołu. */
export async function potwierdzSmierc(message) {
  const karta = message?.getFlag(MODULE_ID, KARTA_SMIERC);
  const actor = karta ? fromUuidSync(karta.actorUuid) : null;
  if (!actor || karta.stan !== "proponowana") return;
  if (!_martwy(actor)) await actor.toggleStatusEffect("dead", { active: true, overlay: true });
  const nowa = { ...karta, stan: "potwierdzona" };
  await message.update({ content: _trescSmierci(actor, nowa), [`flags.${MODULE_ID}.${KARTA_SMIERC}`]: nowa });
  await _odswiezKarte(actor, { koniec: true });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-umieranie-card is-martwy"><div class="neuro-umieranie-head">`
      + `<i class="fa-solid fa-skull"></i> ${esc(actor.name)} nie żyje</div>`
      + `<div class="neuro-umieranie-body">${esc(PRZYCZYNY_SMIERCI[karta.przyczyna]?.label ?? "")}.</div></div>`
  });
}

/**
 * [Cofnij]: stan sprzed. Propozycja — po prostu odrzucona; przy trzech porażkach tor wraca do
 * wartości sprzed ostatniego zdarzenia (inaczej dnd5e nie pozwoli rzucać dalej). Potwierdzona —
 * dodatkowo zdejmuje `dead`.
 */
export async function cofnijSmierc(message) {
  const karta = message?.getFlag(MODULE_ID, KARTA_SMIERC);
  const actor = karta ? fromUuidSync(karta.actorUuid) : null;
  if (!actor || karta.stan === "cofnieta") return;
  if (karta.stan === "potwierdzona" && _martwy(actor)) await actor.toggleStatusEffect("dead", { active: false });
  if (karta.przyczyna === "rzuty" && _tor(actor).porazki >= RZUT_PRZECIW_SMIERCI.tor) {
    await actor.update({ "system.attributes.death.failure": Math.min(RZUT_PRZECIW_SMIERCI.tor - 1, _num(karta.liczby?.porazkiPrzed)) });
  }
  const nowa = { ...karta, stan: "cofnieta" };
  await message.update({ content: _trescSmierci(actor, nowa), [`flags.${MODULE_ID}.${KARTA_SMIERC}`]: nowa });
  _odswiezKarte(actor);
}

/** D2: zwykły BN przy 0 PW — martwy od razu, MG dostaje kartę z wyjściem do maszyny. */
async function _bnPada(actor) {
  await actor.toggleStatusEffect("dead", { active: true, overlay: true });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: game.users.filter(u => u.isGM).map(u => u.id),
    content: _trescBN(actor, { stan: "martwy" }),
    flags: { [MODULE_ID]: { [KARTA_BN]: { actorUuid: actor.uuid, stan: "martwy" } } }
  });
}

/**
 * D2: [Rzuty przeciw śmierci] — śmierć BN zamieniona na Nieprzytomność + Stopień za 0 PW i wejście
 * do maszyny. Ten sam ruch jest w API (panel Stan BN, „chcemy go przesłuchać”).
 */
export async function bnDoUmierania(actor, message = null) {
  if (!game.user.isGM || actor?.type !== "npc" || _pw(actor) > 0) return false;
  await actor.setFlag(MODULE_ID, FLAG, { ..._flaga(actor), bn: true });
  if (_martwy(actor)) await actor.toggleStatusEffect("dead", { active: false });
  await applyZranienie(actor, "PW spadły do 0");
  await wejdzWUmieranie(actor, "PW spadły do 0 — MG: rzuty przeciw śmierci");
  if (message) {
    await message.update({
      content: _trescBN(actor, { stan: "umiera" }),
      [`flags.${MODULE_ID}.${KARTA_BN}.stan`]: "umiera"
    });
  }
  return true;
}

/* -------------------------------------------- */
/*  Rzut przeciw śmierci (U12, F4)               */
/* -------------------------------------------- */

/**
 * Blokada stabilnego i czysta k20: „nie jest powiązany z żadną Cechą Bazową i nie jest też Testem
 * k20” (s. 34). Zdejmujemy wszystkie części poza kością (premie do RO, `death.bonuses.save`,
 * Wyczerpanie, Diamentową Duszę), tryb Ułatwienia/Utrudnienia i okno — nie ma czego konfigurować.
 * Ten hak odpala pierwszy z łańcucha (`deathSave` → `SavingThrow` → `d20Test`).
 */
function _onPreRollDeathSave(config, dialog) {
  const actor = config?.subject;
  if (actor && _stabilny(actor)) {
    ui.notifications.warn(`${actor.name} jest stabilny — nie rzuca przeciw śmierci, dopóki nie otrzyma obrażeń.`);
    return false;
  }
  for (const roll of config?.rolls ?? []) {
    roll.parts = [];
    roll.data = {};
    roll.options ??= {};
    roll.options.advantage = false;
    roll.options.disadvantage = false;
    delete roll.options.maximum;
    delete roll.options.minimum;
  }
  config.halflingLucky = false;
  if (dialog) dialog.configure = false;
}

/**
 * Trzeci sukces: dnd5e sam zeruje tor (`rollDeathSave`) i nic nie odróżnia stabilnego od
 * umierającego (F4). Prośba o `stabilizuj` wchodzi do jego `details.updates` — jeden zapis.
 */
function _onRollDeathSave(rolls, details) {
  const actor = details?.subject;
  if (!actor || !wMaszynie(actor)) return;
  if (details.chatString !== "DND5E.DeathSaveSuccess") return;
  details.updates ??= {};
  details.updates[`flags.${MODULE_ID}.${PROSBA}`] = {
    typ: "stabilizuj", zrodlo: "rzuty", nonce: foundry.utils.randomID(), by: game.user.id
  };
}

/* -------------------------------------------- */
/*  Czas i odpoczynek (U5, U6)                   */
/* -------------------------------------------- */

/**
 * Aktorzy z terminem stabilnego: świat + niepowiązane żetony scen (BN). Hak odpala też co rundę
 * walki, więc żetony filtrujemy po delcie — syntetycznego aktora tworzymy tylko dla trafionych.
 */
function _zTerminem() {
  const termin = flags => Number.isFinite(flags?.[MODULE_ID]?.[FLAG]?.stabilnyDo);
  const out = new Set(game.actors.filter(a => termin(a.flags)));
  for (const scene of game.scenes) {
    for (const t of scene.tokens) if (!t.actorLink && termin(t.delta?.flags) && t.actor) out.add(t.actor);
  }
  return [...out];
}

/** Stabilny bez leczenia odzyskuje 1 PW po wylosowanym czasie — gdy MG przesunie zegar. */
async function _onUpdateWorldTime(worldTime) {
  if (!_jestWykonawca()) return;
  for (const actor of _zTerminem()) {
    const termin = _flaga(actor).stabilnyDo;
    if (!Number.isFinite(termin) || termin > worldTime) continue;
    if (stan(actor) !== "stabilny") {
      await actor.setFlag(MODULE_ID, FLAG, { ..._flaga(actor), stabilnyDo: null });
      continue;
    }
    await actor.update({ "system.attributes.hp.value": 1 });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<p><strong>${esc(actor.name)}</strong> odzyskuje przytomność — 1 PW (stabilny, bez leczenia; s. 34).</p>`
    });
  }
}

/** DO wymaga ≥ 1 PW (s. 45). Odmowa z podpowiedzią, zamiast pełnych PW za darmo (F9). */
function _onPreLongRest(actor) {
  if (!["character", "npc"].includes(actor?.type) || _pw(actor) > 0) return;
  const s = stan(actor);
  const dalej = s === "stabilny"
    ? "Stabilny odzyska 1 PW po 1k8 godzinach — przesuń zegar świata albo lecz go."
    : "Najpierw trzeba go ustabilizować albo wyleczyć.";
  ui.notifications.warn(`${actor.name}: Długi odpoczynek wymaga co najmniej 1 PW (s. 45). ${dalej}`);
  return false;
}

/* -------------------------------------------- */
/*  Prośby do MG                                 */
/* -------------------------------------------- */

/**
 * U MG — wykonaj od razu; u gracza — prośba na aktorze `nosiciel` (jego własnym).
 * @param {Actor} nosiciel
 * @param {object} prosba  `{ typ, celUuid?, … }`
 */
async function _wyslij(nosiciel, prosba) {
  if (game.user.isGM) return _wykonajProsbe(nosiciel, prosba, { lokalnie: true });
  if (!game.users.activeGM) {
    ui.notifications.warn("Umieranie rozstrzyga MG — nie ma aktywnego MG.");
    return null;
  }
  if (!nosiciel?.isOwner) return null;
  return nosiciel.setFlag(MODULE_ID, PROSBA, { ...prosba, nonce: foundry.utils.randomID(), by: game.user.id });
}

async function _wykonajProsbe(nosiciel, prosba, { lokalnie = false } = {}) {
  try {
    const cel = prosba.celUuid ? fromUuidSync(prosba.celUuid) : nosiciel;
    if (!cel) return null;
    if (prosba.typ === "obrazenia") return await _obrazenia(cel, prosba);
    if (prosba.typ === "stabilizuj") {
      if (prosba.zrodlo === "medycyna" && !(_num(prosba.wynik) >= RZUT_PRZECIW_SMIERCI.st)) return null;
      const res = await stabilizuj(cel, { zrodlo: prosba.zrodlo, kto: prosba.kto ?? "" });
      if (!res.ok && prosba.zrodlo !== "rzuty") {
        await ChatMessage.create({
          content: `<p><strong>Stabilizacja odrzucona</strong> (${esc(cel.name)}): ${esc(res.powod)}.</p>`,
          whisper: [prosba.by ?? game.user.id].filter(Boolean),
          speaker: { alias: "Umieranie" }
        });
      }
      return res;
    }
    return null;
  } finally {
    if (!lokalnie && nosiciel.getFlag(MODULE_ID, PROSBA)) await nosiciel.unsetFlag(MODULE_ID, PROSBA);
  }
}

/**
 * Stabilizacja z ręki pomocnika: Pomaganie + Test Inteligencji (Medycyna) ST 10, narzędzia małego
 * medyka (automatycznie, s. 135) albo staza (automatycznie, s. 142). Pomocnik rzuca u siebie, zapis
 * robi MG (R7). Woła to karta „Umiera” i `items/toolkit-medyk.mjs` (F4).
 * @param {Actor} pacjent
 * @param {{zrodlo: "medycyna"|"maly-medyk"|"staza", pomocnik: Actor, wynik?: number}} o
 */
export async function poprosOStabilizacje(pacjent, { zrodlo, pomocnik, wynik = null }) {
  if (!pacjent || !pomocnik) return null;
  return _wyslij(pomocnik, {
    typ: "stabilizuj", celUuid: pacjent.uuid, zrodlo, wynik, kto: pomocnik.name
  });
}

/* -------------------------------------------- */
/*  Karty                                        */
/* -------------------------------------------- */

const STAN_OPIS = Object.freeze({
  umierajacy: "Umierający — na początku każdej swojej tury Rzut Przeciw Śmierci: k20 ≥ 10, bez premii.",
  stabilny: "Stabilny — nie rzuca. Wciąż Nieprzytomny; bez leczenia odzyska 1 PW po 1k8 godzinach. Obrażenia wznawiają umieranie.",
  przytomny: "Odzyskał PW — przytomny.",
  martwy: "Nie żyje."
});

function _pipki(n, z, klasa) {
  return Array.from({ length: z }, (_, i) => `<span class="neuro-umieranie-pip ${klasa}${i < n ? " filled" : ""}"></span>`).join("");
}

function _trescKarty(actor, { przyczyna = "", koniec = false } = {}) {
  const s = stan(actor);
  const { sukcesy, porazki } = _tor(actor);
  const tor = RZUT_PRZECIW_SMIERCI.tor;
  const lvl = getZranienieLvl(actor);
  const zranienie = lvl ? `Stopień Zranienia: ${ZRANIENIE_LEVELS[lvl]?.label ?? lvl} (${lvl}/4).` : "";
  const aktywna = !koniec && (s === "umierajacy" || s === "stabilny");
  const btn = (akcja, ikona, tekst, tylko) => `<button type="button" class="neuro-umieranie-btn" data-umieranie="${akcja}"`
    + `${tylko ? ` data-tylko="${tylko}"` : ""}><i class="fa-solid ${ikona}"></i> ${tekst}</button>`;
  const przyciski = !aktywna ? "" : `<div class="neuro-umieranie-actions">${[
    s === "umierajacy" && btn("rzut", "fa-dice-d20", "Rzut przeciw śmierci", "wlasciciel"),
    s === "umierajacy" && btn("medycyna", "fa-hand-holding-medical", "Stabilizuj — Medycyna ST 10"),
    s === "umierajacy" && btn("medyk", "fa-kit-medical", "Mały medyk"),
    s === "umierajacy" && btn("staza", "fa-bandage", "Staza"),
    btn("wrecz", "fa-hand-fist", "+1 porażka (wręcz)", "mg")
  ].filter(Boolean).join("")}</div>`;
  return `<div class="neuro-umieranie-card is-${koniec && s !== "martwy" ? "przytomny" : s}">
    <div class="neuro-umieranie-head"><i class="fa-solid fa-heart-pulse"></i> ${esc(actor.name)} — umieranie</div>
    <div class="neuro-umieranie-body">
      ${przyczyna ? `<div class="neuro-umieranie-przyczyna">${esc(przyczyna)}.</div>` : ""}
      <div class="neuro-umieranie-tor">
        <span class="neuro-umieranie-tor-label">Sukcesy</span>${_pipki(sukcesy, tor, "sukces")}
        <span class="neuro-umieranie-tor-label">Porażki</span>${_pipki(porazki, tor, "porazka")}
      </div>
      <div class="neuro-umieranie-stan">${esc(STAN_OPIS[koniec && s !== "martwy" ? "przytomny" : s] ?? "")}</div>
      ${zranienie ? `<div class="neuro-umieranie-zranienie">${esc(zranienie)}</div>` : ""}
    </div>
    ${przyciski}
  </div>`;
}

/** Przepisz kartę epizodu (u MG). Z opóźnieniem — kilka zapisów jednego ciosu to jedna zmiana karty. */
const _odswiezane = new Map();
function _odswiezKarte(actor, { koniec = false } = {}) {
  if (!game.user.isGM) return Promise.resolve();
  const id = _flaga(actor).karta;
  const message = id ? game.messages.get(id) : null;
  if (!message) return Promise.resolve();
  if (koniec) {
    clearTimeout(_odswiezane.get(actor.uuid));
    _odswiezane.delete(actor.uuid);
    const przyczyna = message.getFlag(MODULE_ID, KARTA)?.przyczyna ?? "";
    return message.update({ content: _trescKarty(actor, { przyczyna, koniec: true }) });
  }
  clearTimeout(_odswiezane.get(actor.uuid));
  _odswiezane.set(actor.uuid, setTimeout(() => {
    _odswiezane.delete(actor.uuid);
    if (!game.messages.get(id)) return;
    const przyczyna = message.getFlag(MODULE_ID, KARTA)?.przyczyna ?? "";
    message.update({ content: _trescKarty(actor, { przyczyna }) });
  }, 150));
  return Promise.resolve();
}

function _liczbySmierci(karta) {
  const l = karta.liczby ?? {};
  switch (karta.przyczyna) {
    case "rzuty": return `Porażki ${RZUT_PRZECIW_SMIERCI.tor}/${RZUT_PRZECIW_SMIERCI.tor}.`;
    case "olbrzymie": return `Obrażenia ${_num(l.obrazenia)} ≥ 2 × ${_num(l.maksPW)} maks. PW = ${2 * _num(l.maksPW)}.`;
    case "maksPW": return `Maksymalne PW: ${_num(l.maksPW)}.`;
    case "stopien": return "Kolejny Stopień Zranienia przy Krytycznym (4/4).";
    case "wyczerpanie": return `Wyczerpanie ${_num(l.wyczerpanie)}/6.`;
    default: return "";
  }
}

function _trescSmierci(actor, karta) {
  const p = PRZYCZYNY_SMIERCI[karta.przyczyna] ?? { label: karta.przyczyna, strona: "" };
  const ostatnia = p.ostatniaAkcja && karta.stan === "proponowana"
    ? `<div class="neuro-umieranie-ostatnia"><strong>Ostatnia akcja</strong> (s. 34): na chwilę otwiera oczy, mówi kilka słów `
      + `i wykonuje coś godnego zapamiętania — zawleczka granatu, podpalone paliwo, długa seria. Rozegraj ją, potem potwierdź.</div>`
    : "";
  const stopka = {
    proponowana: `<div class="neuro-umieranie-actions">
        <button type="button" class="neuro-umieranie-btn" data-umieranie="potwierdz" data-tylko="mg"><i class="fa-solid fa-skull"></i> Potwierdź</button>
        <button type="button" class="neuro-umieranie-btn" data-umieranie="cofnij" data-tylko="mg"><i class="fa-solid fa-rotate-left"></i> Cofnij</button>
      </div>`,
    potwierdzona: `<div class="neuro-umieranie-stan">Potwierdzona.</div><div class="neuro-umieranie-actions">
        <button type="button" class="neuro-umieranie-btn" data-umieranie="cofnij" data-tylko="mg"><i class="fa-solid fa-rotate-left"></i> Cofnij</button>
      </div>`,
    cofnieta: `<div class="neuro-umieranie-stan">Cofnięta — żyje.</div>`
  }[karta.stan] ?? "";
  return `<div class="neuro-umieranie-card is-smierc is-${karta.stan}">
    <div class="neuro-umieranie-head"><i class="fa-solid fa-skull-crossbones"></i> Śmierć? — ${esc(actor.name)}</div>
    <div class="neuro-umieranie-body">
      <div class="neuro-umieranie-przyczyna">${esc(p.label)}${p.strona ? ` (${esc(p.strona)})` : ""}.</div>
      <div>${esc(_liczbySmierci(karta))}</div>
      ${ostatnia}
    </div>
    ${stopka}
  </div>`;
}

function _trescBN(actor, { stan: s }) {
  const body = s === "martwy"
    ? "PW spadły do 0 — przeciwnik umiera (s. 34). Ważnego BN możesz potraktować jak bohatera."
    : "Wprowadzony do Rzutów Przeciw Śmierci: Nieprzytomność i Stopień Zranienia za 0 PW.";
  const przycisk = s === "martwy"
    ? `<div class="neuro-umieranie-actions"><button type="button" class="neuro-umieranie-btn" data-umieranie="bn" data-tylko="mg">`
      + `<i class="fa-solid fa-heart-pulse"></i> Rzuty przeciw śmierci</button></div>`
    : "";
  return `<div class="neuro-umieranie-card is-bn is-${s}">
    <div class="neuro-umieranie-head"><i class="fa-solid fa-skull"></i> ${esc(actor.name)} pada</div>
    <div class="neuro-umieranie-body">${esc(body)}</div>
    ${przycisk}
  </div>`;
}

/* -------------------------------------------- */
/*  Przyciski kart                               */
/* -------------------------------------------- */

function _aktorKarty(message) {
  const uuid = message.getFlag(MODULE_ID, KARTA)?.actorUuid
    ?? message.getFlag(MODULE_ID, KARTA_SMIERC)?.actorUuid
    ?? message.getFlag(MODULE_ID, KARTA_BN)?.actorUuid;
  return uuid ? fromUuidSync(uuid) : null;
}

function _onRenderMessage(message, html) {
  const flags = message.flags?.[MODULE_ID] ?? {};
  if (!flags[KARTA] && !flags[KARTA_SMIERC] && !flags[KARTA_BN]) return;
  const el = html instanceof HTMLElement ? html : html?.[0];
  const actor = _aktorKarty(message);
  for (const btn of el?.querySelectorAll("[data-umieranie]") ?? []) {
    const tylko = btn.dataset.tylko;
    if ((tylko === "mg" && !game.user.isGM) || (tylko === "wlasciciel" && !actor?.isOwner)) {
      btn.remove();
      continue;
    }
    btn.addEventListener("click", ev => _onClick(ev, message));
  }
}

/** Postać, która pomaga: przypisana graczowi, inaczej zaznaczony żeton. Nie pacjent. */
function _pomocnik(pacjent) {
  const kandydaci = [game.user.character, ...(canvas.tokens?.controlled ?? []).map(t => t.actor)];
  return kandydaci.find(a => a && a !== pacjent && a.uuid !== pacjent?.uuid) ?? null;
}

const _maMedyka = actor => actor?.items.some(i => i.type === "tool" && i.system?.type?.baseItem === "medyka");
const _maStaze = actor => actor?.items.some(i => i.getFlag(MODULE_ID, "staza"));

async function _onClick(event, message) {
  event.preventDefault();
  event.stopPropagation();
  const btn = event.currentTarget;
  const akcja = btn.dataset.umieranie;
  const actor = _aktorKarty(message);
  if (!actor) return;
  btn.disabled = true;
  setTimeout(() => { if (btn.isConnected) btn.disabled = false; }, 4000);

  switch (akcja) {
    case "rzut":
      return actor.rollDeathSave({}, {}, {});
    case "wrecz":
      return game.user.isGM && dodajPorazki(actor, 1, "atak wręcz — MG");
    case "potwierdz":
      return game.user.isGM && potwierdzSmierc(message);
    case "cofnij":
      return game.user.isGM && cofnijSmierc(message);
    case "bn":
      return game.user.isGM && bnDoUmierania(actor, message);
    case "medycyna":
    case "medyk":
    case "staza": {
      const pomocnik = _pomocnik(actor);
      if (!pomocnik) return ui.notifications.warn("Kto pomaga? Przypisz postać albo zaznacz jej żeton.");
      if (akcja === "medyk" && !_maMedyka(pomocnik)) {
        return ui.notifications.warn(`${pomocnik.name} nie ma narzędzi małego medyka.`);
      }
      if (akcja === "staza" && !_maStaze(pomocnik)) return ui.notifications.warn(`${pomocnik.name} nie ma stazy.`);
      if (akcja !== "medycyna") {
        return poprosOStabilizacje(actor, { zrodlo: akcja === "medyk" ? "maly-medyk" : "staza", pomocnik });
      }
      const rolls = await pomocnik.rollSkill({ skill: "med", ability: "int", target: RZUT_PRZECIW_SMIERCI.st },
        {}, { data: { flavor: `Pomaganie — stabilizacja: ${actor.name} (Medycyna ST ${RZUT_PRZECIW_SMIERCI.st})` } });
      const roll = Array.isArray(rolls) ? rolls[0] : rolls;
      if (!roll) return null;
      if (roll.total < RZUT_PRZECIW_SMIERCI.st) {
        return ui.notifications.info(`Medycyna ${roll.total} < ST ${RZUT_PRZECIW_SMIERCI.st} — ${actor.name} wciąż umiera.`);
      }
      return poprosOStabilizacje(actor, { zrodlo: "medycyna", pomocnik, wynik: roll.total });
    }
    default:
      return null;
  }
}

/** `game.neuroshima.umieranie` */
export const umieranieApi = {
  stan, wMaszynie, stabilizuj, dodajPorazki, zaproponujSmierc, bnDoUmierania, poprosOStabilizacje, ocuc
};
