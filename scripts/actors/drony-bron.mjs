/**
 * Neuroshima 5e — broń drona (PLAN_m3_towarzysze.md U13, U14; E7b).
 *
 * RAW (s. 83–84): „Atak. Dron może wykonać w swojej akcji jeden atak, którego zasięg i obrażenia zależą od
 * zamontowanej broni”. Broń to zwykły przedmiot na aktorze drona (modyfikacja — koszt i dopuszczalność z MG);
 * liczby idą z twórcy i operatora, nie z cech drona:
 *
 *   - **Test Ataku:** `2|3 + PB twórcy + mod. ZRC operatora` (`wzory.atak`) — owinięcie `getAttackData`
 *     danych aktywności ataku: natywny atak i tryby ognia (`weapons/fire-modes.mjs` dziedziczą po nim).
 *   - **Obrażenia:** kość broni + mod. INT twórcy — `@mod` w roll data aktywności drona to INT ze stempla.
 *   - **ST ataku obszarowego:** `8 + PB twórcy + mod. ZRC operatora` — tryby ognia liczą ST ze wzoru
 *     `8 + @prof + @abilities.dex.mod`, więc w roll data aktywności drona `@prof` to PB twórcy, a
 *     `@abilities.dex.mod` — ZRC operatora (nowe obiekty: roll data aktora dzieli `abilities` z danymi).
 *
 * Wszystko w chwili rzutu, bez zapisu w aktywnościach: tryby ognia przepisują aktywności broni przy każdej
 * zmianie przedmiotu, a stempel twórcy (D23) i operator (na żywo) i tak żyją na dronie. Bez operatora (dron
 * bez aktywacji nie atakuje, D35) — ZRC 0 i plakietka na karcie ataku (`drony-sterowanie.mjs`).
 *
 * **Montaż:** broń i urządzenie położone na dronie są zamontowane — flaga `zamontowane` (zakres aktywacji,
 * udźwig) i `equipped` (BN bez lalki używa tylko założonej broni, `config/validation.mjs`).
 *
 * **Amunicja (U14):** drony są w symulacji magazynków (`weapons/magazine-model.mjs`, biała lista) — magazynek
 * schodzi jak u postaci; lalki nie mają. Przeładowanie robi ktoś obok — RAW milczy.
 */

import { RODZAJE } from "../config/towarzysze-data.mjs";
import { migawka, wartosciPochodne } from "../config/towarzysze-rules.mjs";
import { towarzysz, kontekstyTowarzysza } from "./towarzysze.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Dron, którego aktywność to jest, albo `null`. */
function _dron(activity) {
  const actor = activity?.actor ?? activity?.item?.actor;
  const t = towarzysz(actor);
  return t && RODZAJE[t.rodzaj]?.maszyna ? actor : null;
}

/** Twórca ze stempla i operator na żywo; brak — zera (liczba zamiast błędu formuły). */
function _konteksty(dron) {
  const k = kontekstyTowarzysza(dron);
  return { tworca: k.tworca ?? migawka({}), operator: k.operator ?? migawka({}) };
}

/** Premia Testu Ataku drona (U13). */
export function premiaAtakuDrona(dron) {
  const t = towarzysz(dron);
  return t ? wartosciPochodne(t.rodzaj, _konteksty(dron)).atak : null;
}

function _owinRollData() {
  const owiniete = new Set();
  for (const cfg of Object.values(CONFIG.DND5E.activityTypes ?? {})) {
    // Metoda mieszka na prototypie klasy z `ActivityMixin` — innej dla każdego typu; każdy owijamy raz.
    let proto = cfg.documentClass?.prototype;
    while (proto && !Object.prototype.hasOwnProperty.call(proto, "getRollData")) proto = Object.getPrototypeOf(proto);
    if (!proto || owiniete.has(proto)) continue;
    owiniete.add(proto);
    const orig = proto.getRollData;
    proto.getRollData = function (...args) {
      const data = orig.apply(this, args);
      const dron = _dron(this);
      if (!dron) return data;
      try {
        const { tworca, operator } = _konteksty(dron);
        data.mod = tworca.abilities.int.mod;
        data.prof = tworca.prof;
        const abilities = { ...(data.abilities ?? {}) };
        abilities.dex = { ...(abilities.dex ?? {}), mod: operator.abilities.dex.mod };
        data.abilities = abilities;
      } catch (err) {
        console.error(`${MODULE_ID} | roll data broni drona ${dron.name}`, err);
      }
      return data;
    };
  }
}

function _owinAtak() {
  const Data = globalThis.dnd5e?.dataModels?.activity?.AttackActivityData;
  const orig = Data?.prototype?.getAttackData;
  if (typeof orig !== "function") {
    console.warn(`${MODULE_ID} | brak AttackActivityData#getAttackData — atak drona liczy się z jego cech`);
    return;
  }
  Data.prototype.getAttackData = function (config = {}) {
    const dron = _dron(this);
    if (!dron) return orig.call(this, config);
    const premia = premiaAtakuDrona(dron);
    if (premia === null) return orig.call(this, config);
    const rollData = this.getRollData();
    // Premie aktora zostają: tędy wchodzą kary awarii celowania (−2/−4, `combat/maszyny.mjs`). dnd5e 6.0 trzyma je w
    // `system.rolls.attack.bonus` (wszystkie ataki) i `system.rolls.attack.<mwak|rwak|…>.bonus` (było `system.bonuses.*`).
    const premie = this.actor?.system.rolls?.attack;
    return CONFIG.Dice.BasicRoll.constructParts({
      toHit: premia,
      actorBonus: premie?.[this.getActionType(config.attackMode)]?.bonus,
      globalBonus: premie?.bonus,
      situational: config.situational
    }, rollData);
  };
}

/** Broń albo urządzenie położone na dronie — zamontowane i założone. */
function _preCreateItem(item, data) {
  const dron = item.parent;
  const t = towarzysz(dron);
  if (!t || !RODZAJE[t.rodzaj]?.maszyna || !["weapon", "equipment"].includes(item.type)) return;
  item.updateSource({ "system.equipped": true, [`flags.${MODULE_ID}.zamontowane`]: true });
}

/** `init`: klasy aktywności dnd5e już są; tryby ognia dziedziczą po owiniętych prototypach. */
export function registerDronyBron() {
  _owinRollData();
  _owinAtak();
  Hooks.on("preCreateItem", _preCreateItem);
}
