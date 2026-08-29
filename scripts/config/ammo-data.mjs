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
    formula: "2d4",
    type: "piercing",
    props: [],
    note: "Ułatwienie do Testów Ataku vs istoty Małe, Malutkie i Roje.",
    price: 2, avail: 70, weight: 0.045
  },
  {
    id: "12ga_b",
    label: ".12 Ga (b – breneka)",
    icon: "ammo_12_ga.svg",
    category: "Śrutowa",
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
];

/** Fast lookup by id. */
export const AMMO_CALIBER_MAP = Object.freeze(
  Object.fromEntries(AMMO_CALIBERS.map(c => [c.id, c]))
);

/** All unique category names in stable display order. */
export const AMMO_CATEGORIES = [...new Set(AMMO_CALIBERS.map(c => c.category))];

/** Materiały wybuchowe (granaty, miny, ładunki), trzymane osobno od kalibrów i magazynków. */
export const GRENADE_TYPES = [
  {
    id: "grenade-molotov",
    label: "Koktajl Mołotowa",
    icon: "molotov_cocktail.svg",
    category: "Granaty",
    area: "Sześcian 3 m",
    save: "RO Zręczność ST 12",
    effect: "Porażka: 2k6 ogień + Podpalenie. Obszar pali się 1 rundę.",
    price: 15, avail: 70, weight: 0.8
  },
  {
    id: "grenade-antipersonnel-mine",
    label: "Mina przeciwpiechotna",
    icon: "anti_personnel_mine.svg",
    category: "Miny",
    area: "Sześcian 3 m",
    save: "RO Zręczność ST 14",
    effect: "Wyzwalana naciskiem. Porażka: 4k6 wybuchowe + 2k6 cięte + Powalenie.",
    price: 90, avail: 15, weight: 1.5
  },
  {
    id: "grenade-antivehicle-mine",
    label: "Mina przeciwpojazdowa",
    icon: "anti_vehicle_mine.svg",
    category: "Miny",
    area: "Sześcian 6 m",
    save: "RO Zręczność ST 14",
    effect: "Silny ładunek ppanc. Porażka: 8k6 wybuchowe; pojazdy: +4k6.",
    price: 220, avail: 10, weight: 5.0
  },
  {
    id: "grenade-c4-remote",
    label: "Ładunek C4 (det. zdalny)",
    icon: "c4_remote_charge.svg",
    category: "Ładunki",
    area: "Sześcian 6 m",
    save: "RO Zręczność ST 15",
    effect: "Detonacja zdalna. Porażka: 8k6 wybuchowe; obiekty i osłony: +4k6.",
    price: 260, avail: 8, weight: 1.0
  },
  {
    id: "grenade-dynamite-remote",
    label: "Pęk dynamitu (det. zdalny)",
    icon: "dynamite_remote_bundle.svg",
    category: "Ładunki",
    area: "Sześcian 6 m",
    save: "RO Zręczność ST 13",
    effect: "Detonacja zdalna. Porażka: 6k6 wybuchowe; obiekty: +2k6.",
    price: 140, avail: 20, weight: 2.0
  },
  {
    id: "grenade-pipebomb-fuze",
    label: "Pipebomb (z lontem)",
    icon: "pipebomb_fuze.svg",
    category: "Ładunki",
    area: "Sześcian 3 m",
    save: "RO Zręczność ST 12",
    effect: "Lont 1 runda. Porażka: 3k6 wybuchowe + 2k6 cięte.",
    price: 35, avail: 45, weight: 0.9
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
  {
    id: "grenade-signal",
    label: "Granat sygnałowy",
    // TODO(icons): interim reuse of smoke_grenade.svg — real art not commissioned yet.
    icon: "smoke_grenade.svg",
    category: "Granaty",
    area: "—",
    save: "—",
    effect: "Sygnał świetlny/dymny widoczny z dużej odległości. Brak obrażeń.",
    price: 20, avail: 40, weight: 0.3
  },
];

/** Fast lookup by grenade id. */
export const GRENADE_MAP = Object.freeze(
  Object.fromEntries(GRENADE_TYPES.map(g => [g.id, g]))
);

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
