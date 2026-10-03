/**
 * Zdolności klasowe z Koloru Kobaltu — treść domowa tej kampanii, **nie** z podręcznika.
 *
 * `config/class-features-data.mjs` jest generowany z tekstu podręcznika
 * (`dev/classes/gen_features.py`), więc wpisy domowe mieszkają tutaj, a generator dopina je
 * na końcu `CLASS_FEATURES`. Kształt wpisu jest identyczny; pula profesji w
 * `config/classes-data.mjs` dobiera je po polu `owner`.
 *
 * `kobalt: true` ukrywa zdolność w puli awansu, gdy Kolor Kobaltu jest wyłączony
 * (`actors/kobalt-advancement.mjs`). Przedmiot w paczce istnieje zawsze — jak reszta WKK.
 */
export const KOBALT_CLASS_FEATURES = Object.freeze({
  // Kowboj z pistoletem zamiast rewolweru (Lorentz, Desert Eagle). Osobna zdolność obok
  // Rewolwerowca, nie jego zamiennik — można wziąć obie. Szybkoładowacz wypada (8 naboi w
  // magazynku zmniejsza wagę przeładowania), w jego miejsce Powąchaj to.
  pistolero: {
    id: "pistolero",
    source: "profesja",
    owner: "kowboj",
    klasa: "twardziel",
    level: null,
    label: "Pistolero",
    action: null,
    kobalt: true,
    legacyAbilityKey: "pistolero",
    handgunKind: "pistolet",
    text: "Pistolet w dłoni jest dla ciebie równie naturalny jak but na stopie. "
      + "Dobywanie. Jeśli nosisz jeden lub dwa pistolety w kaburach, możesz je dobyć lub schować "
      + "bez zużywania darmowej interakcji z przedmiotem. "
      + "Niezawodny. Pistolet w twoich rękach nigdy się nie zacina. "
      + "Jednoręki. Strzelasz z pistoletu jedną ręką bez Utrudnienia. Pistolety traktujesz jako "
      + "broń o właściwości lekka i poręczna. "
      + "Strzał z biodra. +5 do testów Inicjatywy, jeśli trzymasz w ręce lub będziesz dobywać pistolet. "
      + "Powąchaj to. Gdy celujesz z pistoletu do istoty w zasięgu 1,5 m, możesz wykonać Test "
      + "Zastraszania z Ułatwieniem, używając SIŁ lub CHA."
  }
});

/** Wpisy dla mostu `hasAbility()` (`actors/abilities.mjs`), doklejane do `ABILITY_DEFINITIONS`. */
export const KOBALT_ABILITY_DEFINITIONS = Object.freeze({
  pistolero: {
    label: "Pistolero",
    aliases: ["pistolero"],
    noticeColor: "#6b5a2f"
  }
});
