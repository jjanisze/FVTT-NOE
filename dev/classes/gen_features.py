# -*- coding: utf-8 -*-
"""Generate scripts/config/class-features-data.mjs from the extracted rulebook JSON.

Merges:
  - classes.json / professions.json  (verbatim rulebook text + action tags)
  - AUTOMATION below                 (hand-authored uses/recovery/toggle metadata,
                                      each entry justified by a quote from the text)
"""
import json, io, re, os

# Paths are relative to this script, so the pipeline is self-contained and can be
# run from anywhere: `python dev/classes/gen_features.py`
HERE = os.path.dirname(os.path.abspath(__file__))
MODULE_ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(MODULE_ROOT, "scripts", "config", "class-features-data.mjs")

classes = json.load(io.open(os.path.join(HERE, "classes.json"), encoding="utf-8"))
profs = json.load(io.open(os.path.join(HERE, "professions.json"), encoding="utf-8"))

PL = str.maketrans("ąćęłńóśżźĄĆĘŁŃÓŚŻŹ", "acelnoszzACELNOSZZ")

def slug(name):
    s = name.translate(PL).lower()
    s = s.replace("’", "").replace("'", "")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s

# (class, RULEBOOK NAME) -> id, where the auto-slug collides or classes-data.mjs differs
ID_OVERRIDES = {
    ("spec", "SPECJALIZACJA"): "specjalizacja-spec",
    ("zlodziej", "SPECJALIZACJA"): "specjalizacja-zlodziej",
    ("twardziel", "ULUBIONA BROŃ"): "ulubiona-bron-twardziel",
    ("zlodziej", "ULUBIONA BROŃ"): "ulubiona-bron-zlodziej",
    ("zwiadowca", "ULUBIONA BROŃ"): "ulubiona-bron-zwiadowca",
    ("zwiadowca", "WYJADACZ"): "wyjadacz-zwiadowca",
    ("gwiazda", "LET’S ROCK!"): "lets-rock",
}

# Structural entries that are advancement markers, not grantable feats.
SKIP = {"SZTUCZKA", "ZDOLNOŚĆ Z PROFESJI", "ZDOLNOŚĆ Z POCHODZENIA", "ZŁODZIEJSKA PROFESJA"}

# ---------------------------------------------------------------------------
# Hand-authored automation. Every `uses` is quoted from the ability text.
# max: a dnd5e roll-data formula string. period: "sr" (Krótki) | "lr" (Długi).
# ---------------------------------------------------------------------------
AUTOMATION = {
    # ---- Brutal ----
    "berserk": {
        "uses": {"max": "@scale.brutal.berserki", "period": "lr"},   # "odnawia się po odbyciu Długiego odpoczynku"
        "hotbar": True,
        "toggle": {
            "effect": "neuro-berserk",
            "duration": {"rounds": 10},
            "breaksOn": ["unconscious", "incapacitated", "charmed"],
            "afterEnd": "noActionNextTurn",
        },
    },
    "wsciekly-cios": {
        # "Masz ich tyle, ile poziomów Brutala" — each die is 1k6
        "uses": {"max": "@classes.brutal.levels", "period": "lr"},
        "resource": {"die": "1d6", "label": "Kości Wściekłego ciosu"},
        "hotbar": True,
    },
    "brutalny-cios": {
        "uses": {"max": "@classes.brutal.levels", "period": "lr"},   # "odnawiają się po odbyciu Długiego odpoczynku"
        "hotbar": True,
    },
    "z-bara": {"hotbar": True, "requiresState": "neuro-berserk"},
    "solowa": {"hotbar": True},
    "gola-klata": {"passive": True, "acFormula": "10 + @abilities.dex.mod + @abilities.con.mod",
                   "exclusiveGroup": "unarmoredAc"},

    # ---- Cwaniak ----
    "motywacja": {
        "uses": {"max": "@abilities.cha.mod", "period": "sr"},        # "odnawia się po Krótkim odpoczynku"
        "resource": {"die": "@scale.cwaniak.motywacja"},
        "hotbar": True,
    },
    "szczescie": {
        "uses": {"max": "@scale.cwaniak.szczescie", "period": "lr"},  # "odnawia się po Długim odpoczynku"
        "hotbar": True,
    },
    "spieprzysz-to": {
        "uses": {"max": "@abilities.cha.mod", "period": "sr"},        # "po ukończeniu Krótkiego odpoczynku"
        "hotbar": True,
    },
    "obelga": {
        "uses": {"max": "@prof", "period": "sr"},                     # "tyle razy, ile wynosi twoja Premia Biegłości"
        "hotbar": True,
    },
    "kolejka": {"restActivity": "sr", "resource": {"die": "@scale.cwaniak.kolejka"}},
    "szybka-gadka": {"hotbar": True},
    "cwaniacki-zwod": {"hotbar": True},
    "glowa-do-gory": {"hotbar": True},

    # ---- Spec ----
    "dobra-rada": {"uses": {"max": "@prof", "period": "sr"}, "hotbar": True},
    "inteligentna-obrona": {"uses": {"max": "@abilities.int.mod", "period": "sr"}, "hotbar": True},
    "leb-jak-sklep": {
        "uses": {"max": "@prof", "period": "lr"},                     # "odnawia się po Długim odpoczynku"
        "resource": {"die": "@scale.spec.lebJakSklep"},
        "hotbar": True,
    },
    "szybkie-badanie": {"hotbar": True},
    "szybka-produkcja": {"uses": {"max": 1, "period": "sr"}},         # "Raz na Krótki lub Długi odpoczynek"
    "szybkie-rece": {"uses": {"max": "@abilities.dex.mod", "period": "sr"}, "hotbar": True},
    "trajektoria": {"uses": {"max": "@prof", "period": "lr"}, "hotbar": True},

    # ---- Twardziel ----
    "kondycha": {
        "uses": {"max": "@abilities.con.mod", "period": "lr"},        # "po ukończeniu Długiego odpoczynku"
        "hotbar": True,
        "toggle": {"effect": "neuro-kondycha", "duration": {"rounds": None}},
    },
    "twardosc": {
        "uses": {"max": "@abilities.con.mod", "period": "lr"},        # "Masz tych kości tyle, ile mod. Kondycji"
        "resource": {"die": "@scale.twardziel.twardosc"},
        "hotbar": True,
    },
    "ulubiona-bron-twardziel": {"hotbar": True, "picks": {"scale": "@scale.twardziel.ulubionaBron"}},
    "przycelowanie": {"hotbar": True},
    "drugi-atak": {"passive": True, "exclusiveGroup": "extraAttack"},
    "trzeci-atak": {"passive": True, "exclusiveGroup": "extraAttack"},

    # ---- Złodziej ----
    "bolesny-atak": {"passive": True, "resource": {"die": "@scale.zlodziej.bolesnyAtak"}, "oncePerTurn": True},
    "kocie-kosci": {
        # Klasy.md: "ilość = mod. Zręczności, odnawiane po Długim odpoczynku"
        "uses": {"max": "@abilities.dex.mod", "period": "lr"},
        "resource": {"die": "@scale.zlodziej.kocieKosci"},
        "hotbar": True,
    },
    "szybkie-nogi": {"hotbar": True},
    "ulubiona-bron-zlodziej": {"hotbar": True},
    "matrix": {"uses": {"max": "@prof", "period": "lr"}, "hotbar": True},
    "saper": {"uses": {"max": 1, "period": "sr"}},                    # "po Krótkiego lub Długiego odpoczynku"

    # ---- Zwiadowca ----
    "ulubiona-bron-zwiadowca": {"hotbar": True},
    "moj-wrog": {"passive": True, "resource": {"value": "@scale.zwiadowca.mojWrog"}},
    "moj-biom": {"passive": True, "resource": {"value": "@scale.zwiadowca.mojBiom"}},

    # ---- Profesje ----
    "amen": {"uses": {"max": "@abilities.cha.mod", "period": "lr"}, "hotbar": True},
    "clint": {"uses": {"max": 1, "period": "combat"}, "hotbar": True},  # "Raz na walkę"
    "laska-boza": {"hotbar": True},
    "kakofonia": {"hotbar": True},
    "lets-rock": {"hotbar": True},
    "rzuc-bron-i-gleba": {"hotbar": True},
    "truciciel": {"hotbar": True},
    "bez-tajemnic": {"hotbar": True},
    "slaby-punkt": {"hotbar": True, "oncePerTurn": True},
    "mutant-na-sniadanie": {"oncePerTurn": True},
    "maszyna-do-zabijania": {"oncePerTurn": True, "requiresState": "neuro-berserk"},
    "moj-bog-kule-nosi": {"oncePerTurn": True},
    "ja-i-moj-gang": {"requiresState": "neuro-berserk"},
    "zew-areny": {"requiresState": "neuro-berserk"},
    "tarcza-wiary": {"passive": True, "exclusiveGroup": "unarmoredAc"},
    "skuteczny-cios": {"hotbar": True},
    "jak-dbasz-tak-masz": {"legacyAbilityKey": "jakDbaszTakMasz"},
    "empiryk": {"hotbar": True},
    "moja-prawa-reka": {"companion": True},
    "partner": {"companion": True},
    "oswajanie-zwierzat": {"companion": True},
}


# ---------------------------------------------------------------------------
# Inline choice options. These are sub-bullets inside an ability's prose rather
# than their own "POZIOM n:" headings, so the extractor cannot see them.
# Text quoted verbatim from source.txt.
#
# NOTE ON WYJADACZ: the Twardziel entry (poz. 1) lists 4 options inline. The
# Zwiadowca entry (poz. 2) names Jeździec in its own body, and the Zwiadowca
# chapter reprints the shared list plus Zasadzka. Encoded as two pools, the
# literal reading. `Tabele/Klasy.md` claims the Zwiadowca options are
# "Jeździec, Trening w zbroi" — that is wrong; Trening w zbroi is a Żołnierz
# profession ability and appears nowhere in the Wyjadacz list.
# ---------------------------------------------------------------------------
EXTRA_FEATURES = {
    "obsluga-pancerza": ("Obsługa pancerza", "wyjadacz-option",
        "Kiedy nosisz pancerz, otrzymujesz +2 do Trudności Trafienia."),
    "rzeznik": ("Rzeźnik", "wyjadacz-option",
        "Kiedy atakujesz dowolną bronią, nie trzymając w drugiej ręce innej broni, "
        "otrzymujesz modyfikator +3 do obrażeń zadawanych tą bronią."),
    "sokole-oko": ("Sokole oko", "wyjadacz-option",
        "Otrzymujesz modyfikator +3 do Testów Ataku bronią palną, dystansową i rzucaną."),
    "stalowy-nadgarstek": ("Stalowy nadgarstek", "wyjadacz-option",
        "Kiedy strzelasz z broni palnej krótkiej i pistoletów maszynowych jedną ręką, nie "
        "otrzymujesz związanego z tym Utrudnienia do Testów Ataku (tak jakby miały właściwość "
        "poręczna). Dodatkowo każda broń palna krótka w twoich rękach zyskuje właściwość lekka."),
    "jezdziec": ("Jeździec", "wyjadacz-option",
        "Kiedy dosiadasz wierzchowca, nie musisz używać rąk, żeby nim kierować. Nie otrzymujesz "
        "Utrudnienia do Testów Ataków dystansowych związanego z niestabilnym podłożem, kiedy na "
        "nim jedziesz. Wsiadanie i zsiadanie z wierzchowca kosztuje cię tylko 1,5 metra ruchu. "
        "Trudność Trafienia twojego wierzchowca zwiększa się o wartość twojej Premii Biegłości."),
    "zasadzka": ("Zasadzka", "wyjadacz-option",
        "Jeśli twój przeciwnik jest zaskoczony lub w pierwszej turze walki działasz przed nim, "
        "otrzymujesz Ułatwienie w Testach Ataku przeciwko niemu, do końca swojej tury."),
}

# Mój wróg enemy groups — picked at Zwiadowca 1 / 5 / 9.
ENEMY_GROUPS = ["Ludzie", "Maszyny", "Mutanty", "Potwory", "Zwierzęta"]
for g in ENEMY_GROUPS:
    EXTRA_FEATURES[f"moj-wrog-{slug(g)}"] = (
        f"Mój wróg: {g}", "moj-wrog-option",
        f"Twoim wrogiem są {g}. Masz Ułatwienie w Testach Mądrości (Survival), kiedy ich tropisz, "
        f"i w Testach Inteligencji, kiedy przypominasz sobie fakty na ich temat. Kiedy ich atakujesz, "
        f"otrzymujesz modyfikator do ataku i obrażeń zgodny z kolumną Mój wróg.")

# Choice pools, referenced from classes-data.mjs level tables.
CHOICE_POOLS = {
    "wyjadacz":            ["obsluga-pancerza", "rzeznik", "sokole-oko", "stalowy-nadgarstek"],
    "wyjadacz-zwiadowca":  ["jezdziec", "obsluga-pancerza", "rzeznik", "sokole-oko",
                            "stalowy-nadgarstek", "zasadzka"],
    "moj-wrog":            [f"moj-wrog-{slug(g)}" for g in ENEMY_GROUPS],
}

# Repeat entries: a later level re-opens an earlier choice, or is a pure numeric
# upgrade already described in the base ability's text.
REPEATS = {
    "wyjadacz-2":                {"repeatOf": "wyjadacz",           "kind": "choice"},
    "wyjadacz-zwiadowca-2":      {"repeatOf": "wyjadacz-zwiadowca", "kind": "choice"},
    "moj-wrog-2":                {"repeatOf": "moj-wrog",           "kind": "choice"},
    "moj-wrog-3":                {"repeatOf": "moj-wrog",           "kind": "choice"},
    "specjalizacja-zlodziej-2":  {"repeatOf": "specjalizacja-zlodziej", "kind": "trait"},
    "ulubiona-bron-zwiadowca-2": {"repeatOf": "ulubiona-bron-zwiadowca", "kind": "upgrade"},
    "szybka-produkcja-2":        {"repeatOf": "szybka-produkcja",   "kind": "upgrade"},
}


# Rulebook headings are ALLCAPS. Polish uses sentence case for ability names
# ("Wściekły cios", not "Wściekły Cios"), so titles are down-cased with an
# exception list for embedded proper nouns and acronyms.
LABEL_OVERRIDES = {
    "DOKTOR BRAIN": "Doktor Brain",
    "EMITER EMP": "Emiter EMP",
    "LET’S ROCK!": "Let’s rock!",
    "MATRIX": "Matrix",
    "CLINT": "Clint",
}


def label_for(name):
    if name in LABEL_OVERRIDES:
        return LABEL_OVERRIDES[name]
    lowered = name.lower()
    return lowered[:1].upper() + lowered[1:]


def esc(s):
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")


def jsval(v, indent=0):
    """Render a python value as JS source."""
    pad = "  " * indent
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, str):
        return f'"{esc(v)}"'
    if isinstance(v, list):
        return "[" + ", ".join(jsval(x) for x in v) + "]"
    if isinstance(v, dict):
        inner = ", ".join(f"{k}: {jsval(x)}" for k, x in v.items())
        return "{ " + inner + " }"
    raise TypeError(type(v))


records = []

# class abilities
for cls, data in classes.items():
    for a in data["abilities"]:
        if a["name"] in SKIP:
            continue
        aid = ID_OVERRIDES.get((cls, a["name"]), slug(a["name"]))
        records.append({
            "id": aid, "source": "klasa", "owner": cls, "level": a["level"],
            "label": label_for(a["name"]),
            "action": a["action"], "text": a["text"],
        })

# profession abilities
for cls, plist in profs.items():
    for prof, d in plist.items():
        pid = slug(prof)
        for a in d["abilities"]:
            aid = ID_OVERRIDES.get((pid, a["name"]), slug(a["name"]))
            records.append({
                "id": aid, "source": "profesja", "owner": pid, "klasa": cls,
                "level": None, "label": label_for(a["name"]),
                "action": a["action"], "text": a["text"],
            })

# inline choice options (Wyjadacz variants, Mój wróg groups)
for eid, (label, kind, text) in EXTRA_FEATURES.items():
    records.append({
        "id": eid, "source": "opcja", "owner": kind, "level": None,
        "label": label, "action": None, "text": text,
    })

# de-duplicate shared ids (e.g. drugi-atak granted by 3 classes)
seen = {}
merged = []
for r in records:
    if r["id"] in seen:
        prev = seen[r["id"]]
        prev.setdefault("alsoOwnedBy", []).append(r["owner"])
        continue
    seen[r["id"]] = r
    merged.append(r)

# emit
lines = []
lines.append("""/**
 * Neuroshima 5e — Class & profession ability definitions (GENERATED).
 *
 * ⚠ DO NOT EDIT BY HAND. Regenerate with `dev/classes/gen_features.py`.
 *
 * Ability text is verbatim from the rulebook PDF text dump
 * (`Podrecznik/source.txt`), including the [A]/[B]/[R] action tags.
 * `uses` / `toggle` / `hotbar` metadata is hand-authored in the generator and
 * justified by a quote from the ability's own text.
 *
 * Fields:
 *   id            stable slug, referenced from `classes-data.mjs` level tables
 *   source        "klasa" | "profesja"
 *   owner         class identifier, or profession identifier
 *   alsoOwnedBy   other classes granting the same feature (e.g. Drugi atak)
 *   level         class level it is granted at (null for profession picks)
 *   action        "A" | "B" | "R" | null (passive)
 *   uses          { max: <roll-data formula>, period: "sr" | "lr" | "combat" }
 *   toggle        stateful abilities — see actors/class-state.mjs
 *   hotbar        gets an auto-managed macro — see actors/ability-hotbar.mjs
 *   exclusiveGroup non-stacking family (multiclass rule) — see actors/class-rules.mjs
 */

export const CLASS_FEATURES = {""")

for r in merged:
    auto = AUTOMATION.get(r["id"], {})
    fields = []
    fields.append(f'    id: "{r["id"]}"')
    fields.append(f'    source: "{r["source"]}"')
    fields.append(f'    owner: "{r["owner"]}"')
    if r.get("klasa"):
        fields.append(f'    klasa: "{r["klasa"]}"')
    if r.get("alsoOwnedBy"):
        fields.append(f'    alsoOwnedBy: {jsval(sorted(set(r["alsoOwnedBy"])))}')
    fields.append(f'    level: {jsval(r["level"])}')
    fields.append(f'    label: "{esc(r["label"])}"')
    fields.append(f'    action: {jsval(r["action"])}')
    for k, v in auto.items():
        fields.append(f"    {k}: {jsval(v)}")
    fields.append(f'    text: "{esc(r["text"])}"')
    lines.append(f'  "{r["id"]}": {{\n' + ",\n".join(fields) + "\n  },")

lines.append("};\n")

lines.append("""/**
 * Choice pools — an ability that says "wybierz jedną z poniższych".
 * Rendered as an `ItemChoice` advancement over these feature ids.
 */
export const CHOICE_POOLS = {""")
for pid, opts in CHOICE_POOLS.items():
    lines.append(f'  "{pid}": {jsval(opts)},')
lines.append("};\n")

lines.append("""/**
 * Repeat entries — a later level re-opens an earlier choice ("Wyjadacz (2)"),
 * or is a pure numeric upgrade already described by the base ability's text
 * ("Szybka produkcja (2)": the 25 gb cap becomes 50 gb).
 *
 *   kind "choice"  -> ItemChoice over CHOICE_POOLS[repeatOf], excluding already-taken
 *   kind "trait"   -> Trait advancement (another skill Specjalizacja)
 *   kind "upgrade" -> no item granted; the base feature's behaviour changes
 */
export const FEATURE_REPEATS = {""")
for rid, meta in REPEATS.items():
    lines.append(f'  "{rid}": {jsval(meta)},')
lines.append("};\n")

lines.append("""
export const FEATURE_IDS = Object.keys(CLASS_FEATURES);

/**
 * Resolve a level-table entry, which may be:
 *   - a plain feature                       -> { type: "feature" }
 *   - a feature that also opens a choice    -> { type: "featureWithChoice" }
 *     (e.g. "wyjadacz" grants the descriptive feature AND offers its 4 variants;
 *      "moj-wrog" grants the feature AND picks an enemy group)
 *   - a bare choice pool                    -> { type: "choice" }
 *   - a repeat of an earlier choice/upgrade -> { type: "repeat" }
 */
export function resolveGrant(id) {
  const feature = CLASS_FEATURES[id] ?? null;
  const pool = CHOICE_POOLS[id] ?? null;
  if ( feature && pool ) return { type: "featureWithChoice", feature, pool };
  if ( feature ) return { type: "feature", feature };
  if ( pool ) return { type: "choice", pool };
  const repeat = FEATURE_REPEATS[id];
  if ( repeat ) return { type: "repeat", ...repeat, pool: CHOICE_POOLS[repeat.repeatOf] ?? null };
  return null;
}

/** Features granted by a class at a given level. */
export function featuresFor(classId, level) {
  return Object.values(CLASS_FEATURES).filter(
    f => f.source === "klasa" && f.level === level
      && (f.owner === classId || f.alsoOwnedBy?.includes(classId))
  );
}

/** Ability pool offered by a profession. */
export function featuresOfProfession(professionId) {
  return Object.values(CLASS_FEATURES).filter(
    f => f.source === "profesja" && f.owner === professionId
  );
}

/** Every feature that should get an auto-managed hotbar macro. */
export function hotbarFeatures() {
  return Object.values(CLASS_FEATURES).filter(f => f.hotbar === true);
}
""")

io.open(OUT, "w", encoding="utf-8").write("\n".join(lines))
print(f"wrote {OUT}")
print(f"features: {len(merged)}  (klasa={sum(1 for r in merged if r['source']=='klasa')}, "
      f"profesja={sum(1 for r in merged if r['source']=='profesja')})")
print(f"with uses:   {sum(1 for r in merged if 'uses' in AUTOMATION.get(r['id'], {}))}")
print(f"hotbar:      {sum(1 for r in merged if AUTOMATION.get(r['id'], {}).get('hotbar'))}")
print(f"toggle:      {sum(1 for r in merged if 'toggle' in AUTOMATION.get(r['id'], {}))}")
unknown = sorted(set(AUTOMATION) - {r['id'] for r in merged})
print("AUTOMATION keys with no matching feature:", unknown or "none")
