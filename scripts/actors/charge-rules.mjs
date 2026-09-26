/**
 * Neuroshima 5e — zasady podkładanych ładunków (miny, C4, IED), bez UI i bez dokumentów.
 *
 * RAW, *Sprzęt* → „Miny i ładunki wybuchowe" (`8 SZTUCZKI/czesc-01.md`):
 * > Bezpieczne podłożenie ładunku wybuchowego wymaga Testu Zręczności (Zwinne dłonie, narzędzia
 * > małego ślusarza lub małego rusznikarza) lub Mądrości (Survival) o ST 10. Porażka w teście
 * > oznacza brak eksplozji. Porażka o 5 lub więcej, oznacza eksplozję w momencie zakładania.
 *
 * Decyzje MG (2026-09-24/25, `HANDOFF_materialy_wybuchowe.md` §2.3):
 * - podkłada się w zasięgu **3 m**;
 * - sposób detonacji wybiera się **przy podkładaniu**; „radiowy" tylko z zapalnikiem radiowym
 *   z zestawu Detonatora radiowego (pilot + stos zapalników — `items/detonator.mjs`);
 * - czas ustawia gracz, maks. **24 h czasu gry**, liczy zegar świata;
 * - wyzwalacz/pułapkę (i nadepnięcie miny) odpala MG ręcznie;
 * - gracz z pilotem detonuje swoje ładunki radiowe; MG może zdetonować każdy.
 *
 * Tu tylko czyste funkcje — testowane w Quench (`scripts/tests/ekwipunek-dane.test.mjs`).
 */

export const PLANT_DC = 10;
export const PLANT_RANGE_M = 3;
export const TIMER_MAX_SECONDS = 24 * 3600;
export const ROUND_SECONDS = 6;
/** RAW, Elektronika: „detonację ładunku na odległość do 200 metrów". */
export const RADIO_RANGE_M = 200;
/** RAW, Zapalnik elektryczny: „elektroda i 10 metrów kabla". */
export const WIRE_RANGE_M = 10;

/**
 * Sposoby detonacji. `remote` — odpala gracz (pilotem albo kablem); `auto` — zegar świata;
 * `gm` — odpala MG (RAW: nadepnięcie, nacisk, wyzwalacz/pułapka — nie automatyzujemy).
 */
export const DETONATION_METHODS = Object.freeze({
  timer:    { id: "timer",    label: "Czasowy",                 fires: "auto" },
  trigger:  { id: "trigger",  label: "Wyzwalacz / pułapka",     fires: "gm" },
  pressure: { id: "pressure", label: "Nadepnięcie / wyzwalacz", fires: "gm" },
  radio:    { id: "radio",    label: "Radiowy",                 fires: "remote", needs: "radioFuze" },
  electric: { id: "electric", label: "Elektryczny (kabel 10 m)", fires: "remote", needs: "electricFuze" }
});

/**
 * Wynik Testu podłożenia. „Porażka o 5 lub więcej" przy ST 10 = wynik 5 i mniej.
 * @param {number} total
 * @param {number} [dc]
 * @returns {"armed"|"dud"|"blast"}
 */
export function plantOutcome(total, dc = PLANT_DC) {
  const t = Number(total);
  if (t >= dc) return "armed";
  return dc - t >= 5 ? "blast" : "dud";
}

/**
 * Sposoby detonacji dostępne dla ładunku z katalogu, przy tym, co podkładający ma przy sobie.
 * Niedostępne zostają na liście z powodem — dialog pokazuje je wyszarzone, żeby gracz wiedział,
 * czego mu brakuje, zamiast zgadywać, czemu opcji nie ma.
 * @param {{detonation?: string[]}} def  wpis `GRENADE_TYPES`
 * @param {{radioFuze?: number, electricFuze?: number}} have  liczba zapalników przy sobie
 * @returns {{id:string, label:string, fires:string, available:boolean, reason:string|null}[]}
 */
export function availableMethods(def, have = {}) {
  const reasons = {
    radioFuze: "brak zapalnika radiowego (Detonator radiowy)",
    electricFuze: "brak zapalnika elektrycznego"
  };
  return (def?.detonation ?? []).map(id => DETONATION_METHODS[id]).filter(Boolean).map(m => {
    const available = !m.needs || Number(have[m.needs] ?? 0) > 0;
    return { ...m, available, reason: available ? null : reasons[m.needs] };
  });
}

const TIMER_UNITS = Object.freeze({ rounds: ROUND_SECONDS, minutes: 60, hours: 3600 });

/**
 * Czas zapalnika w sekundach gry. Od jednej rundy do 24 h; nieprawidłowe wejście → null.
 * @param {number|string} value
 * @param {"rounds"|"minutes"|"hours"} unit
 * @returns {number|null}
 */
export function timerSeconds(value, unit) {
  const n = Number(String(value ?? "").replace(",", "."));
  const per = TIMER_UNITS[unit];
  if (!per || !Number.isFinite(n) || n <= 0) return null;
  const s = Math.round(n * per);
  if (s < ROUND_SECONDS || s > TIMER_MAX_SECONDS) return null;
  return s;
}

/** Sekundy → „3 rundy" / „10 min" / „1 h 30 min". */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (s < 60) {
    const r = Math.max(1, Math.round(s / ROUND_SECONDS));
    return `${r} ${_plural(r, "runda", "rundy", "rund")}`;
  }
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function _plural(n, one, few, many) {
  if (n === 1) return one;
  const d = n % 10, dd = n % 100;
  return d >= 2 && d <= 4 && !(dd >= 12 && dd <= 14) ? few : many;
}

/**
 * Krótki podpis leżącego ładunku — to, co widać na mapie i w liście ładunków.
 * @param {object} charge  flaga `pendingCharge` Tile'a
 * @param {(time:number)=>string} [clock]  czas świata → „14:32"
 */
export function chargeCaption(charge, clock = t => String(t)) {
  const a = charge?.anchor ?? {};
  switch (a.type) {
    case "timer": return `wybuch ${clock(a.at)}`;
    case "remote": return a.via === "electric" ? "kabel" : "radiowy";
    case "trigger":
      if (a.method === "fizzled") return "niewypał";
      return a.method === "pressure" ? "nacisk" : "wyzwalacz";
    default: return a.combatantName ? `wybuch po turze: ${a.combatantName}` : "wybuch po tej turze";
  }
}

/**
 * Czy ten aktor może zdalnie odpalić ten ładunek — i skąd (bez sprawdzania odległości).
 * Radiowy: aktor ma pilot z tego samego zestawu (`kitId`). Elektryczny: aktor go podłożył
 * (trzyma koniec kabla). Czasowy, wyzwalacz i rzucony granat — nigdy gracz, tylko MG.
 * @param {object} charge  flaga `pendingCharge`
 * @param {{actorUuid:string, pilotKitIds:string[]}} who
 * @returns {{ok:boolean, via:string|null, rangeM:number|null}}
 */
export function remoteAccess(charge, { actorUuid, pilotKitIds = [] } = {}) {
  const a = charge?.anchor;
  if (a?.type !== "remote") return { ok: false, via: null, rangeM: null };
  if (a.via === "radio") {
    const ok = !!a.kitId && pilotKitIds.includes(a.kitId);
    return { ok, via: "radio", rangeM: RADIO_RANGE_M };
  }
  if (a.via === "electric") {
    const ok = !!a.planterUuid && a.planterUuid === actorUuid;
    return { ok, via: "electric", rangeM: WIRE_RANGE_M };
  }
  return { ok: false, via: null, rangeM: null };
}
