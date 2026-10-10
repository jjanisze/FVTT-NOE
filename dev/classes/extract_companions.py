# -*- coding: utf-8 -*-
"""Extract companion statblocks and creation boxes from the NOE class chapter -> companions.json.

    python dev/classes/extract_companions.py [--out DIR]

PLAN_m3_towarzysze.md §7.13 (E6). Sources (NOE, printed pages):
  * Zwiadowca / Łowca Mutantów — OSWAJANIE ZWIERZĄT: ZMUTOWANY OWAD / SSAK / GAD statblocks (s. 99–100)
  * Zwiadowca / Sędzia — PARTNER: PSI PARTNER statblock (s. 100), "Szukanie partnera", LUDZKI PARTNER box (s. 101)
  * Cwaniak / Mafiozo — MOJA PRAWA RĘKA: "ZASADY TWORZENIA PRAWEJ RĘKI" box (s. 76)
  * Spec / Monter — HAKERSTWO: DRON KROCZĄCY / LATAJĄCY statblocks (s. 83–84)

The output keeps the rulebook's own phrases for anything computed from another actor ("14 plus twoja
Premia Biegłości"); `gen_companions.py` turns them into roll-data formulas with a strict grammar. The
vocabularies (skills, damage types, senses, movement, sizes) are the Bestiariusz parser's — one closed
list for the whole module; an unknown word is a build error, not a guess.
"""
import argparse
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "bestiary"))
from noe_source import CLASS_FILES, KLASY  # noqa: E402
import extract_bestiary as B  # noqa: E402

errors = []


def err(where, msg):
    errors.append(f"{where}: {msg}")


# heading in the class file -> (companion id, class file key)
STATBLOCKS = {
    "ZMUTOWANY OWAD": ("zmutowany-owad", "zwiadowca"),
    "ZMUTOWANY SSAK": ("zmutowany-ssak", "zwiadowca"),
    "ZMUTOWANY GAD": ("zmutowany-gad", "zwiadowca"),
    "PSI PARTNER": ("psi-partner", "zwiadowca"),
    "DRON KROCZĄCY": ("dron-kroczacy", "spec"),
    "DRON LATAJĄCY": ("dron-latajacy", "spec"),
}
# info box title -> (companion id, class file key, source ability heading)
BOXES = {
    "LUDZKI PARTNER": ("ludzki-partner", "zwiadowca", "PARTNER"),
    "ZASADY TWORZENIA PRAWEJ RĘKI": ("prawa-reka", "cwaniak", "MOJA PRAWA RĘKA"),
}
# source ability heading -> (ability id, class file key)
ABILITIES = {
    "OSWAJANIE ZWIERZĄT": ("oswajanie-zwierzat", "zwiadowca"),
    "PARTNER": ("partner", "zwiadowca"),
    "MOJA PRAWA RĘKA": ("moja-prawa-reka", "cwaniak"),
    "HAKERSTWO": ("hakerstwo", "spec"),
}

HEADING = re.compile(r"^(#{1,6})\s+(.*?)\s*$")
PAGE = re.compile(r"<!--\s*s\.\s*(\d+)\s*-->")
FEATURE = re.compile(r"^\*\*\*(.+?)\.\*\*\*\s*(.*)$")
LABEL = re.compile(r"\*\*([A-ZŁŚŻŹĆŃÓĄĘ][A-ZŁŚŻŹĆŃÓĄĘ ]*?):?\*\*:?")


def unmd(s):
    return re.sub(r"\s+", " ", s.replace("*", "").replace("\\", "")).strip()


def read_lines(cls):
    """[(page, raw line)] with the page each line is printed on."""
    out, page = [], None
    for line in io.open(os.path.join(KLASY, CLASS_FILES[cls]), encoding="utf-8").read().splitlines():
        m = PAGE.search(line)
        if m:
            page = int(m.group(1))
            continue
        out.append((page, line))
    return out


def section(lines, title, level=None):
    """Lines under the heading `title` up to the next heading; (page of the heading, [raw lines])."""
    for i, (page, line) in enumerate(lines):
        m = HEADING.match(line)
        if m and m.group(2).strip() == title and (level is None or len(m.group(1)) == level):
            body = []
            for _, l2 in lines[i + 1:]:
                if HEADING.match(l2):
                    break
                body.append(l2)
            return page, body
    return None, None


def header_fields(body):
    """Bold-labelled header of a statblock: {'TT': '…', 'PW': '…', 'SZYBKOŚĆ': '…', …} up to the abilities table."""
    fields = {}
    for line in body:
        if line.startswith("|"):
            break
        parts = LABEL.split(line)
        # LABEL.split -> [before, label1, value1, label2, value2, ...]
        for k in range(1, len(parts), 2):
            fields[parts[k].strip()] = unmd(parts[k + 1]).strip(" ;,.")
    return fields


def kw_line(body):
    for line in body:
        t = unmd(line)
        if t.startswith("KW "):
            return t[3:].strip(" .")
    return None


def size_type(body, where):
    for line in body:
        t = unmd(line)
        if not t:
            continue
        m = re.match(r"^(\S+)\s+(zwierzę|maszyna|człowiek|mutant|potwór)$", t, re.I)
        if not m:
            err(where, f"no size/type line before the header: {t[:40]!r}")
            return None, None
        size = next((v for stem, v in B.SIZES if m.group(1).lower().startswith(stem)), None)
        if not size:
            err(where, f"unknown size word {m.group(1)!r}")
        return size, B.CREATURE_TYPES.get(m.group(2).lower())
    return None, None


def abilities(body, where):
    rows = [ln for ln in body if ln.startswith("|") and not re.match(r"^\|\s*-", ln)]
    if len(rows) < 2:
        err(where, "abilities table not found")
        return {}
    heads = [unmd(c) for c in rows[0].strip("|").split("|")]
    vals = [unmd(c) for c in rows[1].strip("|").split("|")]
    out = {}
    for h, v in zip(heads, vals):
        key = B.ABILITIES.get(h.lower())
        if not key:
            err(where, f"unknown ability column {h!r}")
            continue
        m = re.match(r"^(\d+)", v)
        out[key] = int(m.group(1)) if m else None  # "–": no score (drone INT/MDR/CHA)
    return out


def speed(v, where):
    out = {}
    for part in B.split_list(v):
        m = re.match(r"^(?:(\w+)\s+)?([\d,]+)\s*m$", part.strip())
        if not m:
            err(where, f"unparsed speed {part!r}")
            continue
        kind = B.MOVEMENT.get((m.group(1) or "").lower(), "walk") if m.group(1) else "walk"
        if m.group(1) and m.group(1).lower() not in B.MOVEMENT:
            err(where, f"unknown movement {m.group(1)!r}")
        out[kind] = B.num(m.group(2))
    return out


def skills(v, where):
    out = {}
    for part in B.split_list(v):
        m = re.match(r"^(.+?)\s*([+-]\d+)$", part)
        key = B.SKILLS.get(m.group(1).strip().lower()) if m else None
        if not key:
            err(where, f"unknown skill {part!r}")
            continue
        out[key] = int(m.group(2))
    return out


def saves(v, where):
    out = {}
    for part in B.split_list(v):
        m = re.match(r"^(\S+)\s*([+-]\d+)$", part)
        key = B.ABILITIES.get(m.group(1).lower()) if m else None
        if not key:
            err(where, f"unknown save {part!r}")
            continue
        out[key] = int(m.group(2))
    return out


def damage_list(v, where):
    out = []
    for part in B.split_list(v):
        key = B.DAMAGE_TYPES.get(part.strip().lower())
        if not key:
            err(where, f"unknown damage type {part!r}")
            continue
        out.append(key)
    return out


def conditions(v, where):
    out = []
    for part in B.split_list(v):
        key = B.CONDITIONS.get(part.strip().lower())
        if not key:
            err(where, f"unknown condition {part!r}")
            continue
        out.append(key)
    return out


def senses(v, where):
    out = {}
    for part in B.split_list(v):
        p = part.strip()
        m = re.match(r"^Pasywna Percepcja\s+(\d+)$", p, re.I)
        if m:
            out["passivePerception"] = int(m.group(1))
            continue
        m = re.match(r"^(\S+)\s+([\d,]+)\s*(?:m|metrów)$", p)
        key = B.SENSES.get(m.group(1).lower()) if m else None
        if not key:
            err(where, f"unknown sense {p!r}")
            continue
        out[key] = B.num(m.group(2))
    return out


ATTACK = re.compile(
    r"^Atak (?P<kind>wręcz|dystansowy):\s*(?P<bonus>.+?);\s*zasięg\s+(?P<reach>[\d,]+)\s*m;\s*"
    r"Obrażenia:\s*(?P<avg>\d+)\s*\((?P<formula>[^)]+)\)\s*(?P<rest>.*)$")


def attack(name, text, where):
    m = ATTACK.match(unmd(text))
    if not m:
        err(where, f"unparsed attack {name!r}: {unmd(text)[:70]!r}")
        return None
    rest = m.group("rest")
    dtype = None
    for dname in sorted(B.DAMAGE_TYPES, key=len, reverse=True):
        if re.match(rf"^{re.escape(dname)}\b", rest, re.I):
            dtype, rest = B.DAMAGE_TYPES[dname], rest[len(dname):]
            break
    if not dtype:
        err(where, f"attack {name!r}: no damage type in {rest[:40]!r}")
    rider = re.sub(r"^\s*[.,]?\s*(i\s+)?", "", rest).strip() or None
    if rider:
        rider = rider[0].upper() + rider[1:]
    return {
        "id": B.slug(name), "name": name, "kind": "mwak" if m.group("kind") == "wręcz" else "rwak",
        "bonus": m.group("bonus").strip(), "reach": B.num(m.group("reach")),
        "damage": {"avg": int(m.group("avg")), "formula": m.group("formula").replace("k", "d"), "type": dtype},
        "rider": rider,
    }


def statblock(cls, lines, title, cid):
    where = f"{cid} ({title})"
    page, body = section(lines, title, level=5)
    if body is None:
        err(where, "heading not found")
        return None
    # A statblock ends where prose about the companion starts ("**Szukanie partnera.**", an info box).
    cut = next((i for i, l in enumerate(body) if l.startswith("> [!info]") or re.match(r"^\*\*[A-ZŁŚ][a-ząćęłńóśżź]+ ", l)), len(body))
    body = body[:cut]
    size, ctype = size_type(body, where)
    h = header_fields(body)
    out = {
        "id": cid, "heading": title, "klasa": cls, "page": page, "size": size, "creatureType": ctype,
        "tt": h.pop("TT", None), "pw": h.pop("PW", None), "kw": h.pop("KW", None) or kw_line(body),
        "initiative": None, "speed": {}, "stopienZranienia": False,
        "abilities": abilities(body, where), "skills": {}, "saves": {}, "immunities": [],
        "conditionImmunities": [], "senses": {}, "progi": {}, "features": [], "attacks": [], "formulas": {},
    }
    ini = h.pop("INICJATYWA", None)
    if ini:
        m = re.match(r"^([+-]\d+)", ini)
        out["initiative"] = int(m.group(1)) if m else None
    if "SZYBKOŚĆ" in h:
        out["speed"] = speed(h.pop("SZYBKOŚĆ"), where)
    if "STOPIEŃ ZRANIENIA" in h:
        h.pop("STOPIEŃ ZRANIENIA")
        out["stopienZranienia"] = True
    for label, key in (("PRÓG OBRAŻEŃ", "obrazen"), ("PRÓG AWARII", "awarii")):
        if label in h:
            out["progi"][key] = int(re.match(r"^(\d+)", h.pop(label)).group(1))
    # The rest of the bold labels sit after the abilities table.
    after = [l for l in body[[i for i, l in enumerate(body) if l.startswith("|")][-1] + 1:]] if any(l.startswith("|") for l in body) else []
    section_name = None
    for line in after:
        t = line.strip()
        if not t:
            continue
        lab = LABEL.match(t)
        if lab and t == lab.group(0):
            section_name = lab.group(1).strip()      # ZDOLNOŚCI / AKCJE
            continue
        if lab:
            label, value = lab.group(1).strip(), unmd(t[lab.end():]).strip(" ;,.")
            if label == "SZYBKOŚĆ":
                out["speed"] = speed(value, where)
            elif label == "UMIEJĘTNOŚCI":
                out["skills"] = skills(value, where)
            elif label == "RZUTY OBRONNE":
                out["saves"] = saves(value, where)
            elif label == "NIEWRAŻLIWOŚĆ NA OBRAŻENIA":
                out["immunities"] = damage_list(value, where)
            elif label == "NIEWRAŻLIWOŚĆ NA STANY":
                out["conditionImmunities"] = conditions(value, where)
            elif label == "ZMYSŁY":
                out["senses"] = senses(value, where)
            else:
                err(where, f"unknown label {label!r}")
            continue
        f = FEATURE.match(t)
        if f:
            name, text = unmd(f.group(1)), unmd(f.group(2))
            if section_name == "AKCJE" and text.startswith("Atak "):
                a = attack(name, text, where)
                if a:
                    out["attacks"].append(a)
            elif name.startswith("Wzór "):
                key = {"Wzór premii ataku drona": "atak", "Wzór na obrażenia drona": "obrazenia",
                       "Wzór na RO w przypadku ataku obszarowego": "stObszarowe"}.get(name)
                if not key:
                    err(where, f"unknown formula line {name!r}")
                else:
                    out["formulas"][key] = text.rstrip(".")
            else:
                out["features"].append({"id": B.slug(name), "name": name, "section": "actions" if section_name == "AKCJE" else "traits", "text": text})
            continue
        if section_name is None and t.startswith("|"):
            continue
        err(where, f"unclaimed line {t[:60]!r}")
    for label in h:
        err(where, f"unknown header label {label!r}")
    return out


def box(lines, title, cid, cls, ability):
    where = f"{cid} ({title})"
    start = next((i for i, (_, l) in enumerate(lines) if l.strip() == f"> [!info] {title}"), None)
    if start is None:
        err(where, "info box not found")
        return None
    page = lines[start][0]
    fields = {}
    for _, l in lines[start + 1:]:
        if not l.startswith(">"):
            break
        t = l.lstrip("> ").strip()
        m = re.match(r"^\*\*(.+?)[:.]?\*\*:?\s*(.*)$", t)
        if m:
            fields[unmd(m.group(1)).rstrip(":.")] = unmd(m.group(2))
    apage, _ = section(lines, ability, level=6)
    return {"id": cid, "heading": title, "klasa": cls, "page": page, "abilityPage": apage, "fields": fields}


def searching(lines, ability, cid, where):
    """Search rule of a source ability: hours, and for Oswajanie the d6 table and taming days."""
    page, body = section(lines, ability, level=6)
    text = " ".join(unmd(l) for l in (body or []))
    if ability == "PARTNER":  # "Szukanie partnera." sits after the PSI PARTNER statblock
        _, psi = section(lines, "PSI PARTNER", level=5)
        text += " " + " ".join(unmd(l) for l in (psi or []))
    m = re.search(r"poświęcić (\d+) godzin", text)
    # The page is where the search sentence is printed, not the ability heading ("Szukanie partnera" is on
    # the page after the PARTNER heading).
    gdzie = [ability] + (["PSI PARTNER"] if ability == "PARTNER" else [])
    for title in gdzie:
        for i, (pg, line) in enumerate(lines):
            hm = HEADING.match(line)
            if not (hm and hm.group(2).strip() == title):
                continue
            for pg2, l2 in lines[i + 1:]:
                if HEADING.match(l2):
                    break
                if re.search(r"poświęcić \d+ godzin", unmd(l2)):
                    page = pg2
                    break
    out = {"ability": cid, "page": page, "godziny": int(m.group(1)) if m else None}
    if not m:
        err(where, "search hours not found")
    k = re.search(r"Rzuć 1k6.*?\(([^)]+)\)", text)
    if k:
        table = {}
        for part in k.group(1).split(","):
            mm = re.match(r"^\s*(\d)-(\d):\s*(.+?)\s*$", part)
            if not mm:
                err(where, f"unparsed d6 entry {part!r}")
                continue
            for n in range(int(mm.group(1)), int(mm.group(2)) + 1):
                table[n] = mm.group(3)
        out["k6"] = table
    d = re.search(r"oswajania trwa (\d+) dni", text)
    if d:
        out["dniOswajania"] = int(d.group(1))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=HERE, help="directory for companions.json")
    args = ap.parse_args()
    cache = {}
    lines = lambda cls: cache.setdefault(cls, read_lines(cls))  # noqa: E731
    out = {"statblocks": {}, "boxes": {}, "abilities": {}}
    for title, (cid, cls) in STATBLOCKS.items():
        s = statblock(cls, lines(cls), title, cid)
        if s:
            out["statblocks"][cid] = s
    for title, (cid, cls, ability) in BOXES.items():
        b = box(lines(cls), title, cid, cls, ability)
        if b:
            out["boxes"][cid] = b
    for title, (aid, cls) in ABILITIES.items():
        page, body = section(lines(cls), title, level=6)
        entry = {"page": page}
        if aid != "hakerstwo":
            entry.update(searching(lines(cls), title, aid, f"{aid} ({title})"))
        else:
            text = " ".join(unmd(l) for l in (body or []))
            m = re.search(r"Akumulator 24V wystarcza na (\d+) godzin\w* pracy średniego drona i (\d+) godzin\w* pracy małego", text)
            a = re.search(r"\(([\d,]+) l paliwa/1 h\)", text)
            if not (m and a):
                err(aid, "power rules (akumulator / agregat) not found")
            else:
                entry["akumulator"] = {"med": int(m.group(1)), "sm": int(m.group(2))}
                entry["agregatLNaH"] = B.num(a.group(1))
        out["abilities"][aid] = entry

    for cid, s in out["statblocks"].items():
        print(f"  {cid:16s} s. {s['page']}  {s['size']}/{s['creatureType']}  TT {s['tt']!r}  PW {s['pw']!r}  "
              f"{len(s['features'])} cech, {len(s['attacks'])} ataków, wzory {sorted(s['formulas'])}")
    for cid, b in out["boxes"].items():
        print(f"  {cid:16s} s. {b['page']}  pola: {', '.join(b['fields'])}")
    for aid, a in out["abilities"].items():
        print(f"  {aid:20s} {a}")
    print("\n--- errors ---")
    print("\n".join(errors) if errors else "none")
    if errors:
        sys.exit(1)
    path = os.path.join(args.out, "companions.json")
    io.open(path, "w", encoding="utf-8").write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    print(f"\nwrote {path}")


if __name__ == "__main__":
    main()
