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
 */

export const AMMO_CALIBERS = [
  /* ── Pistoletowa ─────────────────────────────────────────────── */
  {
    id: "22lr",
    label: ".22 LR",
    category: "Pistoletowa",
    formula: "1d4",
    type: "piercing",
    props: [],
    note: "Tani nabój o niskiej mocy. Nie można elaborować.",
    price: 1, avail: 80
  },
  {
    id: "38spl",
    label: ".38 SPL",
    category: "Pistoletowa",
    formula: "1d6",
    type: "piercing",
    props: [],
    price: 1, avail: 70
  },
  {
    id: "9mm",
    label: "9 mm",
    category: "Pistoletowa",
    formula: "1d6",
    type: "piercing",
    props: [],
    price: 2, avail: 70
  },
  {
    id: "45acp",
    label: ".45 ACP",
    category: "Pistoletowa",
    formula: "1d8",
    type: "piercing",
    props: [],
    price: 3, avail: 60
  },
  {
    id: "44mag",
    label: ".44 Mag",
    category: "Pistoletowa",
    formula: "1d10",
    type: "piercing",
    props: ["obalajaca"],
    price: 3, avail: 50
  },

  /* ── Karabinowa ──────────────────────────────────────────────── */
  {
    id: "556",
    label: "5,56 mm",
    category: "Karabinowa",
    formula: "2d6",
    type: "piercing",
    props: [],
    price: 3, avail: 60
  },
  {
    id: "76239ak",
    label: "7,62×39 mm AK",
    category: "Karabinowa",
    formula: "2d8",
    type: "piercing",
    props: [],
    price: 4, avail: 30
  },
  {
    id: "762",
    label: "7,62 mm",
    category: "Karabinowa",
    formula: "2d8",
    type: "piercing",
    props: [],
    price: 4, avail: 40
  },
  {
    id: "3006",
    label: ".30-06",
    category: "Karabinowa",
    formula: "2d6",
    type: "piercing",
    props: ["obalajaca"],
    note: "Popularny wśród myśliwych. Broń otrzymuje Obalającą.",
    price: 3, avail: 50
  },
  {
    id: "50bmg",
    label: ".50 BMG",
    category: "Karabinowa",
    formula: "1d20",
    type: "piercing",
    props: ["obalajaca"],
    note: "Przeciwpancerny nabój karabinowy. Broń otrzymuje Obalającą.",
    price: 10, avail: 40
  },

  /* ── Śrutowa ─────────────────────────────────────────────────── */
  {
    id: "12ga_s",
    label: ".12 Ga (ś – śrut)",
    category: "Śrutowa",
    formula: "2d4",
    type: "piercing",
    props: [],
    note: "Ułatwienie do Testów Ataku vs istoty Małe, Malutkie i Roje.",
    price: 2, avail: 70
  },
  {
    id: "12ga_b",
    label: ".12 Ga (b – breneka)",
    category: "Śrutowa",
    formula: "2d6",
    type: "bludgeoning",
    props: ["burzaca", "obalajaca"],
    note: "Wersja monolityczna. Broń otrzymuje Burzącą i Obalającą.",
    price: 2, avail: 50
  },

  /* ── Granatnikowa / Ppanc ────────────────────────────────────── */
  {
    id: "40mm",
    label: "Granat 40 mm",
    category: "Granatnikowa",
    formula: "6d6",
    type: "explosive",
    props: [],
    aoe: "Sześcian 3 m, RO Zręczność ST 15",
    price: 30, avail: 20
  },
  {
    id: "60mm",
    label: "Pocisk 60 mm",
    category: "Granatnikowa",
    formula: "15d6",
    type: "explosive",
    props: [],
    aoe: "Sześcian 6 m, RO Zręczność ST 20",
    price: 60, avail: 10
  },
  {
    id: "120mm",
    label: "Pocisk 120 mm",
    category: "Granatnikowa",
    formula: "10d6",
    type: "slashing",
    props: [],
    aoe: "Sześcian 9 m, RO Zręczność ST 20. +10d6 Wybuchowe.",
    price: 90, avail: 1
  },

  /* ── Miotana (łuki, kusze, proce, dmuchawki) ─────────────────── */
  {
    id: "strzala",
    label: "Strzała",
    category: "Miotana",
    formula: "",
    type: "piercing",
    props: [],
    note: "Amunicja do wszystkich łuków. Obrażenia z karty broni.",
    price: 1, avail: 80
  },
  {
    id: "belt",
    label: "Bełt",
    category: "Miotana",
    formula: "",
    type: "piercing",
    props: [],
    note: "Amunicja do wszystkich kusz. Obrażenia z karty broni.",
    price: 2, avail: 60
  },
  {
    id: "kulka",
    label: "Kulka stalowa",
    category: "Miotana",
    formula: "",
    type: "bludgeoning",
    props: [],
    note: "Pasuje do każdej procy. Obrażenia z karty broni.",
    price: 1, avail: 70
  },
  {
    id: "igla",
    label: "Igła (dmuchawka)",
    category: "Miotana",
    formula: "",
    type: "piercing",
    props: [],
    note: "Można napełnić dawką trucizny lub innej substancji.",
    price: 1, avail: 30
  },
  {
    id: "strzykawka",
    label: "Pocisk-strzykawka",
    category: "Miotana",
    formula: "",
    type: "piercing",
    props: [],
    note: "Rzadka amunicja — można napełnić trucizną.",
    price: 4, avail: 20
  },
];

/** Fast lookup by id. */
export const AMMO_CALIBER_MAP = Object.freeze(
  Object.fromEntries(AMMO_CALIBERS.map(c => [c.id, c]))
);

/** All unique category names in stable display order. */
export const AMMO_CATEGORIES = [...new Set(AMMO_CALIBERS.map(c => c.category))];

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
