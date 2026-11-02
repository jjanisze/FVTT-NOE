/**
 * Neuroshima 5e — Krwawienia (docs/Krwawienia.md; ustalenia MG 2026-10-31 i 2026-11-01).
 *
 * Każde krwawienie to **osobny Efekt Aktywny** ze swoim stanem i ikoną (`config/krwawienia-data.mjs` — `KRWAWIENIA`,
 * stany w `config/conditions.mjs`): Hemofilia, Podstępny atak, w WKK Dum-dum, Przycelowanie — Tętnica, Kolory
 * Rdza/Rtęć/Stal, piła Juggernauta, a u maszyn Wyciek. Ten sam się nie powtarza, różne mogą być naraz — każde tyka
 * osobno i zatrzymuje się osobno (jedna akcja leczenia — jedno krwawienie).
 *
 *   - **Tyknięcie** (`updateCombat`, MG): na początku albo na końcu tury krwawiącego, raz na krawędź (`tikRaz`). Obrażenia
 *     bez rodzaju (liczba do `applyDamage` — bez odporności, nie uruchamiają Hemofilii); przy 0 PW to porażka w Rzucie
 *     Przeciw Śmierci (`combat/umieranie.mjs`), nigdy podwójna „z ataku wręcz”. Hemofilia: najpierw RO na Kondycję ST 10,
 *     trzy zdane z rzędu kończą krwawienie.
 *   - **Zatrzymanie** — przyciski na kartach krwawienia, liczone dla medyka (postać gracza albo zaznaczony żeton):
 *     `opatrz` (test i ST z `stop`; narzędzia małego medyka — ładunek za każdą próbę, pusta torba tylko z Dnem torby
 *     i z Utrudnieniem; Kolory i Wyciek — nie sam sobie), `podajLek` (lek na Hemofilię — przy Hemofilii zawsze, przy
 *     innych w WKK, zasada 43), „Naprawione” przy Wycieku (MG albo właściciel). Usunięcie efektu na cudzym aktorze idzie
 *     przez przekaźnik MG.
 *   - **Wyzwalacze:** Hemofilia — obrażenia cięte lub kłute chorego (`dnd5e.calculateDamage`); Kolory — każdy Stopień
 *     Zranienia (`neuroshima.stopienZranienia` z `applyZranienie`), gdy świat gra Rdzą, Rtęcią albo Stalą; piła — przycisk
 *     pod trafieniem ataku z `flags.<mod>.bestiary.onHit.krwawienie`; reszta — wołający `startBleeding`
 *     (`combat/zdolnosci-trafienie.mjs`, `combat/przycelowanie.mjs`, Rozrywająca dum-dum).
 *   - **Poza walką** (`updateWorldTime`, MG): przypomnienie „X krwawi” co 10 minut zegara świata — krótsze przesunięcia
 *     się sumują, licznik zeruje tyknięcie w walce; z modułem Splatter — plama krwi pod żetonem. Obrażenia nakłada MG.
 *
 * Stan na efekcie: `flags.<mod>.krwawienie = { rodzaj, seria, ostatnio, od }` (`seria` — zdane RO Hemofilii z rzędu,
 * `ostatnio` — czas świata ostatniego tyknięcia albo przypomnienia). Efekt założony ręcznie z HUD-u działa tak samo —
 * brak flagi to wartości domyślne.
 */

import { effectsFor } from "../config/disease-effects.mjs";
import { chemiaForDisease, chemiaKeyByName } from "../config/chemia-data.mjs";
import { isKobaltEnabled, kolorNeuroshimy } from "../config/settings.mjs";
import { creatureKindOf, isHitVerdict } from "../config/defense-rules.mjs";
import { rollTypeOf } from "../config/chat-message-data.mjs";
import {
  KRWAWIENIA, lekDziala, celPasuje, przypomnienie, KOLORY_Z_KRWAWIENIEM
} from "../config/krwawienia-data.mjs";
import { dosesRemaining, getChoroby, takeDose, zuzyjDawke } from "../actors/health-panel.mjs";
import { hasToolKit } from "../actors/tool-availability.mjs";
import { maDnoTorby, zapasyMedyka, zuzyjLadunekMedyka } from "../items/toolkit-medyk.mjs";
import { seqScrollText } from "../weapons/sequencer.mjs";
import { doMG, zarejestrujProsbe } from "../postoj/przekaznik.mjs";
import { obronaOf, verdictOfEntry } from "./trafienie.mjs";
import { krokNaprzod, tikRaz } from "./tiki.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Flaga efektu krwawienia: `{ rodzaj, seria, ostatnio, od }`. */
export const FLAG = "krwawienie";
/** Flaga karty z przyciskami krwawienia. */
const KARTA = "bleed";
/** Flaga karty ataku: krwawienie z `onHit` już nałożone (`{ [tokenUuid]: true }` — lista, bo UUID ma kropki). */
const ONHIT_UZYTE = "krwawienieOnHit";
const PROSBA_START = "krwawienie.start";
const PROSBA_STOP = "krwawienie.zatamuj";
const KOLOR = "#c0392b";
/** Stara, jedna flaga krwawienia na aktorze (sprzed 2026-11-01) — tylko do migracji. */
const STARA_FLAGA = "krwawienie";

/** Progi RAW Hemofilii (s. 109) — publiczna stała z czasów jednego profilu. */
export const BLEED = Object.freeze({ saveAbility: "con", saveDC: 10, damage: "1d4", medicineDC: 15, streakToStop: 3 });

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const _onHitUzyte = new Set();

/* -------------------------------------------- */
/*  Stan                                         */
/* -------------------------------------------- */

/** Maszyna albo pojazd — krwawić nie może, Wyciek tak. */
function _maszyna(actor) {
  return actor?.type === "vehicle" || creatureKindOf(actor?.system?.details?.type?.value) === "maszyna";
}

function _efekt(actor, rodzaj) {
  const def = KRWAWIENIA[rodzaj];
  return def ? actor?.effects?.find(e => e.statuses?.has(def.status)) ?? null : null;
}

const _stan = effect => effect?.getFlag(MODULE_ID, FLAG) ?? {};

/** Krwawienia aktora w kolejności `KRWAWIENIA`: `[{ def, effect }]`. */
export function krwawienia(actor) {
  return Object.values(KRWAWIENIA).map(def => ({ def, effect: _efekt(actor, def.id) })).filter(k => k.effect);
}

export const maKrwawienie = (actor, rodzaj) => !!_efekt(actor, rodzaj);

/** Czy aktor krwawi (dowolne krwawienie; Wyciek maszyny się nie liczy). */
export function isBleeding(actor) {
  return krwawienia(actor).some(k => !k.def.naprawa);
}

/** Wpis Hemofilii aktora, jeśli ją ma. */
function _hemofiliaEntry(actor) {
  return getChoroby(actor).find(e => effectsFor(e)?.bleed) ?? null;
}

/* -------------------------------------------- */
/*  Początek i koniec                            */
/* -------------------------------------------- */

/**
 * Zacznij krwawienie. Ten sam rodzaj drugi raz — nic (się nie powtarza); maszyna nie krwawi, a Wyciek dotyczy tylko
 * maszyn. Cudzy aktor — przez MG.
 * @param {Actor} actor
 * @param {{rodzaj?: string, profile?: string, reason?: string}} [o]  `profile` — dawna nazwa `rodzaj`
 * @returns {Promise<ActiveEffect|null>}
 */
export async function startBleeding(actor, { rodzaj, profile, reason = "" } = {}) {
  const def = KRWAWIENIA[rodzaj ?? profile ?? "hemofilia"];
  if (!actor || !def || !celPasuje(def, { maszyna: _maszyna(actor) }) || _efekt(actor, def.id)) return null;
  if (!actor.isOwner) {
    await doMG(PROSBA_START, { actorUuid: actor.uuid, rodzaj: def.id, reason });
    return null;
  }
  const fx = (await ActiveEffect.implementation.fromStatusEffect(def.status)).toObject();
  delete fx._id;
  const teraz = game.time.worldTime;
  foundry.utils.setProperty(fx, `flags.${MODULE_ID}.${FLAG}`, { rodzaj: def.id, seria: 0, ostatnio: teraz, od: teraz });
  if (reason) fx.description = `${fx.description ?? ""}<p>Źródło: ${esc(reason)}.</p>`;
  const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [fx]);
  seqScrollText(def.naprawa ? "WYCIEK!" : "KRWAWIENIE!", actor, { color: KOLOR, fontSize: 32, duration: 2000 });
  await _karta(actor, def, {
    glowa: def.label.toUpperCase(),
    tresc: `${esc(actor.name)} ${def.naprawa ? "traci płyn" : "zaczyna krwawić"}${reason ? ` (${esc(reason)})` : ""}. ${_regula(def)}`
  });
  return effect ?? null;
}

/**
 * Zatrzymaj krwawienie `rodzaj` (bez rodzaju — wszystkie, np. przy śmierci). Cudzy aktor — przez MG.
 * @returns {Promise<boolean>} czy było co zatrzymać
 */
export async function stopBleeding(actor, rodzaj = null, how = "") {
  const lista = krwawienia(actor).filter(k => !rodzaj || k.def.id === rodzaj);
  if (!lista.length) return false;
  if (!actor.isOwner) {
    await doMG(PROSBA_STOP, { actorUuid: actor.uuid, rodzaj, how });
    return true;
  }
  await actor.deleteEmbeddedDocuments("ActiveEffect", lista.map(k => k.effect.id));
  for (const { def } of lista) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="neuro-bleed-card is-stopped">
        <div class="neuro-bleed-head"><i class="fa-solid fa-droplet-slash"></i> ${def.naprawa ? "WYCIEK USUNIĘTY" : "KRWAWIENIE ZATAMOWANE"}</div>
        <div class="neuro-bleed-body">${esc(actor.name)} — ${esc(def.label)}${how ? `: ${esc(how)}` : ""}.</div>
      </div>`
    });
  }
  return true;
}

/** Przypomnienie zasady na każdej karcie krwawienia. */
function _regula(def) {
  const kiedy = def.when === "start" ? "Na początku" : "Na końcu";
  const ile = def.strata === "pw" ? `utrata <strong>${def.damage.replace(/d/g, "k")}</strong> PW` : `<strong>${def.damage.replace(/d/g, "k")}</strong> obrażeń`;
  if (def.save) {
    const cecha = CONFIG.DND5E.abilities?.[def.save.ability]?.label ?? def.save.ability;
    return `${kiedy} każdej swojej tury: RO na ${cecha} ST ${def.save.dc}, porażka — ${ile}. `
      + `${def.save.streakToStop} zdane RO z rzędu kończą krwawienie.`;
  }
  return `${kiedy} każdej swojej tury: ${ile}, ${def.naprawa ? "aż do naprawy" : "aż ktoś zatamuje krwawienie"}.`;
}

/* -------------------------------------------- */
/*  Tyknięcie                                    */
/* -------------------------------------------- */

/**
 * Hak `updateCombat` (MG): jedna granica tury to koniec poprzedniej i początek bieżącej — każde krwawienie tyka na
 * swojej krawędzi, raz (`tikRaz` z kluczem rodzaju, więc różne krwawienia nie zjadają sobie tyknięć).
 */
async function _onUpdateCombat(combat, changed) {
  if (!game.user.isGM) return;
  if (!("turn" in changed) && !("round" in changed)) return;
  if (!krokNaprzod(combat.previous, combat.current)) return;

  const previousId = combat.previous?.combatantId;
  const ended = previousId ? combat.combatants.get(previousId)?.actor ?? null : null;
  const started = combat.combatant?.actor ?? null;
  for (const { def } of krwawienia(ended).filter(k => k.def.when === "end")) {
    if (await tikRaz(ended, `krwawienie-${def.id}`, combat, { round: combat.previous.round, combatantId: previousId, krawedz: "end" })) {
      await tickBleed(ended, def.id);
    }
  }
  for (const { def } of krwawienia(started).filter(k => k.def.when === "start")) {
    if (await tikRaz(started, `krwawienie-${def.id}`, combat, { round: combat.current.round, combatantId: combat.current.combatantId, krawedz: "start" })) {
      await tickBleed(started, def.id);
    }
  }
}

/**
 * Jedno tyknięcie krwawienia `rodzaj`. Martwy nie krwawi — jego krwawienia znikają bez karty.
 * @returns {Promise<{obrazenia?: number, seria?: number, koniec?: boolean}|null>}
 */
export async function tickBleed(actor, rodzaj = "hemofilia") {
  const def = KRWAWIENIA[rodzaj];
  const effect = _efekt(actor, rodzaj);
  if (!def || !effect) return null;
  if (actor.statuses?.has("dead")) {
    await actor.deleteEmbeddedDocuments("ActiveEffect", krwawienia(actor).map(k => k.effect.id));
    return null;
  }
  const stan = _stan(effect);
  const teraz = game.time.worldTime;

  if (def.save) {
    const rolls = await actor.rollSavingThrow({ ability: def.save.ability, target: def.save.dc }, { configure: false });
    const roll = Array.isArray(rolls) ? rolls[0] : rolls;
    if (!roll) return null;
    if (roll.total >= def.save.dc) {
      const seria = (Number(stan.seria) || 0) + 1;
      if (seria >= def.save.streakToStop) {
        await stopBleeding(actor, rodzaj, `${def.save.streakToStop} zdane RO z rzędu`);
        return { seria, koniec: true };
      }
      await effect.update({ [`flags.${MODULE_ID}.${FLAG}`]: { ...stan, rodzaj, seria, ostatnio: teraz } });
      await _karta(actor, def, { glowa: `${def.label} — RO zdane`, tresc: `Seria: ${seria}/${def.save.streakToStop}. Krwawienie trwa.` });
      return { seria };
    }
  }

  const dmg = await new Roll(def.damage).evaluate();
  // Liczba — obrażenia bez rodzaju (dnd5e: bez odporności); nie z ataku wręcz, więc przy 0 PW jedna porażka.
  await actor.applyDamage(dmg.total, { neuroshimaWrecz: false });
  await _efekt(actor, rodzaj)?.update({ [`flags.${MODULE_ID}.${FLAG}`]: { ...stan, rodzaj, seria: 0, ostatnio: teraz } });
  await _karta(actor, def, {
    glowa: def.save ? `${def.label} — RO oblane` : def.label,
    tresc: `${esc(actor.name)} traci <strong>${dmg.total}</strong> PW.${def.save ? " Seria przerwana." : ""}`,
    rolls: [dmg]
  });
  return { obrazenia: dmg.total };
}

/** Dawna nazwa tyknięcia Hemofilii — może siedzieć w makrze (`game.neuroshima.health.bleeding.rollBleedSave`). */
export const rollBleedSave = actor => tickBleed(actor, "hemofilia");

/* -------------------------------------------- */
/*  Zatrzymanie                                  */
/* -------------------------------------------- */

const TEST_ETYKIETA = {
  narzedzia: (s) => `Opatrz — narzędzia małego medyka, ST ${s.dc}`,
  medycyna: (s) => `Medycyna ST ${s.dc} (narzędzia małego medyka)`,
  pomaganie: (s) => `Pomaganie — Medycyna ST ${s.dc}`,
  mechanik: (s) => `Napraw — narzędzia małego mechanika, ST ${s.dc}`
};
const TEST_IKONA = { narzedzia: "fa-kit-medical", medycyna: "fa-kit-medical", pomaganie: "fa-hands-holding", mechanik: "fa-wrench" };

function _przyciski(actor, def) {
  const btn = (akcja, ikona, tekst) => `<button type="button" class="neuro-bleed-btn" data-action="${akcja}" `
    + `data-rodzaj="${def.id}" data-actor-uuid="${actor.uuid}"><i class="fa-solid ${ikona}"></i> ${tekst}</button>`;
  const out = [btn("test", TEST_IKONA[def.stop.test], TEST_ETYKIETA[def.stop.test](def.stop))];
  if (lekDziala(def, { kobalt: isKobaltEnabled() })) out.push(btn("lek", "fa-syringe", "Wstrzyknij lek"));
  if (def.naprawa) out.push(btn("naprawa", "fa-screwdriver-wrench", "Naprawione (MG)"));
  return `<div class="neuro-bleed-actions">${out.join("")}</div>`;
}

async function _karta(actor, def, { glowa, tresc, rolls = [] }) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls,
    content: `<div class="neuro-bleed-card is-bleeding">
      <div class="neuro-bleed-head"><i class="fa-solid fa-droplet"></i> ${esc(glowa)}</div>
      <div class="neuro-bleed-body">${tresc}</div>
      ${_przyciski(actor, def)}
    </div>`,
    flags: { [MODULE_ID]: { [KARTA]: true } }
  });
}

/** Medyk z punktu widzenia klikającego: jego postać albo zaznaczony żeton; MG bez zaznaczenia — sam krwawiący. */
function _medyk(actor) {
  return canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? (game.user.isGM ? actor : null);
}

const _ten = (a, b) => !!a && !!b && a.uuid === b.uuid;

async function _rzut(medic, stop, { utrudnienie = false, dialog = {}, event = null } = {}) {
  // `event` — Shift i reszta skrótów dnd5e z kliknięcia przycisku (szybki rzut bez okna).
  const cfg = { target: stop.dc, ...(utrudnienie ? { disadvantage: true } : {}), ...(event ? { event } : {}) };
  let rolls;
  if (stop.test === "narzedzia") rolls = await medic.rollToolCheck({ tool: "medyka", ability: "int", ...cfg }, dialog);
  else if (stop.test === "mechanik") {
    const a = medic.system?.abilities ?? {};
    const ability = (Number(a.int?.mod) || 0) > (Number(a.dex?.mod) || 0) ? "int" : "dex";
    rolls = await medic.rollToolCheck({ tool: "mechanika", ability, ...cfg }, dialog);
  } else rolls = await medic.rollSkill({ skill: "med", ability: "int", ...cfg }, dialog);
  return Array.isArray(rolls) ? rolls[0] : rolls;
}

/**
 * Test zatrzymania krwawienia `rodzaj` przez `medic` (test i ST z `stop`). Narzędzia małego medyka — ładunek za każdą
 * próbę; pusta torba tylko z Dnem torby (Aspiryna i Miętusy), wtedy z Utrudnieniem i bez ładunku.
 * @param {Actor} actor  krwawiący
 * @param {string} rodzaj
 * @param {Actor} [medic]
 * @param {{dialog?: object, event?: Event}} [o]  do `rollSkill` / `rollToolCheck` (testy bez okna; kliknięcie z Shiftem)
 * @returns {Promise<boolean|null>} czy zatrzymane; `null` — bez rzutu
 */
export async function opatrz(actor, rodzaj, medic = actor, { dialog = {}, event = null } = {}) {
  const def = KRWAWIENIA[rodzaj];
  if (!def || !_efekt(actor, rodzaj)) return null;
  const s = def.stop;
  const warn = m => { ui.notifications.warn(m); return null; };
  if (!medic?.isOwner) return warn("Zaznacz żeton postaci, która udziela pomocy.");
  if (!s.sam && _ten(medic, actor)) {
    return warn(def.naprawa ? "Maszyna nie naprawi się sama." : `${def.label}: zatamować może tylko ktoś inny (akcja Pomaganie).`);
  }
  let zapas = null;
  let utrudnienie = false;
  if (s.test === "narzedzia" || s.test === "medycyna") {
    if (!hasToolKit(medic, "medyka")) return warn(`${medic.name} nie ma narzędzi małego medyka.`);
    zapas = zapasyMedyka(medic).find(z => z.remaining >= 1 && z.item.isOwner) ?? null;
    if (!zapas) {
      if (!maDnoTorby(medic)) return warn(`${medic.name} ma pustą torbę małego medyka — opatrzenie zużywa ładunek.`);
      utrudnienie = true;
    }
  }
  if (s.test === "mechanik" && !hasToolKit(medic, "mechanika")) return warn(`${medic.name} nie ma narzędzi małego mechanika.`);

  const roll = await _rzut(medic, s, { utrudnienie, dialog, event });
  if (!roll) return null;
  const zostalo = zapas ? await zuzyjLadunekMedyka(zapas.item) : null;
  const ladunek = zapas ? ` — ładunek narzędzi: zostało ${zostalo}/${zapas.max}` : utrudnienie ? " — pusta torba, Dno torby" : "";
  if (roll.total >= s.dc) {
    await stopBleeding(actor, rodzaj, `${def.naprawa ? "naprawa" : "opatrzenie"}: ${medic.name}${ladunek}`);
    return true;
  }
  ui.notifications.info(`${TEST_ETYKIETA[s.test](s)}: ${roll.total} — nieudany, ${def.label} trwa${ladunek}.`);
  return false;
}

/** Lek na Hemofilię (Desmopresyna, preparaty krwiopochodne) z dawką, którego ten klient może użyć. */
function _lekNaHemofilie(actor) {
  const klucze = chemiaForDisease("hemofilia");
  return actor?.items?.find(i => i.type === "consumable" && i.isOwner
    && klucze.includes(i.getFlag(MODULE_ID, "chemiaKey") ?? chemiaKeyByName(i.name)) && dosesRemaining(i) >= 1) ?? null; // cała dawka — napoczęta połówka (Pan Plaster) nie wystarczy
}

/**
 * „Wstrzyknij lek”: jedna dawka zatrzymuje jedno krwawienie `rodzaj` — Hemofilię zawsze, inne tylko w WKK (zasada 43).
 * Chory na Hemofilię bierze dawkę ze swojego wpisu choroby; inaczej — lek krwawiącego, potem medyka.
 * @returns {Promise<boolean>}
 */
export async function podajLek(actor, rodzaj, medic = actor) {
  const def = KRWAWIENIA[rodzaj];
  if (!def || !_efekt(actor, rodzaj) || !lekDziala(def, { kobalt: isKobaltEnabled() })) return false;
  const entry = actor.isOwner ? _hemofiliaEntry(actor) : null;
  if (entry && rodzaj === "hemofilia") {
    await takeDose(actor, entry.id);
    await stopBleeding(actor, rodzaj, "wstrzyknięty lek");
    return true;
  }
  const lek = _lekNaHemofilie(actor) ?? (_ten(medic, actor) ? null : _lekNaHemofilie(medic));
  if (!lek) {
    ui.notifications.warn(`Brak leku na Hemofilię (Desmopresyna, preparaty krwiopochodne) u ${actor.name}`
      + `${medic && !_ten(medic, actor) ? ` ani u ${medic.name}` : ""}.`);
    return false;
  }
  if (!await zuzyjDawke(lek)) return false;
  await stopBleeding(actor, rodzaj, `wstrzyknięty lek (${lek.name}${lek.actor === actor ? "" : `, ${lek.actor?.name}`})`);
  return true;
}

function _bindBleedButtons(message, html) {
  if (!message.getFlag(MODULE_ID, KARTA)) return;
  const el = html instanceof HTMLElement ? html : html?.[0];
  for (const btn of el?.querySelectorAll(".neuro-bleed-btn") ?? []) {
    if (btn.dataset.bound) continue;
    btn.dataset.bound = "1";
    btn.addEventListener("click", _onClickBleedStop);
  }
}

async function _onClickBleedStop(event) {
  event.preventDefault();
  event.stopPropagation();
  const { action, rodzaj, actorUuid } = event.currentTarget.dataset;
  const actor = actorUuid ? fromUuidSync(actorUuid) : null;
  const def = KRWAWIENIA[rodzaj];
  if (!actor || !def) return;
  if (!_efekt(actor, rodzaj)) return ui.notifications.info(`${actor.name}: ${def.label} już nie trwa.`);
  if (action === "test") await opatrz(actor, rodzaj, _medyk(actor), { event });
  else if (action === "lek") await podajLek(actor, rodzaj, _medyk(actor));
  else if (action === "naprawa" && def.naprawa && (game.user.isGM || actor.isOwner)) {
    await stopBleeding(actor, rodzaj, "naprawione (MG)");
  }
}

/* -------------------------------------------- */
/*  Wyzwalacze                                   */
/* -------------------------------------------- */

const BLEEDING_DAMAGE = new Set(["slashing", "piercing"]);

/**
 * Hak `dnd5e.calculateDamage` — chory na Hemofilię, który dostaje obrażenia cięte lub kłute, zaczyna krwawić. Czyta
 * rozbicie na rodzaje, więc broń mieszana się liczy, a obuchowa i tyknięcia krwawień (bez rodzaju) — nie.
 */
function _onCalculateDamage(actor, damages) {
  if (actor?.type !== "character" || !_hemofiliaEntry(actor) || maKrwawienie(actor, "hemofilia")) return;
  const cut = (damages ?? []).find(d => BLEEDING_DAMAGE.has(d.type) && (d.value ?? 0) > 0);
  if (!cut) return;
  const label = CONFIG.DND5E.damageTypes?.[cut.type]?.label ?? cut.type;
  // Odroczone: hak biegnie w środku liczenia obrażeń, a start pisze efekt i kartę.
  setTimeout(() => startBleeding(actor, { rodzaj: "hemofilia", reason: `obrażenia ${label.toLowerCase()}` }), 0);
}

/** Hak `neuroshima.stopienZranienia` — Kolory Rdza, Rtęć, Stal: każdy otrzymany Stopień Zranienia to krwawienie. */
function _onStopienZranienia(actor, { przed = 0, po = 0 } = {}) {
  if (!(po > przed) || !KOLORY_Z_KRWAWIENIEM.includes(kolorNeuroshimy())) return;
  void startBleeding(actor, { rodzaj: "kolory", reason: `Stopień Zranienia ${po}` });
}

/** Krwawienie z `onHit` broni (piła Juggernauta): `rodzaj` z flagi Bestiariusza albo `null`. */
function _krwawienieZBroni(item) {
  const r = item?.flags?.[MODULE_ID]?.bestiary?.onHit?.krwawienie ?? null;
  return KRWAWIENIA[r] ? r : null;
}

/** Przycisk pod kartą ataku, który trafił: „Krwawienie (…) → cel” — RAW bez RO, ale werdykt może jeszcze zmienić reakcja. */
function _onRenderAttackCard(message, html) {
  if (rollTypeOf(message) !== "attack" || html.querySelector(".neuro-bleed-onhit")) return;
  const rodzaj = _krwawienieZBroni(message.getAssociatedItem?.());
  const obrona = obronaOf(message);
  const actor = message.getAssociatedActor?.();
  if (!rodzaj || !obrona?.targets?.length || !actor?.isOwner) return;
  const def = KRWAWIENIA[rodzaj];
  const trafione = obrona.targets.filter(t => isHitVerdict(verdictOfEntry(obrona, t).verdict));
  if (!trafione.length) return;
  const uzyte = message.getFlag(MODULE_ID, ONHIT_UZYTE) ?? [];
  const div = document.createElement("div");
  div.className = "neuro-bleed-onhit neuro-bleed-actions";
  for (const t of trafione) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "neuro-bleed-btn";
    b.dataset.neuroBleedOnhit = t.tokenUuid ?? t.actorUuid;
    b.innerHTML = `<i class="fa-solid fa-droplet"></i> ${esc(def.label)} → ${esc(t.name)}`;
    b.disabled = uzyte.includes(b.dataset.neuroBleedOnhit) || _onHitUzyte.has(`${message.id}:${b.dataset.neuroBleedOnhit}`);
    b.addEventListener("click", ev => _onClickOnHit(ev, message, rodzaj));
    div.appendChild(b);
  }
  (html.querySelector(".message-content") ?? html).appendChild(div);
}

async function _onClickOnHit(event, message, rodzaj) {
  event.preventDefault();
  event.stopPropagation();
  const btn = event.currentTarget;
  const uuid = btn.dataset.neuroBleedOnhit;
  const doc = uuid ? fromUuidSync(uuid) : null;
  const cel = doc?.actor ?? doc;
  if (!cel || btn.disabled) return;
  btn.disabled = true;
  _onHitUzyte.add(`${message.id}:${uuid}`);
  await startBleeding(cel, { rodzaj, reason: message.getAssociatedItem?.()?.name ?? "" });
  if (message.isOwner) await message.setFlag(MODULE_ID, ONHIT_UZYTE, [...(message.getFlag(MODULE_ID, ONHIT_UZYTE) ?? []), uuid]);
}

/* -------------------------------------------- */
/*  Poza walką                                   */
/* -------------------------------------------- */

/** Aktorzy z krwawieniem: świata i niepowiązanych żetonów na scenach. */
function _krwawiacy() {
  const out = new Map();
  const dodaj = a => { if (a && !out.has(a.uuid) && krwawienia(a).length) out.set(a.uuid, a); };
  for (const a of game.actors ?? []) dodaj(a);
  for (const s of game.scenes ?? []) for (const t of s.tokens ?? []) if (!t.actorLink) dodaj(t.actor);
  return [...out.values()];
}

const _wWalce = actor => (game.combats ?? []).some(c => c.started && c.combatants.some(cb => cb.actor?.uuid === actor.uuid));

/**
 * Hak `updateWorldTime` (aktywny MG): co 10 minut zegara świata przypomnienie „X krwawi” — szept do MG, plama krwi pod
 * żetonem (Splatter). Walczący tykają w turach, więc ich to nie dotyczy.
 * @returns {Promise<{actor: string, rodzaj: string, minut: number}[]>} przypomnienia (testy)
 */
export async function przypomnijPozaWalka(worldTime = game.time.worldTime) {
  if (!game.users.activeGM?.isSelf) return [];
  const linie = [];
  for (const actor of _krwawiacy()) {
    if (_wWalce(actor)) continue;
    let zaplamiony = false;
    for (const { def, effect } of krwawienia(actor)) {
      const stan = _stan(effect);
      const przed = Number.isFinite(stan.ostatnio) ? stan.ostatnio : stan.od;
      const p = przypomnienie(przed, worldTime);
      if (p.ostatnio !== stan.ostatnio) await effect.update({ [`flags.${MODULE_ID}.${FLAG}`]: { ...stan, rodzaj: def.id, ostatnio: p.ostatnio } });
      if (!p.nalezne) continue;
      linie.push({ actor: actor.name, rodzaj: def.id, label: def.label, minut: Math.floor((worldTime - przed) / 60) });
      if (!def.naprawa && !zaplamiony) {
        const token = actor.token?.object ?? actor.getActiveTokens?.()[0];
        if (token && CONFIG.Splatter?.splat) { try { CONFIG.Splatter.splat(token); } catch { /* bez Splattera */ } }
        zaplamiony = true;
      }
    }
  }
  if (linie.length) {
    await ChatMessage.create({
      whisper: ChatMessage.getWhisperRecipients("GM"),
      content: `<div class="neuro-bleed-card is-bleeding">
        <div class="neuro-bleed-head"><i class="fa-solid fa-droplet"></i> Krwawienia poza walką</div>
        <div class="neuro-bleed-body">${linie.map(l => `<strong>${esc(l.actor)}</strong> — ${esc(l.label)}, ${l.minut} min bez zatamowania`).join("<br>")}
          <br><em>Przypomnienie co 10 minut zegara świata; ile to kosztuje — decyzja MG.</em></div>
      </div>`
    });
  }
  return linie.map(({ actor, rodzaj, minut }) => ({ actor, rodzaj, minut }));
}

/* -------------------------------------------- */
/*  Migracja                                     */
/* -------------------------------------------- */

/**
 * Jedna flaga i wspólny stan `bleeding` (do 2026-10-31) → efekt rodzaju z dawnego profilu (`hydraulika` → Wyciek,
 * brak profilu → Hemofilia). Raz, u aktywnego MG przy starcie.
 */
export async function migrujStareKrwawienia() {
  if (!game.users.activeGM?.isSelf) return 0;
  let n = 0;
  const aktorzy = new Map();
  for (const a of game.actors ?? []) aktorzy.set(a.uuid, a);
  for (const s of game.scenes ?? []) for (const t of s.tokens ?? []) if (!t.actorLink && t.actor) aktorzy.set(t.actor.uuid, t.actor);
  for (const actor of aktorzy.values()) {
    const stara = actor.flags?.[MODULE_ID]?.[STARA_FLAGA];
    const ids = actor.effects.filter(e => e.statuses?.has("bleeding")).map(e => e.id);
    if (!stara && !ids.length) continue;
    try {
      if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
      if (stara) await actor.unsetFlag(MODULE_ID, STARA_FLAGA);
      if (stara?.active) {
        const rodzaj = stara.profile === "hydraulika" ? "wyciek" : (KRWAWIENIA[stara.profile] ? stara.profile : "hemofilia");
        await startBleeding(actor, { rodzaj, reason: "przeniesione ze starego zapisu krwawienia" });
      }
      n++;
    } catch (err) {
      console.error(`${MODULE_ID} | migracja krwawienia ${actor.name}`, err);
    }
  }
  if (n) console.log(`${MODULE_ID} | Krwawienia: przeniesiono ${n} aktorów na osobne efekty`);
  return n;
}

/* -------------------------------------------- */

export function registerBleeding() {
  // `dnd5e.preApplyDamage` dostaje już tylko sumę — rodzaje obrażeń widzi jeszcze `calculateDamage`.
  Hooks.on("dnd5e.calculateDamage", _onCalculateDamage);
  Hooks.on("updateCombat", _onUpdateCombat);
  Hooks.on("renderChatMessageHTML", _bindBleedButtons);
  Hooks.on("dnd5e.renderChatMessage", _onRenderAttackCard);
  Hooks.on("neuroshima.stopienZranienia", _onStopienZranienia);
  Hooks.on("updateWorldTime", (worldTime) => { void przypomnijPozaWalka(worldTime); });
  Hooks.once("ready", () => { void migrujStareKrwawienia(); });
  zarejestrujProsbe(PROSBA_START, async (_nosiciel, d) => {
    const a = await fromUuid(d.actorUuid);
    return a ? startBleeding(a, { rodzaj: d.rodzaj, reason: d.reason }) : null;
  });
  zarejestrujProsbe(PROSBA_STOP, async (_nosiciel, d) => {
    const a = await fromUuid(d.actorUuid);
    return a ? stopBleeding(a, d.rodzaj ?? null, d.how ?? "") : null;
  });
  console.log(`${MODULE_ID} | Krwawienia (osobne efekty) registered`);
}

export const bleedingApi = Object.freeze({
  KRWAWIENIA, krwawienia, maKrwawienie, isBleeding, startBleeding, stopBleeding, tickBleed, rollBleedSave,
  opatrz, podajLek, przypomnijPozaWalka, migrujStareKrwawienia
});

/** Powierzchnia dla testów Quench. */
export const __testing = Object.freeze({ _maszyna, _efekt, _onStopienZranienia, _krwawienieZBroni });
