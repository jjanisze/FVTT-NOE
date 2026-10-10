/**
 * Neuroshima 5e — kontrolery zdalnego sterowania (PLAN_m3_towarzysze.md D32, D33, D37, U21; E7b).
 *
 * RAW opisuje dwa przedmioty (D32): **fabryczny** z rozdziału Sprzęt (300 m na otwartej przestrzeni, 50 m
 * pod ziemią albo przez ściany; 40 gb, 2 kg, dost. 30%, s. 130–131) i **domowej roboty** ze schematu Hakera
 * („zasięg 100 m”, s. 83; 20 m przez ściany — odczyt MG). Zasięgi z `config/towarzysze-data.mjs`
 * (`KONTROLERY`, generowane). WKK: dostępność fabrycznego 10% (D33), bez przepisu standardowego (D37).
 *
 * Kontroler trzyma się w ręce (lalka: rodzina „tylko w ręce”) i niesie aktywności drona (U21): Komenda [B],
 * Steruj [A], Reaguj [R] — operatorem bywa każdy z kontrolerem w ręce, nie tylko twórca. Co robią, jest w
 * `actors/drony-sterowanie.mjs`; tu tylko dane przedmiotu — bez globali Foundry, bo paczki buduje Node.
 */

import { KONTROLERY } from "../config/towarzysze-data.mjs";
import { liniaDostepnosci } from "../config/dostepnosc.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const ICON = `modules/${MODULE_ID}/icons/items/loot/kontroler_zdalnego_sterowania.svg`;

/** `flags.<mod>.kontroler` = rodzaj (`fabryczny` | `domowy`). */
export const KONTROLER_FLAG = "kontroler";

/** Stałe id aktywności kontrolera (16 znaków, jak id dokumentu). */
export const AKT_KOMENDA = "neuroDronKomenda";
export const AKT_STERUJ = "neuroDronSteruj0";
export const AKT_REAGUJ = "neuroDronReaguj0";

/** Aktywność → tryb aktywacji drona (D36): [B], [A], [R]. */
export const TRYB_AKTYWNOSCI = Object.freeze({ [AKT_KOMENDA]: "B", [AKT_STERUJ]: "A", [AKT_REAGUJ]: "R" });

/** Odwołania katalogu produkcji (cennik i schemat Hakera). */
export const KONTROLER_REF = Object.freeze({ fabryczny: "raw:kontroler", domowy: "tabela:kontroler-domowy" });

/** Cena i waga — fabryczny z cennika, domowy z czasu produkcji (40 h → 40 gb, s. 145). */
const CENA = 40;
const WAGA = 2;

/** Rodzaj kontrolera albo `null`. */
export function rodzajKontrolera(item) {
  const r = item?.flags?.[MODULE_ID]?.[KONTROLER_FLAG];
  return KONTROLERY[r] ? r : null;
}

export function jestKontrolerem(item) {
  return !!rodzajKontrolera(item);
}

/** Zasięg kontrolera `{ zasieg, zasiegPrzeszkody }` w metrach albo `null`. */
export function zasiegKontrolera(item) {
  const k = KONTROLERY[rodzajKontrolera(item)];
  return k ? { zasieg: k.zasieg, zasiegPrzeszkody: k.zasiegPrzeszkody } : null;
}

function _aktywnosc(id, name, type, sort, chatFlavor) {
  return {
    _id: id, type: "utility", name, sort,
    img: ICON,
    activation: { type, value: 1, condition: "", override: false },
    description: { chatFlavor }
  };
}

function _opis(rodzaj) {
  const k = KONTROLERY[rodzaj];
  const dost = rodzaj === "fabryczny" ? liniaDostepnosci(KONTROLER_REF.fabryczny) : null;
  const zrodlo = rodzaj === "fabryczny"
    ? `NOE ${k.strona}.`
    : `Schemat Hakera (NOE ${k.strona}); cena z czasu produkcji. Zasięg przez ściany — odczyt MG.`;
  return `<p>${rodzaj === "fabryczny" ? "Radiowy kontroler zdalnego sterowania z ekranem" : "Kontroler zdalnego sterowania domowej roboty, z ekranem"}: `
    + `zasięg <strong>${k.zasieg} m</strong> na otwartej przestrzeni, <strong>${k.zasiegPrzeszkody} m</strong> pod ziemią albo przez ściany.</p>`
    + "<p>Z kontrolerem w ręce: <strong>Komenda [B]</strong> — ruch, unik, odwrót, przedmiot; <strong>Steruj [A]</strong> — "
    + "wszystko, także atak; <strong>Reaguj [R]</strong> — reakcja drona za twoją Reakcję. Jedna aktywacja drona na rundę.</p>"
    + `<p><em>${zrodlo}${dost ? ` Dostępność: ${dost}.` : ""}</em></p>`;
}

/**
 * Dane kontrolera.
 * @param {"fabryczny"|"domowy"} rodzaj
 */
export function buildKontrolerItemData(rodzaj) {
  const k = KONTROLERY[rodzaj];
  if (!k) throw new Error(`Nieznany kontroler: ${rodzaj}`);
  return {
    name: k.nazwa,
    type: "equipment",
    img: ICON,
    system: {
      type: { value: "trinket", baseItem: "" },
      description: { value: _opis(rodzaj), chat: "" },
      weight: { value: WAGA, units: "kg" },
      price: { value: CENA, denomination: "gb" },
      quantity: 1,
      identifier: `kontroler-${rodzaj}`,
      activities: {
        [AKT_KOMENDA]: _aktywnosc(AKT_KOMENDA, "Komenda drona", "bonus", 100000,
          "Proste polecenie dla drona: idź, podążaj, broń się, podnieś, upuść, zostań."),
        [AKT_STERUJ]: _aktywnosc(AKT_STERUJ, "Steruj dronem", "action", 200000,
          "Pełne sterowanie dronem przez kamerę — wszystkie jego zdolności."),
        [AKT_REAGUJ]: _aktywnosc(AKT_REAGUJ, "Reakcja drona", "reaction", 300000,
          "Dron reaguje za Reakcję operatora: atak okazyjny albo przygotowana akcja.")
      }
    },
    flags: { [MODULE_ID]: { [KONTROLER_FLAG]: rodzaj, dollSlot: "handOnly", produktZastepczy: KONTROLER_REF[rodzaj] } }
  };
}
