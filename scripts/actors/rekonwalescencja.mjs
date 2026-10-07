/**
 * Neuroshima 5e — neutralizacja Stopnia Zranienia i kalendarzyk zdrowia (PLAN_m1_walka.md §7.4, §7.8; E6).
 *
 * Na każdy Długi odpoczynek ranny (Stopień ≥ 1) idzie **jedną** drogą, wybraną przed rzutem (D4):
 *   - **Gojenie** (w kodzie `cialo`) — licznik Regeneracji +1; od trzeciego DO karta z [RO na Kondycję ST 15] dla
 *     właściciela; sukces −1 Stopień i licznik od zera, porażka — RO po każdym następnym DO (D3);
 *   - **Pomoc medyczna** — medyk drużyny albo BN (lekarz; zapasy i cena — sprawa MG, U13): −1 Stopień
 *     bez testu; licznik +1 jak każdy DO, chyba że tego dnia należał się RO — wtedy stoi (D4).
 *     WKK: jeden ładunek narzędzi małego medyka (poza „Dnem torby”), cały DO obojga, jeden pacjent
 *     na medyka (D7);
 *   - **sam sobie** (tylko WKK, D8) — Test Inteligencji (Medycyna) ST 20; sukces −1, porażka +1
 *     Stopień („Samoleczenie”); ładunek schodzi w obu przypadkach; licznik jak dzień z medykiem.
 *
 * Wybór drogi: sekcja „Rekonwalescencja” w oknie DO (klient rejestru `actors/rest-activities.mjs`),
 * zapamiętana na pacjencie jako plan na następny DO — jedno źródło prawdy także dla medyka, który
 * widzi u siebie „Opiekę medyczną”, i dla odpoczynku drużyny bez okna.
 *
 * Kiedy: `dnd5e.restCompleted` u odpoczywającego klienta — po zdjęciu Wyczerpania (−1, U14), więc RO
 * widzi Wyczerpanie już po odpoczynku. DO przy 0 PW nie istnieje (U6). Zapis na pacjencie robi
 * odpoczywający (jest właścicielem); ładunek cudzego zestawu — przekaźnik przez MG (flaga prośby na
 * pacjencie, idiom `combat/obrona.mjs`). Zejście z Krytycznego zdejmuje Wyczerpanie ze Zranienia (RAI)
 * — `setZranienie` w `combat/zranienie.mjs`, każdą drogą.
 *
 * RO i Test samoleczenia to Testy k20 (s. 17): Fuks i Forsowanie wolno; `neuroshima.rerolled`
 * przelicza werdykt, gdy przerzut zamienia porażkę w sukces.
 */

import { registerRestActivity } from "./rest-activities.mjs";
import { getZranienieLvl, setZranienie, applyZranienie, ZRANIENIE_LEVELS } from "../combat/zranienie.mjs";
import {
  REGENERACJA, KRYTYCZNY, regeneracjaPoDO, regeneracjaPoRzucie, prognozaZdrowia, szansaRO, SMIERC_Z_WYCZERPANIA
} from "../config/rekonwalescencja-rules.mjs";
import { POMOC_MEDYCZNA_KOBALT } from "../wkk/config/rekonwalescencja-kobalt.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { maDnoTorby, zapasyMedyka, zuzyjLadunekMedyka } from "../items/toolkit-medyk.mjs";
import { hasToolKit } from "./tool-availability.mjs";
import { zrodlaWyczerpania, opcjeZdejmowania, etykietaZrodla } from "../config/exhaustion.mjs";
import { formatWorldDate, sekundyDoby } from "../world-clock.mjs";
import { getChoroby } from "./health-panel.mjs";
import { bezKorzysciOdpoczynku } from "./disease-effects.mjs";
import { dailySaveFor, getDisease } from "../config/diseases-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Flaga pacjenta: `{ licznik, droga, medyk, karta, ostatniRzut, wynik, stopienPrzed }`. */
const FLAGA = "rekonwalescencja";
/** Prośba do MG: zużyj ładunek cudzego zestawu (`{ ladunek: itemUuid, id }`). */
const PROSBA = "rekonwalescencjaProsba";
/** Karta po DO: `{ actorUuid, rodzaj: "ro"|"samoleczenie"|"info", stopien }`. */
const KARTA = "rekonwalescencjaKarta";
/** Wiadomość rzutu RO / Testu samoleczenia: `{ token, rodzaj, actorUuid }`. */
const RZUT = "rekonwalescencjaRzut";
/** Wartość wyboru medyka: lekarz BN (MG). */
const BN = "bn";
const DROGI = ["cialo", "medyk", "sam"];
const SAMOLECZENIE = POMOC_MEDYCZNA_KOBALT.samoleczenie;

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const nazwaStopnia = n => `${ZRANIENIE_LEVELS[n]?.label ?? "?"} (${n})`;
/** Licznik dla gracza: po oblanym RO rośnie dalej, ale „4/3” nic nie mówi — od trzeciego DO RO po każdym. */
const licznikTxt = n => `${Math.min(n, REGENERACJA.dni)}/${REGENERACJA.dni}`;
const ladunki = n => `${n} ${n === 1 ? "ładunek" : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? "ładunki" : "ładunków"}`;

/** Aktywny MG, a bez MG — właściciel (idiom `actors/udzwig-slowdown.mjs`). */
function _jedynyZapisujacy(actor) {
  const gm = game.users.activeGM;
  return gm ? gm.isSelf : Boolean(actor?.isOwner);
}

/* -------------------------------------------- */
/*  Stan pacjenta                               */
/* -------------------------------------------- */

/**
 * Stan rekonwalescencji: licznik Regeneracji (D3), plan drogi na następny DO, karta czekająca na rzut.
 * @param {Actor} actor
 */
export function stanRekonwalescencji(actor) {
  const f = actor?.getFlag(MODULE_ID, FLAGA) ?? {};
  return {
    licznik: Math.max(0, Number(f.licznik) || 0),
    droga: DROGI.includes(f.droga) ? f.droga : "cialo",
    medyk: f.medyk ?? null,
    karta: f.karta ?? null,
    ostatniRzut: f.ostatniRzut ?? null,
    wynik: f.wynik ?? null,
    stopienPrzed: Number(f.stopienPrzed) || 0
  };
}

async function _zapiszStan(actor, zmiany) {
  await actor.setFlag(MODULE_ID, FLAGA, { ...(actor.getFlag(MODULE_ID, FLAGA) ?? {}), ...zmiany });
}

/** Postacie drużyny — członkowie głównej drużyny dnd5e, a bez niej postacie graczy. */
function _druzyna() {
  const czlonkowie = (game.actors.party?.system?.members ?? []).map(m => m.actor).filter(a => a?.type === "character");
  return czlonkowie.length ? czlonkowie : game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
}

/**
 * Czy `medyk` może dziś opatrzyć `pacjenta`: RAW — biegły w Medycynie, ma narzędzia małego medyka
 * (s. 46); WKK — do tego ładunek albo „Dno torby” (D4). Nieprzytomny medyk nikogo nie opatrzy.
 * @param {Actor} medyk
 * @param {Actor} pacjent
 * @param {{kobalt?: boolean, sam?: boolean}} [opts]
 * @returns {{ok: boolean, powod: string|null, zapas: object|null, dnoTorby: boolean}}
 */
export function ocenaMedyka(medyk, pacjent, { kobalt = isKobaltEnabled(), sam = false } = {}) {
  const nie = powod => ({ ok: false, powod, zapas: null, dnoTorby: false });
  if (!medyk) return nie("nie wybrano medyka");
  if (!sam && medyk.uuid === pacjent?.uuid) return nie("sam sobie — osobna droga");
  if ((medyk.system?.attributes?.hp?.value ?? 1) <= 0) return nie(`${medyk.name} jest nieprzytomny`);
  if (!((medyk.system?.skills?.med?.value ?? 0) >= 1)) return nie(`${medyk.name} nie jest biegły w Medycynie`);
  if (!hasToolKit(medyk, "medyka")) return nie(`${medyk.name} nie ma narzędzi małego medyka`);
  const dnoTorby = maDnoTorby(medyk);
  const zapas = zapasyMedyka(medyk)[0] ?? null;
  if (kobalt && !dnoTorby && !(zapas?.remaining >= 1)) return nie(`${medyk.name} ma pustą torbę małego medyka (WKK: ładunek)`);
  return { ok: true, powod: null, zapas, dnoTorby };
}

/** Pacjenci, których plan na DO wskazuje tego medyka (D7: w WKK jeden). */
function _pacjenciMedyka(medyk, { poza = null } = {}) {
  if (!medyk) return [];
  return game.actors.filter(a => a !== poza && a.uuid !== medyk.uuid && getZranienieLvl(a) > 0
    && stanRekonwalescencji(a).droga === "medyk" && stanRekonwalescencji(a).medyk === medyk.uuid);
}

/** Droga na ten DO: z okna (`config.neuroZajecia`), a bez okna — zapamiętany plan. */
function _wybor(actor, wartosci) {
  const plan = stanRekonwalescencji(actor);
  const w = wartosci?.rekonwalescencja;
  return {
    droga: DROGI.includes(w?.droga) ? w.droga : plan.droga,
    medyk: w?.medyk ? w.medyk : plan.medyk
  };
}

/* -------------------------------------------- */
/*  Sekcja w oknie Długiego odpoczynku          */
/* -------------------------------------------- */

function _sekcjaPacjenta(actor, s) {
  const kobalt = isKobaltEnabled();
  const stan = stanRekonwalescencji(actor);
  const { rzutNalezny } = regeneracjaPoDO({ licznik: stan.licznik, droga: "cialo" });
  const opcje = _druzyna().filter(m => m.uuid !== actor.uuid).map(m => {
    const o = ocenaMedyka(m, actor, { kobalt });
    const zajety = kobalt && o.ok && _pacjenciMedyka(m, { poza: actor }).length >= POMOC_MEDYCZNA_KOBALT.pacjentowNaDO;
    const powod = !o.ok ? o.powod : (zajety ? "opatruje już innego pacjenta (WKK)" : null);
    const dopisek = powod ? ` — ${powod}` : (kobalt ? (o.dnoTorby ? " — Dno torby" : ` — ${o.zapas.remaining}/${o.zapas.max} ładunków`) : "");
    return `<option value="${m.uuid}"${powod ? " disabled" : ""}${stan.medyk === m.uuid ? " selected" : ""}>${esc(m.name)}${esc(dopisek)}</option>`;
  });
  opcje.push(`<option value="${BN}"${stan.medyk === BN ? " selected" : ""}>BN — lekarz (decyduje MG)</option>`);
  const sam = kobalt ? ocenaMedyka(actor, actor, { kobalt, sam: true }) : null;
  const droga = (stan.droga === "sam" && !sam?.ok) ? "cialo" : stan.droga;
  const zaznacz = d => (droga === d ? " checked" : "");
  const N = "neuroZajecia.rekonwalescencja";
  return `<p class="hint neuro-rekon-stan">Stopień Zranienia: <strong>${nazwaStopnia(s)}</strong> · licznik Regeneracji
      <strong>${licznikTxt(stan.licznik)}</strong>${rzutNalezny ? ` — po tym DO: RO na Kondycję ST ${REGENERACJA.st}` : ""}
      · <a class="neuro-kalendarzyk-open" data-actor-uuid="${actor.uuid}"><i class="fa-solid fa-calendar-days" inert></i> kalendarzyk</a></p>
    <label class="neuro-zajecie-check"><input type="radio" name="${N}.droga" value="cialo"${zaznacz("cialo")}>
      <span><strong>Gojenie</strong> — licznik +1; od trzeciego DO RO na Kondycję ST ${REGENERACJA.st} (sukces: −1 Stopień)</span></label>
    <label class="neuro-zajecie-check"><input type="radio" name="${N}.droga" value="medyk"${zaznacz("medyk")}>
      <span><strong>Pomoc medyczna</strong> — −1 Stopień bez testu${rzutNalezny ? "; dziś należy się RO, więc licznik stoi" : ""}${kobalt ? "; WKK: ładunek medyka, cały DO obojga, jeden pacjent" : ""}</span></label>
    <div class="form-group neuro-rekon-medyk"><label>Medyk</label><div class="form-fields"><select name="${N}.medyk">${opcje.join("")}</select></div></div>
    ${kobalt ? `<label class="neuro-zajecie-check${sam.ok ? "" : " is-disabled"}"><input type="radio" name="${N}.droga" value="sam"${zaznacz("sam")}${sam.ok ? "" : " disabled"}>
      <span><strong>Sam sobie medykiem</strong> — Test Inteligencji (Medycyna) ST ${SAMOLECZENIE.st}: sukces −1 Stopień, porażka +1 (WKK)${sam.ok ? "" : ` — ${esc(sam.powod)}`}
      ${s >= KRYTYCZNY ? `<br><strong class="neuro-rekon-ostrzezenie">Przy Krytycznym porażka to piąty Stopień — śmierć.</strong>` : ""}</span></label>` : ""}`;
}

function _sekcjaMedyka(actor, pacjenci) {
  return pacjenci.map(p => `<p class="hint neuro-rekon-opieka"><i class="fa-solid fa-user-nurse" inert></i>
    Opieka medyczna: <strong>${esc(p.name)}</strong> (${nazwaStopnia(getZranienieLvl(p))}) wybrał tę drogę na Długi odpoczynek
    — −1 Stopień bez testu${isKobaltEnabled() ? "; WKK: ładunek z twojej torby, cały DO" : ""}.</p>`).join("");
}

function _rejestrujSekcje() {
  registerRestActivity({
    id: "rekonwalescencja",
    label: "Rekonwalescencja",
    restTypes: ["long"],
    render(actor) {
      const czesci = [];
      const s = getZranienieLvl(actor);
      if (s > 0) czesci.push(_sekcjaPacjenta(actor, s));
      const pacjenci = _pacjenciMedyka(actor);
      if (pacjenci.length) czesci.push(_sekcjaMedyka(actor, pacjenci));
      return czesci.length ? czesci.join("") : null;
    },
    /** D7 (WKK): Pomoc medyczna i samoleczenie zajmują cały DO — pacjenta i medyka. */
    blokuje(actor, typ, { form = null, wartosci = null } = {}) {
      if (!isKobaltEnabled()) return null;
      if (getZranienieLvl(actor) > 0) {
        const droga = form
          ? form.querySelector('[name="neuroZajecia.rekonwalescencja.droga"]:checked')?.value
          : _wybor(actor, wartosci).droga;
        if (droga === "medyk") return "Pomoc medyczna zajmuje cały Długi odpoczynek — bez innych zajęć (WKK).";
        if (droga === "sam") return "Samoleczenie zajmuje cały Długi odpoczynek — bez innych zajęć (WKK).";
      }
      const [pacjent] = _pacjenciMedyka(actor);
      return pacjent ? `Opieka medyczna nad ${esc(pacjent.name)} zajmuje cały Długi odpoczynek — bez innych zajęć (WKK).` : null;
    },
    // Skutki — hak `dnd5e.restCompleted` niżej, także dla odpoczynku bez okna.
    apply() { return null; }
  });
}

/* -------------------------------------------- */
/*  Po Długim odpoczynku                        */
/* -------------------------------------------- */

/** Ładunek zestawu: własny — od razu; cudzy — prośba do MG. @returns {number} zostało */
async function _zuzyjLadunek(pacjent, zapas) {
  if (zapas.item.isOwner) return zuzyjLadunekMedyka(zapas.item);
  await pacjent.setFlag(MODULE_ID, PROSBA, { ladunek: zapas.item.uuid, id: foundry.utils.randomID() });
  return Math.max(0, zapas.remaining - 1);
}

async function _onRestCompleted(actor, result, config) {
  if (!(result?.longRest || config?.type === "long")) return;
  if (!actor?.isOwner || !["character", "npc"].includes(actor.type)) return;
  const s = getZranienieLvl(actor);
  if (s <= 0) {
    if (actor.getFlag(MODULE_ID, FLAGA)) await actor.unsetFlag(MODULE_ID, FLAGA);
    return;
  }
  try {
    await _dzienRekonwalescencji(actor, s, _wybor(actor, config?.neuroZajecia));
  } catch (err) {
    console.error(`${MODULE_ID} | rekonwalescencja`, err);
  }
}

/**
 * Jeden DO rannego (§7.4). Eksportowane dla testów; przy stole woła to tylko hak odpoczynku.
 * @param {Actor} actor
 * @param {{droga: string, medyk: string|null}} wybor  `medyk` — UUID aktora albo `"bn"`
 */
export async function dzienRekonwalescencji(actor, wybor) {
  const s = getZranienieLvl(actor);
  if (s > 0) await _dzienRekonwalescencji(actor, s, wybor);
}

async function _dzienRekonwalescencji(actor, s, wybor) {
  const kobalt = isKobaltEnabled();
  const stan = stanRekonwalescencji(actor);
  const plan = { droga: wybor.droga, medyk: wybor.medyk ?? null };
  const linie = [];
  if (stan.karta) linie.push("Poprzedni rzut nie padł przed tym odpoczynkiem — przepada.");

  let droga = wybor.droga;
  let medyk = null;
  let ocena = null;
  if (droga === "sam" && !kobalt) droga = "cialo"; // NOE: samoleczenia nie ma (D8)
  if (droga === "medyk" && wybor.medyk !== BN) {
    medyk = wybor.medyk ? fromUuidSync(wybor.medyk) : null;
    ocena = ocenaMedyka(medyk, actor, { kobalt });
    if (!ocena.ok) {
      linie.push(`Pomoc medyczna niemożliwa (${esc(ocena.powod)}) — ten dzień to Gojenie.`);
      droga = "cialo";
    }
  }
  if (droga === "sam") {
    ocena = ocenaMedyka(actor, actor, { kobalt, sam: true });
    if (!ocena.ok) {
      linie.push(`Samoleczenie niemożliwe (${esc(ocena.powod)}) — ten dzień to Gojenie.`);
      droga = "cialo";
    }
  }

  if (droga === "cialo") {
    const r = regeneracjaPoDO({ licznik: stan.licznik, droga: "cialo" });
    if (r.rzutNalezny) {
      linie.push(`Gojenie: licznik Regeneracji ${licznikTxt(r.licznik)} — RO na Kondycję ST ${REGENERACJA.st}; sukces −1 Stopień, porażka — znów po następnym Długim odpoczynku.`);
      const karta = await _karta(actor, { rodzaj: "ro", stopien: s, linie });
      await _zapiszStan(actor, { ...plan, licznik: r.licznik, karta: karta?.id ?? null });
      return;
    }
    linie.push(`Gojenie: licznik Regeneracji ${licznikTxt(r.licznik)}.`);
    await _zapiszStan(actor, { ...plan, licznik: r.licznik, karta: null });
    await _karta(actor, { rodzaj: "info", stopien: s, linie });
    return;
  }

  // Pomoc medyczna (medyk drużyny / BN) albo samoleczenie: licznik jak dzień z medykiem (D4, D8).
  const r = regeneracjaPoDO({ licznik: stan.licznik, droga: "medyk" });
  const licznikLinia = r.wstrzymany
    ? `Licznik Regeneracji stoi na ${licznikTxt(r.licznik)} — dziś należał się RO, czeka na następny DO.`
    : `Licznik Regeneracji ${licznikTxt(r.licznik)}.`;
  const kto = medyk ?? actor;
  if (kobalt && ocena?.dnoTorby) linie.push(`${esc(kto.name)}: Dno torby — bez ładunku.`);
  else if (kobalt && ocena?.zapas) {
    const zostalo = await _zuzyjLadunek(actor, ocena.zapas);
    linie.push(`Narzędzia małego medyka (${esc(kto.name)}): −1 ładunek, zostało ${zostalo}/${ocena.zapas.max}.`);
  }

  if (droga === "sam") {
    linie.push(`Samoleczenie: Test Inteligencji (Medycyna) ST ${SAMOLECZENIE.st} — sukces −1 Stopień, porażka +1.`, licznikLinia);
    const karta = await _karta(actor, { rodzaj: "samoleczenie", stopien: s, linie });
    await _zapiszStan(actor, { ...plan, licznik: r.licznik, karta: karta?.id ?? null });
    return;
  }

  linie.unshift(`Pomoc medyczna (${medyk ? esc(medyk.name) : "BN — lekarz"}): Stopień ${nazwaStopnia(s)} → ${nazwaStopnia(s - 1)}.`);
  if (s - 1 > 0) {
    linie.push(licznikLinia);
    await _zapiszStan(actor, { ...plan, licznik: r.licznik, karta: null });
  }
  await setZranienie(actor, s - 1);
  if (s - 1 <= 0) {
    linie.push("Wyleczony — licznik znika.");
    if (actor.getFlag(MODULE_ID, FLAGA)) await actor.unsetFlag(MODULE_ID, FLAGA);
  }
  await _karta(actor, { rodzaj: "info", stopien: s, linie });
}

/* -------------------------------------------- */
/*  Karty i rzuty                               */
/* -------------------------------------------- */

async function _karta(actor, { rodzaj, stopien, linie }) {
  const przycisk = {
    ro: `<button type="button" class="neuro-rekon-btn" data-rekon="ro"><i class="fa-solid fa-dice-d20" inert></i> RO na Kondycję ST ${REGENERACJA.st}</button>`,
    samoleczenie: `<button type="button" class="neuro-rekon-btn" data-rekon="samoleczenie"><i class="fa-solid fa-kit-medical" inert></i> Test Inteligencji (Medycyna) ST ${SAMOLECZENIE.st}</button>`
  }[rodzaj] ?? "";
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-rekon-card is-${rodzaj}">
      <header class="neuro-rekon-head"><i class="fa-solid fa-bed-pulse" inert></i>
        <div><strong>Rekonwalescencja</strong><span>${esc(actor.name)} · ${nazwaStopnia(stopien)}</span></div></header>
      ${linie.map(l => `<p>${l}</p>`).join("")}
      ${przycisk ? `<div class="neuro-rekon-actions">${przycisk}</div>` : ""}
      <p class="neuro-rekon-stopka"><a class="neuro-kalendarzyk-open" data-actor-uuid="${actor.uuid}"><i class="fa-solid fa-calendar-days" inert></i> Kalendarzyk zdrowia</a></p>
    </div>`,
    flags: { [MODULE_ID]: { [KARTA]: { actorUuid: actor.uuid, rodzaj, stopien } } }
  });
}

/** Rzut z wiadomością oznaczoną żetonem — dnd5e klonuje konfigurację wiadomości, więc szukamy jej po fladze. */
async function _rzucZeZnacznikiem(rzut, rodzaj, actor) {
  const token = foundry.utils.randomID();
  const flags = { [MODULE_ID]: { [RZUT]: { token, rodzaj, actorUuid: actor.uuid } } };
  const rolls = await rzut({ data: { flags } });
  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!roll) return null;
  const msg = game.messages.contents.findLast(m => m.getFlag(MODULE_ID, RZUT)?.token === token);
  return { roll, rzutId: msg?.id ?? null };
}

/**
 * [RO na Kondycję ST 15] z karty po DO (D3).
 * @param {Actor} actor
 * @returns {Promise<{sukces: boolean}|null>} null — rzut anulowany (karta zostaje aktualna)
 */
export async function rzutRegeneracji(actor) {
  const s = getZranienieLvl(actor);
  const w = await _rzucZeZnacznikiem(message => actor.rollSavingThrow(
    { ability: REGENERACJA.cecha, target: REGENERACJA.st }, {},
    { ...message, data: { ...message.data, flavor: `Regeneracja — RO na Kondycję ST ${REGENERACJA.st}` } }
  ), "ro", actor);
  if (!w) return null;
  const sukces = w.roll.total >= REGENERACJA.st;
  const { licznik } = regeneracjaPoRzucie({ licznik: stanRekonwalescencji(actor).licznik, sukces });
  await _zapiszStan(actor, { licznik, karta: null, ostatniRzut: w.rzutId, wynik: sukces ? "sukces" : "porazka", stopienPrzed: s });
  if (sukces) await setZranienie(actor, s - 1);
  if (sukces && s - 1 <= 0 && actor.getFlag(MODULE_ID, FLAGA)) await actor.unsetFlag(MODULE_ID, FLAGA);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: sukces
      ? `<strong>${esc(actor.name)}</strong> — Regeneracja: Stopień ${nazwaStopnia(s)} → ${nazwaStopnia(s - 1)}. Licznik od zera.`
      : `<strong>${esc(actor.name)}</strong> — Regeneracja nieudana; RO po każdym następnym Długim odpoczynku.`
  });
  return { sukces };
}

/**
 * [Test Inteligencji (Medycyna) ST 20] — samoleczenie (WKK, D8). Porażka to Stopień przez
 * `applyZranienie` — przy Krytycznym karta „Śmierć” (D1).
 * @param {Actor} actor
 */
export async function testSamoleczenia(actor) {
  const s = getZranienieLvl(actor);
  const w = await _rzucZeZnacznikiem(message => actor.rollSkill(
    { skill: SAMOLECZENIE.umiejetnosc, ability: SAMOLECZENIE.cecha, target: SAMOLECZENIE.st }, {},
    { ...message, data: { ...message.data, flavor: `Samoleczenie — Test Inteligencji (Medycyna) ST ${SAMOLECZENIE.st}` } }
  ), "samoleczenie", actor);
  if (!w) return null;
  const sukces = w.roll.total >= SAMOLECZENIE.st;
  await _zapiszStan(actor, { karta: null, ostatniRzut: w.rzutId, wynik: sukces ? "sukces" : "porazka", stopienPrzed: s });
  if (sukces) {
    await setZranienie(actor, s - 1);
    if (s - 1 <= 0 && actor.getFlag(MODULE_ID, FLAGA)) await actor.unsetFlag(MODULE_ID, FLAGA);
  } else {
    await applyZranienie(actor, "Samoleczenie");
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: sukces
      ? `<strong>${esc(actor.name)}</strong> — samoleczenie udane: Stopień ${nazwaStopnia(s)} → ${nazwaStopnia(s - 1)}.`
      : `<strong>${esc(actor.name)}</strong> — samoleczenie nieudane: +1 Stopień Zranienia.`
  });
  return { sukces };
}

/** Przerzut (Fuks, Forsowanie) zamienił porażkę w sukces — przelicz werdykt raz. */
async function _onRerolled({ message, roll } = {}) {
  const r = message?.getFlag?.(MODULE_ID, RZUT);
  if (!r || !roll) return;
  const actor = fromUuidSync(r.actorUuid);
  if (!actor?.isOwner) return;
  const stan = stanRekonwalescencji(actor);
  if (stan.ostatniRzut !== message.id || stan.wynik !== "porazka") return;
  const st = r.rodzaj === "ro" ? REGENERACJA.st : SAMOLECZENIE.st;
  if (!(roll.total >= st)) return;

  const przed = stan.stopienPrzed;
  const cel = Math.max(0, przed - 1);
  await _zapiszStan(actor, { wynik: "sukces-przerzut", ...(r.rodzaj === "ro" ? { licznik: 0 } : {}) });
  await setZranienie(actor, cel);
  if (cel <= 0 && actor.getFlag(MODULE_ID, FLAGA)) await actor.unsetFlag(MODULE_ID, FLAGA);
  const smierc = r.rodzaj === "samoleczenie" && przed >= KRYTYCZNY
    ? " Porażka przy Krytycznym wywołała kartę „Śmierć” — MG: [Cofnij]." : "";
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<strong>${esc(actor.name)}</strong> — przerzut zmienia wynik: ${r.rodzaj === "ro" ? "Regeneracja" : "samoleczenie"} udane, `
      + `Stopień ${nazwaStopnia(przed)} → ${nazwaStopnia(cel)}.${smierc}`
  });
}

function _onRenderMessage(message, html) {
  const k = message.getFlag(MODULE_ID, KARTA);
  if (!k) return;
  const el = html instanceof HTMLElement ? html : html?.[0];
  const actor = fromUuidSync(k.actorUuid);
  const aktualna = Boolean(actor) && stanRekonwalescencji(actor).karta === message.id;
  for (const btn of el?.querySelectorAll("[data-rekon]") ?? []) {
    // Rzuca właściciel (gracz albo MG); po rozstrzygnięciu albo kolejnym DO przycisk znika u wszystkich.
    if (!aktualna || !actor.isOwner) { btn.remove(); continue; }
    btn.addEventListener("click", async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      if (stanRekonwalescencji(actor).karta !== message.id) return ui.notifications.warn("Ta karta jest już nieaktualna.");
      btn.disabled = true;
      try {
        if (btn.dataset.rekon === "ro") await rzutRegeneracji(actor);
        else await testSamoleczenia(actor);
      } finally {
        if (btn.isConnected) btn.disabled = false;
      }
    });
  }
  if (!aktualna) el?.querySelector(".neuro-rekon-actions")?.remove();
}

/** Karty tego aktora przerysowane lokalnie, gdy zmienia się jego stan (przycisk znika bez edycji wiadomości). */
function _przerysujKarty(actor) {
  for (const m of game.messages.contents.slice(-50)) {
    if (m.getFlag(MODULE_ID, KARTA)?.actorUuid === actor.uuid) ui.chat?.updateMessage?.(m);
  }
}

async function _wykonajProsbe(actor, prosba) {
  try {
    const item = await fromUuid(prosba.ladunek);
    if (item) await zuzyjLadunekMedyka(item);
  } finally {
    await actor.unsetFlag(MODULE_ID, PROSBA);
  }
}

function _onUpdateActor(actor, changes) {
  const flagi = changes?.flags?.[MODULE_ID];
  if (!flagi) return;
  // Stopień 0 — licznik znika (D3); następny Stopień zaczyna od nowa.
  if (flagi.zranienie?.level === 0 && actor.getFlag(MODULE_ID, FLAGA) && _jedynyZapisujacy(actor)) {
    actor.unsetFlag(MODULE_ID, FLAGA);
  }
  if (flagi[PROSBA]?.ladunek && game.users.activeGM?.isSelf) _wykonajProsbe(actor, flagi[PROSBA]);
  if (FLAGA in flagi || `-=${FLAGA}` in flagi) _przerysujKarty(actor);
  if (FLAGA in flagi || "zranienie" in flagi || "exhaustionSources" in flagi || changes?.system) {
    _kalendarzyki.get(actor.uuid)?.render();
  }
}

/* -------------------------------------------- */
/*  Kalendarzyk zdrowia (§7.8, D9)               */
/* -------------------------------------------- */

/**
 * Prognoza dla żywego aktora: oba wiersze (Gojenie, medyk co DO) z tych samych funkcji, co żywe reguły.
 * @param {Actor} actor
 */
export function daneKalendarzyka(actor) {
  const stopien = getZranienieLvl(actor);
  const stan = stanRekonwalescencji(actor);
  const con = actor.system?.abilities?.[REGENERACJA.cecha];
  const szansa = { premia: Number(con?.save?.value) || 0, tryb: Number(con?.save?.roll?.mode) || 0, st: REGENERACJA.st };
  const { kobalt, spelnione } = opcjeZdejmowania(actor);
  const choroba = _chorobaZDziennymRO(actor, szansa.premia);
  const wspolne = { stopien, licznik: stan.licznik, zrodlaWyczerpania: zrodlaWyczerpania(actor), szansa, kobalt, spelnione, choroba };
  return {
    stopien, stan, szansa, kobalt, choroba,
    cialo: prognozaZdrowia({ ...wspolne, droga: "cialo" }),
    medyk: prognozaZdrowia({ ...wspolne, droga: "medyk" })
  };
}

/**
 * Choroba z dziennym RO „na koniec dnia” (Choroba popromienna, Szczurza gorączka — s. 111) — ta sama
 * reguła, którą rzuca „Zachód słońca” (`actors/health-panel.mjs`): k20 + RO na Kondycję − 2 za poziom
 * Wyczerpania, bez Ułatwienia. Pierwsza taka choroba; null — żadnej.
 */
function _chorobaZDziennymRO(actor, premia) {
  const wpis = getChoroby(actor).find(e => dailySaveFor(e));
  if (!wpis) return null;
  const dzienny = dailySaveFor(wpis);
  return {
    nazwa: wpis.name ?? getDisease(wpis.key)?.label ?? "Choroba",
    lek: getDisease(wpis.key)?.medicine ?? null,
    st: dzienny.dc,
    premia,
    tryb: 0,
    bezKorzysci: bezKorzysciOdpoczynku(actor)
  };
}

const _kalendarzyki = new Map();

function _kalendarzykHTML(actor) {
  const k = daneKalendarzyka(actor);
  const teraz = game.time.worldTime;
  const doba = sekundyDoby();
  const data = n => formatWorldDate(teraz + n * doba) ?? `+${n} d`;
  const komorka = n => (n === null ? "<td class=\"is-brak\">—</td>"
    : `<td><strong>${n} DO</strong><span>${esc(data(n))}</span></td>`);
  const tryb = k.szansa.tryb > 0 ? " z Ułatwieniem" : (k.szansa.tryb < 0 ? " z Utrudnieniem" : "");
  const premia = `${k.szansa.premia >= 0 ? "+" : "−"}${Math.abs(k.szansa.premia)}`;

  if (k.stopien <= 0) {
    return `<p class="neuro-kal-zdrowy"><i class="fa-solid fa-heart" inert></i> ${esc(actor.name)} nie ma Stopnia Zranienia.</p>`;
  }

  const powod = p => (p.ryzykoSmierci > 0.5
    ? `nie dożyje bez leku — Wyczerpanie z choroby dojdzie do ${SMIERC_Z_WYCZERPANIA} poziomów`
    : `samo się nie zagoi — szansa RO na Kondycję ST ${REGENERACJA.st} wynosi 0%`);
  const wiersz = (nazwa, p, dopisek = "") => p.samoSieNieZagoi
    ? `<tr><th>${nazwa}${dopisek}</th><td colspan="3" class="is-brak">${powod(p)}</td></tr>`
    : `<tr><th>${nazwa}${dopisek}</th>${komorka(p.progi.najszybciej)}${komorka(p.progi.zwykle)}${komorka(p.progi.prawiePewnie)}</tr>`;

  const dni = Math.min(90, Math.max(14, (k.cialo.progi.prawiePewnie ?? 21) + 3, (k.medyk.progi.prawiePewnie ?? 0) + 3));
  const tydzien = game.time.calendar?.days?.values?.length || 7;
  const pasek = (p, klasa) => {
    const progi = new Map();
    const dodaj = (n, z) => { if (n !== null) progi.set(n, [...(progi.get(n) ?? []), z]); };
    for (const st of p.stopnie) if (st.stopien > 0) dodaj(st.zwykle, `↓${st.stopien}`);
    dodaj(p.progi.najszybciej, "najszybciej");
    dodaj(p.progi.zwykle, "zwykle");
    dodaj(p.progi.prawiePewnie, "9 na 10");
    const komorki = [];
    for (let n = 1; n <= dni; n++) {
      const c = game.time.calendar?.timeToComponents?.(teraz + n * doba);
      const nowyTydzien = c ? (c.dayOfWeek % tydzien === 0) : (n % 7 === 1);
      const z = p.dni[n]?.zdrowy ?? 0;
      const st = p.dni[n]?.stopien ?? [];
      const znaczniki = progi.get(n) ?? [];
      const smierc = p.dni[n]?.smierc ?? 0;
      const tip = `${n}. DO · ${esc(data(n))}<br>zdrowy: ${Math.round(z * 100)}%`
        + (smierc > 0.005 ? `<br>śmierć: ${Math.round(smierc * 100)}%` : "")
        + st.slice(0, k.stopien).map((v, i) => (i > 0 ? `<br>Stopień ≤ ${i}: ${Math.round(v * 100)}%` : "")).join("")
        + (znaczniki.length ? `<br><strong>${znaczniki.join(", ")}</strong>` : "");
      komorki.push(`<span class="neuro-kal-dzien${nowyTydzien ? " is-tydzien" : ""}${znaczniki.length ? " is-znacznik" : ""}"
        style="--p:${z.toFixed(3)}" data-tooltip="${tip}">${c ? c.dayOfMonth + 1 : n}</span>`);
    }
    return `<div class="neuro-kal-pasek ${klasa}">${komorki.join("")}</div>`;
  };

  const zalezy = k.cialo.zalezyOd.length
    ? `<p class="neuro-kal-zalezy"><i class="fa-solid fa-lock" inert></i> Zależy też od: ${k.cialo.zalezyOd.map(z => `${esc(etykietaZrodla(z.zrodlo))} — ${esc(z.opis)}`).join("; ")}.</p>`
    : "";
  const ladunkiWKK = k.kobalt ? ` <span class="neuro-kal-dopisek">(WKK: ${ladunki(k.stopien)})</span>` : "";
  const ch = k.choroba;
  const procent = x => `${Math.round(x * 100)}%`;
  const choroba = ch
    ? `<p class="neuro-kal-choroba"><i class="fa-solid fa-virus" inert></i> <strong>${esc(ch.nazwa)}</strong>: RO na Kondycję
        ST ${ch.st} na koniec każdego dnia (dziś ${procent(szansaRO({ premia: ch.premia, st: ch.st, wyczerpanie: zrodlaWyczerpania(actor).length }))}).
        Porażka: następny Długi odpoczynek bez korzyści (bez −1 Wyczerpania) i +1 Wyczerpanie; Regeneracja i Pomoc medyczna
        liczą ten dzień${ch.bezKorzysci ? ". <strong>Najbliższy Długi odpoczynek już bez korzyści.</strong>" : "."}
        Prognoza zakłada, że nie bierzesz leku${ch.lek ? ` (${esc(ch.lek)})` : ""}.</p>`
    : "";
  const smierc = ch && k.cialo.ryzykoSmierci > 0.005
    ? `<p class="neuro-kal-smierc"><i class="fa-solid fa-skull" inert></i> Ryzyko śmierci z Wyczerpania (${SMIERC_Z_WYCZERPANIA} poziomów),
        zanim choroba minie: <strong>${procent(k.cialo.ryzykoSmierci)}</strong> przy Gojeniu,
        ${procent(k.medyk.ryzykoSmierci)} z medykiem co DO — bez leku.</p>`
    : "";

  return `<header class="neuro-kal-head">
      <div><strong>${esc(actor.name)}</strong> · Stopień ${nazwaStopnia(k.stopien)} · licznik Regeneracji ${licznikTxt(k.stan.licznik)}</div>
      <div class="neuro-kal-sub">Dziś: ${esc(formatWorldDate(teraz) ?? "—")} · RO na Kondycję ${premia}${tryb}, ST ${REGENERACJA.st} · Wyczerpanie ${zrodlaWyczerpania(actor).length}</div>
    </header>
    <table class="neuro-kal-tabela">
      <thead><tr><th></th><th>najszybciej</th><th>zwykle</th><th>prawie na pewno<br><small>(9 na 10)</small></th></tr></thead>
      <tbody>${wiersz("Gojenie", k.cialo)}${wiersz("Z pomocą medyczną co DO", k.medyk, ladunkiWKK)}</tbody>
    </table>
    ${choroba}${smierc}${zalezy}
    <div class="neuro-kal-paski">
      <div class="neuro-kal-etykieta">Gojenie</div>${pasek(k.cialo, "is-cialo")}
      <div class="neuro-kal-etykieta">Z medykiem</div>${pasek(k.medyk, "is-medyk")}
    </div>
    <p class="neuro-kal-zalozenia">Barwa dnia — szansa, że po tym Długim odpoczynku postać jest zdrowa (Stopień 0 i żadnego
      Wyczerpania, które schodzi odpoczynkiem${ch ? ", a choroba minęła" : ""}). Założenia: Długi odpoczynek co dobę bez przerwy — dzień bez DO przesuwa daty;
      bez Fuksów${ch ? "; choroba bez leku" : ""}; nowe rany, choroby i zmiana premii unieważniają prognozę (liczona na nowo przy każdym otwarciu).</p>`;
}

class KalendarzykZdrowia extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["neuro-kalendarzyk"],
    window: { title: "Kalendarzyk zdrowia", icon: "fa-solid fa-calendar-days", resizable: true },
    position: { width: 600, height: "auto" }
  };

  constructor(actor, options = {}) {
    super({ id: `neuro-kalendarzyk-${actor.uuid.replaceAll(".", "-")}`, ...options });
    this.actor = actor;
  }

  get title() {
    return `Kalendarzyk zdrowia — ${this.actor.name}`;
  }

  async _renderHTML() {
    const div = document.createElement("div");
    div.className = "neuro-kal";
    div.innerHTML = _kalendarzykHTML(this.actor);
    return div;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  _onClose(options) {
    super._onClose?.(options);
    _kalendarzyki.delete(this.actor.uuid);
  }
}

/**
 * Otwiera kalendarzyk (D9: tylko do odczytu, dla właściciela i MG).
 * @param {Actor} actor
 */
export function otworzKalendarzyk(actor) {
  if (!actor?.isOwner) return ui.notifications.warn("Kalendarzyk zdrowia widzi właściciel postaci i MG.");
  let app = _kalendarzyki.get(actor.uuid);
  if (!app) {
    app = new KalendarzykZdrowia(actor);
    _kalendarzyki.set(actor.uuid, app);
  }
  return app.render({ force: true });
}

/* -------------------------------------------- */
/*  Rejestracja                                 */
/* -------------------------------------------- */

export function registerRekonwalescencja() {
  _rejestrujSekcje();
  Hooks.on("dnd5e.restCompleted", _onRestCompleted);
  Hooks.on("renderChatMessageHTML", _onRenderMessage);
  Hooks.on("updateActor", _onUpdateActor);
  Hooks.on("neuroshima.rerolled", _onRerolled);
  // Odnośnik „kalendarzyk” żyje na kartach czatu i w oknie DO — jeden delegowany odbiornik.
  document.addEventListener("click", ev => {
    const a = ev.target.closest?.(".neuro-kalendarzyk-open");
    if (!a) return;
    ev.preventDefault();
    const actor = fromUuidSync(a.dataset.actorUuid);
    if (actor) otworzKalendarzyk(actor);
  });
  // Prośby o ładunek złożone, gdy żaden MG nie był zalogowany.
  Hooks.once("ready", async () => {
    if (!game.users.activeGM?.isSelf) return;
    for (const actor of game.actors) {
      const p = actor.getFlag(MODULE_ID, PROSBA);
      if (p?.ladunek) await _wykonajProsbe(actor, p);
    }
  });
  console.log("Neuroshima 5e | Rekonwalescencja (Regeneracja, Pomoc medyczna, kalendarzyk) registered");
}

export const rekonwalescencjaApi = Object.freeze({
  stan: stanRekonwalescencji, ocenaMedyka, dzien: dzienRekonwalescencji, rzutRegeneracji, testSamoleczenia,
  kalendarzyk: otworzKalendarzyk, dane: daneKalendarzyka
});
