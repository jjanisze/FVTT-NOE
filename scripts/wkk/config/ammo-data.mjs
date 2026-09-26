/**
 * Neuroshima 5e — WKK-only ammo/caliber entries.
 *
 * Spliced into `AMMO_CALIBERS` by `config/ammo-data.mjs`. Same entry shape as that file —
 * see its header comment for field meanings. Neither entry here has a RAW rulebook basis:
 * `.44 Mag (dum-dum)` is a house-ruled cartridge for one PC's pistol, `Raca sygnałowa` only
 * exists to feed the wholly-homebrew Pistolet na Race (`wkk/items/pistolet-na-race.mjs`).
 */
export const KOBALT_AMMO = [
  {
    // Homebrew "W Kolorze Kobaltu" - nabój dum-dum, wprowadzony dla Złotego Desert Eagle
    // Lorentza. Pocisk z rozciętym czubkiem: rozrywa tkanki (Rozrywająca), ale rozpłaszcza się
    // na twardej przeszkodzie zamiast ją przebić (Hollow-point). Ta sama kość co zwykły .44 Mag
    // - dum-dum nie bije mocniej, tylko brzydziej, a cały zysk siedzi w tych dwóch cechach.
    id: "44mag_dd",
    label: ".44 Mag (dum-dum)",
    // Własna ikona od batcha 40 (2026-09-25) — wcześniej dzieliła grafikę ze zwykłym .44 Mag
    // i w ekwipunku nie było widać, który z dwóch stosów jest który.
    icon: "ammo_44_mag_dd.svg",
    category: "Pistoletowa",
    family: "44mag",
    formula: "1d10",
    type: "piercing",
    props: ["obalajaca", "rozrywajaca", "hollowpoint"],
    note: "Rozrywająca: RO Kondycja ST 14 albo Krwawienie (1k8 na początku tury). "
      + "Hollow-point: osłona z niezerową redukcją zatrzymuje pocisk całkowicie.",
    price: 6, avail: 25, weight: 0.025
  },
  {
    // Krótka etykieta, jak reszta katalogu — "do X" trafia do `note` poniżej, nie do nazwy (ten
    // sam wzorzec co "Pocisk-strzykawka", ammo równie ekskluzywne dla jednej broni, Strzelby
    // Palmera, ale bez tego w nazwie). Dłuższa wersja "Raca sygnałowa (do Pistoletu na Race)"
    // przelewała się poza pole nazwy w widoku Amunicji na karcie — zgłoszone żywo na Raynaldzie.
    id: "race",
    label: "Raca sygnałowa",
    // Fixed (2026-09-06, batch 39): was reusing ammo_12_ga.svg (a shotgun shell — close enough in
    // shape, but not this item) as an interim placeholder. Dedicated art now exists.
    icon: "raca_sygnalowa.svg",
    category: "Sygnałowa",
    // Empty formula — the weapon (Pistolet na Race, wkk/config/weapons-data.mjs) carries its own
    // base damage, same shape as bows/crossbows here. `type` below is otherwise unused (every
    // reader in weapons/ammo.mjs gates on `caliber.formula` truthy first) but kept for the same
    // self-documenting reason "strzala"/"kulka"/etc. keep theirs.
    formula: "",
    type: "fire",
    props: [],
    note: "Amunicja wyłącznie do Pistoletu na Race. Lżejsza i dalej lecąca niż ręczna Flara "
      + "(patrz wkk/items/flara.mjs) — ale bez pistoletu bezużyteczna, w przeciwieństwie do Flary.",
    price: 5, avail: 40, weight: 0.05
  }
];

/**
 * Materiały wybuchowe spoza podręcznika — wstawiane na koniec `GRENADE_TYPES`
 * (`config/ammo-data.mjs`). Granat sygnałowy nie występuje w RAW-owej liście „Granaty i im
 * podobne" ani „Miny i ładunki"; przeniesiony tu 2026-09-24 (decyzja MG), liczby bez zmian.
 */
export const KOBALT_EXPLOSIVES = [
  {
    id: "grenade-signal",
    label: "Granat sygnałowy",
    // Fixed (2026-09-06): was reusing smoke_grenade.svg as an interim placeholder, but a
    // dedicated granat_sygnalowy.svg was already sitting in icons/weapons unused — same class of
    // gap as Flara's own icon, found in the same sweep.
    icon: "granat_sygnalowy.svg",
    category: "Granaty",
    area: "—",
    save: "—",
    effect: "Sygnał świetlny/dymny widoczny z dużej odległości. Brak obrażeń.",
    price: 20, avail: 40, weight: 0.3
  }
];
