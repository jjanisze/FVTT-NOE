/**
 * Neuroshima 5e — skala grafiki istot (PLAN_m4_pojazdy D42, §4.1, pakiet S1).
 *
 * Pojazdy i auta na mapach kampanii są w prawdziwej skali (D21), a grafiki istot wypełniają całe pole 1,5 m —
 * człowiek wygląda przy samochodzie jak olbrzym. Różnicę zmniejszamy od strony istot: **mnożnik f rysowania**
 * dla wszystkich istot (stockowe dnd5e, NOE, kampania), jednakowo na mapie i w pojeździe.
 *
 * Tylko obraz: dokument żetonu, jego pole, zasięgi, kratki i `tokens/scale-overrides.json` zostają bez zmian, nic
 * nie trafia do bazy — cofnięcie to zmiana liczby w ustawieniach. Wartość wybrał MG po spike'u S0 (2026-10-30): f = 0,8,
 * razem z pojazdami ×1,1 (`SKALA_POJAZDOW`, D45). Mnożenie siatki robi podklasa żetonu
 * (`pojazdy/zeton.mjs`, jedyna podklasa modułu), po rozmiarze jadącego.
 *
 * f dostają aktorzy `character` i `npc` (także wierzchowce i maszyny Molocha); 1 — pojazdy i pojemniki (`vehicle`),
 * drużyny (`group`), żetony bez aktora i obiekty z fizyczności (`scenes/obiekty.mjs`, aktor `npc` z flagą `obiekt`).
 * Przedmioty na ziemi to kafelki, nie żetony — tego pliku nie dotyczą.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/** `FLAGA_OBIEKTU` z `scenes/obiekty.mjs` — wpisana wprost: ten plik czyta podklasa żetonu, bez ciężkich importów. */
const FLAGA_OBIEKTU = "obiekt";

/** Ustawienie świata: mnożnik f (1 — bez zmian). */
export const USTAWIENIE_SKALI_ISTOT = "skalaGrafikiIstot";

/** Zakres ustawienia (D42: wartość wybiera MG po spike'u S0). */
export const SKALA_ISTOT_MIN = 0.5;
export const SKALA_ISTOT_MAX = 1;

/** Typy aktorów rysowane z mnożnikiem. */
const TYPY_ISTOT = new Set(["character", "npc"]);

/** Bieżące f ze świata, przycięte do zakresu; poza grą (Node) i przed rejestracją — 1. */
export function skalaIstot() {
  if (typeof game === "undefined" || !game.settings?.settings?.has(`${MODULE_ID}.${USTAWIENIE_SKALI_ISTOT}`)) return 1;
  return przytnijSkale(game.settings.get(MODULE_ID, USTAWIENIE_SKALI_ISTOT));
}

/** Liczba z ustawienia w zakresie; śmieci — 1. Czysta. */
export function przytnijSkale(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(SKALA_ISTOT_MAX, Math.max(SKALA_ISTOT_MIN, n));
}

/**
 * Czy żeton rysuje istotę (dostaje f). Czysta względem ustawień: patrzy tylko na aktora żetonu.
 * @param {TokenDocument|{actor?: Actor|null}} tokenDoc
 */
export function rysujeIstote(tokenDoc) {
  const actor = tokenDoc?.actor;
  if (!actor || !TYPY_ISTOT.has(actor.type)) return false;
  return !actor.flags?.[MODULE_ID]?.[FLAGA_OBIEKTU];
}

/**
 * Mnożnik rysowania siatki żetonu: f dla istot, 1 dla reszty.
 * @param {TokenDocument} tokenDoc
 * @param {number} [f]  mnożnik (domyślnie z ustawienia świata) — testy i podglądy
 */
export function mnoznikGrafiki(tokenDoc, f = skalaIstot()) {
  return rysujeIstote(tokenDoc) ? przytnijSkale(f) : 1;
}

/** Każdy żeton sceny przelicza siatkę — po zmianie ustawienia u wszystkich klientów. */
function odswiezSiatki() {
  if (!canvas?.ready) return;
  for (const t of canvas.tokens.placeables) t.renderFlags.set({ refreshSize: true });
}

export function registerSkalaIstot() {
  game.settings.register(MODULE_ID, USTAWIENIE_SKALI_ISTOT, {
    name: "Skala grafiki istot",
    hint: "Mnożnik rysowania grafik postaci, potworów i wierzchowców — tylko obraz: pole żetonu, zasięgi i kratki bez "
      + "zmian. Pojazdy mają osobny mnożnik ×1,1 (D45). Domyślnie 0,8; 1 — grafiki jak w dnd5e.",
    // D42/D45 (MG 2026-10-30 po spike'u S0): f = 0,8, a pojazdy ×1,1 (`SKALA_POJAZDOW`).
    scope: "world", config: true, type: Number, default: 0.8,
    range: { min: SKALA_ISTOT_MIN, max: SKALA_ISTOT_MAX, step: 0.05 },
    onChange: odswiezSiatki
  });
}

export const skalaIstotApi = Object.freeze({ skalaIstot, mnoznikGrafiki, rysujeIstote, przytnijSkale });
