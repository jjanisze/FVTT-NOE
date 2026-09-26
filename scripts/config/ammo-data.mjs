/**
 * Neuroshima 5e — Ammo / caliber definitions.
 *
 * AUTHOR-TIME EDITABLE: add or modify entries here to update the caliber
 * dropdown in the weapon item sheet. Changes take effect after FVTT reload.
 *
 * Fields per entry:
 *   id       — unique string key, stored in flags.neuroshima-2026-overrides.mag.ammoType
 *              AND as system.type.subtype on ammo consumable items in inventory
 *   label    — human-readable name shown in the select dropdown
 *   category — group heading in the dropdown (e.g. "Pistoletowa")
 *   formula  — Roll formula for damage dice, dnd5e notation (1d6, 2d8, …).
 *              Empty string = weapon keeps its own base damage (for bows/crossbows/slings).
 *   type     — dnd5e damage type key (piercing, bludgeoning, explosive, slashing, …)
 *   props    — Neuroshima weapon properties granted by this ammo (e.g. ["obalajaca"]).
 *              Added to weapon.system.properties when caliber is selected;
 *              removed when caliber is changed or cleared.
 *   note     — Optional short rules note shown below the mag row in the item sheet.
 *   aoe      — Optional area-of-effect description string (for grenades/rockets).
 *   price    — Suggested unit price in gb (informational only).
 *   avail    — Suggested availability % (informational only).
 *   icon     — Filename (relative to icons/ammo/) for the ammo consumable item icon.
 *              Used when programmatically creating ammo items in an actor's inventory.
 *              Full path: `modules/neuroshima-2026-overrides/icons/ammo/${icon}`
 */

import { KOBALT_AMMO, KOBALT_EXPLOSIVES } from "../wkk/config/ammo-data.mjs";

export const AMMO_CALIBERS = [
  /* ── Pistoletowa ─────────────────────────────────────────────── */
  {
    id: "22lr",
    label: ".22 LR",
    icon: "ammo_22_lr.svg",
    category: "Pistoletowa",
    formula: "1d4",
    type: "piercing",
    props: [],
    note: "Tani nabój o niskiej mocy. Nie można elaborować.",
    price: 1, avail: 80, weight: 0.005
  },
  {
    id: "38spl",
    label: ".38 SPL",
    icon: "ammo_38_spl.svg",
    category: "Pistoletowa",
    formula: "1d6",
    type: "piercing",
    props: [],
    price: 1, avail: 70, weight: 0.013
  },
  {
    id: "9mm",
    label: "9 mm",
    icon: "ammo_9_mm.svg",
    category: "Pistoletowa",
    formula: "1d6",
    type: "piercing",
    props: [],
    price: 2, avail: 70, weight: 0.012
  },
  {
    id: "45acp",
    label: ".45 ACP",
    icon: "ammo_45_acp.svg",
    category: "Pistoletowa",
    formula: "1d8",
    type: "piercing",
    props: [],
    price: 3, avail: 60, weight: 0.021
  },
  {
    id: "44mag",
    label: ".44 Mag",
    icon: "ammo_44_mag.svg",
    category: "Pistoletowa",
    family: "44mag",
    formula: "1d10",
    type: "piercing",
    props: ["obalajaca"],
    price: 3, avail: 50, weight: 0.025
  },

  /* ── Karabinowa ──────────────────────────────────────────────── */
  {
    id: "556",
    label: "5,56 mm",
    icon: "ammo_5_56_mm.svg",
    category: "Karabinowa",
    formula: "2d6",
    type: "piercing",
    props: [],
    price: 3, avail: 60, weight: 0.012
  },
  {
    id: "76239ak",
    label: "7,62×39 mm AK",
    icon: "ammo_7_62x39_mm.svg",
    category: "Karabinowa",
    formula: "2d8",
    type: "piercing",
    props: [],
    price: 4, avail: 30, weight: 0.016
  },
  {
    id: "762",
    label: "7,62 mm",
    icon: "ammo_7_62_mm.svg",
    category: "Karabinowa",
    formula: "2d8",
    type: "piercing",
    props: [],
    price: 4, avail: 40, weight: 0.024
  },
  {
    id: "3006",
    label: ".30-06",
    icon: "ammo_30_06.svg",
    category: "Karabinowa",
    formula: "2d6",
    type: "piercing",
    props: ["obalajaca"],
    note: "Popularny wśród myśliwych. Broń otrzymuje Obalającą.",
    price: 3, avail: 50, weight: 0.027
  },
  {
    id: "50bmg",
    label: ".50 BMG",
    icon: "ammo_50_bmg.svg",
    category: "Karabinowa",
    formula: "1d20",
    type: "piercing",
    props: ["obalajaca"],
    note: "Przeciwpancerny nabój karabinowy. Broń otrzymuje Obalającą.",
    price: 10, avail: 40, weight: 0.115
  },

  /* ── Śrutowa ─────────────────────────────────────────────────── */
  {
    id: "12ga_s",
    label: ".12 Ga (ś – śrut)",
    icon: "ammo_12_ga.svg",
    category: "Śrutowa",
    family: "12ga",
    formula: "2d4",
    type: "piercing",
    props: [],
    note: "Ułatwienie do Testów Ataku vs istoty Małe, Malutkie i Roje.",
    price: 2, avail: 70, weight: 0.045
  },
  {
    id: "12ga_b",
    label: ".12 Ga (b – breneka)",
    icon: "ammo_12_ga_breneka.svg", // batch 40 (2026-09-25); wcześniej wspólna ze śrutem
    category: "Śrutowa",
    family: "12ga",
    formula: "2d6",
    type: "bludgeoning",
    props: ["burzaca", "obalajaca"],
    note: "Wersja monolityczna. Broń otrzymuje Burzącą i Obalającą.",
    price: 2, avail: 50, weight: 0.045
  },

  /* ── Granatnikowa / Ppanc ────────────────────────────────────── */
  {
    id: "40mm",
    label: "Granat 40 mm",
    icon: "ammo_40mm_grenade.svg",
    category: "Granatnikowa",
    formula: "6d6",
    type: "explosive",
    props: [],
    aoe: "Sześcian 3 m, RO Zręczność ST 15",
    price: 30, avail: 20, weight: 0.230
  },
  {
    id: "60mm",
    label: "Pocisk 60 mm",
    icon: "ammo_60mm_rocket.svg",
    category: "Granatnikowa",
    formula: "15d6",
    type: "explosive",
    props: [],
    aoe: "Sześcian 6 m, RO Zręczność ST 20",
    price: 60, avail: 10, weight: 1.700
  },
  {
    id: "120mm",
    label: "Pocisk 120 mm",
    icon: "ammo_120mm_mortar.svg",
    category: "Granatnikowa",
    formula: "10d6",
    type: "slashing",
    props: [],
    aoe: "Sześcian 9 m, RO Zręczność ST 20. +10d6 Wybuchowe.",
    price: 90, avail: 1, weight: 18.000
  },

  /* ── Miotana (łuki, kusze, proce, dmuchawki) ─────────────────── */
  {
    id: "strzala",
    label: "Strzała",
    icon: "ammo_arrow.svg",
    category: "Miotana",
    formula: "",
    type: "piercing",
    props: [],
    note: "Amunicja do wszystkich łuków. Obrażenia z karty broni.",
    price: 1, avail: 80, weight: 0.030
  },
  {
    id: "belt",
    label: "Bełt",
    icon: "ammo_bolt.svg",
    category: "Miotana",
    formula: "",
    type: "piercing",
    props: [],
    note: "Amunicja do wszystkich kusz. Obrażenia z karty broni.",
    price: 2, avail: 60, weight: 0.030
  },
  {
    id: "kulka",
    label: "Kulka stalowa",
    icon: "ammo_ball_bearing.svg",
    category: "Miotana",
    formula: "",
    type: "bludgeoning",
    props: [],
    note: "Pasuje do każdej procy. Obrażenia z karty broni.",
    price: 1, avail: 70, weight: 0.015
  },
  {
    id: "igla",
    label: "Igła (dmuchawka)",
    icon: "ammo_dart.svg",
    category: "Miotana",
    formula: "",
    type: "piercing",
    props: [],
    note: "Można napełnić dawką trucizny lub innej substancji.",
    price: 1, avail: 30, weight: 0.002
  },
  {
    id: "strzykawka",
    label: "Pocisk-strzykawka",
    icon: "ammo_dart.svg",
    category: "Miotana",
    formula: "",
    type: "piercing",
    props: [],
    note: "Rzadka amunicja — można napełnić trucizną.",
    price: 4, avail: 20, weight: 0.010
  },

  ...KOBALT_AMMO,
];

/* -----------------------------------------------------------------
   Rodziny naboi
----------------------------------------------------------------- */

/**
 * Warianty tego samego naboju - to, co fizycznie wchodzi do tej samej komory, ale zachowuje się
 * inaczej po trafieniu: `.12 Ga` śrut/breneka, `.44 Mag` zwykły/dum-dum.
 *
 * Wcześniej istniał tylko jeden taki przypadek i był zaszyty w `magazine.mjs` jako
 * `mag.ammoType?.startsWith("12ga")` z ręcznie wypisanym dialogiem dwóch opcji. Ten hack nie
 * dawał się rozszerzyć (dum-dum musiałby dopisać drugą gałąź `if`), a przy okazji był mylący:
 * prefiks ciągu znaków nie jest tym samym co zgodność kalibru - `12ga_s`/`12ga_b` pasują
 * przypadkiem, `44mag`/`44mag_dd` też by pasowały, ale `762`/`76239ak` pasowałyby BŁĘDNIE
 * (to dwa różne, niewymienne naboje). Jawne pole `family` mówi wprost, co z czym się wymienia.
 *
 * Kaliber bez `family` jest rodziną sam dla siebie - czyli domyślnie nic się nie zmienia.
 */
export function ammoFamily(caliberId) {
  const caliber = AMMO_CALIBER_MAP[caliberId];
  if (!caliber) return caliberId || null;
  return caliber.family ?? caliber.id;
}

/**
 * Wszystkie kalibry wymienne z podanym, łącznie z nim samym.
 * @param {string} caliberId
 * @returns {object[]} wpisy z `AMMO_CALIBERS`, w kolejności katalogowej
 */
export function familyCalibers(caliberId) {
  const family = ammoFamily(caliberId);
  if (!family) return [];
  return AMMO_CALIBERS.filter(c => (c.family ?? c.id) === family);
}

/** Fast lookup by id. */
export const AMMO_CALIBER_MAP = Object.freeze(
  Object.fromEntries(AMMO_CALIBERS.map(c => [c.id, c]))
);

/** All unique category names in stable display order. */
export const AMMO_CATEGORIES = [...new Set(AMMO_CALIBERS.map(c => c.category))];

/** Materiały wybuchowe (granaty, miny, ładunki), trzymane osobno od kalibrów i magazynków. */
export const GRENADE_TYPES = [
  {
    // RAW, *Sztuczki* → „Koktajl Mołotowa" (`8 SZTUCZKI/czesc-01.md`), przepisane 2026-09-23 —
    // wcześniej 3 m / ST 12 / 2k6 ogień / „obszar pali się 1 rundę", nic z tego z podręcznika.
    // Podpalanie butelki i jej 3-rundowy limit: `actors/molotov.mjs`.
    id: "grenade-molotov",
    label: "Koktajl Mołotowa",
    icon: "molotov_cocktail.svg",
    category: "Granaty",
    area: "Sześcian 1,5 m",
    save: "RO Zręczność ST 15",
    effect: "Porażka: 1k6 ogień + 1k6 obuchowe + Podpalenie (1 min). Sukces: brak obrażeń.",
    price: 10, avail: 70, weight: 1
  },
  // Miny i ładunki — RAW, *Sprzęt* → „Miny i ładunki wybuchowe" + „Granaty i im podobne"
  // (`8 SZTUCZKI/czesc-01.md`), przepisane 2026-09-24 (decyzja MG). Wcześniej katalog miał
  // własne liczby na prawie każdym polu (mina ppiech. 3 m / ZR 14 / 4k6+2k6, 1,5 kg; C4 6 m / 8k6
  // „+4k6 obiekty"; dynamit jako „pęk, det. zdalny"; pipebomb, którego w podręczniku nie ma).
  // „(burzące)" = RAW „Burząca: podwójne obrażenia obiektom" — karta pokazuje to MG, nie liczy.
  // `note` trzyma zasady łączenia: to nie są obrażenia rzutu, więc NIE może ich czytać
  // `_parseDamageSpec` (w `effect` „+2k6 za laskę" zostałoby dodane do każdego wybuchu).
  // `placed` — podkładany, nie rzucany (Test ST 10 w zasięgu 3 m); `detonation` — sposoby do
  // wyboru przy podkładaniu (`actors/charge-rules.mjs`, `DETONATION_METHODS`). Zdalne wymagają
  // zapalnika: radiowy z zestawu Detonatora radiowego, elektryczny (C4 wg RAW) — `items/detonator.mjs`.
  {
    id: "grenade-antipersonnel-mine",
    label: "Mina przeciwpiechotna",
    icon: "anti_personnel_mine.svg",
    category: "Miny",
    area: "Sześcian 1,5 m",
    save: "RO Zręczność ST 15",
    effect: "Porażka: 8k6 wybuchowe + Powalenie + Ogłuchnięcie (1 min).",
    note: "Detonacja: nadepnięcie lub wyzwalacz/pułapka. Rozbrojenie: ST 15.",
    placed: true, detonation: ["pressure"],
    price: 80, avail: 20, weight: 10
  },
  {
    id: "grenade-antivehicle-mine",
    label: "Mina przeciwpancerna",
    icon: "anti_vehicle_mine.svg",
    category: "Miny",
    area: "Sześcian 3 m",
    save: "RO Kondycja ST 15",
    effect: "Porażka: 15k6 wybuchowe (burzące).",
    note: "Detonacja: nacisk o wadze 1000 kg lub wyzwalacz/pułapka. Rozbrojenie: ST 15.",
    placed: true, detonation: ["pressure"],
    price: 120, avail: 10, weight: 15
  },
  {
    id: "grenade-c4-remote",
    label: "Plastik C4 (kostka 100 g)",
    icon: "c4_explosive.svg",
    category: "Ładunki",
    area: "Sześcian 3 m",
    save: "RO Kondycja ST 15",
    effect: "Porażka: 10k6 wybuchowe (burzące) + Powalenie + Ogłuchnięcie (1 min).",
    note: "Detonacja: detonator elektryczny. Rozbrojenie: ST 15. "
      + "Łączenie: każde 100 g więcej w ładunku — obrażenia +5k6, obszar +1,5 m.",
    placed: true, detonation: ["electric", "radio"],
    price: 100, avail: 5, weight: 0.1
  },
  {
    id: "grenade-dynamite",
    label: "Dynamit (laska)",
    icon: "dynamite.svg",
    category: "Ładunki",
    area: "Sześcian 3 m",
    save: "RO Zręczność ST 12",
    effect: "Porażka: 5k6 wybuchowe + Powalenie + Ogłuchnięcie (1 min).",
    note: "Podpalenie: akcja Używanie lub Akcja Bonusowa + źródło ognia. "
      + "Łączenie: każda laska więcej w wiązce — obrażenia +2k6; co dwie laski obszar +1,5 m.",
    price: 40, avail: 50, weight: 0.2
  },
  {
    id: "grenade-ied",
    label: "Ładunek improwizowany (IED)",
    icon: "pipebomb_fuze.svg",
    category: "Ładunki",
    area: "Sześcian 3 m",
    save: "RO Zręczność ST 15",
    effect: "Porażka: 3k6 wybuchowe + 3k6 ogień + Powalenie + Ogłuchnięcie (1 min).",
    note: "Detonacja: zdalna, czasowa lub wyzwalacz/pułapka. Rozbrojenie: ST 15.",
    placed: true, detonation: ["timer", "trigger", "electric", "radio"],
    price: 40, avail: 40, weight: 5
  },
  {
    id: "grenade-smoke",
    label: "Granat dymny",
    icon: "smoke_grenade.svg",
    category: "Granaty",
    area: "Sześcian 3 m / 6 m (bud.)",
    save: "—",
    effect: "Chmura dymu utrzymuje się 1 min.",
    price: 40, avail: 30, weight: 0.5
  },
  {
    id: "grenade-gas",
    label: "Granat gazowy",
    icon: "mustard_gas_grenade.svg",
    category: "Granaty",
    area: "Sześcian 3 m / 6 m (bud.)",
    save: "RO Kondycja ST 15",
    effect: "Porażka: Oślepienie + Zatrucie (1 min).",
    price: 60, avail: 20, weight: 1.0
  },
  {
    id: "grenade-flashbang",
    label: "Granat hukowy",
    icon: "flashbang_grenade.svg",
    category: "Granaty",
    area: "Sześcian 3 m",
    save: "RO Kondycja ST 15",
    effect: "Porażka: Oślepienie + Ogłuchnięcie (1 min).",
    price: 60, avail: 30, weight: 0.5
  },
  {
    id: "grenade-improvised",
    label: "Granat improwizowany",
    icon: "improvised_grenade.svg",
    category: "Granaty",
    area: "Sześcian 3 m",
    save: "RO Zręczność ST 10",
    effect: "Porażka: 2k6 wybuchowe + 2k6 cięte.",
    price: 20, avail: 60, weight: 0.5
  },
  {
    id: "grenade-frag",
    label: "Granat odłamkowy",
    icon: "fragmentation_grenade.svg",
    category: "Granaty",
    area: "Sześcian 9 m",
    save: "RO Zręczność ST 15",
    effect: "Porażka: 4k6 wybuchowe + 4k6 cięte + Powalenie + Ogłuchnięcie.",
    price: 70, avail: 40, weight: 0.5
  },
  {
    id: "grenade-incendiary",
    label: "Granat zapalający",
    icon: "incendiary_grenade.svg",
    category: "Granaty",
    area: "Sześcian 6 m",
    save: "RO Zręczność ST 15",
    effect: "Porażka: 6k6 ogień + Podpalenie.",
    price: 70, avail: 20, weight: 1.0
  },
  ...KOBALT_EXPLOSIVES,
];

/** Fast lookup by grenade id. */
export const GRENADE_MAP = Object.freeze(
  Object.fromEntries(GRENADE_TYPES.map(g => [g.id, g]))
);

/**
 * Opis itemu materiału wybuchowego — jedno źródło dla paczki (`dev/packs/build-packs.mjs`),
 * przycisku „Dodaj ładunek" na karcie i synchronizacji rozdanych kopii. Waga, cena i opis są
 * wypiekane w item, więc rozjazd tych trzech ścieżek to rozjazd przy stole.
 */
export function grenadeDescription(def) {
  return `<p><strong>Obszar:</strong> ${def.area ?? "—"}</p>`
    // `save` zaczyna się od „RO …" — bez tego opis mówił „RO: RO Zręczność ST 15".
    + `<p><strong>RO:</strong> ${String(def.save ?? "—").replace(/^RO\s+/, "")}</p>`
    + `<p>${def.effect ?? ""}</p>`
    + (def.note ? `<p>${def.note}</p>` : "");
}

/** Pola itemu wyprowadzone z katalogu (bez ilości i id) — patrz `grenadeDescription`. */
export function grenadeItemFields(def, moduleId = "neuroshima-2026-overrides") {
  return {
    name: def.label,
    img: `modules/${moduleId}/icons/weapons/${def.icon}`,
    "system.type.subtype": def.id,
    "system.weight.value": def.weight,
    "system.price.value": def.price,
    "system.description.value": grenadeDescription(def)
  };
}

/**
 * Build HTML for a caliber <select> element.
 * @param {string} currentValue  Currently selected caliber id.
 * @param {boolean} [disabled]   Whether the select should be disabled.
 * @param {string} [name]        The form field name attribute.
 * @returns {string}             HTML string for the <select>.
 */
export function buildCaliberSelect(currentValue, disabled = false, name = "") {
  const groups = {};
  for (const c of AMMO_CALIBERS) {
    groups[c.category] ??= [];
    groups[c.category].push(c);
  }

  const attrs = [
    name ? `name="${name}"` : "",
    `style="flex:1;min-width:120px"`,
    disabled ? "disabled" : "",
  ].filter(Boolean).join(" ");

  let html = `<select ${attrs}>`;
  html += `<option value="">— kaliber —</option>`;
  for (const [cat, calibers] of Object.entries(groups)) {
    html += `<optgroup label="${cat}">`;
    for (const c of calibers) {
      const formulaInfo = c.formula ? ` [${c.formula}]` : "";
      const sel = currentValue === c.id ? " selected" : "";
      html += `<option value="${c.id}"${sel}>${c.label}${formulaInfo}</option>`;
    }
    html += `</optgroup>`;
  }
  html += `</select>`;
  return html;
}
