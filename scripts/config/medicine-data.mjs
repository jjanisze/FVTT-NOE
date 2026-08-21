/**
 * Neuroshima 5e — Lekarstwa (medicines).
 *
 * Medicines are ordinary dnd5e **consumables** ("Używki" in the inventory), so
 * they inherit the whole native item pipeline: quantity, uses, an activity that
 * spends a dose, autoDestroy on empty, chat cards, favourites, weight.
 * This module is the source of truth; `dev/packs/build-packs.mjs` emits the
 * `neuroshima-2026-overrides.lekarstwa` compendium from it, and
 * `actors/health-panel.mjs` uses it to resolve / import a medicine on demand.
 *
 * Prices are RAW per-dose (tabela LEKARSTWA, str. 111) unless `doses` says the
 * item is sold as a package, in which case the price is for the whole package.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/** Consumable type key registered in `config/terminology.mjs`. */
export const MEDICINE_TYPE = "lekarstwo";

/** Subtypes shown in the item sheet dropdown. */
export const MEDICINE_SUBTYPES = Object.freeze({
  przewlekla: "Na chorobę przewlekłą",
  popromienna: "Przeciwradiacyjne",
  antybiotyk: "Antybiotyk",
  inne: "Inne"
});

/**
 * @typedef {object} MedicineDef
 * @property {string}  label          Item name.
 * @property {string}  subtype        MEDICINE_SUBTYPES key.
 * @property {number}  price          Gamble; per dose unless `doses` > 1.
 * @property {number}  availability   Percentage chance to find it (RAW DOST.).
 * @property {number}  doses          Doses per item unit (1 = one dose per quantity).
 * @property {number}  weight         kg per unit.
 * @property {string[]} treats        Disease keys from `diseases-data.mjs`.
 * @property {string}  description
 */

/** @type {Readonly<Record<string, MedicineDef>>} */
export const MEDICINES = Object.freeze({
  desmopresyna: {
    label: "Desmopresyna",
    subtype: "przewlekla",
    price: 1, availability: 30, doses: 1, weight: 0.05,
    treats: ["hemofilia"],
    description: "Zastrzyk podnoszący krzepliwość krwi. Wstrzyknięcie w trakcie krwawienia "
      + "natychmiast je powstrzymuje."
  },
  preparatyKrwiopochodne: {
    label: "Preparaty krwiopochodne",
    subtype: "przewlekla",
    price: 1, availability: 20, doses: 1, weight: 0.2,
    treats: ["hemofilia"],
    description: "Zamiennik Desmopresyny — trudniejszy w przechowywaniu, równie skuteczny."
  },
  aspirynaK: {
    label: "Aspiryna K",
    subtype: "przewlekla",
    price: 2, availability: 80, doses: 1, weight: 0.02,
    treats: ["niewydolnoscKrazenia"],
    description: "Najpopularniejszy lek na rynku. Rozrzedza krew i odciąża zmęczone serce."
  },
  dracophen: {
    label: "Dracophen",
    subtype: "przewlekla",
    price: 2, availability: 60, doses: 1, weight: 0.02,
    treats: ["syndromDraculi"],
    description: "Stabilizuje reakcję skóry i siatkówki na światło."
  },
  reminex: {
    label: "Reminex",
    subtype: "przewlekla",
    price: 3, availability: 30, doses: 1, weight: 0.02,
    treats: ["syndromThurmana"],
    description: "Nootropik spowalniający degradację funkcji poznawczych."
  },
  relanium: {
    label: "Relanium",
    subtype: "przewlekla",
    price: 2, availability: 30, doses: 1, weight: 0.02,
    treats: ["szalenstwoBostonskie"],
    description: "Silny środek uspokajający. Trzyma furię na smyczy — dopóki bierzesz."
  },
  wapniak: {
    label: "Wapniak",
    subtype: "przewlekla",
    price: 1, availability: 30, doses: 1, weight: 0.02,
    treats: ["osteoporoza"],
    description: "Kredowa tabletka o smaku tynku. Utrzymuje kości w jednym kawałku."
  },
  psychotropy: {
    label: "Psychotropy",
    subtype: "przewlekla",
    price: 3, availability: 30, doses: 1, weight: 0.02,
    treats: ["paranoja"],
    description: "Tłumi natrętne myśli. Nie leczy — po prostu ścisza."
  },
  actinix: {
    label: "Actinix",
    subtype: "przewlekla",
    price: 2, availability: 50, doses: 1, weight: 0.02,
    treats: ["zaburzeniaBledinka"],
    description: "Stabilizuje błędnik. Bez niego świat nie chce stać w miejscu."
  },
  radoff: {
    label: "RadOff",
    subtype: "popromienna",
    price: 30, availability: 20, doses: 1, weight: 0.3,
    treats: ["popromienna"],
    description: "Kuracja odkażająca. Leczy chorobę popromienną, przyjmowany 10 dni z rzędu."
  },
  radmov: {
    label: "RadMov",
    subtype: "popromienna",
    price: 20, availability: 40, doses: 1, weight: 0.05,
    treats: ["popromienna"],
    description: "Nie leczy, ale daje Ułatwienie w Rzutach Obronnych na Kondycję przeciw "
      + "chorobie popromiennej."
  },
  antybiotyk: {
    label: "Antybiotyk (10 dawek)",
    subtype: "antybiotyk",
    price: 40, availability: 40, doses: 10, weight: 0.05,
    treats: ["zakazna", "szczurzaGoraczka"],
    description: "Pigułka lub zawiesina, której regularne stosowanie pozwala wyleczyć cię "
      + "z nabytej choroby. Kuracja trwa co najmniej 10 dni."
  }
});

/**
 * Narrative lines for the "Weź dawkę" chat card — what the table *sees* the
 * character do. One is picked at random; `{a}` is the actor name.
 */
export const MEDICINE_FLAVOR = Object.freeze({
  desmopresyna: [
    "{a} zakasuje rękaw, wbija igłę w zgięcie łokcia i przez chwilę patrzy w bok.",
    "{a} rozgryza plastikową osłonkę strzykawki zębami i robi sobie zastrzyk bez patrzenia."
  ],
  preparatyKrwiopochodne: [
    "{a} wyciąga zimną fiolkę spod kurtki, wstrząsa nią i wbija igłę w udo.",
    "{a} podłącza sobie preparat na kilka minut, klnąc pod nosem na zapach."
  ],
  aspirynaK: [
    "{a} wyciska dwie tabletki z pogniecionego blistra i połyka na sucho.",
    "{a} rozgryza Aspirynę K, krzywi się i popija czymkolwiek ma pod ręką."
  ],
  dracophen: [
    "{a} połyka Dracophen i naciąga kaptur głębiej na oczy.",
    "{a} zażywa dawkę i przez moment mruży oczy, jakby światło zrobiło się ostrzejsze."
  ],
  reminex: [
    "{a} długo wpatruje się w tabletkę, zanim przypomni sobie, po co ją trzyma. Potem połyka.",
    "{a} bierze Reminex i przez chwilę powtarza sobie coś półgłosem."
  ],
  relanium: [
    "{a} rozgryza relanium i oddycha wolniej. Ramiona opadają.",
    "{a} połyka dawkę, zaciska pięści, rozluźnia. Ktoś w pobliżu wypuszcza powietrze z ulgą."
  ],
  wapniak: [
    "{a} chrupie kredową tabletkę wapniaka, krzywiąc się na smak tynku.",
    "{a} wytrząsa wapniaka z fiolki i połyka bez wody, jak co dzień."
  ],
  psychotropy: [
    "{a} odlicza tabletki dwa razy, zanim je połknie. Potem sprawdza, czy nikt nie patrzył.",
    "{a} bierze dawkę psychotropów i przez chwilę patrzy każdemu w oczy po kolei."
  ],
  actinix: [
    "{a} połyka Actinix i przytrzymuje się czegoś, aż świat przestanie się kiwać.",
    "{a} zażywa dawkę, mocno mrugając, zanim horyzont wróci na miejsce."
  ],
  radoff: [
    "{a} wbija ampułkę RadOffu w udo. Przez skórę rozchodzi się piekące zimno.",
    "{a} przyjmuje RadOff i przez minutę oddycha przez zaciśnięte zęby."
  ],
  radmov: [
    "{a} połyka RadMov i sprawdza wskazanie licznika.",
    "{a} bierze RadMov na zapas, zerkając w stronę skażonej strefy."
  ],
  antybiotyk: [
    "{a} odlicza kolejną dawkę antybiotyku z opakowania i popija.",
    "{a} połyka antybiotyk i odhacza dzień kuracji na przedramieniu."
  ]
});

/** Generic fallback lines for custom / unknown medicines. */
export const MEDICINE_FLAVOR_DEFAULT = Object.freeze([
  "{a} przyjmuje dawkę {m}, nie przerywając rozmowy.",
  "{a} zażywa {m} — szybko, żeby nikt nie zdążył zapytać.",
  "{a} bierze swoją dzienną dawkę {m} i chowa opakowanie głębiej do kieszeni."
]);

/** @returns {MedicineDef|null} */
export function getMedicine(key) {
  return key ? (MEDICINES[key] ?? null) : null;
}

/** Find a medicine key by its display name (case/whitespace-insensitive). */
export function medicineKeyByName(name) {
  const norm = String(name ?? "").toLowerCase().trim();
  if (!norm) return null;
  for (const [key, def] of Object.entries(MEDICINES)) {
    if (def.label.toLowerCase() === norm) return key;
  }
  // Loose match: player items are often named "Wapniak (20)" or "Actinix/Rephidal".
  for (const [key, def] of Object.entries(MEDICINES)) {
    const base = def.label.replace(/\s*\(.*\)$/, "").toLowerCase();
    if (norm.includes(base)) return key;
  }
  return null;
}

/** All medicine keys that treat a given disease key. */
export function medicinesForDisease(diseaseKey) {
  if (!diseaseKey) return [];
  return Object.entries(MEDICINES)
    .filter(([, def]) => def.treats.includes(diseaseKey))
    .map(([key]) => key);
}

/**
 * Build the consumable item data for a medicine. Used both by the pack builder
 * and by the panel when it has to materialise an item on the fly (compendium
 * missing, or the GM adding a dose supply straight from the disease row).
 * @param {string} key
 * @param {object} [options]
 * @param {number} [options.quantity=1]
 * @param {string} [options._id]        Deterministic id, for the pack builder.
 * @returns {object} Item creation data.
 */
export function medicineItemData(key, { quantity = 1, _id } = {}) {
  const def = MEDICINES[key];
  if (!def) throw new Error(`Unknown medicine "${key}"`);

  const activityId = `dose${key}`.padEnd(16, "0").slice(0, 16);
  const multiDose = def.doses > 1;

  const data = {
    name: def.label,
    type: "consumable",
    // Core icons — no bespoke medicine art yet, and a missing file renders as a
    // broken image on every inventory row.
    img: def.subtype === "popromienna" ? "icons/svg/blood.svg" : "icons/svg/pill.svg",
    system: {
      description: { value: `<p>${def.description}</p>`, chat: "" },
      source: { custom: "Neuroshima RPG", rules: "2024" },
      quantity,
      weight: { value: def.weight, units: "kg" },
      price: { value: def.price, denomination: "gp" },
      type: { value: MEDICINE_TYPE, subtype: def.subtype },
      // Packaged medicines track doses natively via uses; single-dose ones just
      // burn a quantity, which is what `autoDestroy` does at 0 uses.
      uses: multiDose
        ? { max: String(def.doses), spent: 0, recovery: [], autoDestroy: true }
        : { max: "1", spent: 0, recovery: [], autoDestroy: true },
      activities: {
        [activityId]: {
          _id: activityId,
          type: "utility",
          name: "Zażyj dawkę",
          activation: { type: "action", value: 1 },
          consumption: {
            targets: [{ type: "itemUses", value: "1", target: "" }],
            scaling: { allowed: false }
          },
          description: {}
        }
      }
    },
    flags: {
      [MODULE_ID]: {
        medicineKey: key,
        doses: def.doses,
        availability: def.availability,
        treats: def.treats
      }
    }
  };

  if (_id) data._id = _id;
  return data;
}
