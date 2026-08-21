# -*- coding: utf-8 -*-
"""Extract the 52 Bestiariusz statblocks from the Obsidian vault into bestiary.json.

Source layout (one file per creature, `Podrecznik/Bestiariusz/*.md`):

    # NAZWA                      <- lore heading
    **Kategoria.** ...           <- lore fields
    ...
    ---                          <- separator; everything below is the statblock
    ## NAZWA
    *Mały potwór*                <- size + creature type
    **TT** 12                    <- header fields, closed vocabulary of 16 labels
    ...
    | Siła | Zrc | ... |         <- the six-ability table
    **ZDOLNOŚCI**                <- one of exactly 5 section headers
    **Nazwa.** treść
    **AKCJE**
    **Pazury.** Atak wręcz: +4; zasięg 1,5 m; Obrażenia: 5 (1k6 + 2) kłute...

Design stance: **strict**. An unrecognised header label, section, size, creature
type, damage type, condition, skill or sense is an error, not a silent skip —
the same posture `dev/packs/validate-packs.mjs` takes with unresolved grants.
Errors are *collected*, so one run reports everything wrong at once.

Two creatures are structurally special and flagged rather than forced:
  - **Zombie (Nakładka Death Breath)** — an overlay on a host, not a creature.
    Half its fields read "bez zmian (jak u nosiciela)".  -> overlay: true
  - **Mobsprzęt** — chassis and weapon are rolled on embedded tables.
                                                        -> randomized: true

    python dev/bestiary/extract_bestiary.py
"""
import re, json, io, os, glob, sys, unicodedata

VAULT = r"c:\Git\Neuroshima\neuro5e\Neuro 5e\Podrecznik\Bestiariusz"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "bestiary.json")

# ------------------------------------------------------------------ #
#  Closed vocabularies                                                #
# ------------------------------------------------------------------ #

# Size words carry Polish gender agreement (Mały potwór / Mała maszyna / Małe
# zwierzę), so match on the stem rather than enumerating every inflection.
SIZES = [
    ("malut", "tiny"), ("ogromn", "grg"), ("wielk", "huge"),
    ("duż", "lg"), ("dużym", "lg"), ("średn", "med"), ("mał", "sm"),
]
# Order matters: "malut" must be tested before "mał".

CREATURE_TYPES = {
    "człowiek": "czlowiek",
    "maszyna": "maszyna",
    "mutant": "mutant",
    "potwór": "potwor",
    "zwierzę": "zwierze",
    "rój zwierząt": "rojZwierzat",
}

ABILITIES = {
    "siła": "str", "sil": "str",
    "zręczność": "dex", "zrc": "dex",
    "kondycja": "con", "kon": "con",
    "inteligencja": "int", "int": "int",
    "mądrość": "wis", "mdr": "wis",
    "charyzma": "cha", "cha": "cha",
}

SKILLS = {
    "akrobatyka": "akr", "atletyka": "atl", "historia": "his", "intuicja": "int",
    "medycyna": "med", "oszustwo": "osz", "percepcja": "prc", "perswazja": "per",
    "pojazdy": "poj", "przyroda": "prz", "skradanie się": "skr", "survival": "sur",
    "śledztwo": "sle", "technika": "tch", "tresura": "tre", "występy": "wys",
    "zastraszanie": "zas", "zwinne dłonie": "zwi",
}

# Keys are the Neuroshima damage names; values are dnd5e ids as overridden in
# `scripts/config/damage-types.mjs`.
DAMAGE_TYPES = {
    "cięte": "slashing", "kłute": "piercing", "obuchowe": "bludgeoning",
    "od ognia": "fire", "elektryczne": "lightning", "od kwasu": "acid",
    "wybuchowe": "explosive", "psychiczne": "psychic", "od trucizny": "poison",
    "radioaktywne": "radiant", "od zimna": "cold",
    # Only Biodroid's laser rifle uses this, and the module has no matching type
    # (`radiant` was renamed "Radioaktywne"). Mapped to radiant as the closest
    # energy type; see the note emitted at the end of the run.
    "od światła": "radiant",
}

# Statuses as named in `scripts/config/conditions.mjs`.
CONDITIONS = {
    "nieprzytomność": "unconscious", "niewidoczność": "invisible",
    "obezwładnienie": "incapacitated", "ogłuchnięcie": "deafened",
    "ogłuszenie": "stunned", "oślepienie": "blinded", "pochwycenie": "grappled",
    "powalenie": "prone", "przerażenie": "frightened",
    "sparaliżowanie": "paralyzed", "unieruchomienie": "restrained",
    "wyczerpanie": "exhaustion", "zatrucie": "poisoned", "zauroczenie": "charmed",
}

# dnd5e `attributes.senses` has fixed keys. Termowizja has no counterpart and is
# kept as a Neuroshima-only sense (a v14 DetectionMode is the eventual home).
SENSES = {
    "noktowizja": "darkvision",
    "ślepowidzenie": "blindsight",
    "wyczuwanie drgań": "tremorsense",
    "termowizja": "termowizja",
}

MOVEMENT = {
    "wspinanie": "climb", "pływanie": "swim", "latanie": "fly", "lot": "fly",
    "kopanie": "burrow", "skok": "jump",
}

LORE_FIELDS = {
    "Kategoria": "kategoria", "Krew": "krew", "Występowanie": "wystepowanie",
    "Wygląd": "wyglad", "Informacje": "informacje", "Taktyka": "taktyka",
}

SECTIONS = {
    "ZDOLNOŚCI": "traits",
    "AKCJE": "actions",
    "AKCJA BONUSOWA": "bonus",
    "REAKCJA": "reaction",
    "AKCJE LEGENDARNE": "legendary",
}

HEADER_LABELS = {
    "TT", "PW", "Inicjatywa", "Szybkość", "Zmysły", "Siła przeciwnika",
    "Umiejętności", "Tchórzliwość", "Stopień Zranienia", "Niewrażliwość na stany",
    "Niewrażliwość na obrażenia", "Przedmioty", "Odporność na obrażenia",
    "Rzuty obronne", "Wrażliwość na obrażenia", "Udźwig",
}

# "bez zmian (jak u nosiciela)" / "jak u nosiciela" — the Zombie overlay marker.
INHERIT = re.compile(r"jak u nosiciela|bez zmian")

errors = []
# Things the parser recovered from, but that are defects in the *source markdown*
# and should be fixed in the vault. Reported separately so a typo in the rulebook
# transcription doesn't block a build.
warnings = []


def err(f, msg):
    errors.append(f"{f}: {msg}")


def warn(f, msg):
    warnings.append(f"{f}: {msg}")


def slug(name):
    s = unicodedata.normalize("NFKD", name.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = (s.replace("ł", "l").replace("ż", "z").replace("ź", "z")
          .replace("ó", "o").replace("ę", "e").replace("ą", "a")
          .replace("ć", "c").replace("ń", "n").replace("ś", "s"))
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def num(s):
    """'1,5' and '1.5' -> float; '12' -> int."""
    s = s.strip().replace(",", ".")
    v = float(s)
    return int(v) if v == int(v) else v


# Polish uses the comma as a decimal separator ("4,5 m"), so a naive split on ","
# tears "4,5 m, latanie 36 m" into "4" / "5 m" / "latanie 36 m". Only split on a
# comma that is NOT sitting between two digits.
COMMA = re.compile(r",\s*(?!\d)")


def split_list(s):
    """'cięte, kłute i obuchowe' -> ['cięte','kłute','obuchowe']"""
    s = re.sub(r"\s+i\s+", ", ", s)
    return [p.strip().strip(".") for p in COMMA.split(s) if p.strip()]


def strip_qualifier(part):
    """Pull a trailing '(tylko w wodzie)' off a value, returning (value, qualifier)."""
    q = re.search(r"\((.+)\)\s*$", part)
    if not q:
        return part.strip(), None
    return part[:q.start()].strip(), q.group(1).strip()


# ------------------------------------------------------------------ #
#  Field parsers                                                      #
# ------------------------------------------------------------------ #

def parse_tt(f, v, out):
    if INHERIT.search(v) or v.strip().startswith(("-", "+")) and "(" not in v:
        out["ac"] = {"inherit": True, "modifier": num(v.strip())}
        return
    m = re.match(r"^(\d+)\s*(?:\((.+)\))?\s*$", v)
    if not m:
        return err(f, f"unparsed TT: {v!r}")
    out["ac"] = {"value": int(m.group(1)), "note": m.group(2)}


def parse_pw(f, v, out):
    hp = {}
    parts = [p.strip() for p in v.split(";")]
    head = parts[0]
    if INHERIT.search(head):
        hp["inherit"] = True
    else:
        m = re.match(r"^(\d+)\s*\(([^)]+)\)\s*$", head)
        if not m:
            return err(f, f"unparsed PW: {head!r}")
        hp["avg"] = int(m.group(1))
        hp["formula"] = m.group(2).strip()
    for p in parts[1:]:
        m = re.match(r"^Próg (obrażeń|awarii)\s+(\d+)$", p)
        if not m:
            return err(f, f"unparsed PW rider: {p!r}")
        hp["damageThreshold" if m.group(1) == "obrażeń" else "failureThreshold"] = int(m.group(2))
    out["hp"] = hp


def parse_init(f, v, out):
    m = re.match(r"^([+-]?\d+)\s*\((\d+)\)\s*$", v.strip())
    if not m:
        return err(f, f"unparsed Inicjatywa: {v!r}")
    out["initiative"] = {"mod": int(m.group(1)), "passive": int(m.group(2))}


def parse_speed(f, v, out):
    if INHERIT.search(v):
        out["speed"] = {"inherit": True}
        return
    if not re.match(r"^[\d,]", v.strip()):
        # Mobsprzęt: "rzuć 1k6 i sprawdź w tabeli poniżej"
        out["speed"] = {"rolled": v.strip()}
        return
    sp, note = {}, None
    for part in COMMA.split(v):
        part = part.strip()
        # "36 m (tylko u SMART-a)" — keep the qualifier, don't lose it
        part, q = strip_qualifier(part)
        if q:
            note = f"{note}; {q}" if note else q
        m = re.match(r"^(?:([a-ząćęłńóśźż]+)\s+)?([\d,.]+)\s*m$", part, re.I)
        if not m:
            return err(f, f"unparsed Szybkość part: {part!r}")
        kind, val = m.group(1), num(m.group(2))
        if kind is None:
            sp["walk"] = val
        elif kind.lower() in MOVEMENT:
            sp[MOVEMENT[kind.lower()]] = val
        else:
            return err(f, f"unknown movement type: {kind!r}")
    if note:
        sp["note"] = note
    out["speed"] = sp


def parse_senses(f, v, out):
    if INHERIT.search(v):
        out["senses"] = {"inherit": True}
        return
    se = {"raw": v.strip()}
    for part in COMMA.split(v):
        part, q = strip_qualifier(part.strip())
        m = re.match(r"^Pasywna Percepcja\s+(\d+)$", part, re.I)
        if m:
            se["passivePerception"] = int(m.group(1))
            continue
        m = re.match(r"^([A-Za-ząćęłńóśźżŚŁ ]+?)\s+([\d,.]+)\s*m$", part)
        if not m:
            return err(f, f"unparsed Zmysły part: {part!r}")
        key = m.group(1).strip().lower()
        if key not in SENSES:
            return err(f, f"unknown sense: {key!r}")
        se[SENSES[key]] = num(m.group(2))
        if q:
            # "Ślepowidzenie 36 m (tylko w wodzie)" — dnd5e senses carry no
            # conditionality, so the restriction has to survive as prose.
            se.setdefault("qualifiers", {})[SENSES[key]] = q
    out["senses"] = se


def parse_sp(f, v, out):
    if INHERIT.search(v):
        m = re.match(r"^([+-]\d+)", v.strip())
        out["sp"] = {"inherit": True, "modifier": int(m.group(1)) if m else None}
        return
    m = re.match(r"^(\d+)\s*\(PB\s*([+-]\d+)\)\s*$", v.strip())
    if not m:
        return err(f, f"unparsed Siła przeciwnika: {v!r}")
    out["sp"] = {"value": int(m.group(1)), "pb": int(m.group(2))}


def parse_saves(f, v, out):
    sv = {}
    for part in split_list(v):
        m = re.match(r"^([A-Za-ząćęłńóśźżŚĄ]+)\s*([+-]\d+)$", part.strip())
        if not m:
            return err(f, f"unparsed Rzuty obronne part: {part!r}")
        key = m.group(1).strip().lower()
        if key not in ABILITIES:
            return err(f, f"unknown save ability: {key!r}")
        sv[ABILITIES[key]] = int(m.group(2))
    out["saves"] = sv


# The Umiejętności line mixes real skills with tool proficiencies and, for a few
# creatures, an unresolved *choice* ("Jedna umiejętność lub biegłość w
# narzędziach"). Tools are not skills in dnd5e, so they are routed to their own
# bucket and left as raw text — mapping them onto `tools.mjs` ids is the
# AUTOMATION layer's job, not the parser's.
TOOLISH = re.compile(r"narzędzi|zestaw|biegłość|umiejętność lub", re.I)


def parse_skills(f, v, out):
    sk, tools = {}, []
    for part in split_list(v):
        part = part.strip()
        if TOOLISH.search(part):
            m = re.match(r"^(.+?)\s*([+-]\d+)$", part)
            tools.append({"text": m.group(1).strip() if m else part,
                          "bonus": int(m.group(2)) if m else None})
            continue
        m = re.match(r"^(.+?)\s*([+-]\d+)$", part)
        if not m:
            return err(f, f"unparsed Umiejętności part: {part!r}")
        key = m.group(1).strip().lower()
        if key not in SKILLS:
            return err(f, f"unknown skill: {key!r}")
        sk[SKILLS[key]] = int(m.group(2))
    out["skills"] = sk
    if tools:
        out["tools"] = tools


def _damage_list(f, v, field, out):
    res = []
    for part in split_list(v):
        key = part.strip().lower()
        if key not in DAMAGE_TYPES:
            err(f, f"unknown damage type in {field}: {key!r}")
            continue
        res.append(DAMAGE_TYPES[key])
    out[field] = sorted(set(res))


def parse_cond_immunities(f, v, out):
    res = []
    for part in split_list(v):
        key = part.strip().lower()
        if key not in CONDITIONS:
            err(f, f"unknown condition: {key!r}")
            continue
        res.append(CONDITIONS[key])
    out["conditionImmunities"] = sorted(set(res))


def parse_morale(f, v, out):
    m = re.match(r"^(\d+)\s*%$", v.strip())
    if not m:
        return err(f, f"unparsed Tchórzliwość: {v!r}")
    out["morale"] = int(m.group(1))


def parse_carry(f, v, out):
    m = re.match(r"^Użytkowy:\s*([\d.,]+)\s*kg\.\s*Maksymalny:\s*([\d.,]+)\s*kg\.?$", v.strip())
    if not m:
        return err(f, f"unparsed Udźwig: {v!r}")
    out["carry"] = {"normal": num(m.group(1)), "max": num(m.group(2))}


HEADER_PARSERS = {
    "TT": parse_tt,
    "PW": parse_pw,
    "Inicjatywa": parse_init,
    "Szybkość": parse_speed,
    "Zmysły": parse_senses,
    "Siła przeciwnika": parse_sp,
    "Rzuty obronne": parse_saves,
    "Umiejętności": parse_skills,
    "Tchórzliwość": parse_morale,
    "Udźwig": parse_carry,
    "Niewrażliwość na stany": parse_cond_immunities,
    "Odporność na obrażenia": lambda f, v, o: _damage_list(f, v, "resistances", o),
    "Niewrażliwość na obrażenia": lambda f, v, o: _damage_list(f, v, "immunities", o),
    "Wrażliwość na obrażenia": lambda f, v, o: _damage_list(f, v, "vulnerabilities", o),
    # "O O O O" is a printed four-box tracker, i.e. a marker that this creature
    # uses Stopień Zranienia at all — there is no value to read.
    "Stopień Zranienia": lambda f, v, o: o.__setitem__("usesZranienie", True),
    "Przedmioty": lambda f, v, o: o.__setitem__("items", v.strip()),
}

# ------------------------------------------------------------------ #
#  Attack lines                                                       #
# ------------------------------------------------------------------ #

# Both variants occur: with italics (*Atak wręcz:*) and without (Atak wręcz:).
ATTACK_RE = re.compile(
    r"^\*?(Atak (?:wręcz|dystansowy)):?\*?:?\s*"
    r"\*?([+-]\d+)\*?\s*;\s*"
    r"(?:\*?zasięg:?\*?\s*(?P<range>[^;]+?)\s*;\s*)?"
    r"\*?Obrażenia:?\*?\s*(?P<dmg>.+)$",
    re.I,
)


def parse_attack(f, name, body):
    m = ATTACK_RE.match(body.strip())
    if not m:
        return None
    kind = "mwak" if "wręcz" in m.group(1).lower() else "rwak"
    rng = (m.group("range") or "").strip()
    reach = long = None
    if rng:
        rm = re.match(r"^([\d,.]+)\s*/\s*([\d,.]+)\s*(m)?$", rng)
        if rm:
            reach, long = num(rm.group(1)), num(rm.group(2))
            if not rm.group(3):
                warn(f, f"attack {name!r}: range {rng!r} is missing the 'm' unit")
        else:
            rm = re.match(r"^([\d,.]+)\s*m$", rng)
            if rm:
                reach = num(rm.group(1))
            else:
                err(f, f"unparsed attack range in {name!r}: {rng!r}")
    dmg = m.group("dmg").strip()
    # Most attacks read "5 (1k6 + 2) kłute", but a few deal flat damage with no
    # dice at all ("4 kłute" — Dmuchawka, Żądło, Miotacz strzałek), so the
    # parenthesised formula is optional.
    dm = re.match(r"^(\d+)(?:\s*\(([^)]+)\))?\s*(.*)$", dmg, re.S)
    damage = None
    rider = dmg
    if dm:
        rest = (dm.group(3) or "").strip()
        # The damage type is followed, in most entries, by prose describing a
        # rider ("kłute i cel zostaje Pochwycony..."). Matching a greedy run of
        # lowercase letters swallows that prose, so match against the known
        # vocabulary instead — longest first, so "od trucizny" beats "od ognia".
        dtype = dtype_raw = None
        for dname in sorted(DAMAGE_TYPES, key=len, reverse=True):
            if re.match(rf"^{re.escape(dname)}\b", rest, re.I):
                dtype_raw, dtype = dname, DAMAGE_TYPES[dname]
                rest = rest[len(dname):]
                break
        damage = {
            "avg": int(dm.group(1)),
            "formula": dm.group(2).strip() if dm.group(2) else None,
            "type": dtype,
            "typeRaw": dtype_raw,
        }
        if dtype is None and rest:
            warn(f, f"attack {name!r}: no damage type before {rest[:40]!r}")
        rider = rest.strip().lstrip(".").strip()
        rider = re.sub(r"^i\s+", "", rider).strip()
    else:
        warn(f, f"attack {name!r}: unparsed damage block {dmg[:50]!r}")
    return {
        "name": name,
        "kind": kind,
        "bonus": int(m.group(2)),
        "reach": reach,
        "range": long,
        "damage": damage,
        "rider": rider or None,
    }


# ------------------------------------------------------------------ #
#  Main                                                               #
# ------------------------------------------------------------------ #

def parse_file(path):
    f = os.path.basename(path)
    # The vault files are BOM-prefixed (written by Obsidian on Windows), so the
    # heading regex never matches under plain utf-8.
    text = io.open(path, encoding="utf-8-sig").read()
    if "\n---\n" not in text:
        err(f, "no --- separator")
        return None
    lore_part, stat_part = text.split("\n---\n", 1)

    out = {"file": f, "overlay": False, "randomized": False}

    # ---- lore half ----
    m = re.match(r"^#\s+(.+)$", lore_part.strip().split("\n")[0])
    if not m:
        err(f, "no lore heading")
        return None
    out["name"] = m.group(1).strip()
    # Id comes from the *filename*, not the heading: headings collide
    # ("KOŃ (ZDROWY)" and "KOŃ (SKAŻONY)" both reduce to "kon"), while the
    # filenames are already unique and human-chosen.
    out["id"] = slug(os.path.splitext(f)[0])

    lore = {}
    for lm in re.finditer(r"^\*\*([^*]+?)\.?\*\*\s*(.*)$", lore_part, re.M):
        label, val = lm.group(1).strip().rstrip("."), lm.group(2).strip()
        if label not in LORE_FIELDS:
            err(f, f"unknown lore field: {label!r}")
            continue
        lore[LORE_FIELDS[label]] = val
    # Krew is "`czerwona` — opis"; keep the tag separately, it drives Splatter.
    if "krew" in lore:
        km = re.match(r"^`([^`]+)`\s*(?:—\s*(.*))?$", lore["krew"])
        if km:
            lore["krewTag"] = km.group(1).strip()
            lore["krew"] = (km.group(2) or "").strip()
        else:
            err(f, f"unparsed Krew: {lore['krew']!r}")
    out["lore"] = lore

    # ---- statblock half ----
    lines = stat_part.split("\n")
    section = None
    feature_name = None
    feature_buf = []
    features = []
    attacks = []
    pending_type_line = True

    def flush():
        nonlocal feature_name, feature_buf
        if feature_name is None:
            return
        body = " ".join(x.strip() for x in feature_buf).strip()
        atk = parse_attack(f, feature_name, body) if section in ("actions", "legendary", "bonus", "reaction") else None
        if atk:
            atk["section"] = section
            attacks.append(atk)
        else:
            features.append({"section": section, "name": feature_name, "text": body})
        feature_name, feature_buf = None, []

    for raw in lines:
        s = raw.strip()
        if not s:
            continue

        m = re.match(r"^##\s+(.+)$", s)
        if m:
            out["statName"] = m.group(1).strip()
            continue

        # size + creature type, e.g. *Duży rój zwierząt* or *Mała maszyna (Molocha)*
        if pending_type_line and re.match(r"^\*[^*]+\*$", s) and section is None:
            body = s.strip("*").strip()
            if not body.lower().startswith("tabela"):
                pending_type_line = False
                low = body.lower()
                size = next((v for k, v in SIZES if low.startswith(k)), None)
                if not size:
                    err(f, f"unknown size in type line: {body!r}")
                out["size"] = size
                rest = re.sub(r"^\S+\s+", "", body)
                paren = re.search(r"\((.+)\)", rest)
                if paren:
                    out["typeNote"] = paren.group(1)
                    rest = rest[:paren.start()].strip()
                rest = rest.strip().rstrip(".,")
                ct = CREATURE_TYPES.get(rest.lower())
                if not ct:
                    # "rój zwierząt", "potwór — nakładka na ..." etc.
                    ct = next((v for k, v in CREATURE_TYPES.items() if rest.lower().startswith(k)), None)
                if not ct:
                    err(f, f"unknown creature type: {rest!r}")
                out["creatureType"] = ct
                continue

        # section header
        m = re.match(r"^\*\*([A-ZŁŚŻŹĆŃÓĄĘ ]{4,})\*\*$", s)
        if m:
            flush()
            key = m.group(1).strip()
            if key not in SECTIONS:
                err(f, f"unknown section: {key!r}")
            section = SECTIONS.get(key)
            continue

        # ability table
        if s.startswith("|"):
            cells = [c.strip() for c in s.strip("|").split("|")]
            if cells and cells[0].lower() == "siła":
                continue
            if all(set(c) <= set(":- ") for c in cells):
                continue
            if len(cells) == 6 and section is None:
                ab = {}
                for key, cell in zip(["str", "dex", "con", "int", "wis", "cha"], cells):
                    cm = re.match(r"^(\d+)\s*\(([+-]\d+)\)$", cell)
                    if cm:
                        ab[key] = {"value": int(cm.group(1)), "mod": int(cm.group(2))}
                    elif INHERIT.search(cell):
                        ab[key] = {"inherit": True}
                    elif cell.strip() in {"-", "–", "—", ""}:
                        # Machines print "-" for an ability they simply do not
                        # have (Kurczak has no Charisma). dnd5e has no "no score"
                        # state, so this becomes 0 downstream — recorded as null
                        # here so the generator can decide deliberately.
                        ab[key] = {"none": True}
                    else:
                        err(f, f"unparsed ability cell: {cell!r}")
                out["abilities"] = ab
                continue
            # Mobsprzęt's chassis/weapon tables
            out["randomized"] = True
            out.setdefault("tables", []).append(cells)
            continue

        # header field or named feature
        m = re.match(r"^(\d+\.\s*)?\*\*([^*]+?)\.?\*\*\s*(.*)$", s)
        if m:
            label, val = m.group(2).strip().rstrip("."), m.group(3).strip()
            if section is None and label in HEADER_LABELS:
                HEADER_PARSERS[label](f, val, out)
                continue
            if section is None:
                err(f, f"unknown header label: {label!r}")
                continue
            flush()
            feature_name = label
            feature_buf = [val]
            continue

        # continuation prose (legendary-action preambles, italic table captions)
        if section:
            if feature_name is not None:
                feature_buf.append(s)
            else:
                out.setdefault("sectionNotes", []).append({"section": section, "text": s})
            continue

        err(f, f"unrecognised line: {s[:80]!r}")

    flush()
    out["features"] = features
    out["attacks"] = attacks

    if INHERIT.search(stat_part):
        out["overlay"] = True

    return out


def main():
    files = sorted(p for p in glob.glob(os.path.join(VAULT, "*.md"))
                   if os.path.basename(p) != "Bestiariusz.md")
    print(f"Bestiariusz — parsing {len(files)} profiles\n")

    result = {}
    for p in files:
        rec = parse_file(p)
        if rec:
            if rec["id"] in result:
                err(rec["file"], f"duplicate id {rec['id']!r}")
            result[rec["id"]] = rec

    # required-field sweep
    for rid, r in result.items():
        if r["overlay"] or r["randomized"]:
            continue
        for field in ("ac", "hp", "initiative", "speed", "senses", "sp", "abilities", "size", "creatureType"):
            if field not in r:
                err(r["file"], f"missing required field: {field}")

    print(f"  parsed        {len(result)} creatures")
    print(f"  features      {sum(len(r['features']) for r in result.values())}")
    print(f"  attacks       {sum(len(r['attacks']) for r in result.values())}")
    print(f"  overlays      {[r['id'] for r in result.values() if r['overlay']]}")
    print(f"  randomized    {[r['id'] for r in result.values() if r['randomized']]}")

    if warnings:
        print(f"\n{len(warnings)} SOURCE-MARKDOWN WARNINGS (fix in the vault):")
        for w in warnings:
            print("  " + w)

    if errors:
        print(f"\n{len(errors)} ERRORS:")
        for e in errors:
            print("  " + e)
    else:
        print("\n  errors        none")

    with io.open(OUT, "w", encoding="utf-8") as fh:
        json.dump(result, fh, ensure_ascii=False, indent=1, sort_keys=True)
    print(f"\nwrote {OUT}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
