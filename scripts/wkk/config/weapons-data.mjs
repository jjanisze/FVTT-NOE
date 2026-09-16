/**
 * Neuroshima 5e — WKK-only weapon entries.
 *
 * Spliced back into their original category arrays in `config/weapons-data.mjs` (not appended
 * to the end of `WEAPONS`), so category-contiguous ordering in that file's exports is unchanged.
 * Same entry shape — see that file's header comment for field meanings. None of these three has
 * a RAW rulebook basis: Laska and Miecz are one-off stat writeups for a specific PC's existing
 * gear, Pistolet na Race is a wholly homebrew weapon built to fire Raca ammo
 * (`wkk/config/ammo-data.mjs`) / feed `wkk/items/pistolet-na-race.mjs`.
 */

// Homebrew (Laffitte). Statystyki nadane w IMPLEMENTATION.md (21), gdy okazało się, że
// broń nie ma w ogóle kości obrażeń — do zatwierdzenia przez MG, patrz TODO_mechanika.md §4.
export const LASKA = {
  id: "laska", name: "Laska", type: "biala", icon: "laska.svg",
  damage: { number: 1, denomination: 6, types: ["bludgeoning"] },
  props: ["fin"],
  weight: 1, price: 15, avail: 60
};

// Homebrew (Raynald). Statystyki spisane z jego karty w IMPLEMENTATION.md (21) — celowo
// 1k10 bez właściwości, żeby nie zmienić broni, którą już gra. Katana (1k10, fin+ver, ta
// sama cena) zostaje bronią wyraźnie lepszą, i tak ma być.
export const MIECZ = {
  id: "miecz", name: "Miecz", type: "biala", icon: "miecz.svg",
  damage: { number: 1, denomination: 10, types: ["slashing"] },
  props: [],
  weight: 1.5, price: 40, avail: 40
};

// Homebrew, W Kolorze Kobaltu (nie z podręcznika) — patrz docs/Kobalt.md. Jednostrzałowa
// (Wmag. 1, ładowanie), tak jak Samoróbka. Główne zastosowanie to sygnalizacja i oświetlenie
// punktu trafienia/rzutu (patrz wkk/items/flara.mjs) — obrażenia poniżej to tylko to, co się
// dzieje, gdy ktoś strzeli racą prosto w kogoś.
export const PISTOLET_NA_RACE = {
  id: "pistolet-na-race", name: "Pistolet na Race", type: "palnaKrotka", icon: "pistolet_na_race.svg",
  damage: { number: 1, denomination: 4, types: ["fire"] },
  range: { value: 12, long: 30 },
  props: ["wmag", "tryb_p", "ladowanie"],
  caliber: "race", mag: { kind: "wmag", max: 1 }, fixedDamage: true,
  weight: 0.6, price: 30, avail: 30,
  note: "Wystrzeliwuje race sygnałowe — patrz Flara i Raca sygnałowa. Trafienie bezpośrednie: "
    + "1k4 od ognia; cel wykonuje RO Zręczność ST 12 albo zostaje Podpalony.",
  manual: ["RO na Podpalenie przy trafieniu bezpośrednim rozstrzyga MG (jak przy Koktajlu Mołotowa) — nie jest automatyzowane."]
};

/** All WKK-only weapons, for anything that wants the full set rather than one category. */
export const KOBALT_WEAPONS = [LASKA, MIECZ, PISTOLET_NA_RACE];
