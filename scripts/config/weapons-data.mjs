/**
 * Neuroshima 5e — definicje broni.
 *
 * Zrodlo prawdy: `Tabele/Bronie/BronBiala.md`, `BronMiotana.md`, `BronPalna.md`.
 * Ten plik karmi jednoczesnie kompendium `bron` (dev/packs/build-packs.mjs),
 * generator `createWeapons()` oraz mape ikon w `config/weapons.mjs` — zeby pack,
 * Zbrojownia i runtime nie mogly sie rozjechac.
 *
 * Pola wpisu:
 *   id         — slug; deterministyczne id w packu (`idFor("weapon", id)`)
 *   name       — nazwa dokladnie jak w tabeli
 *   type       — klucz z NEURO_WEAPON_TYPES (biala / miotana / palna* / specjalna)
 *   icon       — plik w icons/weapons/
 *   damage     — { number, denomination, types[] }; `bonus` dla obrazen plaskich
 *   versatile  — { number, denomination } dla wlasciwosci `ver`, inaczej null
 *   range      — { value, long } w metrach; null dla broni bialej bez `thr`
 *   props      — klucze wlasciwosci (CONFIG.DND5E.itemProperties)
 *   caliber    — id z ammo-data.mjs albo null
 *   mag        — { kind: "mag"|"wmag"|"beb"|"belt", max } albo null
 *   weight     — kg
 *   price      — gb
 *   avail      — dostepnosc w %
 *   fixedDamage— true = kostki z tabeli wygrywaja z domyslna formula kalibru
 *                (patrz `weapons/ammo.mjs`, sekcja "Damage formula + type")
 *   note       — tekst regul do opisu przedmiotu
 *   manual     — czego modul NIE automatyzuje; drukowane na karcie przedmiotu
 *
 * Trybow ognia (`tryb_*`) NIE zapisujemy jako aktywnosci — `weapons/fire-modes.mjs`
 * generuje je z wlasciwosci przy kazdym zapisie przedmiotu.
 */

import { AMMO_CALIBER_MAP } from "./ammo-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/* -------------------------------------------- */
/*  Bron biala — atak SILA (fin pozwala na ZRE)  */
/* -------------------------------------------- */

const BRON_BIALA = [
  {
    id: "bat", name: "Bat", type: "biala", icon: "whip.svg",
    damage: { number: 1, denomination: 4, types: ["slashing"] },
    props: ["fin", "lgt", "rch"],
    weight: 0.5, price: 15, avail: 50
  },
  {
    id: "bejsbol-rurka", name: "Bejsbol/Rurka", type: "biala", icon: "iron_pipe_club.svg",
    damage: { number: 1, denomination: 6, types: ["bludgeoning"] },
    versatile: { number: 1, denomination: 8 },
    props: ["ver", "powalajaca"],
    weight: 1, price: 10, avail: 90
  },
  {
    id: "crash", name: "Crash", type: "biala", icon: "crash_halberd.svg",
    damage: { number: 2, denomination: 8, types: ["slashing"] },
    props: ["two", "rch"],
    weight: 10, price: 30, avail: 40
  },
  {
    id: "kafar", name: "Kafar", type: "biala", icon: "kafar_piledriver.svg",
    damage: { number: 2, denomination: 6, types: ["bludgeoning"] },
    props: ["burzaca", "two", "powalajaca"],
    weight: 15, price: 30, avail: 50
  },
  {
    id: "kastet", name: "Kastet", type: "biala", icon: "brass_knuckles.svg",
    damage: { number: 1, denomination: 4, types: ["bludgeoning"] },
    props: ["powalajaca", "lgt"],
    weight: 0.1, price: 5, avail: 80
  },
  {
    id: "katana", name: "Katana", type: "biala", icon: "katana.svg",
    damage: { number: 1, denomination: 10, types: ["slashing"] },
    versatile: { number: 1, denomination: 12 },
    props: ["fin", "ver"],
    weight: 1, price: 40, avail: 20
  },
  {
    id: "kilof", name: "Kilof", type: "biala", icon: "pickaxe.svg",
    damage: { number: 1, denomination: 10, types: ["piercing"] },
    props: ["burzaca", "two", "przebijajaca"],
    weight: 3, price: 20, avail: 70
  },
  {
    id: "lancuch", name: "Łańcuch", type: "biala", icon: "chain.svg",
    damage: { number: 1, denomination: 6, types: ["bludgeoning"] },
    props: ["unieruchamiajaca", "rch"],
    weight: 5, price: 5, avail: 70
  },
  {
    id: "maczeta", name: "Maczeta", type: "biala", icon: "machete.svg",
    damage: { number: 1, denomination: 8, types: ["slashing"] },
    props: ["lgt", "karczujaca"],
    weight: 1, price: 10, avail: 80
  },
  {
    id: "nadziak", name: "Nadziak", type: "biala", icon: "horsemans_pick.svg",
    damage: { number: 1, denomination: 8, types: ["piercing", "bludgeoning"] },
    props: ["burzaca", "lgt", "przebijajaca"],
    weight: 2, price: 20, avail: 30
  },
  {
    id: "noz-taktyczny", name: "Nóż taktyczny", type: "biala", icon: "combat_knife.svg",
    damage: { number: 1, denomination: 6, types: ["piercing", "slashing"] },
    props: ["fin", "lgt"],
    weight: 0.5, price: 10, avail: 70
  },
  {
    id: "oszczep", name: "Oszczep", type: "biala", icon: "javelin.svg",
    damage: { number: 1, denomination: 6, types: ["piercing"] },
    range: { value: 30, long: 90 },
    props: ["thr"],
    weight: 1, price: 10, avail: 60
  },
  {
    id: "pila-spalinowa", name: "Piła spalinowa", type: "biala", icon: "combat_chainsaw.svg",
    damage: { number: 2, denomination: 10, types: ["slashing"] },
    props: ["two", "karczujaca", "spalinowa"],
    weight: 10, price: 70, avail: 20,
    manual: ["Zbiornik 0,5 l starcza na 30 minut pracy. Moduł nie liczy paliwa."]
  },
  {
    id: "pilomiecz", name: "Piłomiecz", type: "biala", icon: "machine_sword.svg",
    damage: { number: 1, denomination: 10, types: ["slashing"] },
    versatile: { number: 1, denomination: 12 },
    props: ["ver", "zasilana"],
    weight: 4, price: 90, avail: 10,
    manual: ["Mały akumulator starcza na 20 ataków. Moduł nie liczy ładunku."]
  },
  {
    id: "siekierka", name: "Siekierka", type: "biala", icon: "hatchet.svg",
    damage: { number: 1, denomination: 6, types: ["slashing", "bludgeoning"] },
    range: { value: 6, long: 18 },
    props: ["karczujaca", "lgt", "thr"],
    weight: 1, price: 10, avail: 80
  },
  {
    id: "szabla", name: "Szabla", type: "biala", icon: "saber.svg",
    damage: { number: 1, denomination: 8, types: ["slashing", "piercing"] },
    props: ["lgt", "fin"],
    weight: 1, price: 15, avail: 40
  },
  {
    id: "szoker", name: "Szoker", type: "biala", icon: "paralyzer.svg",
    damage: { number: 1, denomination: 4, types: ["lightning"] },
    props: ["lgt", "fin", "porazajaca", "zasilana"],
    weight: 0.2, price: 30, avail: 30,
    manual: ["Zwykła bateria starcza na 5 ataków. Moduł nie liczy ładunku."]
  },
  {
    id: "topor-strazacki", name: "Topór strażacki", type: "biala", icon: "fireman_axe.svg",
    damage: { number: 1, denomination: 12, types: ["slashing", "bludgeoning"] },
    props: ["two", "karczujaca", "powalajaca"],
    weight: 3, price: 20, avail: 60
  },
  {
    id: "widly", name: "Widły", type: "biala", icon: "pitchfork.svg",
    damage: { number: 2, denomination: 4, types: ["piercing"] },
    versatile: { number: 3, denomination: 4 },
    range: { value: 6, long: 18 },
    props: ["ver", "thr"],
    weight: 2, price: 10, avail: 70
  },
  {
    id: "wlocznia", name: "Włócznia", type: "biala", icon: "spear.svg",
    damage: { number: 1, denomination: 8, types: ["piercing"] },
    versatile: { number: 1, denomination: 10 },
    range: { value: 6, long: 18 },
    props: ["ver", "thr"],
    weight: 3, price: 10, avail: 60
  }
];

/* -------------------------------------------- */
/*  Bron miotana — atak ZRECZNOSC                */
/* -------------------------------------------- */

const BRON_MIOTANA = [
  {
    id: "bolas", name: "Bolas", type: "miotana", icon: "bola.svg",
    damage: { number: 1, denomination: 4, types: ["bludgeoning"] },
    range: { value: 9, long: 36 },
    props: ["fin", "obalajaca", "thr", "unieruchamiajaca"],
    weight: 1, price: 5, avail: 20
  },
  {
    id: "dmuchawka", name: "Dmuchawka", type: "miotana", icon: "blowgun.svg",
    damage: { number: null, denomination: null, bonus: "1", types: ["piercing"] },
    range: { value: 9, long: 36 },
    props: ["cicha", "ladowanie"],
    caliber: "igla", fixedDamage: true,
    weight: 0.1, price: 10, avail: 50,
    note: "Obrażenia płaskie: 1. Igły można napełnić trucizną."
  },
  {
    id: "bumerang", name: "Bumerang", type: "miotana", icon: "boomerang.svg",
    damage: { number: 1, denomination: 6, types: ["slashing"] },
    range: { value: 9, long: 36 },
    props: ["fin", "powracajaca", "thr"],
    weight: 0.5, price: 10, avail: 40
  },
  {
    id: "kusza-bloczkowa", name: "Kusza bloczkowa", type: "miotana", icon: "crossbow.svg",
    damage: { number: 1, denomination: 12, types: ["piercing"] },
    range: { value: 60, long: 120 },
    props: ["cicha", "two", "ladowanie", "sm"],
    caliber: "belt",
    weight: 4, price: 70, avail: 30
  },
  {
    id: "kusza-automatyczna-pistoletowa", name: "Kusza automatyczna pistoletowa",
    type: "miotana", icon: "crossbow.svg",
    damage: { number: 1, denomination: 8, types: ["piercing"] },
    range: { value: 9, long: 36 },
    props: ["cicha", "two", "wmag", "sm"],
    caliber: "belt", mag: { kind: "wmag", max: 6 },
    weight: 2, price: 50, avail: 30
  },
  {
    id: "kusza-automatyczna-cobra", name: "Kusza automatyczna Cobra",
    type: "miotana", icon: "cobra_crossbow.svg",
    damage: { number: 1, denomination: 10, types: ["piercing"] },
    range: { value: 60, long: 120 },
    props: ["cicha", "two", "przeladowanie", "wmag", "sm"],
    caliber: "belt", mag: { kind: "wmag", max: 7 },
    weight: 5, price: 130, avail: 10
  },
  {
    id: "luk-bloczkowy", name: "Łuk bloczkowy", type: "miotana", icon: "bow.svg",
    damage: { number: 1, denomination: 12, types: ["piercing"] },
    range: { value: 60, long: 180 },
    props: ["cicha", "two", "ladowanie"],
    caliber: "strzala",
    weight: 2, price: 50, avail: 40
  },
  {
    id: "luk-tradycyjny", name: "Łuk tradycyjny", type: "miotana", icon: "bow.svg",
    damage: { number: 1, denomination: 8, types: ["piercing"] },
    range: { value: 30, long: 90 },
    props: ["cicha", "two"],
    caliber: "strzala",
    weight: 1, price: 30, avail: 60
  },
  {
    id: "noz-do-rzucania", name: "Nóż do rzucania", type: "miotana", icon: "combat_knife.svg",
    damage: { number: 1, denomination: 4, types: ["piercing"] },
    range: { value: 6, long: 12 },
    props: ["cicha", "fin", "lgt", "thr"],
    weight: 0.1, price: 10, avail: 70
  },
  {
    id: "proca", name: "Proca", type: "miotana", icon: "slingshot.svg",
    damage: { number: 1, denomination: 4, types: ["bludgeoning"] },
    range: { value: 9, long: 36 },
    props: ["cicha", "two"],
    caliber: "kulka",
    weight: 0.1, price: 5, avail: 60
  }
];

/* -------------------------------------------- */
/*  Bron palna — atak ZRECZNOSC                  */
/* -------------------------------------------- */

/*
 * Wagi pochodza z naglowkow podsekcji tabeli ("waga ok. 1 kg"), bo kolumna Waga
 * istnieje tylko dla broni specjalnej. Kategoria "Karabiny przeciwpancerne
 * i maszynowe" podaje widelki 10-30 kg — wartosci ponizej sa autorskim rozbiciem
 * tego zakresu, nie liczba z tabeli.
 */

const BRON_PALNA_KROTKA = [
  {
    id: "b92", name: "B 92", type: "palnaKrotka", icon: "beretta_b92.svg",
    damage: { number: 1, denomination: 6, types: ["piercing"] },
    range: { value: 18, long: 39 },
    props: ["amm", "tryb_p"],
    caliber: "9mm", mag: { kind: "mag", max: 15 },
    weight: 1, price: 30, avail: 30
  },
  {
    id: "b93r", name: "B 93R", type: "palnaKrotka", icon: "beretta_b93r.svg",
    damage: { number: 1, denomination: 6, types: ["piercing"] },
    range: { value: 18, long: 39 },
    props: ["amm", "tryb_p", "tryb_ks"],
    caliber: "9mm", mag: { kind: "mag", max: 20 },
    weight: 1, price: 40, avail: 30
  },
  {
    id: "jedenastka", name: "Jedenastka", type: "palnaKrotka", icon: "colt_1911.svg",
    damage: { number: 1, denomination: 8, types: ["piercing"] },
    range: { value: 18, long: 54 },
    props: ["amm", "tryb_p"],
    caliber: "45acp", mag: { kind: "mag", max: 7 },
    weight: 1, price: 50, avail: 30
  },
  {
    id: "desert-eagle", name: "Desert Eagle", type: "palnaKrotka", icon: "desert_eagle.svg",
    damage: { number: 1, denomination: 10, types: ["piercing"] },
    range: { value: 18, long: 54 },
    props: ["amm", "tryb_p", "obalajaca"],
    caliber: "44mag", mag: { kind: "mag", max: 8 },
    weight: 1, price: 80, avail: 20
  },
  {
    id: "g17", name: "G17", type: "palnaKrotka", icon: "glock_17.svg",
    damage: { number: 1, denomination: 6, types: ["piercing"] },
    range: { value: 18, long: 39 },
    props: ["amm", "tryb_p", "sm"],
    caliber: "9mm", mag: { kind: "mag", max: 17 },
    weight: 1, price: 60, avail: 30
  },
  {
    id: "mark-23", name: "Mark 23", type: "palnaKrotka", icon: "hk_mark_23.svg",
    damage: { number: 1, denomination: 8, types: ["piercing"] },
    range: { value: 18, long: 39 },
    props: ["amm", "tryb_p", "sm"],
    caliber: "45acp", mag: { kind: "mag", max: 12 },
    weight: 1, price: 50, avail: 40
  },
  {
    id: "mk-iv", name: "Mk IV", type: "palnaKrotka", icon: "ruger_mark_iv.svg",
    damage: { number: 1, denomination: 4, types: ["piercing"] },
    range: { value: 12, long: 36 },
    props: ["amm", "tryb_p", "poreczna"],
    caliber: "22lr", mag: { kind: "mag", max: 10 },
    weight: 1, price: 40, avail: 70
  },
  {
    id: "k-22", name: "K-22", type: "palnaKrotka", icon: "k_22_revolver.svg",
    damage: { number: 1, denomination: 4, types: ["piercing"] },
    range: { value: 12, long: 24 },
    props: ["beb", "tryb_p", "poreczna"],
    caliber: "22lr", mag: { kind: "beb", max: 6 },
    weight: 1, price: 25, avail: 80
  },
  {
    id: "trzydziestka-osemka", name: "Trzydziestka ósemka", type: "palnaKrotka",
    icon: "m642_revolver.svg",
    damage: { number: 1, denomination: 6, types: ["piercing"] },
    range: { value: 18, long: 36 },
    props: ["beb", "tryb_p", "poreczna"],
    caliber: "38spl", mag: { kind: "beb", max: 6 },
    weight: 1, price: 35, avail: 60
  },
  {
    id: "peacemaker", name: "Peacemaker", type: "palnaKrotka", icon: "peacemaker_revolver.svg",
    damage: { number: 1, denomination: 8, types: ["piercing"] },
    range: { value: 18, long: 45 },
    props: ["beb", "tryb_p"],
    caliber: "45acp", mag: { kind: "beb", max: 6 },
    weight: 1, price: 40, avail: 50
  },
  {
    id: "magnum-44", name: ".44 Magnum", type: "palnaKrotka", icon: "magnum_44.svg",
    damage: { number: 1, denomination: 10, types: ["piercing"] },
    range: { value: 18, long: 45 },
    props: ["beb", "tryb_p", "obalajaca"],
    caliber: "44mag", mag: { kind: "beb", max: 6 },
    weight: 1, price: 60, avail: 30
  },
  {
    id: "obrzyn", name: "Obrzyn", type: "palnaKrotka", icon: "sawed_off_shotgun.svg",
    damage: { number: 2, denomination: 4, types: ["piercing"] },
    range: { value: 6, long: 18 },
    props: ["wmag", "tryb_p", "dublet"],
    caliber: "12ga_s", mag: { kind: "wmag", max: 2 },
    weight: 2, price: 40, avail: 70,
    note: "Śrut: 2k4 kłute. Breneka: 2k6 obuchowe — zmień kaliber na .12 Ga (b)."
  },
  {
    id: "samorobka", name: "Samoróbka", type: "palnaKrotka", icon: "pipe_gun.svg",
    damage: { number: 1, denomination: 6, types: ["piercing"] },
    range: { value: 12, long: 24 },
    props: ["wmag", "tryb_p", "ladowanie"],
    caliber: "9mm", mag: { kind: "wmag", max: 1 },
    weight: 2, price: 20, avail: 50,
    note: "Tabela podaje kaliber i obrażenia jako „Różne” — 9 mm to wartość domyślna.",
    manual: ["Kaliber i kostkę obrażeń ustala MG przy tworzeniu egzemplarza."]
  }
];

const BRON_PALNA_POSREDNIA = [
  {
    id: "hk-universal", name: "HK Universal", type: "palnaPosr", icon: "hk_ump.svg",
    damage: { number: 1, denomination: 8, types: ["piercing"] },
    range: { value: 27, long: 90 },
    props: ["amm", "tryb_p", "tryb_ks", "tryb_ds", "sm"],
    caliber: "45acp", mag: { kind: "mag", max: 30 },
    weight: 3, price: 90, avail: 15
  },
  {
    id: "empepiatka", name: "Empepiątka", type: "palnaPosr", icon: "hk_mp5.svg",
    damage: { number: 1, denomination: 6, types: ["piercing"] },
    range: { value: 27, long: 81 },
    props: ["amm", "tryb_p", "tryb_ks", "tryb_ds"],
    caliber: "9mm", mag: { kind: "mag", max: 30 },
    weight: 3, price: 50, avail: 45
  },
  {
    id: "tommy-gun", name: "Tommy gun", type: "palnaPosr", icon: "tommy_gun.svg",
    damage: { number: 1, denomination: 8, types: ["piercing"] },
    range: { value: 18, long: 90 },
    props: ["amm", "tryb_p", "tryb_ds"],
    caliber: "45acp", mag: { kind: "mag", max: 50 },
    weight: 3, price: 60, avail: 40
  },
  {
    id: "uzi", name: "UZI", type: "palnaPosr", icon: "uzi.svg",
    damage: { number: 1, denomination: 6, types: ["piercing"] },
    range: { value: 18, long: 81 },
    props: ["amm", "tryb_p", "tryb_ds"],
    caliber: "9mm", mag: { kind: "mag", max: 32 },
    weight: 3, price: 50, avail: 60
  },
  {
    id: "ak-kalach", name: "AK (Kałach)", type: "palnaPosr", icon: "ak_47.svg",
    damage: { number: 2, denomination: 8, types: ["piercing"] },
    range: { value: 75, long: 300 },
    props: ["amm", "tryb_p", "tryb_ds"],
    caliber: "76239ak", mag: { kind: "mag", max: 30 },
    weight: 3, price: 70, avail: 10
  },
  {
    id: "scar", name: "Scar", type: "palnaPosr", icon: "scar_heavy.svg",
    damage: { number: 2, denomination: 8, types: ["piercing"] },
    range: { value: 60, long: 600 },
    props: ["amm", "tryb_p", "tryb_ks", "tryb_ds", "sm"],
    caliber: "762", mag: { kind: "mag", max: 30 },
    weight: 3, price: 120, avail: 30
  },
  {
    id: "ar", name: "AR", type: "palnaPosr", icon: "armalite_carbine.svg",
    damage: { number: 2, denomination: 6, types: ["piercing"] },
    range: { value: 60, long: 540 },
    props: ["amm", "tryb_p", "tryb_ks", "tryb_ds", "sm"],
    caliber: "556", mag: { kind: "mag", max: 30 },
    weight: 3, price: 90, avail: 40
  },
  {
    id: "xm-8", name: "XM-8", type: "palnaPosr", icon: "xm_8_rifle.svg",
    damage: { number: 2, denomination: 6, types: ["piercing"] },
    range: { value: 90, long: 450 },
    props: ["amm", "tryb_p", "tryb_ks", "tryb_ds", "co", "sm"],
    caliber: "556", mag: { kind: "mag", max: 100 },
    weight: 3, price: 190, avail: 20,
    note: "Fabryczny kolimator — odwzorowany właściwością CO."
  }
];

const BRON_PALNA_DLUGA = [
  {
    id: "deer-hunter", name: "Deer Hunter", type: "palnaDluga", icon: "deer_hunter.svg",
    damage: { number: 1, denomination: 12, types: ["piercing"] },
    range: { value: 90, long: 270 },
    props: ["wmag", "tryb_p", "dluga", "obalajaca", "przeladowanie"],
    caliber: "44mag", mag: { kind: "wmag", max: 6 }, fixedDamage: true,
    weight: 4, price: 60, avail: 30
  },
  {
    id: "r700", name: "R700", type: "palnaDluga", icon: "remington_700.svg",
    damage: { number: 2, denomination: 8, types: ["piercing"] },
    range: { value: 150, long: 600 },
    props: ["wmag", "tryb_p", "dluga", "przeladowanie"],
    caliber: "762", mag: { kind: "wmag", max: 6 },
    weight: 4, price: 130, avail: 10
  },
  {
    id: "lewar-m95", name: "Lewar M95", type: "palnaDluga", icon: "lever_action_rifle.svg",
    damage: { number: 2, denomination: 6, types: ["piercing"] },
    range: { value: 90, long: 360 },
    props: ["wmag", "tryb_p", "dluga", "obalajaca", "przeladowanie"],
    caliber: "3006", mag: { kind: "wmag", max: 5 },
    weight: 4, price: 50, avail: 50
  },
  {
    id: "field-03", name: "Field 03", type: "palnaDluga", icon: "field_03_rifle.svg",
    damage: { number: 2, denomination: 8, types: ["piercing"] },
    range: { value: 90, long: 450 },
    props: ["wmag", "tryb_p", "dluga", "obalajaca", "przeladowanie"],
    caliber: "3006", mag: { kind: "wmag", max: 5 }, fixedDamage: true,
    weight: 4, price: 70, avail: 20
  },
  {
    id: "hk-g3", name: "HK G3", type: "palnaDluga", icon: "hk_g3.svg",
    damage: { number: 2, denomination: 8, types: ["piercing"] },
    range: { value: 90, long: 450 },
    props: ["amm", "tryb_p", "tryb_ks", "tryb_ds"],
    caliber: "762", mag: { kind: "mag", max: 30 },
    weight: 4, price: 130, avail: 15
  },
  {
    id: "m1-us-rifle", name: "M1 US Rifle", type: "palnaDluga", icon: "m1_us_rifle.svg",
    damage: { number: 2, denomination: 8, types: ["piercing"] },
    range: { value: 150, long: 450 },
    props: ["wmag", "tryb_p", "dluga", "obalajaca"],
    caliber: "3006", mag: { kind: "wmag", max: 8 }, fixedDamage: true,
    weight: 4, price: 80, avail: 30
  },
  {
    id: "m14", name: "M14", type: "palnaDluga", icon: "m14_rifle.svg",
    damage: { number: 2, denomination: 8, types: ["piercing"] },
    range: { value: 90, long: 780 },
    props: ["amm", "tryb_p", "tryb_ds", "dluga", "sm"],
    caliber: "762", mag: { kind: "mag", max: 20 },
    weight: 4, price: 100, avail: 25
  },
  {
    id: "sr-25", name: "SR 25", type: "palnaDluga", icon: "sr_25.svg",
    damage: { number: 2, denomination: 8, types: ["piercing"] },
    range: { value: 90, long: 900 },
    props: ["amm", "tryb_p", "tryb_ks", "dluga", "co", "sm"],
    caliber: "762", mag: { kind: "mag", max: 10 },
    weight: 4, price: 250, avail: 10
  },
  {
    id: "dwururka", name: "Dwururka", type: "palnaDluga", icon: "double_barreled_shotgun.svg",
    damage: { number: 3, denomination: 4, types: ["piercing"] },
    range: { value: 18, long: 54 },
    props: ["wmag", "tryb_p", "dluga", "dublet"],
    caliber: "12ga_s", mag: { kind: "wmag", max: 2 }, fixedDamage: true,
    weight: 4, price: 60, avail: 50,
    note: "Śrut: 3k4 kłute. Breneka: 3k6 obuchowe — zmień kaliber na .12 Ga (b)."
  },
  {
    id: "pompka", name: "Pompka", type: "palnaDluga", icon: "pump_shotgun.svg",
    damage: { number: 4, denomination: 4, types: ["piercing"] },
    range: { value: 18, long: 60 },
    props: ["wmag", "tryb_p", "dluga", "przeladowanie"],
    caliber: "12ga_s", mag: { kind: "wmag", max: 6 }, fixedDamage: true,
    weight: 4, price: 80, avail: 30,
    note: "Śrut: 4k4 kłute. Breneka: 4k6 obuchowe — zmień kaliber na .12 Ga (b)."
  },
  {
    id: "strzelba-palmera", name: "Strzelba Palmera", type: "palnaDluga", icon: "strzelba_palmera.svg",
    damage: { number: null, denomination: null, types: ["piercing"] },
    range: { value: 30, long: 90 },
    props: ["wmag", "tryb_p", "dluga"],
    caliber: "strzykawka", mag: { kind: "wmag", max: 1 }, fixedDamage: true,
    weight: 4, price: 70, avail: 30,
    note: "Strzela wyłącznie pociskami-strzykawkami — sama nie zadaje obrażeń kostkowych.",
    manual: ["Efekt pocisku (środek chemiczny, dawka, RO) rozstrzyga MG."]
  },
  {
    id: "sp12-tactical", name: "SP12 Tactical", type: "palnaDluga", icon: "sp12_tactical.svg",
    damage: { number: 3, denomination: 4, types: ["piercing"] },
    range: { value: 36, long: 72 },
    props: ["amm", "tryb_p", "dluga"],
    caliber: "12ga_s", mag: { kind: "mag", max: 8 }, fixedDamage: true,
    weight: 4, price: 90, avail: 20,
    note: "Śrut: 3k4 kłute. Breneka: 3k6 obuchowe — zmień kaliber na .12 Ga (b)."
  }
];

const BRON_PALNA_CIEZKA = [
  {
    id: "mgl1s", name: "MGL1S", type: "palnaCiezka", icon: "mgl1s.svg",
    damage: { number: 6, denomination: 6, types: ["explosive"] },
    range: { value: 100, long: null },
    props: ["beb", "tryb_p", "przeladowanie", "burzaca"],
    caliber: "40mm", mag: { kind: "beb", max: 6 },
    weight: 5, price: 200, avail: 20
  },
  {
    id: "thumper", name: "Thumper", type: "palnaCiezka", icon: "thumper_grenade_launcher.svg",
    damage: { number: 6, denomination: 6, types: ["explosive"] },
    range: { value: 100, long: null },
    props: ["wmag", "tryb_p", "burzaca"],
    caliber: "40mm", mag: { kind: "wmag", max: 1 },
    weight: 5, price: 150, avail: 30
  },
  {
    id: "bazooka", name: "Bazooka", type: "palnaCiezka", icon: "bazooka.svg",
    damage: { number: 15, denomination: 6, types: ["explosive"] },
    range: { value: 100, long: 200 },
    props: ["wmag", "tryb_p", "ppanc"],
    caliber: "60mm", mag: { kind: "wmag", max: 1 },
    weight: 5, price: 200, avail: 30
  },
  {
    id: "law", name: "LAW", type: "palnaCiezka", icon: "law_launcher.svg",
    damage: { number: 20, denomination: 6, types: ["explosive"] },
    range: { value: 100, long: 200 },
    props: ["tryb_p", "jednorazowa", "ppanc"],
    weight: 5, price: 300, avail: 10,
    note: "Rakieta na stały załadunek — nie ma osobnego kalibru w kartotece amunicji.",
    manual: ["Po strzale wyrzutnia jest bezużyteczna. Moduł jej nie kasuje."]
  },
  {
    id: "light-fifty", name: "Light Fifty", type: "palnaCiezka", icon: "light_fifty.svg",
    damage: { number: 2, denomination: 20, types: ["piercing"] },
    range: { value: 300, long: 1500 },
    props: ["amm", "tryb_p", "ciezka", "dluga", "obalajaca", "ppanc", "co", "sm"],
    caliber: "50bmg", mag: { kind: "mag", max: 5 }, fixedDamage: true,
    weight: 14, price: 350, avail: 5
  },
  {
    id: "browning", name: "Browning", type: "palnaCiezka", icon: "browning_m2.svg",
    damage: { number: 1, denomination: 20, types: ["piercing"] },
    range: { value: 45, long: 450 },
    props: ["amm", "tryb_p", "tryb_ds", "tryb_ms", "dluga", "ciezka", "obalajaca", "ppanc"],
    caliber: "50bmg", mag: { kind: "belt", max: 250 },
    weight: 30, price: 400, avail: 10
  },
  {
    id: "minimi", name: "Minimi", type: "palnaCiezka", icon: "fn_minimi.svg",
    damage: { number: 2, denomination: 6, types: ["piercing"] },
    range: { value: 60, long: 240 },
    props: ["amm", "tryb_p", "tryb_ds", "tryb_ms", "dluga", "ciezka", "obalajaca"],
    caliber: "556", mag: { kind: "belt", max: 100 },
    weight: 10, price: 250, avail: 20
  },
  {
    id: "the-pig", name: "The Pig", type: "palnaCiezka", icon: "m60_machine_gun.svg",
    damage: { number: 2, denomination: 8, types: ["piercing"] },
    range: { value: 45, long: 540 },
    props: ["amm", "tryb_p", "tryb_ds", "tryb_ms", "ciezka", "dluga", "obalajaca"],
    caliber: "762", mag: { kind: "belt", max: 200 },
    weight: 11, price: 300, avail: 15
  },
  {
    id: "minigun", name: "Minigun", type: "palnaCiezka", icon: "minigun.svg",
    damage: { number: 2, denomination: 8, types: ["piercing"] },
    range: { value: 45, long: 200 },
    props: ["amm", "tryb_ms", "dluga", "ciezka", "obalajaca"],
    caliber: "762", mag: { kind: "belt", max: 1000 },
    weight: 30, price: 350, avail: 5,
    note: "Jedyna broń palna bez ognia pojedynczego — strzela wyłącznie miażdżącą serią."
  }
];

const BRON_SPECJALNA = [
  {
    id: "miotacz-ognia", name: "Miotacz ognia", type: "specjalna", icon: "flamethrower.svg",
    damage: { number: 6, denomination: 6, types: ["fire"] },
    range: { value: 36, long: null },
    props: ["ciezka", "spalinowa"],
    mag: { kind: "wmag", max: 5 },
    weight: 20, price: 200, avail: 5,
    note: "Pełny zbiornik: 5 użyć. Zasięg: linia 36 m. Istoty w obszarze wykonują RO na "
        + "Zręczność o ST 10. Porażka: 18 (6k6) obrażeń od ognia oraz Podpalenie. "
        + "Sukces: połowa obrażeń.",
    manual: [
      "Obszar (linia 36 m) i RO na Zręczność ST 10 — MG wyznacza cele i zbiera rzuty.",
      "Stan Podpalenie nakładany ręcznie."
    ]
  },
  {
    id: "mozdzierz", name: "Moździerz", type: "specjalna", icon: "light_mortar.svg",
    damage: { number: 10, denomination: 6, types: ["explosive"] },
    range: { value: 50, long: 2000 },
    props: ["wmag", "tryb_p", "burzaca", "ciezka", "ladowanie"],
    caliber: "120mm", mag: { kind: "wmag", max: 1 },
    weight: 20, price: 300, avail: 5,
    note: "Zasięg min. 50 m, maks. 2 km. Obszar: sześcian 9 m, RO na Zręczność o ST 20. "
        + "Porażka: 30 (10k6) obrażeń ciętych i 30 (10k6) wybuchowych + Powalenie "
        + "i Ogłuchnięcie na 1 min. Sukces: połowa obrażeń.",
    manual: [
      "Drugi komplet kostek (10k6 cięte) nie jest wpisany w obrażenia bazowe — dorzuć ręcznie.",
      "Obszar, RO ST 20, Powalenie i Ogłuchnięcie rozstrzyga MG.",
      "Zasięg minimalny 50 m nie jest egzekwowany."
    ]
  }
];

/* -------------------------------------------- */
/*  Eksport                                       */
/* -------------------------------------------- */

/** Wszystkie 74 bronie z tabel, w kolejnosci kategorii. */
export const WEAPONS = [
  ...BRON_BIALA,
  ...BRON_MIOTANA,
  ...BRON_PALNA_KROTKA,
  ...BRON_PALNA_POSREDNIA,
  ...BRON_PALNA_DLUGA,
  ...BRON_PALNA_CIEZKA,
  ...BRON_SPECJALNA
];

/** Szybkie wyszukanie po id. */
export const WEAPON_MAP = Object.freeze(
  Object.fromEntries(WEAPONS.map(w => [w.id, w]))
);

/** Nazwa kanoniczna → plik ikony. Zrodlo dla WEAPON_ICON_MAP w `config/weapons.mjs`. */
export const WEAPON_ICONS = Object.freeze(
  Object.fromEntries(WEAPONS.map(w => [w.name, w.icon]))
);

/**
 * Nazwy, pod ktorymi te same bronie leza juz w swiecie, sprzed ujednolicenia
 * do tabel. Trzymane tylko po to, zeby stare itemy dalej dostawaly ikone.
 */
export const WEAPON_NAME_ALIASES = Object.freeze({
  "Bejsbol": "Bejsbol/Rurka",
  "Rurka": "Bejsbol/Rurka",
  "Trzydziestka": "Trzydziestka ósemka",
  "AK": "AK (Kałach)",
  "Kusza pistoletowa": "Kusza automatyczna pistoletowa",
  "Kusza Cobra": "Kusza automatyczna Cobra"
});

/* -------------------------------------------- */
/*  Budowa przedmiotu                             */
/* -------------------------------------------- */

const DAMAGE_TYPE_LABELS = {
  slashing: "cięte", piercing: "kłute", bludgeoning: "obuchowe",
  lightning: "elektryczne", fire: "ogień", explosive: "wybuchowe"
};

const MAG_KIND_LABELS = {
  mag: "Magazynek", wmag: "Magazynek wewnętrzny", beb: "Bębenek", belt: "Taśma"
};

function _damageLabel(d) {
  const type = (d.types ?? []).map(t => DAMAGE_TYPE_LABELS[t] ?? t).join(" / ");
  if (d.number && d.denomination) return `${d.number}k${d.denomination} ${type}`;
  if (d.bonus) return `${d.bonus} ${type}`;
  return type || "—";
}

/**
 * Opis przedmiotu. Sekcja „Nie automatyzujemy" jest obowiazkowa wszedzie tam,
 * gdzie wpis ma `manual` — zasada domu z ARCHITECTURE.md §5.
 */
function _description(w) {
  const rows = [
    ["Obrażenia", _damageLabel(w.damage)],
    w.versatile ? ["Oburącz", `${w.versatile.number}k${w.versatile.denomination}`] : null,
    w.range ? ["Zasięg", w.range.long ? `${w.range.value}/${w.range.long} m` : `${w.range.value} m`] : null,
    w.mag ? ["Zasilanie", `${MAG_KIND_LABELS[w.mag.kind]} ${w.mag.max}`] : null,
    w.caliber ? ["Nabój", AMMO_CALIBER_MAP[w.caliber]?.label ?? w.caliber] : null,
    ["Dostępność", `${w.avail}%`]
  ].filter(Boolean);

  const table = rows.map(([k, v]) => `<p><strong>${k}:</strong> ${v}</p>`).join("");
  const note = w.note ? `<p>${w.note}</p>` : "";
  const manual = w.manual?.length
    ? `<h4>Nie automatyzujemy</h4><ul>${w.manual.map(m => `<li>${m}</li>`).join("")}</ul>`
    : "";

  return `${table}${note}${manual}`;
}

/**
 * Ksztalt itemu `weapon`, wspolny dla kompendium i `createWeapons()`.
 * Aktywnosci celowo puste — `weapons/fire-modes.mjs` dobuduje tryby ognia
 * z wlasciwosci przy pierwszym zapisie.
 */
export function buildWeaponItemData(w, extra = {}) {
  const flags = { [MODULE_ID]: { availability: w.avail } };
  if (w.caliber || w.mag) {
    flags[MODULE_ID].mag = {
      ammoType: w.caliber ?? "",
      max: w.mag?.max ?? null,
      current: w.mag?.max ?? 0
    };
  }
  if (w.fixedDamage) flags[MODULE_ID].fixedDamage = true;

  return {
    name: w.name,
    type: "weapon",
    img: `modules/${MODULE_ID}/icons/weapons/${w.icon}`,
    system: {
      description: { value: _description(w), chat: "" },
      source: { custom: "Neuroshima RPG", rules: "2024" },
      type: { value: w.type, baseItem: "" },
      quantity: 1,
      weight: { value: w.weight, units: "kg" },
      price: { value: w.price, denomination: "gp" },
      properties: [...w.props],
      damage: {
        base: {
          number: w.damage.number ?? null,
          denomination: w.damage.denomination ?? null,
          bonus: w.damage.bonus ?? "",
          types: [...w.damage.types]
        },
        versatile: w.versatile
          ? { number: w.versatile.number, denomination: w.versatile.denomination, bonus: "", types: [] }
          : { number: null, denomination: null, bonus: "", types: [] }
      },
      range: {
        value: w.range?.value ?? null,
        long: w.range?.long ?? null,
        units: w.range ? "m" : ""
      },
      activities: {}
    },
    flags,
    ...extra
  };
}

/* -------------------------------------------- */
/*  Generator na aktorze (Zbrojownia)             */
/* -------------------------------------------- */

/**
 * Odtwarza komplet 74 broni na aktorze Zbrojowni. Upsert po nazwie — istniejacy
 * przedmiot jest nadpisywany danymi z tabel, brakujacy tworzony. Nic nie kasuje,
 * zeby recznie dolozone egzemplarze (np. „H&K UMP (uszkodzone)") przezyly.
 *
 * Wywolanie: `game.neuroshima.createWeapons()`
 */
export async function createWeapons(actor) {
  actor ??= game.actors.find(a => a.getFlag(MODULE_ID, "isZbrojownia"));
  if (!actor) {
    ui.notifications.error("Brak aktora Zbrojownia (flaga isZbrojownia).");
    return null;
  }

  const byName = new Map(actor.items.filter(i => i.type === "weapon").map(i => [i.name, i]));
  const toCreate = [];
  const toUpdate = [];

  for (const w of WEAPONS) {
    const data = buildWeaponItemData(w);
    const legacyName = Object.entries(WEAPON_NAME_ALIASES)
      .find(([, canonical]) => canonical === w.name)?.[0];
    const existing = byName.get(w.name) ?? (legacyName ? byName.get(legacyName) : null);

    if (existing) toUpdate.push({ _id: existing.id, ...data });
    else toCreate.push(data);
  }

  if (toCreate.length) await actor.createEmbeddedDocuments("Item", toCreate);
  if (toUpdate.length) await actor.updateEmbeddedDocuments("Item", toUpdate);

  ui.notifications.info(
    `Zbrojownia: ${toCreate.length} nowych broni, ${toUpdate.length} zaktualizowanych.`
  );
  return { created: toCreate.length, updated: toUpdate.length };
}
