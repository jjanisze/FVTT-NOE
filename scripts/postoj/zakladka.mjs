/**
 * Neuroshima 5e — zakładka „Postój” na karcie drużyny (PLAN_m5_postoj.md §7.3).
 *
 * Miejsce (MG edytuje; gracze widzą nazwę, rodzaj i region), obraz Miejsca (tylko nadpisanie MG, D43),
 * przyciski MG. Kolejne etapy dokładają tu dobę (E5), punkty handlowe (E3), przeskok (E7) i szabrowanie
 * (E8) — sekcje rejestrują się przez `zarejestrujSekcjePostoju`, żeby karta drużyny nie importowała
 * wszystkiego wprost.
 */

import { LOKALIZACJE, REGIONY } from "../config/handel-data.mjs";
import { ilustracja } from "../config/ilustracje.mjs";
import { getMiejsce, maMiejsce, opisMiejsca, ustawMiejsceDruzyny, przypiszDoSceny, miejsceSceny } from "./miejsce.mjs";
import { otworzCennik } from "./cennik.mjs";
import { audytPortfela } from "./portfel.mjs";

/** @type {{id: string, kolejnosc: number, kontekst: (grupa: Actor) => Promise<object|null>|object|null, szablon: string}[]} */
const SEKCJE = [];

/** Sekcja zakładki z innego etapu: kontekst + częściowy szablon (ścieżka do pliku .hbs). */
export function zarejestrujSekcjePostoju(def) {
  if (SEKCJE.some(s => s.id === def.id)) return;
  SEKCJE.push({ kolejnosc: 50, ...def });
  SEKCJE.sort((a, b) => a.kolejnosc - b.kolejnosc);
}

/** Szablony sekcji (do `loadTemplates`). */
export function szablonySekcji() {
  return SEKCJE.map(s => s.szablon);
}

/** Kontekst zakładki. */
export async function buildPostojContext(grupa) {
  const m = getMiejsce(grupa);
  const isGM = game.user.isGM;
  const scena = game.scenes?.active ?? null;
  const sekcje = [];
  for (const s of SEKCJE) {
    let ctx = null;
    try { ctx = await s.kontekst(grupa); } catch (err) { console.warn(`neuroshima | Postój: sekcja ${s.id}`, err); }
    if (ctx) sekcje.push({ id: s.id, szablon: s.szablon, ctx });
  }
  return {
    isGM,
    miejsce: {
      ustawione: maMiejsce(m),
      opis: opisMiejsca(m),
      nazwa: m.nazwa,
      rodzaj: m.rodzaj ? LOKALIZACJE[m.rodzaj].label : null,
      region: m.region ? REGIONY[m.region].label : null,
      knajpa: m.knajpa,
      maksStawka: m.maksStawka,
      // Mnożniki tylko u MG (U42).
      modyfikator: isGM && m.rodzaj ? LOKALIZACJE[m.rodzaj].modyfikator : null
    },
    obraz: await ilustracja("miejsce", null, { nadpisanie: m.obraz }),
    scena: isGM && scena ? { nazwa: scena.name, ma: !!miejsceSceny(scena) } : null,
    sekcje
  };
}

/**
 * Akcje zakładki (dokładane do `DEFAULT_OPTIONS.actions` karty drużyny przy jej budowie w `ready`).
 * Kolejne etapy dopisują swoje w `init` przez `zarejestrujAkcjePostoju`.
 */
export const AKCJE_POSTOJU = {
  neuroPostojMiejsce: async function () { await ustawMiejsceDruzyny(this.actor); },
  neuroPostojScena: async function () { await przypiszDoSceny(this.actor); },
  neuroPostojCennik: function () { otworzCennik(); },
  neuroPostojAudyt: async function () { await audytPortfela(); }
};

/** Akcje sekcji zakładki: `{ nazwa: function(event, target) }`, `this` — karta drużyny. */
export function zarejestrujAkcjePostoju(akcje) {
  Object.assign(AKCJE_POSTOJU, akcje);
}
