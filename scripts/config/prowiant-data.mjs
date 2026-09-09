/**
 * Neuroshima 5e — Prowiant (food & water stock).
 *
 * RAW thresholds, `Tabele/Zywnosc.md` § Zasady Odżywiania:
 *   - eat at least 0.5 kg/day or gain a level of Wyczerpanie (Niedożywienie)
 *   - drink at least 2 L/day or gain a level of Wyczerpanie (Odwodnienie)
 *
 * This is deliberately NOT a full k100 food table matched item-by-item like
 * Surowce's five materials — a live scan of the whole party found exactly two
 * recurring item names ("Konserwa", "Litr Wody") covering nearly every
 * character's actual stock, so matching is done by loose category regex
 * instead of an enumerated catalog. `weight` is never guessed: the panel sums
 * whatever `system.weight × system.quantity` the item itself already carries,
 * on the theory that 1 L water ≈ 1 kg (true for every "Litr Wody" instance
 * seen live), so both pools can share one weight-based unit.
 *
 * Display-only, by design (2026-08-29 decision) — no automatic Wyczerpanie
 * application. This just answers "how many days of food/water do we have,"
 * matching the project's standing rule that detection is automated but
 * penalties stay a GM call.
 */

/** @typedef {{id:string, label:string, unit:string, dailyThreshold:number, accent:string, match:RegExp}} ProwiantCategory */

/** @type {ReadonlyArray<ProwiantCategory>} */
export const PROWIANT_CATEGORIES = Object.freeze([
  {
    id: "jedzenie",
    label: "Jedzenie",
    unit: "kg",
    dailyThreshold: 0.5,
    accent: "#c2925a",
    // Rozszerzone 2026-09-09: "Jerky" nie pasowało do niczego, więc jedzenie o nietypowej
    // nazwie było dla licznika dni zapasu niewidzialne — a niewidzialne znaczy tu "postać
    // głoduje, a karta twierdzi, że nie ma zapasów". Dorzucone formy suszone, batony,
    // liofilizaty i puszki, czyli to, co realnie trafia do plecaka.
    match: /konserw|prowiant\b|racj[ae]|mre\b|chleb|mi[ęe]so|\bser\b|ryb[ay]?\b|owoc|warzyw|mleko|kasz[ae]|ry[żz]u?\b|jajk|kawa|herbat|jerky|susz|w[eę]dlin|salami|kie[lł]bas|baton|sucharek|herbatnik|krakers|liofiliz|\bpuszk|s[lł]onin|fasol|groch|m[ąa]k[ai]?\b|mi[oó]d|orzech|p[lł]atk/i
  },
  {
    id: "woda",
    label: "Woda",
    unit: "l",
    dailyThreshold: 2,
    accent: "#5ab0c2",
    // "Manierka", "Kanister wody", "Woda filtrowana (1 l)" — wszystko to woda pitna w praktyce.
    match: /\bwod[ayęy]\b|\bwody\b|manierk|kanister wod|\bnapoj|\bnap[oó]j/i
  }
]);


/* -----------------------------------------------------------------
   Katalog do zakupów
----------------------------------------------------------------- */

const ICON_DIR = "modules/neuroshima-2026-overrides/icons";

/**
 * Pozycje, które da się dodać do ekwipunku przyciskiem "Dodaj prowiant".
 *
 * Ceny, dostępność i wagi są przepisane wprost z `Tabele/Zywnosc.md` (Tabela Żywności oraz
 * sekcja 🏠 Dodatkowe Pozycje Handlowe) — nic tu nie jest zgadywane. To świadomie NIE jest
 * cała tabela k100: przyprawy, sól czy olej nikogo nie żywią jako racja dzienna i tylko
 * zaśmiecałyby wybór. Panel i tak liczy każdy przedmiot, którego nazwa pasuje do wzorca
 * kategorii, więc pozycja spoza tej listy nadal działa — katalog to skrót, nie bramka.
 *
 * `perDay` oznacza pozycje sprzedawane jako gotowa racja dzienna (MRE): waga jest wtedy
 * podana za dzień, nie za kilogram.
 *
 * @typedef {object} ProwiantEntry
 * @property {string} id
 * @property {string} label
 * @property {"jedzenie"|"woda"} category
 * @property {number} price   gb za sztukę
 * @property {number} avail   procentowa dostępność (RAW DOST.)
 * @property {number} weight  kg (albo litry, liczone 1 l ≈ 1 kg)
 * @property {string} icon    pełna ścieżka do ikony
 */

/** @type {ReadonlyArray<ProwiantEntry>} */
export const PROWIANT_CATALOG = Object.freeze([
  // --- Jedzenie ---
  { id: "konserwa",     label: "Konserwa (1 kg)",              category: "jedzenie", price: 15,  avail: 20,  weight: 1,    icon: `${ICON_DIR}/weapons/canned_food.svg` },
  { id: "prowiant",     label: "Prowiant (1 kg)",              category: "jedzenie", price: 10,  avail: 50,  weight: 1,    icon: `${ICON_DIR}/weapons/canned_food.svg` },
  { id: "chleb",        label: "Chleb (1 kg)",                 category: "jedzenie", price: 10,  avail: 60,  weight: 1,    icon: `${ICON_DIR}/weapons/canned_food.svg` },
  { id: "mieso",        label: "Mięso (1 kg)",                 category: "jedzenie", price: 10,  avail: 80,  weight: 1,    icon: `${ICON_DIR}/weapons/canned_food.svg` },
  { id: "mieso_suszone", label: "Mięso suszone / jerky (1 kg)", category: "jedzenie", price: 20, avail: 40,  weight: 1,    icon: `${ICON_DIR}/weapons/canned_food.svg` },
  { id: "ser",          label: "Ser (1 kg)",                   category: "jedzenie", price: 10,  avail: 40,  weight: 1,    icon: `${ICON_DIR}/weapons/canned_food.svg` },
  { id: "ryby",         label: "Ryby (1 kg)",                  category: "jedzenie", price: 20,  avail: 40,  weight: 1,    icon: `${ICON_DIR}/weapons/canned_food.svg` },
  { id: "owoce",        label: "Owoce i warzywa (1 kg)",       category: "jedzenie", price: 15,  avail: 30,  weight: 1,    icon: `${ICON_DIR}/weapons/canned_food.svg` },
  { id: "liofilizat",   label: "Liofilizowana żywność (1 kg)", category: "jedzenie", price: 45,  avail: 10,  weight: 1,    icon: `${ICON_DIR}/weapons/canned_food.svg` },
  { id: "mre",          label: "Racja wojskowa MRE (1 dzień)", category: "jedzenie", price: 50,  avail: 5,   weight: 0.75, icon: `${ICON_DIR}/items/loot/menazka.svg` },
  // --- Woda ---
  { id: "woda_brudna",     label: "Woda brudna (1 l)",     category: "woda", price: 0.5, avail: 100, weight: 1, icon: `${ICON_DIR}/items/loot/manierka.svg` },
  { id: "woda_pitna",      label: "Woda pitna (1 l)",      category: "woda", price: 1,   avail: 80,  weight: 1, icon: `${ICON_DIR}/items/loot/woda_filtrowana.svg` },
  { id: "woda_filtrowana", label: "Woda filtrowana (1 l)", category: "woda", price: 2,   avail: 50,  weight: 1, icon: `${ICON_DIR}/items/loot/woda_filtrowana.svg` },
  { id: "mleko",           label: "Mleko (1 l)",           category: "woda", price: 5,   avail: 50,  weight: 1, icon: `${ICON_DIR}/items/loot/manierka.svg` },
]);

/** @type {Readonly<Record<string, ProwiantEntry>>} */
export const PROWIANT_CATALOG_MAP = Object.freeze(
  Object.fromEntries(PROWIANT_CATALOG.map(e => [e.id, e]))
);

/**
 * Dane przedmiotu dla pozycji katalogowej. Zostaje `loot` — nic nie czyta typu tych rzeczy
 * (patrz `getProwiantCategory`), a zmiana typu na consumable niosłaby tę samą pułapkę
 * co przy gadżetach, bez żadnego zysku.
 * @param {string} id
 * @param {number} [quantity]
 */
export function buildProwiantItemData(id, quantity = 1) {
  const entry = PROWIANT_CATALOG_MAP[id];
  if (!entry) throw new Error(`Unknown prowiant entry "${id}"`);
  return {
    name: entry.label,
    type: "loot",
    img: entry.icon,
    system: {
      description: { value: "", chat: "" },
      source: { custom: "Neuroshima RPG", rules: "2024" },
      quantity,
      weight: { value: entry.weight, units: "kg" },
      price: { value: entry.price, denomination: "gb" },
      identified: true
    },
    flags: { "neuroshima-2026-overrides": { prowiantId: entry.id, availability: entry.avail } }
  };
}

/**
 * Resolve the Prowiant category for an item, or `null`.
 * `loot` and plain `consumable` both qualify — unlike Surowce/Chemia, food/water
 * stock on real sheets is almost always still typed `loot`, and forcing a retype
 * would fight the audit tool for no functional gain (nothing reads this item's
 * `type` anywhere else).
 * @param {Item} item
 * @returns {ProwiantCategory|null}
 */
export function getProwiantCategory(item) {
  if (item?.type !== "loot" && item?.type !== "consumable") return null;
  // Never double-count something the Chemia/Surowce systems already own.
  if (item.getFlag?.("neuroshima-2026-overrides", "chemiaKey")) return null;
  const name = item.name ?? "";
  for (const cat of PROWIANT_CATEGORIES) {
    if (cat.match.test(name)) return cat;
  }
  return null;
}
