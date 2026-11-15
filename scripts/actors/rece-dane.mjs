/**
 * Neuroshima 5e — stan rąk w roll data (`@neuro.rece`), dla warunków Efektów Aktywnych (PLAN_m8 §9, T20).
 *
 * Człowiek-pająk, Alpinista (s. 102): Szybkość wspinania równa Szybkości, „pod warunkiem że masz obie ręce wolne lub
 * trzymasz w nich zestaw wspinaczkowy”. Efekt na Sztuczce ma warunek dnd5e 6 (`system.conditions`) na
 * `neuro.rece.wspinaczka` — prawda, gdy każda ręka jest pusta albo trzyma Sprzęt do wspinaczki. Sam sprzęt w plecaku
 * niczego nie włącza. Zmiana lalki (przedmiot do ręki, pochwycenie, kierownica) przelicza aktora, a warunek efektu jest
 * oceniany od nowa przy każdym przygotowaniu danych — bez zapisów dokumentów.
 *
 *   neuro.rece.wolne        liczba rąk bez przedmiotu i bez lokatora (lalka; BN — natywne `equipped`)
 *   neuro.rece.wspinaczka   obie ręce wolne albo zajęte wyłącznie zestawem wspinaczkowym
 *
 * Getter leniwy: roll data powstaje często (każdy rzut, wzbogacanie tekstu), a lalkę liczymy dopiero przy odczycie.
 */

import { heldItems, freeHands, isDollActor } from "./doll.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const ZESTAW = "sprzet_wspinaczkowy";

const _zestaw = item => item?.flags?.[MODULE_ID]?.gearId === ZESTAW;

/**
 * Stan rąk aktora.
 * @param {Actor} actor
 * @returns {{wolne: number, wspinaczka: boolean}}
 */
export function stanRak(actor) {
  if (!actor) return { wolne: 0, wspinaczka: false };
  const wolne = freeHands(actor);
  if (!isDollActor(actor)) return { wolne, wspinaczka: wolne >= 2 };
  const rece = heldItems(actor);
  const wspinaczka = rece.length > 0 && rece.every(h => (!h.item && !h.occupant) || (_zestaw(h.item) && !h.occupant));
  return { wolne, wspinaczka };
}

export function registerReceDane() {
  const proto = CONFIG.Actor.documentClass.prototype;
  const getRollData = proto.getRollData;
  proto.getRollData = function (...args) {
    const data = getRollData.apply(this, args);
    if (!data || typeof data !== "object" || !["character", "npc"].includes(this.type)) return data;
    const actor = this;
    let rece = null;
    const neuro = data.neuro && typeof data.neuro === "object" ? data.neuro : {};
    Object.defineProperty(neuro, "rece", {
      configurable: true, enumerable: true,
      get() {
        if (rece) return rece;
        try { rece = stanRak(actor); } catch (err) { console.warn(`${MODULE_ID} | stan rąk ${actor.name}`, err); rece = { wolne: 0, wspinaczka: false }; }
        return rece;
      }
    });
    data.neuro = neuro;
    return data;
  };
}
