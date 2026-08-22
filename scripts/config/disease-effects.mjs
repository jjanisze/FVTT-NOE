/**
 * Neuroshima 5e — mechanical effects of disease stages.
 *
 * `diseases-data.mjs` holds the rulebook *text*; this holds what the system can
 * actually enforce from it. Split deliberately: the text is quoted and must not
 * drift, while this table encodes judgement calls about how each sentence maps
 * onto dnd5e, and those calls are worth reviewing on their own.
 *
 * ## How a sentence becomes an effect
 *
 * dnd5e 5.3 exposes `AdvantageModeField` on the roll config of abilities, saves,
 * skills and tools, applied by Active Effect with ADD mode (-1 disadvantage,
 * +1 advantage). A skill roll *combines* the ability's mode with the skill's own
 * (`actor.mjs` → `AdvantageModeField.combineFields`), so
 * `abilities.cha.check.roll.mode = -1` correctly covers "Utrudnienie w Testach
 * Cech opartych na Charyzmie" including CHA-based skill tests. That single fact
 * is why most of this table is one or two changes per stage.
 *
 * Attack rolls have no equivalent field, so `attack` here is handled at roll time
 * by `actors/disease-effects.mjs` through `dnd5e.postBuildAttackRollConfig`.
 *
 * ## Fields
 * - `changes`     Active Effect changes, applied while the stage is current.
 * - `statuses`    Status ids granted by the effect (prone, frightened…).
 * - `attack`      Attack-roll disadvantage: `"all"` or an ability key.
 * - `conditional` A situation the system cannot detect (daylight, riding as a
 *                 passenger). Rendered as a toggle chip on the disease row; its
 *                 `changes`/`attack` only apply while the GM/player switches it on.
 * - `tick`        A per-interval damage the toggle exposes as a button.
 * - `rage`        Szał trigger; `chance` is the k100 threshold (100 = automatic).
 * - `bleed`       Hemofilia's bleeding trigger (see `combat/bleeding.mjs`).
 * - `fallMultiplier` Multiplies Spadanie damage (see `combat/falling.mjs`).
 * - `manual`      Prose the system deliberately does NOT enforce, shown in the
 *                 panel so it is obvious what is still the GM's job.
 *
 * ## Invariant: a stage is never milder than the one below it
 * Only one stage's effect is live at a time, so each entry states the *total* at that
 * stage rather than an increment. The rulebook text does not: it often describes the new
 * symptom and stays silent about what obviously still hurts, which read literally would
 * cure a haemorrhaging character's back pain as they got worse. Where a stage's text does
 * not revoke an earlier penalty, that penalty is repeated here. Losing a *benefit* on the
 * way up (Paranoja's Ułatwienie, Szaleństwo's Ułatwienie w Zastraszaniu) is not a violation
 * — that is the disease getting worse.
 */

// CONST.ACTIVE_EFFECT_MODES, spelled out: this module is imported by the pack
// builder and by node syntax checks, where the Foundry globals do not exist.
const MULTIPLY = 1;
const ADD = 2;
const UPGRADE = 4;
const OVERRIDE = 5;

/** Disadvantage (-1) / advantage (+1) on an ability's checks. */
const check = (abl, v = -1) => ({ key: `system.abilities.${abl}.check.roll.mode`, mode: ADD, value: String(v) });
/** Disadvantage / advantage on an ability's saving throws. */
const save = (abl, v = -1) => ({ key: `system.abilities.${abl}.save.roll.mode`, mode: ADD, value: String(v) });
/** Disadvantage / advantage on a named skill. */
const skill = (id, v = -1) => ({ key: `system.skills.${id}.roll.mode`, mode: ADD, value: String(v) });

const ALL_ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
/** "Utrudnienie we wszystkich Testach" — every ability check, and so every skill. */
const allChecks = (v = -1) => ALL_ABILITIES.map(a => check(a, v));
const allSaves = (v = -1) => ALL_ABILITIES.map(a => save(a, v));

/**
 * "Wpływanie" is an *action*, not a skill — it resolves as a CHA test with
 * Zastraszanie / Oszustwo / Perswazja, or a MDR test with Tresura. The MDR half
 * is already covered wherever the stage also penalises MDR, so this maps the
 * three CHA skills. Flagged here because it is an interpretation, not RAW text.
 */
const wplywanie = (v = -1) => [skill("zas", v), skill("osz", v), skill("per", v)];

/** Speed to zero / halved. */
const speedZero = { key: "system.attributes.movement.walk", mode: OVERRIDE, value: "0" };
const speedHalf = { key: "system.attributes.movement.walk", mode: MULTIPLY, value: "0.5" };

/**
 * Effects keyed by disease, then by stage index (0 = przewlekły).
 * A missing stage means the stage has no enforceable mechanics.
 * @type {Readonly<Record<string, Record<number, object>>>}
 */
export const DISEASE_EFFECTS = Object.freeze({

  /* ---- Hemofilia — single "stan ogólny" ---- */
  hemofilia: {
    0: {
      bleed: true
    }
  },

  /* ---- Niewydolność krążenia ---- */
  niewydolnoscKrazenia: {
    0: { changes: [check("str"), check("con")] },
    1: {
      changes: [check("str"), check("con"), save("str"), save("con")],
      attack: "str"
    },
    2: {
      // "Utrudnienie we wszystkich Testach" — Testy Cech, Ataku i RO alike.
      changes: [...allChecks(), ...allSaves(), speedZero],
      attack: "all",
      statuses: ["prone"],
      manual: "Powalenie utrzymuje się, póki zdrowie się nie poprawi."
    }
  },

  /* ---- Syndrom Draculi ---- */
  syndromDraculi: {
    0: {
      // Darkvision is unconditional; the daylight penalty is not.
      changes: [{ key: "system.attributes.senses.darkvision", mode: UPGRADE, value: "18" }],
      conditional: {
        label: "w świetle dziennym",
        changes: [skill("prc")],
        attack: "all"
      }
    },
    1: {
      changes: [{ key: "system.attributes.senses.darkvision", mode: UPGRADE, value: "18" }],
      conditional: {
        label: "na słońcu",
        tick: { formula: "1d4", type: "light", period: "minutę" }
      }
    },
    2: {
      changes: [{ key: "system.attributes.senses.darkvision", mode: UPGRADE, value: "18" }],
      conditional: {
        label: "w świetle",
        tick: { formula: "1d6", type: "light", period: "minutę" }
      }
    }
  },

  /* ---- Syndrom Thurmana ---- */
  syndromThurmana: {
    0: { changes: [check("int")] },
    1: {
      changes: [
        { key: "system.abilities.int.value", mode: OVERRIDE, value: "6" },
        check("cha")
      ]
    },
    2: {
      changes: [
        { key: "system.abilities.int.value", mode: OVERRIDE, value: "2" },
        check("cha"),
        { key: "system.traits.ci.value", mode: ADD, value: "frightened" }
      ],
      manual: "W walce używasz tylko broni improwizowanej lub ataków bez broni."
    }
  },

  /* ---- Szaleństwo bostońskie ---- */
  szalenstwoBostonskie: {
    0: { changes: [skill("per"), skill("osz"), skill("zas", 1)] },
    1: {
      changes: [check("int"), check("cha")],
      rage: { chance: 50 }
    },
    2: {
      changes: [check("int"), check("cha")],
      rage: { chance: 100 },
      manual: "W szale atakujesz wszystkich wokół; uspokajasz się dopiero po utracie przytomności."
    }
  },

  /* ---- Osteoporoza ---- */
  osteoporoza: {
    0: { fallMultiplier: 2 },
    1: {
      changes: [check("str"), save("str")],
      attack: "str",
      fallMultiplier: 2
    },
    2: {
      changes: [check("str"), save("str"), speedHalf],
      attack: "str",
      fallMultiplier: 4
    }
  },

  /* ---- Paranoja ---- */
  paranoja: {
    0: { changes: [skill("int", 1), skill("prc", 1), skill("osz"), skill("per")] },
    1: {
      changes: [check("int"), check("wis"), save("int"), save("wis"), ...wplywanie()]
    },
    2: {
      changes: [check("int"), check("wis"), save("int"), save("wis"), ...wplywanie()],
      statuses: ["frightened"],
      manual: "Jedyną akcją, jaką możesz wykonać w walce, jest Unikanie."
    }
  },

  /* ---- Zaburzenia błędnika ---- */
  zaburzeniaBledinka: {
    0: {
      conditional: {
        label: "jako pasażer pojazdu",
        changes: [...allChecks(), ...allSaves()],
        attack: "all"
      }
    },
    1: {
      attack: "all",
      conditional: {
        label: "jako pasażer pojazdu",
        changes: [...allChecks(), ...allSaves()],
        attack: "all"
      },
      manual: "Nie potrafisz przejść więcej niż 3 metry w linii prostej."
    },
    2: {
      changes: [...allChecks(), ...allSaves(), speedZero],
      attack: "all"
    }
  }
});

/**
 * Effect spec for a disease entry at its current stage.
 * Custom (player-authored) diseases have no key and therefore no mechanics —
 * inventing effects from free text would be guesswork.
 * @param {object} entry
 * @returns {object|null}
 */
export function effectsFor(entry) {
  if (!entry?.key) return null;
  return DISEASE_EFFECTS[entry.key]?.[entry.stage ?? 0] ?? null;
}

/** True when this stage has a GM-toggleable situational rider. */
export function hasConditional(entry) {
  return !!effectsFor(entry)?.conditional;
}
