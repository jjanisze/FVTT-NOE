/**
 * Neuroshima 5e — Chemia, leki, narkotyki i używki.
 *
 * Single source of truth for everything swallowed, injected, smeared or smoked.
 * Merged from two previously separate sets:
 *   - the 12 disease medicines that used to live in `medicine-data.mjs`
 *     (`Podrecznik` tabela LEKARSTWA, str. 111), and
 *   - `Tabele/ChemiaIDrugi.md` (14 środków leczniczych, 9 narkotyków/używek,
 *     3 materiały pirotechniczne).
 *
 * They overlap in exactly three entries — RadOff, RadMov, Antybiotyk — which
 * agree on price and availability in both sources, so they are the same item and
 * are declared once here with the union of both sets of mechanics.
 *
 * Everything except the pyrotechnics is a dnd5e **consumable**, so it inherits
 * the native item pipeline: quantity, uses, an activity that spends a dose,
 * autoDestroy on empty, chat cards, favourites, weight. The pyrotechnics are
 * crafting stock, not something you take, so they are `loot`.
 *
 * `dev/packs/build-packs.mjs` emits the `lekarstwa` compendium from this module;
 * `actors/health-panel.mjs` resolves a disease's medicine through it; and
 * `items/chemia.mjs` runs whatever mechanics cannot be expressed as a plain
 * Active Effect.
 *
 * ## How a rulebook sentence becomes mechanics
 *
 * Same split as `config/disease-effects.mjs`: the `description` quotes the book
 * and must not drift, while `mech` encodes judgement calls about how the sentence
 * maps onto dnd5e. Anything the system deliberately does NOT enforce goes in
 * `mech.manual`, which the chat card prints out loud — a mechanic that applies
 * silently is a bug, and so is one that silently does not.
 *
 * Prices are RAW per dose unless `doses` says the item is sold as a package, in
 * which case the price covers the whole package.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/**
 * Custom art (2026-08-29 icon sweep). Most of the catalog was shipping on
 * generic Foundry core placeholders (`icons/svg/pill.svg` and friends) despite
 * dedicated commissioned icons already sitting unused in these directories —
 * `def.img` below just never got pointed at them. See IMPLEMENTATION.md.
 */
const DRUGS_ICON_DIR = `modules/${MODULE_ID}/icons/items/drugs`;
const CHEMIA_LOOT_ICON_DIR = `modules/${MODULE_ID}/icons/items/loot`;

/** Consumable type key registered in `config/terminology.mjs`. */
export const CHEMIA_TYPE = "lekarstwo";

/** Subtypes shown in the item sheet dropdown. */
export const CHEMIA_SUBTYPES = Object.freeze({
  przewlekla: "Na chorobę przewlekłą",
  popromienna: "Przeciwradiacyjne",
  antybiotyk: "Antybiotyk",
  bojowy: "Stymulant bojowy",
  leczniczy: "Środek leczniczy",
  narkotyk: "Narkotyk",
  uzywka: "Używka",
  inne: "Inne"
});

/* -------------------------------------------- */
/*  Active Effect helpers                        */
/* -------------------------------------------- */

// CONST.ACTIVE_EFFECT_MODES, spelled out: this module is imported by the pack
// builder and by node syntax checks, where the Foundry globals do not exist.
const MULTIPLY = 1;
const ADD = 2;
const OVERRIDE = 5;

/** Disadvantage (-1) / advantage (+1) on a named skill. */
const skill = (id, v = -1) => ({ key: `system.skills.${id}.roll.mode`, mode: ADD, value: String(v) });
/** Flat numeric bonus to an ability's checks — Neuroshima's penalties are numbers, not Utrudnienie. */
const checkBonus = (abl, v) => ({ key: `system.abilities.${abl}.bonuses.check`, mode: ADD, value: String(v) });
/** Advantage / disadvantage on an ability's saving throws. */
const save = (abl, v = -1) => ({ key: `system.abilities.${abl}.save.roll.mode`, mode: ADD, value: String(v) });

/**
 * Every damage type in this world (`config/damage-types.mjs`), which is what
 * "odporność na wszystkie obrażenia" has to expand into: dnd5e's `traits.di` is
 * a plain Set of type keys with no "all" sentinel, so immunity is enumerated.
 */
export const ALL_DAMAGE_TYPES = Object.freeze([
  "slashing", "piercing", "bludgeoning", "fire", "light", "lightning",
  "acid", "explosive", "psychic", "poison", "radiant", "cold"
]);

/** Expand `immunity: true` into one ADD change per damage type. */
export const immunityChanges = () =>
  ALL_DAMAGE_TYPES.map(t => ({ key: "system.traits.di.value", mode: ADD, value: t }));

/* -------------------------------------------- */
/*  The catalogue                                */
/* -------------------------------------------- */

/**
 * @typedef {object} ChemiaMech
 * @property {string}  [activation]   dnd5e activation type; omit for a free interaction.
 * @property {object}  [heal]         `{number, denomination, bonus}` — dice healing on use.
 * @property {number}  [hpPerDose]    Flat PW per dose (Painkiller).
 * @property {object}  [effect]       Active Effect applied on use.
 * @property {boolean} [immunity]     Expands into immunity to every damage type.
 * @property {number}  [delayRounds]  Effect starts this many rounds after the dose.
 * @property {object}  [after]        Resolution once `effect` elapses — see `items/chemia.mjs`.
 * @property {object}  [regen]        `{hp, seconds}` regeneration ticking each turn.
 * @property {object}  [clears]       What the dose removes (exhaustion, poison, radiation, zranienie).
 * @property {number}  [dailyMax]     Doses per day before `overdose` applies.
 * @property {object}  [overdose]     What exceeding `dailyMax` costs.
 * @property {boolean} [drink]        Counts as a portion of alcohol (+1 Upojenie).
 * @property {object}  [rage]         Szał bojowy state — see `items/chemia.mjs`.
 * @property {string}  [manual]       Prose the system deliberately does NOT enforce.
 *
 * @typedef {object} ChemiaDef
 * @property {string}   label
 * @property {string}   subtype       CHEMIA_SUBTYPES key.
 * @property {string}   [itemType]    dnd5e item type; defaults to "consumable".
 * @property {number}   price         Gambles; per dose unless `doses` > 1.
 * @property {number[]} [priceRange]  Where the book gives a spread instead of one price.
 * @property {number}   availability  Percentage chance to find it (RAW DOST.).
 * @property {number}   doses         Doses per unit (1 = one dose per quantity).
 * @property {number}   weight        kg per unit.
 * @property {string[]} treats        Disease keys from `diseases-data.mjs`.
 * @property {string}   description
 * @property {string}   [img]
 * @property {ChemiaMech} [mech]
 */

/** @type {Readonly<Record<string, ChemiaDef>>} */
export const CHEMIA = Object.freeze({

  /* ============================================================ */
  /*  Leki na choroby przewlekłe — tabela LEKARSTWA, str. 111     */
  /* ============================================================ */

  desmopresyna: {
    label: "Desmopresyna",
    subtype: "przewlekla",
    price: 1, availability: 30, doses: 1, weight: 0.05,
    treats: ["hemofilia"],
    img: `${DRUGS_ICON_DIR}/desmopresyna.svg`,
    description: "Zastrzyk podnoszący krzepliwość krwi. Wstrzyknięcie w trakcie krwawienia "
      + "natychmiast je powstrzymuje."
  },
  preparatyKrwiopochodne: {
    label: "Preparaty krwiopochodne",
    subtype: "przewlekla",
    price: 1, availability: 20, doses: 1, weight: 0.2,
    treats: ["hemofilia"],
    img: `${DRUGS_ICON_DIR}/iv_bag_spare.svg`,
    description: "Zamiennik Desmopresyny — trudniejszy w przechowywaniu, równie skuteczny."
  },
  aspirynaK: {
    label: "Aspiryna K",
    subtype: "przewlekla",
    price: 2, availability: 80, doses: 1, weight: 0.02,
    treats: ["niewydolnoscKrazenia"],
    img: `${DRUGS_ICON_DIR}/aspiryna_k.svg`,
    description: "Najpopularniejszy lek na rynku. Rozrzedza krew i odciąża zmęczone serce."
  },
  dracophen: {
    label: "Dracophen",
    subtype: "przewlekla",
    price: 2, availability: 60, doses: 1, weight: 0.02,
    treats: ["syndromDraculi"],
    img: `${DRUGS_ICON_DIR}/dracophen.svg`,
    description: "Stabilizuje reakcję skóry i siatkówki na światło."
  },
  reminex: {
    label: "Reminex",
    subtype: "przewlekla",
    price: 3, availability: 30, doses: 1, weight: 0.02,
    treats: ["syndromThurmana"],
    img: `${DRUGS_ICON_DIR}/reminex.svg`,
    description: "Nootropik spowalniający degradację funkcji poznawczych."
  },
  relanium: {
    label: "Relanium",
    subtype: "przewlekla",
    price: 2, availability: 30, doses: 1, weight: 0.02,
    treats: ["szalenstwoBostonskie"],
    img: `${DRUGS_ICON_DIR}/relanium.svg`,
    description: "Silny środek uspokajający. Trzyma furię na smyczy — dopóki bierzesz."
  },
  wapniak: {
    label: "Wapniak",
    subtype: "przewlekla",
    price: 1, availability: 30, doses: 1, weight: 0.02,
    treats: ["osteoporoza"],
    img: `${DRUGS_ICON_DIR}/wapniak.svg`,
    description: "Kredowa tabletka o smaku tynku. Utrzymuje kości w jednym kawałku."
  },
  psychotropy: {
    label: "Psychotropy",
    subtype: "przewlekla",
    price: 3, availability: 30, doses: 1, weight: 0.02,
    treats: ["paranoja"],
    img: `${DRUGS_ICON_DIR}/psychotropy.svg`,
    description: "Tłumi natrętne myśli. Nie leczy — po prostu ścisza."
  },
  actinix: {
    label: "Actinix",
    subtype: "przewlekla",
    price: 2, availability: 50, doses: 1, weight: 0.02,
    treats: ["zaburzeniaBledinka"],
    img: `${DRUGS_ICON_DIR}/actinix.svg`,
    description: "Stabilizuje błędnik. Bez niego świat nie chce stać w miejscu."
  },

  /* ============================================================ */
  /*  Przeciwradiacyjne i antybiotyki                             */
  /*  (w obu źródłach — tabela LEKARSTWA i ChemiaIDrugi.md)       */
  /* ============================================================ */

  radoff: {
    label: "RadOff",
    subtype: "popromienna",
    price: 30, availability: 20, doses: 1, weight: 0.3,
    treats: ["popromienna"],
    img: `${DRUGS_ICON_DIR}/radoff.svg`,
    description: "Kuracja odkażająca. Usuwa wszystkie skutki napromieniowania (w tym Wyczerpanie "
      + "ze Skażenia). Leczy chorobę popromienną, przyjmowany 10 dni z rzędu. "
      + "RO Kondycja ST 15 lub wymioty i biegunka przez 1 minutę (bez akcji).",
    mech: {
      activation: "action",
      clears: { radiation: true, exhaustionSource: "skazenie" },
      side: {
        save: { ability: "con", dc: 15 },
        label: "Wymioty i biegunka",
        effect: {
          name: "RadOff — wymioty",
          icon: "icons/svg/acid.svg",
          seconds: 60,
          statuses: ["incapacitated"]
        }
      },
      manual: "Wyleczenie choroby popromiennej wymaga 10 dawek w 10 kolejnych dniach — "
        + "licznik kuracji prowadzi MG."
    }
  },
  radmov: {
    label: "RadMov",
    subtype: "popromienna",
    price: 20, availability: 40, doses: 1, weight: 0.05,
    treats: ["popromienna"],
    img: `${DRUGS_ICON_DIR}/radmov.svg`,
    description: "Nie leczy, ale daje Ułatwienie w Rzutach Obronnych na Kondycję przeciw "
      + "skażeniu radioaktywnemu przez 1 godzinę.",
    mech: {
      activation: "action",
      effect: {
        name: "RadMov",
        icon: "icons/svg/radiation.svg",
        seconds: 3600,
        changes: [save("con", 1)]
      },
      manual: "Ułatwienie dotyczy wyłącznie RO przeciw skażeniu — dnd5e nie rozróżnia RO na "
        + "Kondycję po ich źródle, więc przez godzinę Ułatwienie widnieje przy każdym RO na "
        + "Kondycję. Przy RO z innego powodu zignoruj je."
    }
  },
  antybiotyk: {
    label: "Antybiotyk (10 dawek)",
    subtype: "antybiotyk",
    price: 40, availability: 40, doses: 10, weight: 0.05,
    treats: ["zakazna", "szczurzaGoraczka"],
    img: `${DRUGS_ICON_DIR}/antybiotyk.svg`,
    description: "Pigułka lub zawiesina, której regularne stosowanie pozwala wyleczyć cię "
      + "z nabytej choroby. Kuracja trwa co najmniej 10 dni.",
    mech: {
      activation: "action",
      manual: "Kuracja liczy się dopiero po 10 dniach regularnego stosowania — pojedyncza "
        + "dawka nie leczy niczego. Postęp kuracji prowadzi MG."
    }
  },

  /* ============================================================ */
  /*  Środki lecznicze — ChemiaIDrugi.md                          */
  /* ============================================================ */

  anestix: {
    label: "Anestix",
    subtype: "bojowy",
    price: 100, availability: 10, doses: 1, weight: 0.1,
    treats: [],
    img: `${DRUGS_ICON_DIR}/anestix.svg`,
    description: "Po 1 rundzie: odporność na wszystkie obrażenia przez 1 minutę. "
      + "Po upływie działania: RO Kondycja ST 20 lub +1 Stopień Zranienia; "
      + "jeśli wynik jest o 5 lub więcej niższy od ST — kolejny Stopień Zranienia.",
    mech: {
      activation: "action",
      delayRounds: 1,
      effect: {
        name: "Anestix — znieczulenie",
        icon: "icons/svg/blood.svg",
        seconds: 60,
        immunity: true
      },
      after: {
        save: { ability: "con", dc: 20 },
        label: "Zejście z Anestixu",
        onFail: { zranienie: 1, extraOnMargin: { by: 5, zranienie: 1 } },
        text: "Znieczulenie mija i ciało przypomina sobie wszystko naraz."
      }
    }
  },

  ar23: {
    label: "AR-23",
    subtype: "bojowy",
    price: 70, availability: 10, doses: 1, weight: 0.1,
    treats: [],
    img: `${DRUGS_ICON_DIR}/ar23.svg`,
    description: "Akcja: przywraca 4k6+4 PW. Efekt uboczny: RO Mądrość ST 15 lub Utrudnienie "
      + "do testów Perswazji i Oszustwa do Długiego Odpoczynku.",
    mech: {
      activation: "action",
      heal: { number: 4, denomination: 6, bonus: "4" },
      side: {
        save: { ability: "wis", dc: 15 },
        label: "Rozkojarzenie",
        effect: {
          name: "AR-23 — rozkojarzenie",
          icon: "icons/svg/daze.svg",
          untilLongRest: true,
          changes: [skill("per"), skill("osz")]
        }
      }
    }
  },

  ar35: {
    label: "AR-35 BETA",
    subtype: "bojowy",
    price: 100, availability: 5, doses: 1, weight: 0.1,
    treats: [],
    img: `${DRUGS_ICON_DIR}/ar35_beta.svg`,
    description: "Akcja: przywraca 8k6+8 PW; odporność na wszystkie obrażenia przez 1 minutę; "
      + "szał bojowy — musisz atakować co turę (brak wrogów → sojusznicy). RO Mądrość ST 20 "
      + "na końcu tury, by zakończyć szał. Po szale: Obezwładniony przez 1 minutę. "
      + "Maksymalnie 1 dawka dziennie — druga oznacza 75% szans na śmierć.",
    mech: {
      activation: "action",
      heal: { number: 8, denomination: 6, bonus: "8" },
      effect: {
        name: "AR-35 BETA — odporność",
        icon: "icons/svg/blood.svg",
        seconds: 60,
        immunity: true
      },
      rage: {
        name: "AR-35 BETA — szał bojowy",
        icon: "icons/svg/terror.svg",
        endSave: { ability: "wis", dc: 20 },
        after: {
          effect: {
            name: "AR-35 BETA — wyczerpanie po szale",
            icon: "icons/svg/unconscious.svg",
            seconds: 60,
            statuses: ["incapacitated"]
          }
        }
      },
      dailyMax: 1,
      overdose: {
        chance: 75,
        label: "Przedawkowanie AR-35 BETA",
        text: "Druga dawka w ciągu doby. Serce albo wytrzyma, albo nie."
      },
      manual: "Przymus atakowania co turę (a przy braku wrogów — sojuszników) rozstrzyga MG. "
        + "System ogłasza szał, pilnuje RO na jego zakończenie i nakłada Obezwładnienie po nim, "
        + "ale nie wybiera celów za gracza."
    }
  },

  deadline: {
    label: "Deadline",
    subtype: "bojowy",
    price: 50, availability: 20, doses: 1, weight: 0.1,
    treats: [],
    img: `${DRUGS_ICON_DIR}/deadline.svg`,
    description: "Zastrzyk: regeneracja 1 PW na turę przez 10 minut. Potem RO Kondycja ST 15 — "
      + "przy porażce PW spadają do 1 i otrzymujesz 1 poziom Wyczerpania.",
    mech: {
      activation: "action",
      regen: { hp: 1, seconds: 600 },
      effect: {
        name: "Deadline — regeneracja",
        icon: "icons/svg/regen.svg",
        seconds: 600
      },
      after: {
        save: { ability: "con", dc: 15 },
        label: "Zejście z Deadline'u",
        onFail: { hpToOne: true, exhaustion: "deadline" },
        text: "Organizm oddaje wszystko, co pożyczył."
      },
      manual: "Regeneracja tyka na początku tury — a tury istnieją tylko w walce. "
        + "Poza walką 10 minut Deadline'u to 100 tur i PW dolicza MG."
    }
  },

  detoks: {
    label: "Detoks (5 fiolek)",
    subtype: "leczniczy",
    price: 40, availability: 40, doses: 5, weight: 0.15,
    treats: [],
    img: `${DRUGS_ICON_DIR}/detoks.svg`,
    description: "Usuwa trucizny z organizmu. RO Kondycja ST 10 lub bolesne wydalanie "
      + "przez 1 minutę (bez możliwości podejmowania akcji).",
    mech: {
      activation: "action",
      clears: { poisoned: true },
      side: {
        save: { ability: "con", dc: 10 },
        label: "Bolesne wydalanie",
        effect: {
          name: "Detoks — bolesne wydalanie",
          icon: "icons/svg/acid.svg",
          seconds: 60,
          statuses: ["incapacitated"]
        }
      }
    }
  },

  medpak: {
    label: "Medpak",
    subtype: "leczniczy",
    price: 20, availability: 40, doses: 1, weight: 0.25,
    treats: [],
    img: `${DRUGS_ICON_DIR}/medpak.svg`,
    description: "Akcja: przywraca 2k6+2 PW. Maksymalnie 2 sztuki dziennie.",
    mech: {
      activation: "action",
      heal: { number: 2, denomination: 6, bonus: "2" },
      dailyMax: 2,
      overdose: {
        label: "Trzeci Medpak w ciągu doby",
        noEffect: true,
        text: "Organizm nie przyswaja już kolejnej dawki — środek się marnuje."
      }
    }
  },

  neuroCola: {
    label: "Neuro-Cola",
    subtype: "leczniczy",
    price: 40, availability: 30, doses: 1, weight: 0.4,
    treats: [],
    img: `${DRUGS_ICON_DIR}/neuro_cola.svg`,
    description: "Przedwojenna puszka. Ułatwienie do jednego wybranego Testu wykonywanego "
      + "w ciągu 1 godziny.",
    mech: {
      activation: "action",
      effect: {
        name: "Neuro-Cola — kopniak",
        icon: "icons/svg/aura.svg",
        seconds: 3600
      },
      oneShotAdvantage: true,
      manual: "Efekt zaznacza godzinne okno, ale sam nie wybiera Testu — Ułatwienie do "
        + "jednego dowolnego Testu w tym czasie ogłasza gracz i przyznaje MG. "
        + "Po wykorzystaniu zdejmij efekt ręcznie."
    }
  },

  painkiller: {
    label: "Painkiller (10 tabletek)",
    subtype: "leczniczy",
    price: 10, availability: 60, doses: 10, weight: 0.05,
    treats: [],
    img: `${DRUGS_ICON_DIR}/painkiller.svg`,
    description: "1 tabletka przywraca 1 PW. Można wziąć garść: każda tabletka daje −1 "
      + "do testów Mądrości, a gdy kara przekroczy Mądrość — tracisz przytomność. "
      + "Efekty kończą się po Krótkim Odpoczynku. Można podać nieprzytomnej osobie "
      + "(zmiażdżone tabletki wraz z płynem).",
    mech: {
      activation: "action",
      hpPerDose: 1,
      dosePenalty: {
        ability: "wis",
        perDose: -1,
        name: "Painkiller — otępienie",
        icon: "icons/svg/pill.svg",
        unconsciousWhenOverAbility: true,
        clearsOn: "shortRest"
      }
    }
  },

  taurus: {
    label: "Taurus",
    subtype: "leczniczy",
    price: 40, availability: 40, doses: 1, weight: 0.1,
    treats: [],
    img: `${DRUGS_ICON_DIR}/taurus.svg`,
    description: "Usuwa 1 poziom stanu Wyczerpanie.",
    mech: {
      activation: "action",
      clears: { exhaustion: 1 }
    }
  },

  trybiotyl: {
    label: "Trybiotyl",
    subtype: "leczniczy",
    price: 30, availability: 40, doses: 1, weight: 0.2,
    treats: [],
    img: `${DRUGS_ICON_DIR}/trybiotyl.svg`,
    description: "Maść. Posmaruj ranę, a po Krótkim Odpoczynku Stopień Zranienia spada o 1.",
    mech: {
      activation: "action",
      pendingRest: {
        rest: "shortRest",
        label: "Trybiotyl — maść na ranie",
        icon: "icons/svg/heal.svg",
        apply: { zranienie: -1 }
      }
    }
  },

  wdTabs: {
    label: "WD-Tabs (10 tabletek)",
    subtype: "leczniczy",
    price: 20, availability: 60, doses: 10, weight: 0.05,
    treats: [],
    img: `${DRUGS_ICON_DIR}/wd_tabs.svg`,
    description: "1 tabletka uzdatnia 1 litr brudnej wody.",
    mech: {
      activation: "action",
      manual: "Uzdatnianie wody nie ma reprezentacji mechanicznej — zużycie tabletki "
        + "odnotowuje się, skutek rozstrzyga MG."
    }
  },

  /* ============================================================ */
  /*  Narkotyki i używki — ChemiaIDrugi.md                        */
  /* ============================================================ */

  tornado: {
    label: "Tornado",
    subtype: "narkotyk",
    price: 65, availability: 20, doses: 1, weight: 0.02,
    treats: [],
    img: `${DRUGS_ICON_DIR}/tornado.svg`,
    description: "Narkotyczny trans: wizje świata sprzed wojny (5 IX 2020). Czas trwania "
      + "nieobliczalny. Regularne zażywanie prowadzi do „bluesa\" — stanu odrętwienia "
      + "i obojętności, aż po utratę woli życia. W wielu miastach zakazane.",
    priceRange: [30, 100],
    mech: {
      activation: "action",
      effect: {
        name: "Tornado — trans",
        icon: "icons/svg/stoned.svg",
        seconds: null,
        statuses: ["incapacitated"]
      },
      manual: "Czas trwania transu jest z definicji nieobliczalny — efekt nie ma czasu "
        + "wygaśnięcia i zdejmuje go MG. Uzależnienie i „blues\" są czysto fabularne: "
        + "system ich nie liczy i nie zgłosi sam z siebie."
    }
  },

  neodrugs: {
    label: "Neodrugs",
    subtype: "narkotyk",
    price: 50, availability: 20, doses: 1, weight: 0.02,
    treats: [],
    img: `${DRUGS_ICON_DIR}/neodrugs.svg`,
    description: "Syntetyczne narkotyki. Szczegółowe efekty zależą od odmiany.",
    mech: {
      activation: "action",
      manual: "Efekty ustala MG dla konkretnej odmiany — system nie nakłada niczego sam."
    }
  },

  narkotykiLatwe: {
    label: "Narkotyki łatwe w produkcji",
    subtype: "narkotyk",
    price: 10, availability: 40, doses: 1, weight: 0.02,
    treats: [],
    img: `${DRUGS_ICON_DIR}/narkotyki_latwe.svg`,
    description: "Lokalne, improwizowane narkotyki. Efekty według uznania MG.",
    mech: {
      activation: "action",
      manual: "Efekty według uznania MG — system nie nakłada niczego sam."
    }
  },

  narkotykiPrzedwojenne: {
    label: "Narkotyki przedwojenne",
    subtype: "narkotyk",
    price: 60, availability: 10, doses: 1, weight: 0.02,
    treats: [],
    img: `${DRUGS_ICON_DIR}/narkotyki_przedwojenne.svg`,
    description: "Rzadkie, przedwojenne substancje psychoaktywne. Efekty według uznania MG.",
    mech: {
      activation: "action",
      manual: "Efekty według uznania MG — system nie nakłada niczego sam."
    }
  },

  alkoholTani: {
    label: "Alkohol tani (1 l)",
    subtype: "uzywka",
    price: 5, availability: 70, doses: 5, weight: 1,
    treats: [],
    img: `${DRUGS_ICON_DIR}/alkohol_tani.svg`,
    description: "Bimber, denaturat, cokolwiek pali w gardle. Jedna porcja to 100 ml mocnego "
      + "lub 500 ml słabego trunku. Możliwość ostrego ciągu.",
    mech: {
      activation: "action",
      drink: true,
      manual: "Ostry ciąg (i kac nazajutrz) prowadzi MG — pojedyncza porcja tylko rzuca "
        + "RO na Kondycję przeciw Upojeniu."
    }
  },

  alkoholMarkowy: {
    label: "Alkohol markowy (1 l)",
    subtype: "uzywka",
    price: 10, availability: 30, doses: 5, weight: 1,
    treats: [],
    img: `${DRUGS_ICON_DIR}/alkohol_markowy.svg`,
    description: "Używka wyższej jakości. Jedna porcja to 100 ml mocnego lub 500 ml słabego trunku.",
    mech: {
      activation: "action",
      drink: true
    }
  },

  cygaro: {
    label: "Cygaro",
    subtype: "uzywka",
    price: 5, availability: 30, doses: 1, weight: 0.02,
    treats: [],
    img: `${DRUGS_ICON_DIR}/cygaro.svg`,
    description: "Używka. Pali się długo i pachnie lepiej niż wszystko dookoła.",
    mech: { activation: "action", manual: "Bez efektów mechanicznych — czysta fabuła." }
  },

  papieros: {
    label: "Papieros",
    subtype: "uzywka",
    price: 1, availability: 50, doses: 1, weight: 0.01,
    treats: [],
    img: `${DRUGS_ICON_DIR}/papieros.svg`,
    description: "Używka. Waluta, rozmowa i pretekst do przerwy w jednym.",
    mech: { activation: "action", manual: "Bez efektów mechanicznych — czysta fabuła." }
  },

  tytonDoZucia: {
    label: "Tytoń do żucia",
    subtype: "uzywka",
    price: 2, availability: 80, doses: 1, weight: 0.02,
    treats: [],
    img: `${DRUGS_ICON_DIR}/tyton_do_zucia.svg`,
    description: "Używka. Nie zdradza cię ogniem ani dymem.",
    mech: { activation: "action", manual: "Bez efektów mechanicznych — czysta fabuła." }
  },

  /* ============================================================ */
  /*  Materiały pirotechniczne i chemiczne                        */
  /*  Surowiec do produkcji, nie środek — stąd `loot`.            */
  /* ============================================================ */

  nitrogliceryna: {
    label: "Nitrogliceryna (100 g)",
    subtype: "inne",
    itemType: "loot",
    price: 100, availability: 15, doses: 1, weight: 0.15,
    treats: [],
    img: `${CHEMIA_LOOT_ICON_DIR}/nitrogliceryna.svg`,
    description: "1 g zastępuje 100 g Chemii przy produkcji materiałów wybuchowych.",
    mech: {
      manual: "Surowiec produkcyjny — przelicznik stosuje się przy wytwarzaniu, "
        + "nie przez użycie przedmiotu."
    }
  },

  prochCzarny: {
    label: "Proch czarny (100 g)",
    subtype: "inne",
    itemType: "loot",
    price: 50, availability: 50, doses: 1, weight: 0.15,
    treats: [],
    img: `${CHEMIA_LOOT_ICON_DIR}/proch_czarny.svg`,
    description: "1 g zastępuje 100 g Chemii przy elaboracji amunicji. Szansa zacięcia ×2; "
      + "przy wystrzale powstają duże ilości dymu.",
    mech: {
      manual: "Podwójna szansa zacięcia dotyczy amunicji elaborowanej tym prochem — "
        + "oznacza ją MG przy produkcji, nie posiadanie surowca."
    }
  },

  prochStrzelniczy: {
    label: "Proch strzelniczy (100 g)",
    subtype: "inne",
    itemType: "loot",
    price: 100, availability: 30, doses: 1, weight: 0.15,
    treats: [],
    img: `${CHEMIA_LOOT_ICON_DIR}/proch_strzelniczy.svg`,
    description: "1 g zastępuje 100 g Chemii przy elaboracji amunicji.",
    mech: {
      manual: "Surowiec produkcyjny — przelicznik stosuje się przy wytwarzaniu, "
        + "nie przez użycie przedmiotu."
    }
  }
});

/* -------------------------------------------- */
/*  Flavour                                      */
/* -------------------------------------------- */

/**
 * Narrative lines for the "Weź dawkę" chat card — what the table *sees* the
 * character do. One is picked at random; `{a}` is the actor name.
 */
export const CHEMIA_FLAVOR = Object.freeze({
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
  ],
  anestix: [
    "{a} wbija Anestix w udo przez spodnie i liczy do dziesięciu.",
    "{a} strzela sobie Anestixem w szyję. Świat robi się dziwnie daleki."
  ],
  ar23: [
    "{a} wbija AR-23 w mostek i szarpie się jak od prądu.",
    "{a} łamie ampułkę AR-23. Rany zaciągają się szybciej, niż powinny."
  ],
  ar35: [
    "{a} wbija AR-35 prosto w serce i zaczyna wyć.",
    "{a} przyjmuje BETĘ. Źrenice znikają, zostaje tylko wściekłość."
  ],
  deadline: [
    "{a} wstrzykuje Deadline i przez chwilę czuje się nieśmiertelny.",
    "{a} opróżnia strzykawkę Deadline'u. Zegar zaczyna tykać."
  ],
  detoks: [
    "{a} wypija fiolkę Detoksu i od razu żałuje.",
    "{a} przełyka Detoks, krzywiąc się na smak rdzy."
  ],
  medpak: [
    "{a} rozrywa opakowanie Medpaka zębami i przyciska go do rany.",
    "{a} opróżnia Medpak jednym ruchem, nie przerywając obserwacji."
  ],
  neuroCola: [
    "{a} otwiera puszkę Neuro-Coli. Syk brzmi jak coś z innego świata.",
    "{a} wypija Neuro-Colę do dna i przez chwilę patrzy na puszkę z rozrzewnieniem."
  ],
  painkiller: [
    "{a} wysypuje tabletki na dłoń i połyka, nie licząc.",
    "{a} rozgryza painkillery na sucho. Ból cichnie, reszta też."
  ],
  taurus: [
    "{a} wypija Taurusa jednym haustem i prostuje plecy.",
    "{a} bierze Taurusa. Zmęczenie odpuszcza na tyle, żeby iść dalej."
  ],
  trybiotyl: [
    "{a} wciera Trybiotyl w ranę, sycząc przez zęby.",
    "{a} rozsmarowuje maść po rozcięciu i obwiązuje je czymkolwiek."
  ],
  wdTabs: [
    "{a} wrzuca tabletkę WD do manierki i czeka, aż osad opadnie.",
    "{a} uzdatnia litr mętnej wody i wącha ją ostrożnie."
  ],
  tornado: [
    "{a} bierze działkę Tornada. Wzrok ucieka gdzieś przed wojnę.",
    "{a} odpływa w Tornado. Uśmiecha się do czegoś, czego nikt inny nie widzi."
  ],
  alkoholTani: [
    "{a} pociąga z butelki i wzdryga się całym ciałem.",
    "{a} wlewa w siebie porcję bimbru, nie mrugnąwszy okiem."
  ],
  alkoholMarkowy: [
    "{a} nalewa sobie porcję czegoś, co ma jeszcze etykietę.",
    "{a} pije powoli, jakby to była okazja."
  ],
  papieros: [
    "{a} zapala papierosa, osłaniając płomień dłonią.",
    "{a} zaciąga się głęboko i wypuszcza dym w bok."
  ],
  cygaro: [
    "{a} obcina końcówkę cygara i zapala je bez pośpiechu.",
    "{a} pyka cygaro, wyraźnie zadowolony z siebie."
  ],
  tytonDoZucia: [
    "{a} wpycha za wargę porcję tytoniu i spluwa w bok.",
    "{a} żuje tytoń w milczeniu, obserwując horyzont."
  ]
});

/** Generic fallback lines for custom / unknown entries. */
export const CHEMIA_FLAVOR_DEFAULT = Object.freeze([
  "{a} przyjmuje dawkę {m}, nie przerywając rozmowy.",
  "{a} zażywa {m} — szybko, żeby nikt nie zdążył zapytać.",
  "{a} bierze swoją dzienną dawkę {m} i chowa opakowanie głębiej do kieszeni."
]);

/* -------------------------------------------- */
/*  Lookups                                      */
/* -------------------------------------------- */

/** @returns {ChemiaDef|null} */
export function getChemia(key) {
  return key ? (CHEMIA[key] ?? null) : null;
}

/** Find an entry key by its display name (case/whitespace-insensitive). */
export function chemiaKeyByName(name) {
  const norm = String(name ?? "").toLowerCase().trim();
  if (!norm) return null;
  for (const [key, def] of Object.entries(CHEMIA)) {
    if (def.label.toLowerCase() === norm) return key;
  }
  // Loose match: player items are often named "Wapniak (20)" or "Actinix/Rephidal".
  for (const [key, def] of Object.entries(CHEMIA)) {
    const base = def.label.replace(/\s*\(.*\)$/, "").toLowerCase();
    if (norm.includes(base)) return key;
  }
  return null;
}

/** All keys that treat a given disease key. */
export function chemiaForDisease(diseaseKey) {
  if (!diseaseKey) return [];
  return Object.entries(CHEMIA)
    .filter(([, def]) => def.treats.includes(diseaseKey))
    .map(([key]) => key);
}

/* -------------------------------------------- */
/*  Item data                                    */
/* -------------------------------------------- */

/** Default art per subtype, so a missing `img` never renders as a broken row. */
const SUBTYPE_ICON = {
  przewlekla: "icons/svg/pill.svg",
  popromienna: "icons/svg/radiation.svg",
  antybiotyk: "icons/svg/pill.svg",
  bojowy: "icons/svg/blood.svg",
  leczniczy: "icons/svg/heal.svg",
  narkotyk: "icons/svg/stoned.svg",
  uzywka: "icons/svg/tankard.svg",
  inne: "icons/svg/item-bag.svg"
};

/**
 * Deterministic 16-character document id from a seed string (FNV-1a, four rounds).
 *
 * Ids have to be stable so a rebuilt pack keeps pointing at the same effects, and
 * they have to be derivable in plain JS because this module is imported both by
 * the node pack builder (no `foundry.utils.randomID`) and by the browser.
 * @param {string} seed
 * @returns {string} 16 chars from Foundry's id alphabet.
 */
function idFromSeed(seed) {
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  let h = 0x811c9dc5;
  for (let round = 0; round < 4; round++) {
    const s = `${seed}#${round}`;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    for (let i = 0; i < 4; i++) {
      out += ALPHABET[(h >>> (i * 6)) % ALPHABET.length];
    }
  }
  return out;
}

/** Stable id of the Active Effect playing `role` for entry `key`. */
export const chemiaEffectId = (key, role) => idFromSeed(`chemia-effect:${key}:${role}`);
/** Stable id of the "use a dose" activity for entry `key`. */
export const chemiaActivityId = key => idFromSeed(`chemia-activity:${key}`);

/** What the inventory button says, when "Zażyj" would read wrong. */
const USE_LABEL = {
  alkoholTani: "Wypij", alkoholMarkowy: "Wypij", neuroCola: "Wypij",
  cygaro: "Zapal", papieros: "Zapal", tytonDoZucia: "Weź porcję",
  trybiotyl: "Posmaruj ranę", wdTabs: "Uzdatnij wodę"
};

/**
 * Turn one `mech.effect`-shaped spec into Active Effect creation data.
 *
 * `untilLongRest` has no dnd5e equivalent — dnd5e durations are rounds, turns,
 * seconds or nothing — so it becomes an endless effect plus a `clearOn` flag that
 * `items/chemia.mjs` honours on `dnd5e.restCompleted`.
 *
 * @param {string} key
 * @param {string} role   Which slot of `mech` this effect came from.
 * @param {object} spec
 * @returns {object} ActiveEffect creation data.
 */
function effectData(key, role, spec) {
  const duration = {};
  if (spec.seconds) duration.seconds = spec.seconds;
  if (spec.rounds) duration.rounds = spec.rounds;

  const changes = [...(spec.changes ?? [])];
  if (spec.immunity) changes.push(...immunityChanges());

  return {
    _id: chemiaEffectId(key, role),
    name: spec.name,
    img: spec.icon ?? "icons/svg/pill.svg",
    changes,
    statuses: spec.statuses ?? [],
    duration,
    disabled: false,
    transfer: false,
    flags: {
      [MODULE_ID]: {
        chemiaKey: key,
        chemiaRole: role,
        ...(spec.untilLongRest ? { clearOn: "longRest" } : {})
      }
    }
  };
}

/**
 * Every Active Effect an entry needs, keyed by the `mech` slot that owns it.
 * They all live on the item with `transfer: false`, exactly like an SRD potion's:
 * inert while carried, copied onto the drinker when a dose is spent.
 * @param {string} key
 * @returns {object[]}
 */
export function chemiaEffects(key) {
  const m = CHEMIA[key]?.mech;
  if (!m) return [];
  const out = [];
  if (m.effect) out.push(effectData(key, "effect", m.effect));
  if (m.side?.effect) out.push(effectData(key, "side", m.side.effect));
  if (m.rage) out.push(effectData(key, "rage", m.rage));
  if (m.rage?.after?.effect) out.push(effectData(key, "rageAfter", m.rage.after.effect));
  if (m.dosePenalty) out.push(effectData(key, "dosePenalty", { ...m.dosePenalty, changes: [] }));
  if (m.pendingRest) {
    out.push(effectData(key, "pendingRest", {
      name: m.pendingRest.label,
      icon: m.pendingRest.icon
    }));
  }
  return out;
}

/**
 * Build the item data for one entry, including its activity and Active Effects.
 *
 * The activity is deliberately a bare `utility`, and its `effects` array is left
 * empty even though the item carries real Active Effects. Reason: dnd5e's own
 * "apply effect" button on a card applies to *selected tokens*, which is wrong
 * for something you swallow, and wiring both paths would apply everything twice.
 * `items/chemia.mjs` listens on `dnd5e.postUseActivity` and applies to the actor
 * who spent the dose — the same pattern `items/toolkit-medyk.mjs` already uses.
 *
 * @param {string} key
 * @param {object} [options]
 * @param {number} [options.quantity=1]
 * @param {string} [options._id]        Deterministic id, for the pack builder.
 * @returns {object} Item creation data.
 */
export function chemiaItemData(key, { quantity = 1, _id } = {}) {
  const def = CHEMIA[key];
  if (!def) throw new Error(`Unknown chemia entry "${key}"`);

  const multiDose = def.doses > 1;
  const isLoot = def.itemType === "loot";
  const img = def.img ?? SUBTYPE_ICON[def.subtype] ?? "icons/svg/pill.svg";

  const data = {
    name: def.label,
    type: def.itemType ?? "consumable",
    img,
    system: {
      description: { value: `<p>${def.description}</p>`, chat: "" },
      source: { custom: "Neuroshima RPG", rules: "2024" },
      quantity,
      weight: { value: def.weight, units: "kg" },
      price: { value: def.price, denomination: "gb" }
    },
    effects: [],
    flags: {
      [MODULE_ID]: {
        chemiaKey: key,
        doses: def.doses,
        availability: def.availability,
        treats: def.treats
      }
    }
  };

  if (isLoot) {
    data.system.type = { value: "material", subtype: "" };
    if (_id) data._id = _id;
    return data;
  }

  data.system.type = { value: CHEMIA_TYPE, subtype: def.subtype };
  // Packaged doses track natively via uses; single-dose items get uses.max 1 so
  // the same consumption target works everywhere and autoDestroy clears the empty.
  data.system.uses = {
    max: multiDose ? String(def.doses) : "1",
    spent: 0,
    recovery: [],
    autoDestroy: true
  };

  data.effects = chemiaEffects(key);

  const actId = chemiaActivityId(key);
  data.system.activities = {
    [actId]: {
      _id: actId,
      type: "utility",
      name: USE_LABEL[key] ?? "Zażyj",
      img,
      activation: { type: def.mech?.activation ?? "action", value: 1, condition: "" },
      consumption: {
        targets: [{ type: "itemUses", value: "1", target: "" }],
        scaling: { allowed: false }
      },
      effects: [],
      flags: { [MODULE_ID]: { chemiaKey: key } }
    }
  };

  if (_id) data._id = _id;
  return data;
}

/* -------------------------------------------- */
/*  Coverage report                              */
/* -------------------------------------------- */

/**
 * Which entries carry mechanics the system actually enforces, and which are
 * prose only. Drives the "czego system NIE robi" block on the chat card, so
 * "this one is the GM's job" is stated rather than assumed.
 *
 * `viaDisease` is its own bucket on purpose: a chronic-disease medicine has no
 * effect of its own, but taking a dose is fully tracked by the health panel
 * (supply, sunset save, stage ladder). Filing those under "manual" would be a
 * lie in the other direction.
 *
 * @returns {{automated: string[], partial: string[], viaDisease: string[], manual: string[]}}
 */
export function chemiaCoverage() {
  const automated = [];
  const partial = [];
  const viaDisease = [];
  const manual = [];
  for (const [key, def] of Object.entries(CHEMIA)) {
    const m = def.mech ?? {};
    const enforced = Boolean(
      m.heal || m.hpPerDose || m.effect || m.regen || m.clears
      || m.drink || m.rage || m.dosePenalty || m.pendingRest || m.side
    );
    if (enforced && m.manual) partial.push(key);
    else if (enforced) automated.push(key);
    else if (def.treats?.length) viaDisease.push(key);
    else manual.push(key);
  }
  return { automated, partial, viaDisease, manual };
}
