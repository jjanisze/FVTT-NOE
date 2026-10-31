/**
 * Neuroshima 5e — rejestr „po rzucie”: czyste zasady (PLAN_m7 §3.0.2, D4, U1–U2).
 *
 * Przycisk pod rzutem k20 to jedno **źródło** — Fuks, Forsowanie, a w E1 Motywacja, Szczęście, Amen, Twardość…
 * Każda modyfikacja to nowa wiadomość w **łańcuchu** rzutu (jak dzisiejszy Fuks: przerzut na nowej karcie,
 * stara „zastąpiona”). Łańcuch pamięta, co już użyto:
 *
 *   - jedno użycie danego źródła na rzut (`uzyte`);
 *   - modyfikacje sumują się w kolejności klikania; **przerzut** liczy rzut od nowa z formuły rzutu pierwotnego,
 *     więc dodane wcześniej kości przepadają (U2, jak Fuks);
 *   - wynik przerzutu „trzeba zaakceptować” (Fuks s. 17, Szczęście s. 72): po przerzucie żadne źródło-przerzut
 *     nie wraca; dodatki (Motywacja, Twardość…) wolno dalej;
 *   - Przerzut to z definicji powtórzenie **nieudanego** Testu k20 (s. 16) — źródła-przerzuty ze znanym progiem
 *     chowają się po sukcesie (`wynik: "porazka"`); bez progu zostają (U4). Szczęście ma własną zasadę („wynik ci
 *     nie odpowiada”) i tej bramki nie bierze.
 *
 * Stan przycisku: `aktywny` | `szary` (z dymkiem: brak użyć, poza zasięgiem — U1) | `ukryty`. Tu tylko bramki
 * wspólne; bramki źródła (kto widzi, zasoby, zasięg) liczy jego `ocen` w warstwie Foundry.
 *
 * Bez Foundry — testowane w warstwie 1 (`tests/po-rzucie.test.mjs`).
 */

/** Testy k20 (s. 17): Test Cechy (z umiejętnością i narzędziem), Rzut Obronny, Test Ataku. RPŚ nim nie jest (s. 34). */
export const TESTY_K20 = Object.freeze(["skill", "ability", "tool", "attack", "save"]);
/** Rodzaje rzutu, pod którymi rejestr w ogóle rysuje pasek: Testy k20 i RPŚ (Twardość wymienia go wprost, U7). */
export const RZUTY_REJESTRU = Object.freeze([...TESTY_K20, "death"]);
/** Próg RPŚ (s. 34): 10 lub więcej — sukces. */
export const PROG_RPS = 10;
/** Test Cechy — także z umiejętnością albo narzędziem. */
export const TESTY_CECHY = Object.freeze(["skill", "ability", "tool"]);

/** Pusty łańcuch: rzut pierwotny. */
export const LANCUCH_ZERO = Object.freeze({ uzyte: Object.freeze([]), przerzut: false });

/**
 * Wynik wobec ST albo TT; `null`, gdy próg nieznany (U4: przycisk „po porażce” jest wtedy widoczny).
 * @param {number} total
 * @param {number|null|undefined} prog
 * @returns {"sukces"|"porazka"|null}
 */
export function wynikTestu(total, prog) {
  const p = Number(prog);
  if (prog === null || prog === undefined || prog === "" || !Number.isFinite(p)) return null;
  return Number(total) >= p ? "sukces" : "porazka";
}

/**
 * Łańcuch po użyciu źródła.
 * @param {{uzyte?: string[], przerzut?: boolean}|null} lancuch
 * @param {string} zrodlo
 * @param {{przerzut?: boolean}} [o]
 * @returns {{uzyte: string[], przerzut: boolean}}
 */
export function poUzyciu(lancuch, zrodlo, { przerzut = false } = {}) {
  const l = lancuch ?? LANCUCH_ZERO;
  return { uzyte: [...(l.uzyte ?? []), zrodlo], przerzut: !!l.przerzut || !!przerzut };
}

/**
 * Wspólne bramki przycisku źródła.
 * @param {{id: string, typy: string[], przerzut?: boolean, wynik?: "porazka"|"sukces"|"naturalna1"}} row
 * @param {{typ: string, wynik?: "sukces"|"porazka"|null, naturalna?: number|null, lancuch?: object}} ctx
 * @returns {{stan: "aktywny"|"ukryty", powod?: string}}
 */
export function bramkiZrodla(row, ctx) {
  const l = ctx.lancuch ?? LANCUCH_ZERO;
  if (!row.typy.includes(ctx.typ)) return { stan: "ukryty", powod: "nie ten rodzaj rzutu" };
  if ((l.uzyte ?? []).includes(row.id)) return { stan: "ukryty", powod: "już użyte na tym rzucie" };
  if (row.przerzut && l.przerzut) return { stan: "ukryty", powod: "wynik przerzutu trzeba zaakceptować" };
  if (row.wynik === "porazka" && ctx.wynik === "sukces") return { stan: "ukryty", powod: "tylko po porażce" };
  if (row.wynik === "sukces" && ctx.wynik === "porazka") return { stan: "ukryty", powod: "tylko po sukcesie" };
  if (row.wynik === "naturalna1" && ctx.naturalna !== 1) return { stan: "ukryty", powod: "tylko przy naturalnej 1" };
  return { stan: "aktywny" };
}

/**
 * Stan przycisku: bramki wspólne, potem ocena źródła (`{stan, powod}` albo nic — aktywny).
 * @returns {{stan: "aktywny"|"szary"|"ukryty", powod?: string}}
 */
export function stanPrzycisku(row, ctx, ocena = null) {
  const b = bramkiZrodla(row, ctx);
  if (b.stan !== "aktywny") return b;
  if (!ocena || ocena.stan === "aktywny") return { stan: "aktywny", ...(ocena?.powod ? { powod: ocena.powod } : {}) };
  return { stan: ocena.stan === "szary" ? "szary" : "ukryty", powod: ocena.powod };
}

/**
 * Licznik RPŚ po zamianie porażki na sukces po rzucie (Twardość, U7). dnd5e już zapisał porażkę (naturalna 1 — dwie,
 * s. 34): cofamy ją i dopisujemy sukces; trzeci sukces stabilizuje (liczniki od zera, jak `applyDeathSaveResult`).
 * @param {{success?: number, failure?: number}} death  liczniki po pierwotnym rzucie
 * @param {{naturalna?: number|null}} [o]
 * @returns {{success: number, failure: number, outcome: "stable"|null}}
 */
export function korektaRPS(death, { naturalna = null } = {}) {
  const failure = Math.max(0, (Number(death?.failure) || 0) - (naturalna === 1 ? 2 : 1));
  const success = Math.min(3, (Number(death?.success) || 0) + 1);
  if (success >= 3) return { success: 0, failure: 0, outcome: "stable" };
  return { success, failure, outcome: null };
}

/**
 * Przejście wyniku po modyfikacji — dla konsumentów („był porażką, teraz sukces” i odwrotnie).
 * @param {number} przed
 * @param {number} po
 * @param {number|null} prog
 * @returns {"naSukces"|"naPorazke"|null}
 */
export function przejscie(przed, po, prog) {
  const a = wynikTestu(przed, prog);
  const b = wynikTestu(po, prog);
  if (!a || !b || a === b) return null;
  return b === "sukces" ? "naSukces" : "naPorazke";
}
