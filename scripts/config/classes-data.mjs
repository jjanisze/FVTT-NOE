/**
 * Neuroshima 5e — Class definitions (6 klas × 12 poziomów) + 18 profesji.
 *
 * SOURCE OF TRUTH: the progression tables embedded in the rulebook PDF text dump
 * (`Podrecznik/source.txt`), section "TABELA ZDOLNOŚCI KLASOWYCH <KLASA>".
 *
 * ⚠ `Tabele/Klasy.md` is a hand-made summary and contains several errors — it must NOT
 * be used to derive mechanics. Divergences found and resolved in favour of the PDF table:
 *   - Brutal "Berserki" column: PDF 2,2,2,3,3,3,4,4,4,5,5,5 (Klasy.md had 1,1,2,2,2,2,3,3,3,4,4,4)
 *   - Zwiadowca "Mój wróg":     PDF +1/1k6, +2/2k6, +3/3k6 (Klasy.md had +1/+1k6…+4/+1k12)
 *   - Zwiadowca "Mój biom":     PDF 2,2,2,3,3,3,4,4,4,5,5,5 (Klasy.md had 2,2,3,3,4,4,5,5,6,6,7,7)
 *   - Twardziel profession levels: PDF 3/7/11 (Klasy.md said 3/6/11)
 *   - Cwaniak skill list is 8 entries, not 12; "Samouk" is poziom 9, not 7
 *     (the prose heading says 7, the table says 9 — table wins)
 *
 * Ability text lives in `class-features-data.mjs`; this file only describes structure.
 */

/** Ability-score keys as used by dnd5e (`system.abilities`). */
export const ABILITY = {
  SIL: "str", ZRC: "dex", KON: "con", INT: "int", MDR: "wis", CHA: "cha"
};

/** Marker used in `grants` for the level's Sztuczka pick (pack is empty for now). */
export const SZTUCZKA = "@sztuczka";
/** Marker for "Zdolność z profesji" — resolved against the chosen subclass. */
export const PROFESJA = "@profesja";
/** Marker for "Zdolność z profesji / Sztuczka" — player picks either pool. */
export const PROFESJA_LUB_SZTUCZKA = "@profesja|sztuczka";
/** Marker for Spec poziom 5 — second ability from the character's Pochodzenie. */
export const POCHODZENIE = "@pochodzenie";

/**
 * PW (hit points) groups. Neuroshima uses flat per-level values, which dnd5e's
 * HitPoints advancement cannot express — see PLAN_classes.md §4.1 and `actors/pw.mjs`.
 */
const PW_D8 = { first: 16, perLevel: 4, hd: "d8" };
const PW_D6 = { first: 12, perLevel: 3, hd: "d6" };

/* -------------------------------------------- */
/*  Klasy                                        */
/* -------------------------------------------- */

export const CLASSES = {

  /* ============================ BRUTAL ============================ */
  brutal: {
    identifier: "brutal",
    label: "Brutal",
    primaryAbility: ABILITY.SIL,
    requirement: { ability: ABILITY.SIL, value: 15 },
    pw: PW_D8,
    saves: [ABILITY.KON, ABILITY.SIL],
    skills: { count: 2, pool: ["atl", "tre", "prc", "prz", "sur", "zas"] },
    tools: null,
    weapons: ["biala", "palnaKrotka"],
    armor: ["lgt", "med", "shl"],
    // Multiclass entry grants (rulebook "Jako postać wieloklasowa")
    multiclass: { weapons: ["biala", "palnaKrotka"], armor: ["shl"], skills: null },
    startingEquipment: {
      always: ["Plecak turysty"],
      choice: {
        A: { gb: 150 },
        B: ["kafar", "nóż taktyczny", "medpak", "obrzyn",
            "10 naboi .12 Ga (breneka)", "oszczep ×3"]
      }
    },
    professionLevels: [3, 6, 10],
    professions: ["ganger", "gladiator", "najemnik"],
    scale: {
      berserki: {
        type: "number", label: "Liczba Berserków",
        values: [2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5]
      },
      obrazeniaBerserkera: {
        type: "dice", label: "Obrażenia Berserkera",
        values: ["1d6", "1d6", "1d6", "1d8", "1d8", "1d8",
                 "1d10", "1d10", "1d10", "1d12", "1d12", "1d12"]
      }
    },
    levels: {
      1:  ["berserk", "gola-klata"],
      2:  ["wsciekly-cios", "z-bara"],
      3:  ["szosty-zmysl", PROFESJA],
      4:  [SZTUCZKA],
      5:  ["drugi-atak", "brutalny-cios"],
      6:  [PROFESJA_LUB_SZTUCZKA],
      7:  ["szalencza-szarza", "solowa"],
      8:  [SZTUCZKA],
      9:  ["paranoja"],
      10: [PROFESJA_LUB_SZTUCZKA],
      11: ["zabojczy-cios"],
      12: [SZTUCZKA]
    }
  },

  /* ============================ CWANIAK ============================ */
  cwaniak: {
    identifier: "cwaniak",
    label: "Cwaniak",
    primaryAbility: ABILITY.CHA,
    requirement: { ability: ABILITY.CHA, value: 15 },
    pw: PW_D6,
    saves: [ABILITY.CHA, ABILITY.ZRC],
    skills: { count: 4, pool: ["akr", "skr", "his", "osz", "per", "wys", "zas", "zwi"] },
    tools: { instruments: 2, any: 1 },
    weapons: ["biala", "palnaKrotka"],
    armor: ["lgt"],
    multiclass: { weapons: [], armor: [], skills: { count: 1, fromClassPool: true } },
    startingEquipment: {
      always: ["Plecak oszusta", "instrument muzyczny (do 50 gb)"],
      choice: {
        A: { gb: 150 },
        B: ["koktajl Mołotowa ×2", "kurtka ćwiekowana", "medpak",
            "narzędzia małego szulera", "nóż taktyczny", "papieros ×10",
            "rewolwer Trzydziestka ósemka", "12 naboi .38 SPL", "zapalniczka"]
      }
    },
    professionLevels: [3, 6, 10],
    professions: ["gwiazda", "kaznodzieja", "mafiozo"],
    scale: {
      szczescie: {
        type: "number", label: "Szczęście",
        values: [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4]
      },
      motywacja: {
        type: "dice", label: "Motywacja",
        values: ["1d6", "1d6", "1d6", "1d6", "1d8", "1d8",
                 "1d8", "1d8", "1d10", "1d10", "1d10", "1d10"]
      },
      kolejka: {
        type: "dice", label: "Kolejka",
        values: [null, "1d4", "1d4", "1d4", "1d6", "1d6",
                 "1d6", "1d6", "1d8", "1d8", "1d8", "1d8"]
      }
    },
    levels: {
      1:  ["motywacja", "szczescie"],
      2:  ["kolejka", "spieprzysz-to"],
      3:  [PROFESJA, "szybka-gadka"],
      4:  [SZTUCZKA, "ekspert"],
      5:  ["obelga", "cwaniacki-zwod"],
      6:  [PROFESJA_LUB_SZTUCZKA],
      7:  ["glowa-do-gory"],
      8:  [SZTUCZKA],
      9:  ["samouk"],
      10: [PROFESJA_LUB_SZTUCZKA],
      11: ["smiertelna-obelga"],
      12: [SZTUCZKA]
    }
  },

  /* ============================= SPEC ============================= */
  spec: {
    identifier: "spec",
    label: "Spec",
    primaryAbility: ABILITY.INT,
    requirement: { ability: ABILITY.INT, value: 15 },
    pw: PW_D6,
    saves: [ABILITY.INT, ABILITY.MDR],
    skills: { count: 4, pool: ["his", "int", "med", "poj", "prz", "sle", "tch"] },
    tools: { any: 2 },
    weapons: ["biala", "palnaKrotka"],
    armor: ["lgt"],
    multiclass: { weapons: [], armor: [], skills: { count: 1, fromClassPool: true }, tools: { any: 1 } },
    startingEquipment: {
      always: ["Plecak naukowca", "jeden dowolny zestaw narzędzi"],
      choice: {
        A: { gb: 170 },
        B: ["narzędzia małego medyka", "medpak", "pistolet B 93R",
            "15 naboi 9 mm", "szoker"]
      }
    },
    professionLevels: [3, 6, 10],
    professions: ["chemik", "medyk", "monter"],
    scale: {
      lebJakSklep: {
        type: "dice", label: "Łeb jak sklep",
        values: [null, "1d4", "1d4", "1d6", "1d6", "1d8",
                 "1d8", "1d10", "1d10", "1d12", "1d12", "1d12"]
      }
    },
    levels: {
      1:  ["dobra-rada", "inteligentna-obrona"],
      2:  ["leb-jak-sklep", "szybkie-badanie"],
      3:  [PROFESJA, "szybka-produkcja"],
      4:  [SZTUCZKA, "szybkie-rece"],
      5:  ["wyksztalciuch", POCHODZENIE],
      6:  [PROFESJA_LUB_SZTUCZKA],
      7:  ["specjalizacja-spec", "trajektoria"],
      8:  [SZTUCZKA],
      9:  ["bystrzacha"],
      10: [PROFESJA_LUB_SZTUCZKA],
      11: ["w-czuly-punkt", "szybka-produkcja-2"],
      12: [SZTUCZKA]
    }
  },

  /* =========================== TWARDZIEL =========================== */
  twardziel: {
    identifier: "twardziel",
    label: "Twardziel",
    primaryAbility: ABILITY.KON,
    requirement: { ability: ABILITY.KON, value: 15 },
    pw: PW_D8,
    saves: [ABILITY.KON, ABILITY.ZRC],
    skills: { count: 2, pool: ["akr", "atl", "int", "prc", "poj", "sur", "tre", "zas"] },
    tools: null,
    weapons: ["biala", "miotana", "palnaKrotka", "palnaPosr", "palnaDluga", "palnaCiezka", "specjalna"],
    armor: ["lgt", "med", "hvy", "shl"],
    multiclass: {
      weapons: "choice:2", armor: ["lgt", "med", "shl"],
      skills: { count: 1, fromClassPool: true }
    },
    startingEquipment: {
      always: ["Plecak żołnierza"],
      choice: {
        A: { gb: 200 },
        B: ["Empepiątka", "30 naboi 9 mm", "Plate carrier typ I", "rura stalowa"]
      }
    },
    // ⚠ Twardziel is the exception: 3 / 7 / 11, not 3 / 6 / 10.
    professionLevels: [3, 7, 11],
    professions: ["kowboj", "wojownik-autostrady", "zolnierz"],
    scale: {
      twardosc: {
        type: "dice", label: "Twardość",
        values: [null, null, "1d4", "1d4", "1d4", "1d6",
                 "1d6", "1d6", "1d8", "1d8", "1d8", "1d10"]
      },
      ulubionaBron: {
        type: "number", label: "Ulubiona broń",
        values: [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4]
      }
    },
    levels: {
      1:  ["wyjadacz", "kondycha", "ulubiona-bron-twardziel"],
      2:  ["przycelowanie", "zryw"],
      3:  [PROFESJA, "twardosc"],
      4:  [SZTUCZKA],
      5:  ["drugi-atak"],
      6:  [SZTUCZKA],
      7:  [PROFESJA, "wyjadacz-2"],
      8:  [SZTUCZKA],
      9:  ["nie-klekam"],
      10: ["trzeci-atak", SZTUCZKA],
      11: [PROFESJA],
      12: [SZTUCZKA]
    }
  },

  /* ============================ ZŁODZIEJ =========================== */
  zlodziej: {
    identifier: "zlodziej",
    label: "Złodziej",
    primaryAbility: ABILITY.ZRC,
    requirement: { ability: ABILITY.ZRC, value: 15 },
    pw: PW_D6,
    saves: [ABILITY.INT, ABILITY.ZRC],
    skills: {
      count: 4,
      pool: ["akr", "int", "osz", "prc", "per", "skr", "sle", "tch", "wys", "zas", "zwi"]
    },
    tools: { fixed: ["slusarza"] },
    weapons: ["biala", "miotana", "palnaKrotka"],
    armor: ["lgt"],
    multiclass: {
      weapons: [], armor: ["lgt"],
      skills: { count: 1, fromClassPool: true }, tools: { fixed: ["slusarz"] }
    },
    startingEquipment: {
      always: ["Plecak włamywacza", "narzędzia małego ślusarza"],
      choice: {
        A: { gb: 150 },
        B: ["kolczatki", "kulki stalowe", "kurtka ćwiekowana", "łuk tradycyjny",
            "20 strzał", "medpak", "nóż taktyczny", "nóż do rzucania ×2"]
      }
    },
    professionLevels: [3, 6, 10],
    professions: ["kurier", "szczur", "zabojca"],
    scale: {
      bolesnyAtak: {
        type: "dice", label: "Bolesny atak",
        values: ["1d6", "1d6", "2d6", "2d6", "3d6", "3d6",
                 "4d6", "4d6", "5d6", "5d6", "6d6", "6d6"]
      },
      kocieKosci: {
        type: "dice", label: "Kocie kości",
        values: [null, "1d4", "1d4", "1d4", "1d6", "1d6",
                 "1d6", "1d8", "1d8", "1d8", "1d10", "1d10"]
      }
    },
    levels: {
      1:  ["specjalizacja-zlodziej", "bolesny-atak", "szybkie-nogi"],
      2:  ["kocie-kosci", "ulubiona-bron-zlodziej"],
      3:  [PROFESJA, "podstepny-atak"],
      4:  [SZTUCZKA, "elektronik"],
      5:  ["szybkosc-kota", "specjalizacja-zlodziej-2"],
      6:  [PROFESJA_LUB_SZTUCZKA],
      7:  ["matrix"],
      8:  [SZTUCZKA],
      9:  ["dziewiec-zyc"],
      10: [PROFESJA_LUB_SZTUCZKA],
      11: ["saper"],
      12: [SZTUCZKA]
    }
  },

  /* =========================== ZWIADOWCA =========================== */
  zwiadowca: {
    identifier: "zwiadowca",
    label: "Zwiadowca",
    primaryAbility: ABILITY.MDR,
    requirement: { ability: ABILITY.MDR, value: 15 },
    pw: PW_D8,
    saves: [ABILITY.KON, ABILITY.MDR],
    skills: { count: 3, pool: ["atl", "int", "prc", "prz", "sur", "skr", "sle", "tre"] },
    tools: { fixed: ["klusownika"], choice: { count: 1, pool: ["kowala", "mechanika", "rzeznika"] } },
    weapons: ["biala", "miotana", "palnaKrotka", "palnaDluga"],
    armor: ["lgt", "med"],
    multiclass: {
      weapons: "choice:2", armor: ["lgt", "med", "shl"],
      skills: { count: 1, fromClassPool: true }
    },
    startingEquipment: {
      always: ["Plecak turysty", "narzędzia małego kłusownika"],
      choice: {
        A: { gb: 150 },
        B: ["kurtka ćwiekowana", "lewar M95", "10 naboi .30-06",
            "nóż taktyczny", "medpak"]
      }
    },
    professionLevels: [3, 6, 10],
    professions: ["lowca-mutantow", "sedzia", "zabojca-maszyn"],
    scale: {
      mojWrog: {
        type: "string", label: "Mój wróg",
        values: ["+1/1k6", "+1/1k6", "+1/1k6", "+1/1k6", "+2/2k6", "+2/2k6",
                 "+2/2k6", "+2/2k6", "+3/3k6", "+3/3k6", "+3/3k6", "+3/3k6"]
      },
      mojBiom: {
        type: "number", label: "Mój biom",
        values: [2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5]
      }
    },
    levels: {
      1:  ["moj-wrog", "moj-biom", "ulubiona-bron-zwiadowca"],
      2:  ["wyjadacz-zwiadowca", "klusownik"],
      3:  [PROFESJA, "cichy-krok"],
      4:  [SZTUCZKA],
      5:  ["drugi-atak", "moj-wrog-2"],
      6:  [PROFESJA_LUB_SZTUCZKA],
      7:  ["sportowiec", "wyczulone-zmysly"],
      8:  [SZTUCZKA],
      9:  ["moj-wrog-3", "ulubiona-bron-zwiadowca-2"],
      10: [PROFESJA_LUB_SZTUCZKA],
      11: ["wyjadacz-zwiadowca-2", "pogon"],
      12: [SZTUCZKA]
    }
  }
};

/* -------------------------------------------- */
/*  Profesje (subklasy)                          */
/* -------------------------------------------- */

/**
 * Each profession lists the abilities its parent class may choose from at its
 * profession levels. `proficiencies` is granted on taking the profession.
 */
export const PROFESSIONS = {
  /* Brutal */
  ganger:    { klasa: "brutal", label: "Ganger",
               abilities: ["dwoch-na-jednego", "ja-i-moj-gang", "jeden-z-nich", "odwazny-czy-glupi"] },
  gladiator: { klasa: "brutal", label: "Gladiator",
               abilities: ["nie-do-zdarcia", "lyzeczka", "zew-areny", "zawolajcie-kolegow"] },
  najemnik:  { klasa: "brutal", label: "Najemnik",
               abilities: ["maszyna-do-zabijania", "reputacja", "skuteczny-cios"] },

  /* Cwaniak */
  gwiazda:     { klasa: "cwaniak", label: "Gwiazda",
                 abilities: ["kakofonia", "lets-rock", "stylowa", "za-garsc-gambli"] },
  kaznodzieja: { klasa: "cwaniak", label: "Kaznodzieja Nowej Ery",
                 abilities: ["amen", "laska-boza", "moj-bog-kule-nosi", "tarcza-wiary"] },
  mafiozo:     { klasa: "cwaniak", label: "Mafiozo",
                 abilities: ["bezlitosny-przywodca", "renoma", "moja-prawa-reka"] },

  /* Spec */
  chemik: { klasa: "spec", label: "Chemik",
            abilities: ["smakuje-jak-arszenik", "pirotechnika", "rusznikarstwo"] },
  medyk:  { klasa: "spec", label: "Medyk",
            abilities: ["doktor-brain", "krwawy-aniol", "lapiduch", "farmacja"] },
  monter: { klasa: "spec", label: "Monter",
            abilities: ["mechanika", "hakerstwo", "serwisowanie"] },

  /* Twardziel */
  kowboj:                { klasa: "twardziel", label: "Kowboj",
                           abilities: ["clint", "rewolwerowiec", "zawsze-w-siodle"] },
  "wojownik-autostrady": { klasa: "twardziel", label: "Wojownik Autostrady",
                           abilities: ["drzwi-w-drzwi", "kaskader", "pancerna-fura"] },
  zolnierz:              { klasa: "twardziel", label: "Żołnierz",
                           abilities: ["jak-dbasz-tak-masz", "rutyna", "trening-w-zbroi"] },

  /* Złodziej */
  kurier:  { klasa: "zlodziej", label: "Kurier",
             abilities: ["skrytka", "slang", "znajomosci"] },
  szczur:  { klasa: "zlodziej", label: "Szczur",
             abilities: ["a-co-mi-tam", "szary", "truciciel", "zwinnosc-szczura"] },
  zabojca: { klasa: "zlodziej", label: "Zabójca",
             abilities: ["jeden-strzal", "kamuflaz", "strzelec"] },

  /* Zwiadowca */
  "lowca-mutantow": { klasa: "zwiadowca", label: "Łowca Mutantów",
                      abilities: ["bez-tajemnic", "mutant-na-sniadanie", "pogromca", "oswajanie-zwierzat"] },
  sedzia:           { klasa: "zwiadowca", label: "Sędzia",
                      abilities: ["jeden-z-nas", "rzuc-bron-i-gleba", "partner"] },
  "zabojca-maszyn": { klasa: "zwiadowca", label: "Zabójca Maszyn",
                      abilities: ["emiter-emp", "empiryk", "slaby-punkt"] }
};

/* -------------------------------------------- */
/*  Helpers                                      */
/* -------------------------------------------- */

/** Neuroshima PB — identical to dnd5e's floor((lvl+7)/4) for levels 1–12. */
export function proficiencyBonus(level) {
  return Math.floor((Math.clamp(level, 1, 12) + 7) / 4);
}

/** Look up a scale value for a class at a given level. */
export function scaleValueAt(classId, valueId, level) {
  const values = CLASSES[classId]?.scale?.[valueId]?.values;
  if (!values) return null;
  return values[Math.clamp(level, 1, 12) - 1] ?? null;
}

/** All profession ids belonging to a class. */
export function professionsOf(classId) {
  return Object.entries(PROFESSIONS)
    .filter(([, p]) => p.klasa === classId)
    .map(([id]) => id);
}

export const CLASS_IDS = Object.keys(CLASSES);
export const PROFESSION_IDS = Object.keys(PROFESSIONS);
