/**
 * Neuroshima 5e — WKK-only weapon entries.
 *
 * Spliced back into their original category arrays in `config/weapons-data.mjs` (not appended
 * to the end of `WEAPONS`), so category-contiguous ordering in that file's exports is unchanged.
 * Same entry shape — see that file's header comment for field meanings. None of these has
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
  caliber: "race", mag: { kind: "wmag", max: 1 }, chamber: false, fixedDamage: true,
  weight: 0.6, price: 30, avail: 30,
  note: "Wystrzeliwuje race sygnałowe — patrz Flara i Raca sygnałowa. Trafienie bezpośrednie: "
    + "1k4 od ognia; cel wykonuje RO Zręczność ST 12 albo zostaje Podpalony.",
  manual: ["RO na Podpalenie przy trafieniu bezpośrednim rozstrzyga MG (jak przy Koktajlu Mołotowa) — nie jest automatyzowane."]
};

// Homebrew (Lorentz). Nagrodowa, nazwana sztuka — pozlacany Desert Eagle z Citadel Grand's.
// Do tej pory istniala WYLACZNIE jako recznie zrobiony item na jego karcie, bez wpisu w tabeli;
// spisana tu 1:1 z tego egzemplarza (2026-09-22), zeby migracja magazynkow miala co odtworzyc
// z kompendium. Bez wpisu `weaponId` nie ma skad sie wziac, a bez niego bron nie obsluguje
// wymiennych magazynkow — czyli Lorentz stracilby magazynki do swojej flagowej spluwy.
//
// `magwell: "desert-eagle"` to powod, dla ktorego to pole w ogole istnieje (PLAN_magazynki.md §3):
// pozlacany egzemplarz bierze zwykle magazynki do Desert Eagle. Bez tego kazda nazwana wersja
// standardowej broni wymagalaby wlasnych magazynkow — i nierealistycznie, i upierdliwie przy
// stole. Generator magazynkow POMIJA wpisy z jawnym `magwell`, wiec nie powstanie osobny
// „Magazynek do Zlotego Desert Eagle" obok normalnego.
//
// Rozrywajaca i Hollow-point NIE sa tu wlasciwosciami broni — przychodza z kalibru `44mag_dd`
// (`wkk/config/ammo-data.mjs`), wiec pojawiaja sie i znikaja razem z nabojem dum-dum w komorze.
// Wpisanie ich na bron zamrozilo by je na stale, takze przy zwyklym .44 Mag.
export const ZLOTY_DESERT_EAGLE = {
  id: "zloty-desert-eagle", name: "Złoty Desert Eagle", type: "palnaKrotka",
  icon: "desert_eagle_zloty.svg",
  damage: { number: 1, denomination: 10, types: ["piercing"] },
  range: { value: 18, long: 54 },
  props: ["amm", "tryb_p", "obalajaca"],
  caliber: "44mag", magwell: "desert-eagle", mag: { kind: "mag", max: 8 },
  attackBonus: 1,
  weight: 1, price: 300, avail: 20,
  note: "Pozłacany, mistrzowsko spasowany Desert Eagle z grawerunkiem „Citadel Grand's finest” "
    + "i eleganckim, hebanowym chwytem. Trafienie: +1. "
    + "Obalająca: istota maksymalnie Średnia zdaje ST 10, inaczej zostaje Powalona. "
    + "Bierze zwykłe magazynki do Desert Eagle."
};

/*
 * „Śmieci sprzedawcy" (PLAN_paper_doll D36). Bestiariusz atakuje przedmiotami, których nie ma
 * w tabeli broni NOE — maczugą, pałką, kamiennym nożem, sztyletem, młotkiem. Żeby BN padający
 * przy 0 PW (D34) miał co upuścić, dostają tu wpisy: słabsze od najbliższych kuzynów z RAW
 * (Bejsbol/Rurka, Nóż taktyczny, Kastet), tanie i pospolite — łup, który się sprzedaje, nie
 * podnosi. Statystyki ustalił agent wdrażający lalkę (2026-10-03) — do przejrzenia przez MG.
 * Dedykowane ikony trafiają partią 42 (`dev/icons/MISSING.md` §A); wpisy
 * zatwierdzone przez MG są przepinane po kolei, a reszta zachowuje pożyczone.
 */
export const MACZUGA = {
  id: "maczuga", name: "Maczuga", type: "biala", icon: "maczuga.svg",
  damage: { number: 1, denomination: 6, types: ["bludgeoning"] },
  props: [],
  weight: 2, price: 5, avail: 90,
  note: "Ciężki, nierówny kij — czasem nabity gwoździami. Gorsza od bejsbola: ani oburęczna, ani powalająca."
};
export const PALKA_POLICYJNA = {
  id: "palka-policyjna", name: "Pałka policyjna", type: "biala", icon: "palka_policyjna.svg",
  damage: { number: 1, denomination: 4, types: ["bludgeoning"] },
  props: ["lgt"],
  weight: 0.6, price: 8, avail: 60,
  note: "Gumowa albo drewniana pałka służbowa. Lekka — dobra do drugiej ręki, słaba w pierwszej."
};
export const KAMIENNY_NOZ = {
  id: "kamienny-noz", name: "Kamienny nóż", type: "biala", icon: "kamienny_noz.svg",
  damage: { number: 1, denomination: 4, types: ["piercing"] },
  props: ["lgt"],
  weight: 0.3, price: 1, avail: 90,
  note: "Ociosany krzemień albo szkło na rzemieniu. Tępieje po pierwszej walce."
};
export const SZTYLET = {
  id: "sztylet", name: "Sztylet", type: "biala", icon: "sztylet.svg",
  damage: { number: 1, denomination: 4, types: ["piercing"] },
  props: ["fin", "lgt"],
  weight: 0.4, price: 6, avail: 70,
  note: "Wąskie, obosieczne ostrze domowej roboty. Finezyjny, ale krótszy i słabszy od noża taktycznego."
};
export const MLOTEK = {
  id: "mlotek", name: "Młotek", type: "biala", icon: "mlotek.svg",
  damage: { number: 1, denomination: 4, types: ["bludgeoning"] },
  props: ["lgt"],
  weight: 0.7, price: 3, avail: 90,
  note: "Zwykły młotek ciesielski. Narzędzie, które czasem robi za broń."
};

/** Śmieci sprzedawcy razem — do splotu z bronią białą w `config/weapons-data.mjs`. */
export const KOBALT_VENDOR_TRASH = [MACZUGA, PALKA_POLICYJNA, KAMIENNY_NOZ, SZTYLET, MLOTEK];

/** All WKK-only weapons, for anything that wants the full set rather than one category. */
export const KOBALT_WEAPONS = [LASKA, MIECZ, PISTOLET_NA_RACE, ZLOTY_DESERT_EAGLE, ...KOBALT_VENDOR_TRASH];

/** Id wszystkich broni WKK — bramka Kobaltu dla upuszczeń z Bestiariusza (D36). */
export const KOBALT_WEAPON_IDS = Object.freeze(KOBALT_WEAPONS.map(w => w.id));
