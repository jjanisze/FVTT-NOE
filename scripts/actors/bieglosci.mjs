/**
 * Neuroshima 5e — biegłości z awansów: ostrzeżenie D1 i audyt (PLAN_m6_drobne_zasady.md §5.1).
 *
 * Profesje, klasy i Sztuczka Muzyk nadają biegłości natywnymi awansami `Trait` dnd5e (`dev/packs/build-packs.mjs`,
 * dane: `PROFESSIONS[pid].bieglosci`). Tu dwie rzeczy, których dnd5e nie robi:
 *
 *   - **Ostrzeżenie (D1).** Stałe nadanie w trybie `upgrade` podnosi o stopień: biegłość → Specjalizacja. Gdy już jest
 *     Specjalizacja, dnd5e nic nie zapisuje i nic nie mówi; tak samo nadanie broni czy pancerza, które postać już ma,
 *     i wybór, z którego nie zostało nic do wybrania. MG: „nic nie przepada po cichu” — po zakończeniu awansu gracz i
 *     MG dostają szept z listą, plus sygnał naruszenia (D11). Bez blokady.
 *   - **Audyt (D4).** `game.neuroshima.bieglosci.audyt(actor)` — czego postaci brakuje względem awansów z kompendium
 *     (klasa, druga klasa, profesja, Sztuczki). Wyborów nie da się odtworzyć („nie wiadomo, co wybrał”), więc audyt
 *     mówi tylko, czy liczba się zgadza. Kopie przedmiotów sprzed M6 nie mają nowych awansów — audyt to zaznacza; nic
 *     nie poprawia sam (to robi hand-off `HANDOFF_bieglosci_retro.md`).
 *
 * Źródło awansu rozpoznajemy po fladze `flags.<mod>.bieglosci` (`profesja` / `sztuczka`), którą stawia builder.
 */

import { sygnalNaruszenia } from "../combat/sygnal-naruszenia.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/* -------------------------------------------- */
/*  Czyste                                       */
/* -------------------------------------------- */

/**
 * Co jeden awans `Trait` nadał mniej, niż obiecał. Stałe nadanie, którego nie ma w `chosen`, dnd5e pominęło, bo
 * postać miała już najwyższy stopień (`TraitAdvancement#actorSelected`); wybory liczymy ilością.
 * @param {{grants: Iterable<string>, choices: Array<{count: number}>, mode: string, chosen: Iterable<string>}} trait
 * @returns {Array<{rodzaj: "maSpecjalizacje"|"maBieglosc"|"brakWyboru", klucz?: string, ile?: number}>}
 */
export function wnioskiZTraitu({ grants = [], choices = [], mode = "default", chosen = [] }) {
  const nadania = new Set(grants);
  const wybrane = new Set(chosen);
  const out = [];
  for (const k of nadania) {
    if (wybrane.has(k)) continue;
    out.push({ rodzaj: mode === "upgrade" ? "maSpecjalizacje" : "maBieglosc", klucz: k });
  }
  const chce = choices.reduce((n, c) => n + (Number(c.count) || 0), 0);
  const ma = [...wybrane].filter(k => !nadania.has(k)).length;
  if (ma < chce) out.push({ rodzaj: "brakWyboru", ile: chce - ma });
  return out;
}

/* -------------------------------------------- */
/*  Ostrzeżenie (D1)                             */
/* -------------------------------------------- */

const _wnioski = new WeakMap();

function _etykieta(klucz) {
  try { return dnd5e.documents.Trait.keyLabel(klucz); } catch { return klucz; }
}

function _linia(w, zrodlo) {
  if (w.rodzaj === "maSpecjalizacje") return `${_etykieta(w.klucz)}: masz już Specjalizację — ${zrodlo} nic tu nie dodaje.`;
  if (w.rodzaj === "maBieglosc") return `${_etykieta(w.klucz)}: masz już biegłość — ${zrodlo} nic tu nie dodaje.`;
  return `${zrodlo}: nie było z czego wybrać (${w.ile}) — postać ma już wszystko z puli.`;
}

/** Kroki tego przebiegu awansu z naszych `Trait` (profesja, Sztuczka), już po zastosowaniu na klonie. */
function _zbierz(manager) {
  const linie = [];
  for (const step of manager.steps ?? []) {
    if (step.type !== "forward") continue;
    const adv = step.flow?.advancement;
    if (adv?.type !== "Trait") continue;
    const zrodlo = adv.flags?.[MODULE_ID]?.bieglosci;
    if (!zrodlo) continue;
    const cfg = adv.configuration;
    const kto = zrodlo === "profesja" ? `profesja ${adv.item?.name ?? ""}`.trim() : `Sztuczka ${adv.item?.name ?? ""}`.trim();
    for (const w of wnioskiZTraitu({ grants: cfg.grants, choices: cfg.choices, mode: cfg.mode, chosen: adv.value?.chosen ?? [] })) {
      linie.push(_linia(w, kto));
    }
  }
  return linie;
}

function _onPreComplete(manager) {
  try {
    const linie = _zbierz(manager);
    if (linie.length) _wnioski.set(manager, linie);
  } catch (err) {
    console.error(`${MODULE_ID} | bieglosci: ostrzeżenie D1`, err);
  }
}

function _onComplete(manager) {
  const linie = _wnioski.get(manager);
  if (!linie?.length) return;
  _wnioski.delete(manager);
  void sygnalNaruszenia(manager.actor, { tytul: "Biegłości — nic nie przepada po cichu", linie });
}

/* -------------------------------------------- */
/*  Audyt (D4)                                   */
/* -------------------------------------------- */

const PACZKI = Object.freeze({ class: "klasy", subclass: "profesje", feat: "sztuczki" });

/**
 * Klucze umiejętności stock dnd5e → klucze NOE (`config/skills.mjs`). Postacie z importu trzymają biegłości pod
 * starymi kluczami (`ath`, `itm`, `ins`…), których NOE nie zna — na karcie ich nie ma, rzut idzie bez PB. `null` —
 * umiejętność bez odpowiednika (Wiedza tajemna, Religia). Tylko do audytu: nic nie przepisuje sam.
 */
export const STARE_KLUCZE_UMIEJETNOSCI = Object.freeze({
  acr: "akr", ani: "tre", arc: null, ath: "atl", dec: "osz", his: "his", ins: "int", itm: "zas", inv: "sle",
  med: "med", nat: "prz", prc: "prc", prf: "wys", per: "per", rel: null, slt: "zwi", ste: "skr", sur: "sur"
});

/** Przedmiot z kompendium modułu odpowiadający przedmiotowi postaci (klasa/profesja po identyfikatorze, Sztuczka po nazwie). */
async function _wzorzec(item) {
  const pack = game.packs.get(`${MODULE_ID}.${PACZKI[item.type]}`);
  if (!pack) return null;
  const index = await pack.getIndex({ fields: ["system.identifier"] });
  const hit = item.type === "feat"
    ? index.find(e => e.name === item.name)
    : index.find(e => e.system?.identifier === item.system?.identifier);
  return hit ? pack.getDocument(hit._id) : null;
}

async function _wartosci(actor) {
  const T = dnd5e.documents.Trait;
  const out = {};
  for (const trait of ["skills", "tool", "weapon", "armor", "saves"]) Object.assign(out, await T.actorValues(actor, trait));
  return out;
}

/** Klucze konkretne z puli (wieloznaczniki rozwija dnd5e). */
async function _rozwin(pula) {
  const T = dnd5e.documents.Trait;
  const out = new Set();
  for (const k of pula) {
    if (!k.endsWith("*")) { out.add(k); continue; }
    const trait = k.split(":")[0];
    const wybory = (await T.choices(trait, { prefixed: true })).filter(new Set([k]));
    for (const x of wybory.asSet()) if (!x.endsWith("*")) out.add(x);
  }
  return out;
}

function _dotyczy(adv, item, actor) {
  const root = item.type === "subclass" ? actor.items.find(i => i.type === "class" && i.system.identifier === item.system.classIdentifier) : item;
  if (["class", "subclass"].includes(item.type)) {
    if ((root?.system?.levels ?? 0) < adv.level) return false;
    const pierwsza = root?.isOriginalClass;
    if (adv.classRestriction === "primary" && pierwsza === false) return false;
    if (adv.classRestriction === "secondary" && pierwsza !== false) return false;
  }
  return true;
}

/**
 * Czego postaci brakuje względem awansów `Trait` z kompendium. Tylko odczyt.
 * @param {Actor} actor
 * @returns {Promise<{postac: string, pozycje: object[]}>}
 */
export async function audyt(actor) {
  const ma = await _wartosci(actor);
  const pozycje = [];
  const dodaj = p => pozycje.push(p);

  for (const item of actor.items.filter(i => PACZKI[i.type])) {
    if (item.type === "feat" && !item.getFlag(MODULE_ID, "sztuczka")) continue;
    const wzor = await _wzorzec(item);
    if (!wzor) continue;
    const kopia = new Set(Object.keys(item.toObject().system?.advancement ?? {}));
    for (const adv of Object.values(wzor.toObject().system.advancement ?? {})) {
      if (adv.type !== "Trait" || !_dotyczy(adv, item, actor)) continue;
      const cfg = adv.configuration;
      const staraKopia = !kopia.has(adv._id);
      const zrodlo = `${item.name}${adv.level ? ` (poz. ${adv.level})` : ""} — ${adv.name}`;
      for (const k of cfg.grants ?? []) {
        dodaj({ zrodlo, rodzaj: "nadanie", co: _etykieta(k), klucz: k, stan: (ma[k] ?? 0) >= 1 ? "ok" : "brak", staraKopia });
      }
      for (const c of cfg.choices ?? []) {
        const pula = await _rozwin(c.pool);
        const posiadane = [...pula].filter(k => (ma[k] ?? 0) >= 1).length;
        dodaj({
          zrodlo, rodzaj: "wybór", co: c.pool.map(_etykieta).join(" / "), klucz: c.pool.join(","), ile: c.count,
          stan: posiadane < c.count ? `brak (${posiadane} z ${c.count})` : "nie wiadomo, co wybrał — liczba się zgadza",
          staraKopia
        });
      }
    }
  }

  // Druga klasa z czasów sprzed Z14: stary awans bez `classRestriction` nadał pełny zestaw startowy.
  for (const item of actor.items.filter(i => i.type === "class" && i.isOriginalClass === false)) {
    for (const adv of Object.values(item.toObject().system.advancement ?? {})) {
      if (adv.type !== "Trait" || adv.level !== 1 || adv.classRestriction) continue;
      const nadane = adv.value?.chosen ?? [];
      if (!nadane.length) continue;
      dodaj({
        zrodlo: `${item.name} (druga klasa)`, rodzaj: "nadmiar?", co: nadane.map(_etykieta).join(", "), klucz: nadane.join(","),
        stan: "pełny zestaw startowy zamiast wieloklasowego (s. 59) — do przejrzenia", staraKopia: true
      });
    }
  }

  // Biegłości pod kluczami, których NOE nie zna (import sprzed modułu): umiejętności stock, broń i pancerze spoza tabel.
  const D = CONFIG.DND5E;
  for (const [k, s] of Object.entries(actor._source.system?.skills ?? {})) {
    if (k in D.skills || !(Number(s?.value) > 0)) continue;
    const noe = STARE_KLUCZE_UMIEJETNOSCI[k];
    dodaj({
      zrodlo: "dane postaci", rodzaj: "stary klucz", co: `umiejętność „${k}” (${s.value === 2 ? "Specjalizacja" : "biegłość"})`,
      klucz: `skills:${k}`, stan: noe ? `martwy — w NOE to ${D.skills[noe]?.label ?? noe} (${noe})` : "martwy — bez odpowiednika w NOE",
      staraKopia: true
    });
  }
  for (const [trait, path, cfg] of [["weapon", "weaponProf", D.weaponProficiencies], ["armor", "armorProf", D.armorProficiencies]]) {
    for (const k of actor._source.system?.traits?.[path]?.value ?? []) {
      if (k in cfg) continue;
      dodaj({ zrodlo: "dane postaci", rodzaj: "stary klucz", co: `${trait} „${k}”`, klucz: `${trait}:${k}`,
        stan: "martwy — spoza kategorii NOE", staraKopia: true });
    }
  }

  const raport = { postac: actor.name, pozycje };
  console.table?.(pozycje.map(p => ({ źródło: p.zrodlo, rodzaj: p.rodzaj, co: p.co, stan: p.stan, "sprzed M6": p.staraKopia ? "tak" : "" })));
  return raport;
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerBieglosci() {
  Hooks.on("dnd5e.preAdvancementManagerComplete", _onPreComplete);
  Hooks.on("dnd5e.advancementManagerComplete", _onComplete);
}

/** `game.neuroshima.bieglosci` */
export const bieglosciApi = { audyt, wnioskiZTraitu, STARE_KLUCZE_UMIEJETNOSCI };
