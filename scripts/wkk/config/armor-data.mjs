/**
 * Neuroshima 5e — WKK-only armour entries.
 *
 * Spliced into `ARMORS` by `config/armor-data.mjs`, at the end of the light armours. Same entry
 * shape as that file — see its header for the fields.
 */
export const KOBALT_ARMORS = [
  {
    // Kamizelka taktyczna — decyzja MG 2026-09-25: wariant lekkiego pancerza z ładownicami, który
    // daje jeden dodatkowy slot przedmiotu podręcznego (`actors/handy-items.mjs`, `handyLimit()`).
    // Baza: Plate carrier typ I (TT 12, 5 kg, 70 gb) — to już jest „kamizelka nośna" w RAW;
    // ładownice: +1 kg, +20 gb, trochę rzadsza. Sam slot nie jest w podręczniku, stąd WKK.
    // Buźka i Kluczyk mają z Roll20 lootowe „(Lekka) Kamizelka taktyczna (50)", 6 kg — tego
    // wpisu nie podmieniamy automatycznie (zmiana TT przy braku pancerza — decyzja MG).
    id: "kamizelka-taktyczna", name: "Kamizelka taktyczna", cat: "Lekki", armorType: "light",
    ac: 12, dex: null, strength: null, stealth: null, donTime: 1,
    weight: 6, price: 90, avail: 30,
    handySlots: 1,
    note: "Kamizelka nośna z lekkimi płytami, obszyta rzędami ładownic i kieszeni. "
      + "Jeden przedmiot podręczny więcej (WKK)."
  }
];
