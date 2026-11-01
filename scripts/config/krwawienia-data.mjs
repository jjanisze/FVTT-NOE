/**
 * Neuroshima 5e — krwawienia jako dane (docs/Krwawienia.md; ustalenia MG 2026-10-31 i 2026-11-01).
 *
 * Każde krwawienie to osobny efekt ze swoim stanem (`status`) i ikoną; ten sam się nie powtarza, różne mogą być naraz.
 * Jedna akcja leczenia zatrzymuje jedno wybrane. Obrażenia z krwawienia nie mają rodzaju; przy 0 PW każde tyknięcie
 * (także sama utrata PW) to porażka w Rzucie Przeciw Śmierci. Silnik — `combat/bleeding.mjs`, stany —
 * `config/conditions.mjs`. Bez Foundry: testy warstwy 1.
 *
 * `stop` — jak zatrzymać:
 *   - `test` — `"narzedzia"` Test narzędzi małego medyka (INT), `"medycyna"` Test Medycyny z narzędziami małego medyka,
 *     `"pomaganie"` akcja Pomaganie i Test Inteligencji (Medycyna), `"mechanik"` Test narzędzi małego mechanika;
 *   - `ladunek` — zużywa ładunek narzędzi małego medyka, za każdą próbę (pusta torba — tylko z Dnem torby, z Utrudnieniem);
 *   - `sam` — czy krwawiący może zrobić to sam.
 * `lek` — lek na Hemofilię: `"raw"` zawsze, `"wkk"` tylko w Kolorze Kobaltu (zasada 43), `null` nigdy.
 * `cel` — `"zywe"` (maszyny nie krwawią) albo `"maszyna"` (Wyciek).
 */

import { DUMDUM_BLEED, KRWAWIENIE_KOBALT } from "../wkk/combat/bleeding.mjs";

const _f = Object.freeze;
const OWN = "modules/neuroshima-2026-overrides/icons/statuses";

/** „Opatrzenie rany” bez podanego ST — powstrzymanie krwawienia z opisu narzędzi małego medyka (s. 135). */
export const OPATRZENIE = _f({ test: "narzedzia", dc: 10, ladunek: true, sam: true });

/** Dopisek każdego krwawienia (nie Wycieku). */
const PRZY_ZERO = "<p>Przy 0 PW każde tyknięcie to porażka w Rzucie Przeciw Śmierci; stabilizacja krwawienia nie "
  + "zatrzymuje. Jedna akcja leczenia zatrzymuje jedno krwawienie.</p>";

const PODSTEPNY = _f({
  id: "podstepny", status: "krwawieniePodstepny", label: "Krwawienie (Podstępny atak)",
  img: `${OWN}/krwawienie-podstepny.svg`, zrodlo: "Złodziej, poz. 3, s. 92",
  when: "start", damage: "1d8", strata: "obrazenia", save: null, stop: OPATRZENIE, lek: "wkk", cel: "zywe",
  opis: "<p>1k8 obrażeń na początku swojej tury, aż ktoś opatrzy ranę: Test narzędzi małego medyka ST 10 "
    + "(ładunek narzędzi). Złodziej, poz. 3, s. 92.</p>" + PRZY_ZERO
});

/** Kolejność — kolejność tyknięć i przycisków. */
export const KRWAWIENIA = _f({
  hemofilia: _f({
    id: "hemofilia", status: "krwawienieHemofilia", label: "Krwawienie (Hemofilia)",
    img: `${OWN}/krwawienie-hemofilia.svg`, zrodlo: "Choroby, s. 109",
    when: "end", damage: "1d4", strata: "obrazenia",
    save: _f({ ability: "con", dc: 10, streakToStop: 3 }),
    stop: _f({ test: "medycyna", dc: 15, ladunek: true, sam: true }), lek: "raw", cel: "zywe",
    opis: "<p>Na koniec swojej tury RO na Kondycję ST 10, porażka — 1k4 obrażeń. Ustaje po leku (Desmopresyna, "
      + "preparaty krwiopochodne), Teście Medycyny ST 15 z narzędziami małego medyka (ładunek) albo trzech zdanych RO "
      + "z rzędu. Choroby, s. 109.</p>" + PRZY_ZERO
  }),
  podstepny: PODSTEPNY,
  // WKK — ten sam efekt co Podstępny atak pod inną nazwą, ale osobny: mogą być naraz (`wkk/combat/bleeding.mjs`).
  dumdum: _f({ ...PODSTEPNY, ...DUMDUM_BLEED }),
  tetnica: _f({
    id: "tetnica", status: "krwawienieTetnica", label: "Krwawienie (Przycelowanie — Tętnica)",
    img: `${OWN}/krwawienie-tetnica.svg`, zrodlo: "Twardziel, poz. 2, s. 87; Sztuczka, s. 106",
    when: "start", damage: "1d6", strata: "pw", save: null, stop: OPATRZENIE, lek: "wkk", cel: "zywe",
    opis: "<p>Utrata 1k6 PW na początku swojej tury, aż ktoś opatrzy ranę: Test narzędzi małego medyka ST 10 "
      + "(ładunek narzędzi). Przycelowanie — Twardziel, s. 87; Sztuczka, s. 106.</p>" + PRZY_ZERO
  }),
  kolory: _f({
    id: "kolory", status: "krwawienieKolory", label: "Krwawienie (Rdza/Rtęć/Stal)",
    img: `${OWN}/krwawienie-kolory.svg`, zrodlo: "Kolory Neuroshimy, s. 201–202",
    when: "start", damage: "1", strata: "pw", save: null,
    stop: _f({ test: "pomaganie", dc: 10, ladunek: false, sam: false }), lek: "wkk", cel: "zywe",
    opis: "<p>Utrata 1 PW na początku swojej tury. Zatrzymuje ktoś inny: akcja Pomaganie i Test Inteligencji "
      + "(Medycyna) ST 10, bez narzędzi. Kolory Neuroshimy — Rdza, Rtęć, Stal, s. 201–202.</p>" + PRZY_ZERO
  }),
  pila: _f({
    id: "pila", status: "krwawieniePila", label: "Krwawienie (Piły Juggernauta)",
    img: `${OWN}/krwawienie-pila.svg`, zrodlo: "Notatnik Łowcy, s. 217",
    when: "start", damage: "1d4", strata: "obrazenia", save: null, stop: OPATRZENIE, lek: "wkk", cel: "zywe",
    opis: "<p>1k4 obrażeń na początku swojej tury, aż ktoś opatrzy ranę: Test narzędzi małego medyka ST 10 "
      + "(ładunek narzędzi). Piła tarczowa Juggernauta, Notatnik Łowcy, s. 217.</p>" + PRZY_ZERO
  }),
  wyciek: _f({
    id: "wyciek", status: "wyciek", label: "Wyciek (układ hydrauliczny)",
    img: `${OWN}/wyciek.svg`, zrodlo: "Twardziel, poz. 2, s. 87; Sztuczka, s. 106",
    when: "start", damage: "1d6", strata: "pw", save: null,
    stop: _f({ test: "mechanik", dc: 10, ladunek: false, sam: false }), lek: null, cel: "maszyna", naprawa: true,
    opis: "<p>Maszyna traci 1k6 PW na początku swojej tury, aż ktoś ją naprawi: Test narzędzi małego mechanika "
      + "ST 10, bez ładunku (decyzja MG). To nie rana — bez leku i opatrywania. Przycelowanie w układ hydrauliczny.</p>"
  })
});

/** Rodzaj krwawienia po id stanu. */
export const KRWAWIENIE_PO_STATUSIE = _f(Object.fromEntries(Object.values(KRWAWIENIA).map(d => [d.status, d.id])));

/** Czy lek na Hemofilię zatrzymuje to krwawienie. */
export function lekDziala(def, { kobalt = false } = {}) {
  return def?.lek === "raw" || (def?.lek === "wkk" && !!kobalt && KRWAWIENIE_KOBALT.lek);
}

/** Czy krwawienie pasuje do celu: krwawienia — żywe, Wyciek — maszyny. */
export function celPasuje(def, { maszyna = false } = {}) {
  return def?.cel === "maszyna" ? !!maszyna : !maszyna;
}

/** Kolory z krwawieniem przy Stopniu Zranienia (s. 201–202); Chrom go nie ma. */
export const KOLORY_Z_KRWAWIENIEM = _f(["rdza", "rtec", "stal"]);

/** Przypomnienie MG poza walką — co tyle sekund zegara świata (sumują się krótsze przesunięcia). */
export const PRZYPOMNIENIE_CO = 600;

/**
 * Przypomnienie poza walką: `{ nalezne, ostatnio }` — `ostatnio` po decyzji (cofnięcie zegara ustawia je na teraz).
 * @param {number|null|undefined} ostatnio  czas świata ostatniego tyknięcia albo przypomnienia
 * @param {number} teraz
 */
export function przypomnienie(ostatnio, teraz) {
  if (!Number.isFinite(ostatnio) || teraz < ostatnio) return { nalezne: false, ostatnio: teraz };
  return teraz - ostatnio >= PRZYPOMNIENIE_CO ? { nalezne: true, ostatnio: teraz } : { nalezne: false, ostatnio };
}
