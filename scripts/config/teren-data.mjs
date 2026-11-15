/**
 * Neuroshima 5e — teren bez Tiled jako dane (PLAN_m8_ruch_i_ekonomia_akcji §3.2, §8.2, E2).
 *
 * Czyste: bez dokumentów, bez `game`. Konsumenci — `scenes/teren-preset.mjs` (przyczyny w Regionie, preset),
 * `combat/ekonomia.mjs` (jednostki sceny), tryb ruchu „Ciągnięcie” (D34), testy.
 *
 * ## Przyczyny trudnego terenu
 *
 * Natywny `dnd5e.difficultTerrain` ma zbiór `types` (przyczyny), a aktor — `movement.ignoredDifficultTerrain`.
 * dnd5e pomija Region, gdy aktor ignoruje **wszystkie** jego przyczyny, ma „all”, albo (dla przyczyn magicznych)
 * „magical”/„nonmagical”. Region bez przyczyn („inne”) spowalnia każdego poza „all” — nieznana przyczyna wymaga
 * deklaracji, nie pełnej niewrażliwości (§8.2). Kilka zwykłych Regionów naraz to dalej ×2 (s. 26, D34): dnd5e nie
 * sumuje trudnego terenu z trudnym terenem.
 *
 * Lista NOE (s. 26): zagracone pomieszczenie, niski strop, gruzowisko, schody, ostre zbocze, zaśnieżone pole,
 * przeszkoda wodna, bagno. Klucze dnd5e zostają (zgodność z treściami systemu), etykiety są z NOE; schody,
 * zagracenie i niski strop dnd5e nie ma — moduł je dopisuje.
 */

/** Przyczyny w kolejności wyboru. `dnd5e` — klucz istnieje w systemie (zmieniamy tylko etykietę). */
export const PRZYCZYNY_TERENU = Object.freeze([
  Object.freeze({ id: "stairs", label: "Schody", dnd5e: false }),
  Object.freeze({ id: "slope", label: "Stok / pochyły teren", dnd5e: true }),
  Object.freeze({ id: "rocks", label: "Gruz / kamienie", dnd5e: true }),
  Object.freeze({ id: "clutter", label: "Zagracenie", dnd5e: false }),
  Object.freeze({ id: "lowCeiling", label: "Niski strop", dnd5e: false }),
  Object.freeze({ id: "mud", label: "Mokradło / bagno", dnd5e: true }),
  Object.freeze({ id: "sand", label: "Piasek", dnd5e: true }),
  Object.freeze({ id: "snow", label: "Śnieg", dnd5e: true }),
  Object.freeze({ id: "ice", label: "Lód", dnd5e: true }),
  Object.freeze({ id: "liquid", label: "Woda (przeszkoda wodna)", dnd5e: true }),
  Object.freeze({ id: "plants", label: "Zarośla", dnd5e: true }),
  Object.freeze({ id: "web", label: "Sieci / pajęczyny", dnd5e: true })
]);

const _PO_ID = new Map(PRZYCZYNY_TERENU.map(p => [p.id, p]));

/**
 * Odporności zdolności na przyczyny terenu (§8.2, §9) — dokumentacja mapowania i źródło dla testów. Mechanika siedzi
 * w danych zdolności: Efekt Aktywny dopisuje klucze do `ignoredDifficultTerrain` (Cichy krok — `actors/cichy-krok.mjs`).
 *   cichy-krok      Zwiadowca 3 (s. 98): „trudny teren nie spowalnia” — wszystko, także pola zajęte przez istoty
 *   czlowiekPajak   Sztuczka, Po dwa naraz (s. 102): pochyły teren i schody — gruz na schodach dalej spowalnia
 *   wloczykij       Miami (s. 62): podmokłe tereny i rozległe piaski (MG 2026-11-15: bez przeszkody wodnej)
 */
export const ODPORNOSCI_TERENU = Object.freeze({
  "cichy-krok": Object.freeze(["all"]),
  czlowiekPajak: Object.freeze(["stairs", "slope"]),
  wloczykij: Object.freeze(["mud", "sand"])
});

/** Etykieta przyczyny („Schody”) albo sam klucz, gdy nieznany. */
export function etykietaPrzyczyny(id) {
  return _PO_ID.get(id)?.label ?? String(id);
}

/** Przyczyny po kolei listy, bez duplikatów i nieznanych kluczy. */
export function przyczynyZnane(typy = []) {
  const zbior = new Set(typy);
  return PRZYCZYNY_TERENU.filter(p => zbior.has(p.id)).map(p => p.id);
}

/** Nazwa Regionu/zachowania z presetu: „Trudny teren — Schody, Gruz / kamienie” albo „Trudny teren”. */
export function nazwaTerenu(typy = []) {
  const znane = przyczynyZnane(typy);
  return znane.length ? `Trudny teren — ${znane.map(etykietaPrzyczyny).join(", ")}` : "Trudny teren";
}

/**
 * Dane zachowania `dnd5e.difficultTerrain` z presetu (§8.2): przyczyny opcjonalne, bez magii.
 * @param {string[]} typy
 */
export function zachowanieTerenu(typy = []) {
  return { type: "dnd5e.difficultTerrain", name: nazwaTerenu(typy), system: { magical: false, types: przyczynyZnane(typy) } };
}

/**
 * Lustro reguły dnd5e (`DifficultTerrainRegionBehaviorType#_getTerrainEffects`) dla zwykłego, niemagicznego Regionu:
 * czy aktor z tymi odpornościami ignoruje Region z tymi przyczynami. Do podglądu i testów — nie zastępuje systemu.
 * @param {Iterable<string>} typy        przyczyny Regionu (puste — „inne”)
 * @param {Iterable<string>} ignorowane  `movement.ignoredDifficultTerrain` aktora
 */
export function terenIgnorowany(typy = [], ignorowane = []) {
  const ign = new Set(ignorowane);
  if (ign.has("all") || ign.has("nonmagical")) return true;
  const t = new Set(typy);
  if (!t.size) return false;
  return [...t].every(x => ign.has(x));
}

/* -------------------------------------------- */
/*  Jednostki sceny (§3.1)                       */
/* -------------------------------------------- */

const _METRY = new Set(["m", "m.", "metr", "metry", "metrów", "metrow", "meter", "meters", "metre", "metres"]);

/**
 * Czy jednostki siatki sceny to metry — Szybkości postaci są w metrach, więc tylko wtedy natywny koszt da się
 * porównać z budżetem. Inne jednostki (ft, km, mile) — budżet „rozlicz ręcznie” (MG 2026-11-15), nic po cichu
 * nie jest przeliczane. Pusta jednostka — metry (domyślna konwencja świata).
 * @param {string|null|undefined} jednostki  `scene.grid.units`
 * @returns {{metry: boolean, jednostka: string}}
 */
export function jednostkiSceny(jednostki) {
  const j = String(jednostki ?? "").trim();
  if (!j) return { metry: true, jednostka: "m" };
  return { metry: _METRY.has(j.toLowerCase()), jednostka: j };
}

/** Opis ręcznego rozliczenia na scenie w innych jednostkach. */
export function opisJednostek(jednostka) {
  return `scena w ${jednostka} — ruch nie jest porównywany z Szybkością w metrach; rozlicz ręcznie`;
}

/* -------------------------------------------- */
/*  Ciągnięcie pochwyconego (s. 35, D34)         */
/* -------------------------------------------- */

const ROZMIARY = Object.freeze(["tiny", "sm", "med", "lg", "huge", "grg"]);

/**
 * Dopłata za ciągnięcie albo niesienie pochwyconego za odcinek (s. 35): +dystans, chyba że chwytający jest co najmniej
 * dwa rozmiary większy od celu. Sumuje się z trudnym terenem i czołganiem (D34): czołganie + teren + ciągnięcie = 6 m
 * na 1,5 m. Nieznany cel — dopłata zostaje (bezpieczniej dla budżetu niż cicha zniżka).
 * @param {number} dystans
 * @param {{chwytajacy?: string, cel?: string|null, powalony?: boolean}} [o]  rozmiary dnd5e
 * @returns {number} dopłata do natywnego kosztu odcinka
 */
export function doplataCiagniecia(dystans, { chwytajacy = "med", cel = null, powalony = false } = {}) {
  const d = Number(dystans) || 0;
  if (d <= 0) return 0;
  const rc = ROZMIARY.indexOf(chwytajacy), rt = cel ? ROZMIARY.indexOf(cel) : -1;
  const ciagniecie = rc >= 0 && rt >= 0 && rc - rt >= 2 ? 0 : d;
  // Ciągnięcie leżąc to też czołganie (s. 37): druga, niezależna dopłata.
  return ciagniecie + (powalony ? d : 0);
}
