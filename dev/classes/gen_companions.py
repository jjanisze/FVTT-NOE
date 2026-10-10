# -*- coding: utf-8 -*-
"""Generate scripts/config/towarzysze-data.mjs from companions.json (PLAN_m3_towarzysze.md §7.13, E6).

    python dev/classes/gen_companions.py

companions.json (from extract_companions.py) keeps the rulebook's phrases; this turns them into roll-data
formulas with a strict grammar — an unknown phrase is a build error, never a guess — and merges the
decisions that have no RAW sentence of their own (META below, each with its plan reference).
"""
import io
import json
import math
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
MODULE_ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
SRC = os.path.join(HERE, "companions.json")
OUT = os.path.join(MODULE_ROOT, "scripts", "config", "towarzysze-data.mjs")

errors = []


def err(where, msg):
    errors.append(f"{where}: {msg}")


# --------------------------------------------------------------------------- #
#  Decisions without a RAW sentence of their own                               #
# --------------------------------------------------------------------------- #

# Turn kind (§3.3): Partner and animal act on a Komenda (D2), Prawa ręka with full control, a drone in
# its operator's turn (D35).
META = {
    "zmutowany-owad": {"zrodlo": "oswajanie-zwierzat", "tura": "komenda"},
    "zmutowany-ssak": {"zrodlo": "oswajanie-zwierzat", "tura": "komenda"},
    "zmutowany-gad": {"zrodlo": "oswajanie-zwierzat", "tura": "komenda"},
    "psi-partner": {"zrodlo": "partner", "tura": "komenda"},
    "ludzki-partner": {"zrodlo": "partner", "tura": "komenda", "nazwa": "Ludzki partner"},
    "prawa-reka": {"zrodlo": "moja-prawa-reka", "tura": "pelna", "nazwa": "Prawa ręka"},
    # D21 (RAI): folded drone weight; price from the production time (s. 145: 1 h = 1 gb).
    "dron-kroczacy": {"zrodlo": "hakerstwo", "tura": "operator", "przepis": "dron-kroczacy", "zlozony": {"waga": 25, "cena": 70}},
    "dron-latajacy": {"zrodlo": "hakerstwo", "tura": "operator", "przepis": "dron-latajacy", "zlozony": {"waga": 4, "cena": 90}},
}
ORDER = list(META)

ZRODLA_META = {
    "partner": {"nazwa": "Partner", "klasa": "zwiadowca"},
    "oswajanie-zwierzat": {"nazwa": "Oswajanie zwierząt", "klasa": "zwiadowca"},
    "moja-prawa-reka": {"nazwa": "Moja prawa ręka", "klasa": "cwaniak"},
    "hakerstwo": {"nazwa": "Hakerstwo", "klasa": "spec"},
}

# Statblock feature automation (descriptors as in the Bestiariusz): Współpraca — the same wording.
CECHY_AUTOMATYKA = {"wspolpraca": {"kind": "packTactics", "range": 1.5}}

# Attack rider → on-hit condition: "trafiony cel zostaje Pochwycony / otrzymuje stan Powalenie, jeśli jest
# rozmiaru średniego lub mniejszego".
RIDER_STANY = {"pochwycony": "grappled", "powalenie": "prone"}
RIDER_ROZMIARY = {"małego": "sm", "średniego": "med", "dużego": "lg"}

# D32 — two remote controllers (factory: Sprzęt s. 130–131; home-made: Hacker schematic s. 83, 20 m
# through walls is the GM's reading).
KONTROLERY = {
    "fabryczny": {"nazwa": "Kontroler zdalnego sterowania", "zasieg": 300, "zasiegPrzeszkody": 50, "strona": "s. 130–131"},
    "domowy": {"nazwa": "Kontroler zdalnego sterowania (domowej roboty)", "zasieg": 100, "zasiegPrzeszkody": 20, "strona": "s. 83"},
}

# Reference owner for template values in the pack (PB +2, MDR +2, class level 3).
REF = {"wlasciciel": {"prof": 2, "abilities": {"wis": {"mod": 2}, "int": {"mod": 0}}, "poziomKlasy": 3},
       "tworca": {"prof": 2, "abilities": {"int": {"mod": 3}}},
       "operator": {"prof": 2, "abilities": {"dex": {"mod": 0}}}}

# --------------------------------------------------------------------------- #
#  Phrase grammar → roll data                                                  #
# --------------------------------------------------------------------------- #

CECHY = {"Siły": "str", "Zręczności": "dex", "Kondycji": "con", "Inteligencji": "int", "Mądrości": "wis", "Charyzmy": "cha"}
KLASY_DOPELNIACZ = {"Zwiadowcy": "zwiadowca", "Cwaniaka": "cwaniak", "Speca": "spec"}

# One term: (regex, builder(match, kto) -> roll-data reference). `kto` is the owner word that may trail
# a whole "X i Y <kto>" group ("mod. Inteligencji i Premia Biegłości twórcy").
TERMS = [
    (r"^twoja Premia Biegłości$", lambda m, kto: "@wlasciciel.prof"),
    (r"^twój modyfikator (?:z )?(\w+)$", lambda m, kto: f"@wlasciciel.abilities.{CECHY[m.group(1)]}.mod"),
    (r"^twój poziom (\w+)$", lambda m, kto: "@wlasciciel.poziomKlasy"),
    (r"^Premia Biegłości$", lambda m, kto: f"@{kto}.prof"),
    (r"^(?:mod\.|modyfikator) (\w+)$", lambda m, kto: f"@{kto}.abilities.{CECHY[m.group(1)]}.mod"),
]
KTO = {"twórcy": "tworca", "operatora": "operator"}


def term(phrase, kto, where):
    p = phrase.strip()
    for rx, build in TERMS:
        m = re.match(rx, p)
        if m:
            try:
                return build(m, kto)
            except KeyError as e:
                err(where, f"unknown word {e} in {phrase!r}")
                return "0"
    err(where, f"unknown phrase {phrase!r}")
    return "0"


def group(phrase, where):
    """'Premia Biegłości twórcy i modyfikator Zręczności operatora' → ['@tworca.prof', '@operator.abilities.dex.mod'].
    A trailing owner word applies to every term before it since the last owner word."""
    words = phrase.split()
    out, buf = [], []
    for w in words:
        if w in KTO:
            parts = re.sub(r"^i ", "", " ".join(buf)).split(" i ")
            out += [term(p, KTO[w], where) for p in parts if p.strip()]
            buf = []
        else:
            buf.append(w)
    if buf:
        out += [term(p, None, where) for p in re.sub(r"^i ", "", " ".join(buf)).split(" i ") if p.strip()]
    return out


def wzor(phrase, where):
    """'3 plus 10 x twój modyfikator Mądrości' → '3 + 10 * @wlasciciel.abilities.wis.mod'."""
    if phrase is None:
        return None
    p = re.sub(r"\s+", " ", phrase.strip().rstrip(".;,"))
    p = re.sub(r"^\+(\d)", r"\1", p)          # attack lines print "+4 plus …"
    out = []
    for chunk in p.split(" plus "):
        c = chunk.strip()
        m = re.match(r"^(\d+)\s*x\s*(.+)$", c)
        if re.fullmatch(r"\d+", c):
            out.append(c)
        elif m:
            refs = group(m.group(2), where)
            if len(refs) != 1:
                err(where, f"multiplied group of {len(refs)} terms in {phrase!r}")
            out.append(f"{m.group(1)} * {refs[0] if refs else '0'}")
        elif c.startswith("Kość zamontowanej broni"):
            continue                                   # the weapon's own die — not part of the bonus
        else:
            out += group(c, where)
    return " + ".join(out) if out else None


def ocen(formula, dane=REF):
    """Evaluate a generated formula on the reference owner (template values)."""
    def ref(m):
        v = dane
        for k in m.group(1).split("."):
            v = v[k]
        return str(v)
    return eval(re.sub(r"@([\w.]+)", ref, formula), {"__builtins__": {}})  # generated, closed grammar


def kw(phrase, where):
    """'k6 x ½ twojego poziomu Zwiadowcy' → {kosc, mnoznik}; also the human box's 'KW to k6 i ma ich tyle, ile …'."""
    if not phrase:
        return None
    m = re.search(r"k(\d+)\s*x\s*(½\s*)?(?:twojego poziomu|twój poziom) (\w+)", phrase)
    if not m:
        m2 = re.search(r"to k(\d+) i ma ich tyle, ile ty masz (?:obecnie )?poziomów (\w+)", phrase)
        if not m2:
            err(where, f"unknown KW phrase {phrase!r}")
            return None
        return {"kosc": int(m2.group(1)), "mnoznik": 1, "klasa": KLASY_DOPELNIACZ.get(m2.group(2))}
    return {"kosc": int(m.group(1)), "mnoznik": 0.5 if m.group(2) else 1, "klasa": KLASY_DOPELNIACZ.get(m.group(3))}


LICZBY = {"jedną": 1, "jeden": 1, "jedna": 1, "dwóch": 2, "dwie": 2, "dwa": 2}


def liczba(text, where):
    m = re.search(r"\b(" + "|".join(LICZBY) + r")\b", text or "")
    if not m:
        err(where, f"no count in {text!r}")
        return 0
    return LICZBY[m.group(1)]


def nazwa(heading):
    return heading[0] + heading[1:].lower()


def strona(a, b=None):
    return f"s. {a}" if b is None or a == b else f"s. {min(a, b)}–{max(a, b)}"


def onhit(rider, where):
    if not rider:
        return None
    m = re.search(r"(Pochwycony|Powalenie),? jeśli jest rozmiaru (\w+) lub mniejszego", rider)
    if not m:
        return None
    cond = RIDER_STANY.get(m.group(1).lower())
    size = RIDER_ROZMIARY.get(m.group(2))
    if not cond or not size:
        err(where, f"unknown rider {rider!r}")
        return None
    return {"condition": cond, "maxSize": size}


def udzwig(features, where):
    f = next((x for x in features if x["id"] == "udzwig"), None)
    m = re.search(r"Użytkowy: (\d+) kg\. Maksymalny: (\d+) kg", f["text"]) if f else None
    if not m:
        err(where, "no Udźwig")
        return None
    return {"uzytkowy": int(m.group(1)), "maksymalny": int(m.group(2))}


# --------------------------------------------------------------------------- #
#  Build                                                                       #
# --------------------------------------------------------------------------- #

def build(src):
    rodzaje, statbloki = {}, {}
    abil = src["abilities"]
    for cid in ORDER:
        meta = META[cid]
        zrodlo = meta["zrodlo"]
        klasa = ZRODLA_META[zrodlo]["klasa"]
        where = cid
        if cid in src["statblocks"]:
            s = src["statblocks"][cid]
            maszyna = s["creatureType"] == "maszyna"
            r = {
                "nazwa": nazwa(s["heading"]), "zrodlo": zrodlo, "klasa": klasa,
                "strona": strona(abil["hakerstwo"]["page"], s["page"]) if maszyna else strona(s["page"]),
                "typAktora": "npc", "maszyna": maszyna, "stopnieZranienia": s["stopienZranienia"] and not maszyna,
                "rozmiar": s["size"], "tura": meta["tura"], "pb": None,
            }
            wz = {"tt": wzor(s["tt"], where), "pwMaks": wzor(s["pw"], where)}
            if maszyna:
                wz["atak"] = wzor(s["formulas"].get("atak"), where)
                wz["obrazeniaPremia"] = wzor(s["formulas"].get("obrazenia"), where)
                wz["stObszarowe"] = wzor(s["formulas"].get("stObszarowe"), where)
                r["lata"] = "fly" in s["speed"]
                r["progi"] = {"obrazen": s["progi"].get("obrazen"), "awarii": s["progi"].get("awarii")}
                r["akumulatorGodzin"] = abil["hakerstwo"]["akumulator"][s["size"]]
                r["przepis"] = meta["przepis"]
                r["zlozony"] = meta["zlozony"]
                r["kw"] = None
            else:
                atk = s["attacks"][0] if s["attacks"] else None
                wz["atak"] = wzor(atk["bonus"], where) if atk else None
                k = kw(s["kw"], where)
                if k and k["klasa"] != klasa:
                    err(where, f"KW counts levels of {k['klasa']}, the ability belongs to {klasa}")
                r["kw"] = {"kosc": k["kosc"], "mnoznik": k["mnoznik"]} if k else None
                if atk:
                    r["atak"] = {"nazwa": atk["name"], "obrazenia": atk["damage"]["formula"], "typ": atk["damage"]["type"]}
            r["wzory"] = {k: v for k, v in wz.items() if v}
            r["udzwig"] = udzwig(s["features"], where)
            rodzaje[cid] = r
            if maszyna:
                # A drone has no INT/MDR/CHA ("–" in the book); dnd5e needs a number — 10, a neutral modifier.
                abil_vals = {k: (v if v is not None else 10) for k, v in s["abilities"].items()}
                statbloki[cid] = {
                    "name": r["nazwa"], "size": s["size"], "creatureType": s["creatureType"],
                    "ac": ocen(r["wzory"]["tt"]), "initiative": s["initiative"] or 0,
                    "hp": {"avg": max(1, ocen(r["wzory"]["pwMaks"])), "formula": ""},
                    "abilities": abil_vals, "skills": s["skills"], "saves": s["saves"],
                    "immunities": s["immunities"], "conditionImmunities": s["conditionImmunities"],
                    "senses": s["senses"], "speed": s["speed"],
                    "carry": {"normal": r["udzwig"]["uzytkowy"], "max": r["udzwig"]["maksymalny"]},
                    "damageThreshold": r["progi"]["obrazen"], "failureThreshold": r["progi"]["awarii"],
                    "features": [{**f, "automation": CECHY_AUTOMATYKA.get(f["id"])} for f in s["features"]],
                    "attacks": [],
                }
            if not maszyna:
                ile = max(1, math.floor(REF["wlasciciel"]["poziomKlasy"] * r["kw"]["mnoznik"] + 1e-9))
                statbloki[cid] = {
                    "name": r["nazwa"], "size": s["size"], "creatureType": s["creatureType"],
                    "ac": ocen(r["wzory"]["tt"]), "initiative": s["initiative"],
                    "hp": {"avg": ocen(r["wzory"]["pwMaks"]), "formula": f"{ile}d{r['kw']['kosc']}"},
                    "abilities": s["abilities"], "skills": s["skills"], "saves": s["saves"],
                    "immunities": s["immunities"], "senses": s["senses"], "speed": s["speed"],
                    "carry": {"normal": r["udzwig"]["uzytkowy"], "max": r["udzwig"]["maksymalny"]},
                    "features": [{**f, "automation": CECHY_AUTOMATYKA.get(f["id"])} for f in s["features"]],
                    "attacks": [{
                        "id": a["id"], "name": a["name"], "kind": a["kind"], "reach": a["reach"], "range": None,
                        "section": "actions", "bonus": ocen(wzor(a["bonus"], where)), "damage": a["damage"],
                        "rider": a["rider"], "onHit": onhit(a["rider"], where), "dropsAs": None
                    } for a in s["attacks"]],
                }
        else:
            b = src["boxes"][cid]
            f = b["fields"]
            pw_zdanie = f["Punkty Wytrzymałości"].split(".")[0]
            k = kw(f["Punkty Wytrzymałości"], where)
            pbm = re.match(r"^\+(\d+) \(nie rośnie\)", f["Premia Biegłości"])
            if not pbm:
                err(where, f"unknown PB phrase {f['Premia Biegłości']!r}")
            cm = re.search(r"przydzielenia: ([\d, ]+?) lub (\d+) punkty", f["Cechy"])
            if not cm:
                err(where, f"unknown attribute phrase {f['Cechy']!r}")
            rodzaje[cid] = {
                "nazwa": meta["nazwa"], "zrodlo": zrodlo, "klasa": klasa,
                "strona": strona(b["abilityPage"], b["page"]) if cid == "prawa-reka" else strona(b["page"]),
                "typAktora": "character", "maszyna": False, "stopnieZranienia": "Stopnie Zranienia" in f.get("Śmierć", ""),
                "rozmiar": "med", "tura": meta["tura"], "pb": int(pbm.group(1)) if pbm else None,
                "kw": {"kosc": k["kosc"], "mnoznik": k["mnoznik"]} if k else None,
                "wzory": {"pwMaks": wzor(pw_zdanie, where)},
                "cechy": {"zestaw": [int(x) for x in re.split(r",\s*", cm.group(1).strip())] if cm else [],
                          "punkty": int(cm.group(2)) if cm else 0},
                "rzutyObronne": liczba(f["Rzuty Obronne"], where),
                "umiejetnosci": liczba(f["Umiejętności"], where),
                "sztuczki": liczba(f["Sztuczki"], where),
            }
            if k and k["klasa"] != klasa:
                err(where, f"KW counts levels of {k['klasa']}, the ability belongs to {klasa}")
    zrodla = {}
    for zid, zm in ZRODLA_META.items():
        a = abil[zid]
        z = {"nazwa": zm["nazwa"], "klasa": zm["klasa"], "rodzaje": [c for c in ORDER if META[c]["zrodlo"] == zid]}
        if "k6" in a:
            by_name = {rodzaje[c]["nazwa"].lower(): c for c in z["rodzaje"]}
            z["k6"] = {str(n): by_name.get(v.lower()) for n, v in a["k6"].items()}
            if None in z["k6"].values():
                err(zid, f"d6 table names an unknown kind: {a['k6']}")
        if zid == "hakerstwo":
            z["szukanie"] = None
        else:
            sz = {"godziny": a["godziny"]}
            if "dniOswajania" in a:
                sz["dniOswajania"] = a["dniOswajania"]
            sz["strona"] = strona(a["page"])
            z["szukanie"] = sz
        zrodla[zid] = z
    return rodzaje, statbloki, zrodla, abil["hakerstwo"]["agregatLNaH"]


# --------------------------------------------------------------------------- #
#  Emit                                                                        #
# --------------------------------------------------------------------------- #

def js(v, ind=0):
    pad, pad1 = "  " * ind, "  " * (ind + 1)
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v) if not (isinstance(v, float) and v.is_integer()) else str(int(v))
    if isinstance(v, str):
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, list):
        if not v:
            return "Object.freeze([])"
        if all(not isinstance(x, (dict, list)) for x in v):
            return "Object.freeze([" + ", ".join(js(x) for x in v) + "])"
        return "Object.freeze([\n" + ",\n".join(pad1 + js(x, ind + 1) for x in v) + "\n" + pad + "])"
    if isinstance(v, dict):
        if not v:
            return "Object.freeze({})"
        def key(k):
            return k if re.fullmatch(r"[A-Za-z_]\w*", k) else json.dumps(k, ensure_ascii=False)
        flat = all(not isinstance(x, (dict, list)) for x in v.values()) and len(v) <= 4
        if flat:
            return "Object.freeze({ " + ", ".join(f"{key(k)}: {js(x)}" for k, x in v.items()) + " })"
        return "Object.freeze({\n" + ",\n".join(f"{pad1}{key(k)}: {js(x, ind + 1)}" for k, x in v.items()) + "\n" + pad + "})"
    raise TypeError(type(v))


HEADER = '''/**
 * Neuroshima 5e — towarzysze i drony: dane z NOE (PLAN_m3_towarzysze.md §7.2).
 *
 * ⚠ GENEROWANE — nie edytować ręcznie. Źródło: NOE s. 75–76, 83–84, 99–101 → `dev/classes/extract_companions.py`
 * → `dev/classes/companions.json` → `dev/classes/gen_companions.py` (część `npm run build:classes`). Decyzje bez
 * własnego zdania w RAW (rodzaj tury, waga drona złożonego D21, kontrolery D32) — tabele w generatorze.
 *
 * Czysty: bez `game`, bez `CONFIG`.
 *
 * ## Wzory
 *
 * Składnia roll data dnd5e, wytłumaczona z fraz podręcznika ścisłą gramatyką („14 plus twoja Premia
 * Biegłości” → `14 + @wlasciciel.prof`; nieznana fraza = błąd budowy). Te same napisy trafiają do natywnych
 * pól (TT `custom`, premia ataku `flat`), a `config/towarzysze-rules.mjs` liczy je u siebie. Trzy konteksty
 * (U2, D23):
 *   - `@wlasciciel` — migawka właściciela **na żywo**: `prof`, `abilities.<id>.mod`, `poziomKlasy`
 *     (poziom w klasie z flagi towarzysza), `poziom` (postaci);
 *   - `@tworca` — stempel twórcy drona z chwili budowy: `prof`, `abilities.int.mod`;
 *   - `@operator` — migawka operatora drona na żywo: `prof`, `abilities.<id>.mod`.
 *
 * Statblocki zwierząt drukują umiejętności i RO policzone przy PB +2 — z PB właściciela rosną tylko
 * TT i atak, bo tylko one piszą „plus twoja Premia Biegłości” (D4).
 */
'''


def main():
    src = json.load(io.open(SRC, encoding="utf-8"))
    rodzaje, statbloki, zrodla, agregat = build(src)
    if errors:
        print("--- errors ---\n" + "\n".join(errors))
        sys.exit(1)
    out = [HEADER]
    out.append('/** Rodzaj tury z §3.3: komenda (zatrzask, D2), pełna kontrola (Prawa ręka), tura operatora (dron, D35). */')
    out.append('export const TURY = Object.freeze({\n  komenda: "komenda",\n  pelna: "pelna",\n  operator: "operator"\n});\n')
    out.append('/**\n * Rodzaje towarzyszy. Klucz = `flags.<mod>.towarzysz.rodzaj` (U1). `rozmiar` — klucz rozmiaru dnd5e;\n'
               ' * `zrodlo` — identyfikator zdolności klasowej; `klasa` — klasa właściciela, od której liczy się poziom.\n */')
    out.append(f"export const RODZAJE = {js(rodzaje)};\n")
    out.append('/**\n * Statblocki zwierząt w kształcie wpisu Bestiariusza — szablony paczki `towarzysze` buduje ten sam builder\n'
               ' * (Współpraca dostaje `packTactics`, F12). Liczby zależne od właściciela policzone dla właściciela z PB +2,\n'
               ' * MDR +2 i 3. poziomem klasy — to tylko wartości szablonu; na karcie towarzysza liczy je moduł (`wzory`).\n */')
    out.append(f"export const STATBLOKI = {js(statbloki)};\n")
    out.append('/** Zdolności źródłowe (§3.1) → rodzaje i szukanie (§3.5). Szukanie w M3 to tylko podpowiedź (D30). */')
    out.append(f"export const ZRODLA = {js(zrodla)};\n")
    out.append('/**\n * Kontrolery zdalnego sterowania (D32, U17): zasięg na otwartej przestrzeni i przez ściany / pod ziemią.\n'
               ' * Fabryczny — Sprzęt, s. 130–131; domowy — schemat Hakera, s. 83 (20 m przez ściany: odczyt MG).\n */')
    out.append(f"export const KONTROLERY = {js(KONTROLERY)};\n")
    out.append("/** Agregat prądotwórczy na dronie: litry paliwa na godzinę (s. 83). */")
    out.append(f"export const AGREGAT_L_NA_H = {js(agregat)};\n")
    io.open(OUT, "w", encoding="utf-8", newline="\n").write("\n".join(out))
    print(f"wrote {OUT}: {len(rodzaje)} rodzajów, {len(statbloki)} statblocków, {len(zrodla)} zdolności")


if __name__ == "__main__":
    main()
