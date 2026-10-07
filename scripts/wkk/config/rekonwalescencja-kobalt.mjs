/**
 * Neuroshima 5e — rekonwalescencja: reguły WKK.
 *
 * Host: `config/rekonwalescencja-rules.mjs` (czyste zasady), który czyta te wpisy tylko przy
 * `{ kobalt: true }` — warstwa Foundry podaje to z `isKobaltEnabled()`. Plan: `PLAN_m1_walka.md`
 * D5, D7, D8. Kształt — wzorzec nadpisania z `scripts/wkk/README.md`: reguła RAW zostaje w hoście,
 * tu leży tylko to, co Kobalt zmienia.
 */

/**
 * D5 — Wyczerpanie z Krytycznego Stopnia Zranienia jest **uporczywe**: Długi odpoczynek go nie
 * zdejmuje, schodzi dopiero z zejściem z Krytycznego (wtedy zdejmuje je już reguła RAI hosta).
 * NOE: zwykły poziom, schodzi jak każdy inny. Wpis ma kształt reguły zdejmowania hosta.
 */
export const ZRANIENIE_UPORCZYWE_KOBALT = Object.freeze({
  uporczywe: Object.freeze({
    dopoki: "zejscie-z-krytycznego",
    opis: "Uporczywe (WKK) — póki Stopień Zranienia jest Krytyczny"
  })
});

/**
 * D4, D7, D8 — Pomoc medyczna w Kobalcie: jeden ładunek narzędzi małego medyka (poza „Dnem
 * torby”), cały DO obojga, jeden pacjent; samoleczenie — Test Inteligencji (Medycyna) ST 20,
 * porażka dodaje Stopień, ładunek schodzi w obu przypadkach. Konsumenci: E6.
 */
export const POMOC_MEDYCZNA_KOBALT = Object.freeze({
  ladunek: 1,
  zajmujeOboje: true,
  pacjentowNaDO: 1,
  samoleczenie: Object.freeze({ umiejetnosc: "med", cecha: "int", st: 20, porazkaDodajeStopien: true, ladunekPrzyPorazce: true })
});
