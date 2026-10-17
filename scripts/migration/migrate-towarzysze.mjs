/**
 * Neuroshima 5e — migracja ręcznie zbudowanego ludzkiego towarzysza (PLAN_m3_towarzysze.md §7.14, U19; E5).
 *
 * Przed M3 ludzki partner był zwykłą postacią z własną klasą-zaślepką bez awansów, wpisanymi ręcznie PW i
 * PB rosnącym z poziomem (F3). Migracja robi z niego towarzysza bez uruchamiania kreatora — jego wybory
 * (cechy, RO, umiejętności, Pochodzenie, Sztuczka) zostają:
 *
 *   1. **Właściciel:** brakujące kategorie broni (D14 — kategoria z biegłości profesji, której nie wybrano),
 *      ponowne zesłanie zdolności źródłowej z paczki (`resyncClassFeatures`, F4 — m.in. aktywność Komenda).
 *   2. **Towarzysz:** flaga U1; klasa-zaślepka → „Towarzysz” na poziomie klasy właściciela (awanse poziomu 1
 *      jako już dokonane — biegłości siedzą na aktorze); efekt PB +2 (U3); ręczne maks. PW → `null` (liczy
 *      moduł); Percepcja na MDR, Śledztwo na INT (F3); członek drużyny właściciela (D19); własność graczy
 *      właściciela; notka „brak automatyzacji przywołania” z biografii — out; kreator oznaczony jako zrobiony;
 *      Szybkość 9 m, jeśli postać jej nie ma (sprzed `character-defaults.mjs` — dnd5e bierze ją z gatunku).
 *   3. **Sztuczka (D15)** — opcjonalnie: klucz z `SZTUCZKI` zamienia dotychczasową Sztuczkę towarzysza.
 *      Sztuczki nie niosą automatyki cech, więc premię („+1 ZRC”) podaje wołający (`premiaCechy`) — idzie tylko
 *      razem z faktyczną zamianą, więc drugi przebieg jej nie dubluje.
 *
 * Domyślnie próba na sucho: zwraca plan i kopię obu aktorów (`kopia`) — wołający zapisuje ją lokalnie,
 * poza publicznym repozytorium. `commit: true` wykonuje. Idempotentna.
 */

import { RODZAJE, ZRODLA } from "../config/towarzysze-data.mjs";
import { FLAG, zapewnijEfektPB } from "../actors/towarzysze.mjs";
import { KLASA_TOWARZYSZA, synchronizujPoziom } from "../actors/towarzysze-tworzenie.mjs";
import { resyncClassFeatures } from "./resync-class-features.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Akapit biografii sprzed M3 — wprowadzenie partnera prowadził MG ręcznie. */
const NOTKA_BIOGRAFII = /<p>(?:(?!<\/p>)[\s\S])*brak automatyzacji przywołania(?:(?!<\/p>)[\s\S])*<\/p>\s*/i;
/** Umiejętności z przypisaną złą Cechą w danych postaci (F3): klucz → Cecha. */
const CECHY_UMIEJETNOSCI = Object.freeze({ prc: "wis", sle: "int" });

const _aktor = ref => (typeof ref === "string" ? (fromUuidSync(ref) ?? game.actors.getName(ref)) : ref) ?? null;

/**
 * @param {object} o
 * @param {Actor|string} o.wlasciciel            aktor, uuid albo nazwa
 * @param {Actor|string} o.towarzysz
 * @param {string} [o.rodzaj]                    `ludzki-partner` | `prawa-reka`
 * @param {string[]} [o.broniWlasciciela]        kategorie broni do dopisania właścicielowi (D14)
 * @param {string|null} [o.sztuczka]             klucz Sztuczki towarzysza (D15) albo `null` — bez zmiany
 * @param {Record<string, number>} [o.premiaCechy]  premia Cech Bazowych nowej Sztuczki, np. `{ dex: 1 }`
 * @param {boolean} [o.commit]
 * @returns {Promise<{plan: string[], kopia: object|null, wykonane: boolean}>}
 */
export async function migrujTowarzysza({
  wlasciciel, towarzysz, rodzaj = "ludzki-partner", broniWlasciciela = [], sztuczka = null, premiaCechy = {}, commit = false
} = {}) {
  if (!game.user.isGM) throw new Error("Migrację towarzysza wykonuje MG.");
  const owner = _aktor(wlasciciel);
  const comp = _aktor(towarzysz);
  const wpis = RODZAJE[rodzaj];
  if (!owner || !comp) throw new Error(`Nie znaleziono aktora: ${!owner ? wlasciciel : towarzysz}`);
  if (!wpis || wpis.typAktora !== "character") throw new Error(`Rodzaj „${rodzaj}” to nie ludzki towarzysz`);
  const klasa = ZRODLA[wpis.zrodlo].klasa;
  const plan = [];
  const kopia = { data: new Date().toISOString(), wlasciciel: owner.toObject(), towarzysz: comp.toObject() };

  // 1. Właściciel
  const bronie = owner._source.system.traits?.weaponProf?.value ?? [];
  const brak = broniWlasciciela.filter(b => !bronie.includes(b));
  if (brak.length) plan.push(`${owner.name}: biegłość w broni + ${brak.join(", ")} (D14)`);
  const zrodlo = owner.items.find(i => i.getFlag(MODULE_ID, "abilityId") === wpis.zrodlo);
  if (!zrodlo) plan.push(`${owner.name}: UWAGA — brak zdolności ${ZRODLA[wpis.zrodlo].nazwa}`);
  else if (!zrodlo.system.activities?.some(a => a.name === "Komenda") && wpis.tura === "komenda") {
    plan.push(`${owner.name}: ${zrodlo.name} — zesłanie z paczki (aktywność Komenda, F4)`);
  }

  // 2. Towarzysz
  const t = comp.getFlag(MODULE_ID, FLAG);
  if (t?.wlasciciel !== owner.uuid || t?.rodzaj !== rodzaj) plan.push(`${comp.name}: flaga towarzysza (${wpis.nazwa}, właściciel ${owner.name})`);
  const zaslepki = comp.items.filter(i => i.type === "class" && i.system.identifier !== KLASA_TOWARZYSZA);
  const maKlase = comp.items.some(i => i.type === "class" && i.system.identifier === KLASA_TOWARZYSZA);
  const poziom = Math.max(1, Number(owner.classes?.[klasa]?.system?.levels) || 0);
  if (zaslepki.length) plan.push(`${comp.name}: klasa ${zaslepki.map(i => `${i.name} (${i.system.identifier})`).join(", ")} → Towarzysz ${poziom}`);
  else if (!maKlase) plan.push(`${comp.name}: + klasa Towarzysz ${poziom}`);
  if (!comp.effects.get("neuroTowarzyszPB")) plan.push(`${comp.name}: efekt PB +2 (U3)`);
  if (comp._source.system.attributes.hp.max != null) plan.push(`${comp.name}: maks. PW ${comp._source.system.attributes.hp.max} → liczy moduł (5 × ${poziom})`);
  const zleCechy = Object.entries(CECHY_UMIEJETNOSCI).filter(([k, c]) => (comp._source.system.skills?.[k]?.ability ?? c) !== c);
  if (zleCechy.length) plan.push(`${comp.name}: ${zleCechy.map(([k, c]) => `${k} → ${c}`).join(", ")} (F3)`);
  const party = game.actors.party;
  const wDruzynie = party?.system?.members?.some(m => m.actor === owner);
  if (wDruzynie && !party.system.members.some(m => m.actor === comp)) plan.push(`${comp.name}: do drużyny ${party.name} (D19)`);
  const gracze = game.users.filter(u => !u.isGM && owner.testUserPermission(u, "OWNER"));
  const bezPraw = gracze.filter(u => !comp.testUserPermission(u, "OWNER"));
  if (bezPraw.length) plan.push(`${comp.name}: własność ${bezPraw.map(u => u.name).join(", ")}`);
  const bio = comp._source.system.details?.biography?.value ?? "";
  if (NOTKA_BIOGRAFII.test(bio)) plan.push(`${comp.name}: notka „brak automatyzacji przywołania” z biografii — usunięta`);
  if (comp.getFlag(MODULE_ID, "kreator")?.cechy !== true) plan.push(`${comp.name}: kreator — oznaczony jako zrobiony`);
  const bezSzybkosci = !(Number(comp._source.system.attributes?.movement?.speeds?.walk) > 0);
  if (bezSzybkosci) plan.push(`${comp.name}: Szybkość — → 9 m (każdy człowiek startuje z 9 m)`);

  // 3. Sztuczka
  let nowaSztuczka = null;
  const stare = comp.items.filter(i => i.getFlag(MODULE_ID, "sztuczka"));
  if (sztuczka) {
    const pack = game.packs.get(`${MODULE_ID}.sztuczki`);
    const index = await pack.getIndex({ fields: [`flags.${MODULE_ID}.sztuczkaKey`, `flags.${MODULE_ID}.sztuczka`] });
    const e = index.find(i => {
      const f = i.flags?.[MODULE_ID] ?? {};
      return f.sztuczkaKey === sztuczka || f.sztuczka === sztuczka || i.name.toLowerCase() === String(sztuczka).toLowerCase();
    });
    if (!e) throw new Error(`Nie ma Sztuczki „${sztuczka}” w paczce`);
    nowaSztuczka = await pack.getDocument(e._id);
    if (!stare.some(i => i.name === nowaSztuczka.name)) {
      plan.push(`${comp.name}: Sztuczka ${stare.map(i => i.name).join(", ") || "—"} → ${nowaSztuczka.name} (D15)`);
      for (const [k, n] of Object.entries(premiaCechy)) {
        const v = Number(comp._source.system.abilities?.[k]?.value) || 10;
        plan.push(`${comp.name}: ${k.toUpperCase()} ${v} → ${v + n} (premia Sztuczki)`);
      }
    } else nowaSztuczka = null;
  }

  if (!commit) return { plan, kopia, wykonane: false };

  // --- wykonanie ---
  if (brak.length) await owner.update({ "system.traits.weaponProf.value": [...bronie, ...brak] });
  if (zrodlo) await resyncClassFeatures({ commit: true, actors: [owner.name] });

  const zmiany = {
    [`flags.${MODULE_ID}.${FLAG}`]: { wlasciciel: owner.uuid, rodzaj, klasa },
    [`flags.${MODULE_ID}.kreator.cechy`]: true,
    "system.attributes.hp.max": null
  };
  if (bezSzybkosci) Object.assign(zmiany, { "system.attributes.movement.speeds.walk": 9, "system.attributes.movement.units": "m" });
  for (const [k, c] of Object.entries(CECHY_UMIEJETNOSCI)) zmiany[`system.skills.${k}.ability`] = c;
  if (NOTKA_BIOGRAFII.test(bio)) zmiany["system.details.biography.value"] = bio.replace(NOTKA_BIOGRAFII, "");
  for (const u of bezPraw) zmiany[`ownership.${u.id}`] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  await comp.update(zmiany);

  if (zaslepki.length) await comp.deleteEmbeddedDocuments("Item", zaslepki.map(i => i.id));
  if (!comp.items.some(i => i.type === "class" && i.system.identifier === KLASA_TOWARZYSZA)) {
    const pack = game.packs.get(`${MODULE_ID}.klasy`);
    const doc = (await pack.getDocuments()).find(d => d.type === "class" && d.system.identifier === KLASA_TOWARZYSZA);
    const data = game.items.fromCompendium(doc);
    data.system.levels = poziom;
    await comp.createEmbeddedDocuments("Item", [data]);
  }
  await synchronizujPoziom(comp);
  await zapewnijEfektPB(comp);
  if (wDruzynie && !party.system.members.some(m => m.actor === comp)) await party.system.addMember(comp);
  if (nowaSztuczka) {
    if (stare.length) await comp.deleteEmbeddedDocuments("Item", stare.map(i => i.id));
    await comp.createEmbeddedDocuments("Item", [game.items.fromCompendium(nowaSztuczka)]);
    const premie = Object.fromEntries(Object.entries(premiaCechy).map(([k, n]) =>
      [`system.abilities.${k}.value`, (Number(comp._source.system.abilities?.[k]?.value) || 10) + n]));
    if (Object.keys(premie).length) await comp.update(premie);
  }
  return { plan, kopia, wykonane: true };
}
