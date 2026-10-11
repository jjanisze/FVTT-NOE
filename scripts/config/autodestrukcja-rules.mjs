/**
 * Neuroshima 5e — autodestrukcja maszyn: czyste zasady (PLAN_m5_postoj.md §7.1, U19–U23, E0).
 *
 * NOE s. 204: przy 0 PW maszyny MG rzuca k100 na szansę ze statblocku; wybuch po 1k4 rundach niszczy wszystkie
 * surowce elektroniczne, chemiczne i części zapasowe; parametry wybuchu — w statblocku. Dane maszyn
 * (`{ szansa, promien, rzut, obrazenia[], stany[] }`) generuje `dev/bestiary/gen_bestiary.py` (U21, E9).
 * Czysty: bez `game`.
 */

/** Surowce, które wybuch niszczy (s. 204): zostają materiały konstrukcyjne. */
export const ZNISZCZONE_SUROWCE = Object.freeze(["CE", "CH", "CZ"]);

/** Stany flagi `autodestrukcja` na aktorze żetonu (§7.18). */
export const STANY_AUTODESTRUKCJI = Object.freeze(["czeka", "odlicza", "wybuch", "bez"]);

/** Wybuch, gdy k100 ≤ szansa (s. 204). */
export function czyWybucha(k100, szansa) {
  return Number(k100) <= Number(szansa);
}

/** Odliczanie: 1k4 rund (s. 204). Wynik kości to liczba rund. */
export function odliczanie(k4) {
  return Math.max(1, Math.min(4, Math.floor(Number(k4) || 1)));
}

/** Kopia listy niszczonych surowców (s. 204). */
export function zniszczoneSurowce() {
  return [...ZNISZCZONE_SUROWCE];
}

/**
 * Rozmiar wraku na mapie (U23): mały / średni / duży / gigantyczny z rozmiaru dnd5e.
 * @returns {"maly"|"sredni"|"duzy"|"gigantyczny"}
 */
export function rozmiarWraku(rozmiar) {
  if (["tiny", "sm"].includes(rozmiar)) return "maly";
  if (rozmiar === "med") return "sredni";
  if (rozmiar === "lg") return "duzy";
  return "gigantyczny";
}

/**
 * Parsuje nazwę cechy statblocku „Autodestrukcja (80%)” → 80; inaczej `null`.
 */
export function szansaZNazwy(nazwa) {
  const m = /autodestrukcja\s*\((\d{1,3})\s*%\)/i.exec(String(nazwa ?? ""));
  return m ? Number(m[1]) : null;
}

/**
 * Krok tiku odliczania (U22): na początku tury maszyny odejmuje rundę; 0 — wybuch.
 * @param {{stan: string, rundy: number}} flaga
 * @returns {{stan: string, rundy: number, wybuch: boolean}}
 */
export function tikOdliczania(flaga) {
  if (flaga?.stan !== "odlicza") return { stan: flaga?.stan ?? "czeka", rundy: flaga?.rundy ?? 0, wybuch: false };
  const rundy = Math.max(0, (Number(flaga.rundy) || 0) - 1);
  return rundy === 0 ? { stan: "wybuch", rundy: 0, wybuch: true } : { stan: "odlicza", rundy, wybuch: false };
}
