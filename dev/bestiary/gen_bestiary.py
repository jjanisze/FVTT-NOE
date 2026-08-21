# -*- coding: utf-8 -*-
"""Turn bestiary.json into scripts/config/bestiary-data.mjs.

Pipeline position (mirrors dev/classes/gen_features.py):

    Podrecznik/Bestiariusz/*.md
      -> extract_bestiary.py      bestiary.json          (pure transcription)
      -> gen_bestiary.py          bestiary-data.mjs      (+ automation metadata)
      -> dev/packs/build-packs.mjs  packs/bestiariusz    (LevelDB)

The prose in the vault says *what* an ability does in Polish; it cannot say which
dnd5e activity type implements it, which status id it applies, or what the save
target is. That is what this file adds, in two layers:

  RULES       — pattern rules keyed on the ability *name*. The rulebook reuses the
                same ability across many creatures with identical wording, so one
                rule covers dozens of features: Pierwsze spotkanie (32 creatures),
                Algorytm czuwania (11), Współpraca (10), Światłowstręt (4).
  AUTOMATION  — per-creature overrides, keyed "<creature-id>.<ability-slug>", for
                the genuinely bespoke ones.

Anything neither layer claims is emitted as a plain descriptive feature: readable
on the sheet, not automated. That boundary is deliberate — a complete bestiary
that is 60% automated beats a fifth of a bestiary that is 100% automated.

Automation levels follow the house doctrine: automate *detection* and
*bookkeeping*, never *application*. Riders with narrative weight surface a chat
card with a button and wait for the GM.

    python dev/bestiary/gen_bestiary.py
"""
import json, io, os, re, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "bestiary.json")
OUT = os.path.abspath(os.path.join(HERE, "..", "..", "scripts", "config", "bestiary-data.mjs"))

ABIL_WORDS = {
    "siłę": "str", "siły": "str", "siła": "str",
    "zręczność": "dex", "zręczności": "dex",
    "kondycję": "con", "kondycji": "con",
    "inteligencję": "int", "inteligencji": "int",
    "mądrość": "wis", "mądrości": "wis",
    "charyzmę": "cha", "charyzmy": "cha",
}

SIZE_WORDS = {"malutki": "tiny", "mały": "sm", "średni": "med",
              "duży": "lg", "wielki": "huge", "ogromny": "grg"}

# Machines print "-" for Charisma. dnd5e has no "no score" state; 1 is the 5e
# convention for a mindless construct and keeps the sheet from looking broken.
NO_SCORE_VALUE = 1

warnings = []


def slug(name):
    s = unicodedata.normalize("NFKD", name.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    for a, b in [("ł", "l"), ("ż", "z"), ("ź", "z"), ("ó", "o"), ("ę", "e"),
                 ("ą", "a"), ("ć", "c"), ("ń", "n"), ("ś", "s")]:
        s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def dice(formula):
    """Polish dice notation uses 'k'; Foundry wants 'd'. '8k6' -> '8d6'."""
    return re.sub(r"(\d)\s*k\s*(\d)", r"\1d\2", formula) if formula else None


def find_dc(text):
    m = re.search(r"ST\s*(\d+)", text)
    return int(m.group(1)) if m else None


def find_save_ability(text):
    m = re.search(r"RO na (\w+)", text, re.I)
    if not m:
        return None
    return ABIL_WORDS.get(m.group(1).lower())


# ------------------------------------------------------------------ #
#  RULES — name-keyed, apply across every creature that has them      #
# ------------------------------------------------------------------ #

def rule_pierwsze_spotkanie(cid, feat):
    """'RO na Mądrość o ST 9.' — a morale/fear check on first sighting.

    A `save` activity the GM fires once when the creature is revealed.
    Auto-firing on token reveal would be over-engineering: the GM decides when
    the party actually *sees* the thing.
    """
    dc = find_dc(feat["text"])
    ability = find_save_ability(feat["text"]) or "wis"
    if dc is None:
        warnings.append(f"{cid}: Pierwsze spotkanie has no ST")
        return None
    return {"kind": "save", "ability": ability, "dc": dc, "activation": "special"}


def rule_wspolpraca(cid, feat):
    """Pack tactics. dnd5e core has no flag-based advantage system (verified:
    there is no `flags.dnd5e.advantage` in actor.mjs — that is MIDI-QOL), so
    this has to be a `dnd5e.postBuildAttackRollConfig` hook counting adjacent
    conscious allies. Implemented in scripts/combat/pack-tactics.mjs."""
    m = re.search(r"zasięgu ([\d,]+) m", feat["text"])
    rng = float(m.group(1).replace(",", ".")) if m else 1.5
    return {"kind": "packTactics", "range": rng}


def rule_algorytm_czuwania(cid, feat):
    """'nigdy nie jest Zaskoczony' — immunity to the `surprised` status."""
    return {"kind": "conditionImmunity", "condition": "surprised"}


def rule_swiatlowstret(cid, feat):
    """Blinded in sunlight. Reading scene darkness to decide this is fragile
    (indoor scenes at noon, lit interiors), so it ships as a GM-toggled effect."""
    return {"kind": "toggleEffect", "condition": "blinded", "trigger": "sunlight"}


def rule_atak_wielokrotny(cid, feat):
    """Multiattack is a container describing how many of the *other* actions to
    take. There is nothing to roll on its own."""
    return {"kind": "multiattack"}


RULES = {
    "pierwsze-spotkanie": rule_pierwsze_spotkanie,
    "wspolpraca": rule_wspolpraca,
    "algorytm-czuwania": rule_algorytm_czuwania,
    "swiatlowstret": rule_swiatlowstret,
    "atak-wielokrotny": rule_atak_wielokrotny,
}

# ------------------------------------------------------------------ #
#  AUTOMATION — per-creature overrides                                #
# ------------------------------------------------------------------ #

AUTOMATION = {
    # ---- Bit-Boys (vertical slice) ----
    "bit-boys.palcozerca": {
        # Full GM-in-the-loop shape: the crit is detected automatically, but the
        # debuff is applied only when the GM picks a victim and clicks. Written
        # as a *generic* crit rider so Alahama/Szczękowij/Neoniedźwiedź can reuse
        # it — see scripts/combat/crit-riders.mjs.
        "kind": "critRider",
        "rider": "palcozerca",
        "roll": "1d10",
        "table": {"1-5": "palce lewej ręki", "6-10": "palce prawej ręki"},
        "effect": {
            "key": "palec-odgryziony",
            "label": "Odgryziony palec",
            "permanent": True,
            "changes": [
                # -1 to every Dex-based ability check, until regrown or replaced.
                {"key": "system.bonuses.abilities.check", "mode": "add", "value": "-1"}
            ],
        },
        "skipsZranienie": True,   # "Atak nie powoduje otrzymania Stopnia Zranienia"
    },
    "bit-boys.pazury": {
        "onHit": {"condition": "grappled", "escapeDC": 12, "maxSize": "med"},
    },
    "bit-boys.unieruchomienie": {
        "kind": "save", "ability": "str", "dc": 12,
        "activation": "bonus",
        "onFail": {"condition": "restrained", "escapeDC": 12},
        "requires": "grappled",
    },
    "bit-boys.skok": {"kind": "descriptive"},
}


# ------------------------------------------------------------------ #
#  Build                                                              #
# ------------------------------------------------------------------ #

def automate(cid, feat):
    key = f"{cid}.{slug(feat['name'])}"
    if key in AUTOMATION:
        return AUTOMATION[key]
    rule = RULES.get(slug(feat["name"]))
    return rule(cid, feat) if rule else None


def build_creature(cid, r):
    ab = {}
    for k, v in (r.get("abilities") or {}).items():
        if v.get("none"):
            ab[k] = NO_SCORE_VALUE
        elif v.get("inherit"):
            ab[k] = None
        else:
            ab[k] = v["value"]

    hp = r.get("hp", {})
    senses = r.get("senses", {})

    out = {
        "id": cid,
        "name": r["name"],
        "size": r.get("size"),
        "creatureType": r.get("creatureType"),
        "typeNote": r.get("typeNote"),
        "blood": r["lore"].get("krewTag"),
        "lore": {k: v for k, v in r["lore"].items() if k != "krewTag"},
        "ac": r.get("ac", {}).get("value"),
        "acNote": r.get("ac", {}).get("note"),
        "hp": {"avg": hp.get("avg"), "formula": dice(hp.get("formula"))},
        "damageThreshold": hp.get("damageThreshold"),
        "failureThreshold": hp.get("failureThreshold"),
        "initiative": r.get("initiative", {}).get("mod"),
        "speed": r.get("speed", {}),
        "abilities": ab,
        "saves": r.get("saves", {}),
        "skills": r.get("skills", {}),
        "tools": r.get("tools"),
        "resistances": r.get("resistances", []),
        "immunities": r.get("immunities", []),
        "vulnerabilities": r.get("vulnerabilities", []),
        "conditionImmunities": r.get("conditionImmunities", []),
        "senses": {k: v for k, v in senses.items() if k not in ("raw", "qualifiers")},
        "senseQualifiers": senses.get("qualifiers"),
        "sp": r.get("sp", {}).get("value"),
        "pb": r.get("sp", {}).get("pb"),
        "morale": r.get("morale"),
        "usesZranienie": bool(r.get("usesZranienie")),
        "gear": r.get("items"),
        "carry": r.get("carry"),
        "overlay": r.get("overlay", False),
        "randomized": r.get("randomized", False),
        "features": [],
        "attacks": [],
    }

    for f in r["features"]:
        out["features"].append({
            "id": slug(f["name"]),
            "name": f["name"],
            "section": f["section"],
            "text": f["text"],
            "automation": automate(cid, f),
        })

    for a in r["attacks"]:
        auto = AUTOMATION.get(f"{cid}.{slug(a['name'])}", {})
        dmg = a.get("damage") or {}
        out["attacks"].append({
            "id": slug(a["name"]),
            "name": a["name"],
            "section": a["section"],
            "kind": a["kind"],
            "bonus": a["bonus"],
            "reach": a.get("reach"),
            "range": a.get("range"),
            "damage": {
                "avg": dmg.get("avg"),
                "formula": dice(dmg.get("formula")),
                "type": dmg.get("type"),
            } if dmg else None,
            "rider": a.get("rider"),
            "onHit": auto.get("onHit"),
        })

    return out


def main():
    data = json.load(io.open(SRC, encoding="utf-8"))
    built = {cid: build_creature(cid, r) for cid, r in sorted(data.items())}

    n_auto = sum(1 for c in built.values() for f in c["features"] if f["automation"])
    n_feat = sum(len(c["features"]) for c in built.values())
    n_hit = sum(1 for c in built.values() for a in c["attacks"] if a["onHit"])

    header = f'''/**
 * Neuroshima 5e — Bestiariusz data.
 *
 * GENERATED by dev/bestiary/gen_bestiary.py — do not edit by hand.
 * Content comes from Podrecznik/Bestiariusz/*.md via extract_bestiary.py;
 * automation metadata comes from the RULES/AUTOMATION layers in the generator.
 *
 * {len(built)} creatures, {n_feat} features ({n_auto} automated), {n_hit} attack riders.
 */

export const BESTIARY = '''

    body = json.dumps(built, ensure_ascii=False, indent=2, sort_keys=True)
    with io.open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(header + body + ";\n")

    print(f"Bestiariusz — generating data module\n")
    print(f"  creatures     {len(built)}")
    print(f"  features      {n_feat} ({n_auto} automated, {n_feat - n_auto} descriptive)")
    print(f"  attacks       {sum(len(c['attacks']) for c in built.values())} ({n_hit} with on-hit riders)")
    if warnings:
        print(f"\n{len(warnings)} warnings:")
        for w in warnings:
            print("  " + w)
    print(f"\nwrote {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
