# -*- coding: utf-8 -*-
"""Extract the 18 Neuroshima professions (subclasses) + their abilities -> professions.json.

    python dev/classes/extract_professions.py [--out DIR]

Block shape in the NOE class files:
    ### <CLASSADJ> PROFESJE         <- run header
    #### <PROFESSION>               <- flavour prose
    ##### BIEGŁOŚCI <GEN>           <- proficiency grants
    ##### ZDOLNOŚCI <GEN>           <- "Na 3., 6. i 10. poziomie..." then abilities
    ###### <ABILITY NAME> [A|B|R]   <- heading + body, repeating
A few abilities are set as plain bold lines instead of headings, and companion statblocks
(DRON KROCZĄCY, PSI PARTNER…) sit between abilities; the EXPECTED lists decide what is an
ability, everything else stays in the text of the ability before it.
"""
import argparse
import io
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from noe_source import CLASS_FILES, KLASY, read_sections, split_action  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))

# run header -> ordered (profession nominative, exact "BIEGŁOŚCI <genitive>" anchor).
# The genitive is irregular (GWIAZDA->GWIAZDY, SĘDZIA->SĘDZIEGO), so it is spelled out
# rather than derived.
RUNS = [
    ("brutal",    "BRUTALNE PROFESJE", [
        ("GANGER",                "BIEGŁOŚCI GANGERA"),
        ("GLADIATOR",             "BIEGŁOŚCI GLADIATORA"),
        ("NAJEMNIK",              "BIEGŁOŚCI NAJEMNIKA")]),
    ("cwaniak",   "CWANIACKIE PROFESJE", [
        ("GWIAZDA",               "BIEGŁOŚCI GWIAZDY"),
        ("KAZNODZIEJA NOWEJ ERY", "BIEGŁOŚCI KAZNODZIEI"),
        ("MAFIOZO",               "BIEGŁOŚCI MAFIOZO")]),
    ("spec",      "SPECJALNE PROFESJE", [
        ("CHEMIK",                "BIEGŁOŚCI CHEMIKA"),
        ("MEDYK",                 "BIEGŁOŚCI MEDYKA"),
        ("MONTER",                "BIEGŁOŚCI MONTERA")]),
    ("twardziel", "TWARDZIELSKIE PROFESJE", [
        ("KOWBOJ",                "BIEGŁOŚCI KOWBOJA"),
        ("WOJOWNIK AUTOSTRADY",   "BIEGŁOŚCI WOJOWNIKA AUTOSTRADY"),
        ("ŻOŁNIERZ",              "BIEGŁOŚCI ŻOŁNIERZA")]),
    ("zlodziej",  "ZŁODZIEJSKIE PROFESJE", [
        ("KURIER",                "BIEGŁOŚCI KURIERA"),
        ("SZCZUR",                "BIEGŁOŚCI SZCZURA"),
        ("ZABÓJCA",               "BIEGŁOŚCI ZABÓJCY")]),
    ("zwiadowca", "ZWIADOWCZE PROFESJE", [
        ("ŁOWCA MUTANTÓW",        "BIEGŁOŚCI ŁOWCY MUTANTÓW"),
        ("SĘDZIA",                "BIEGŁOŚCI SĘDZIEGO"),
        ("ZABÓJCA MASZYN",        "BIEGŁOŚCI ZABÓJCY MASZYN")]),
]

# expected ability names per profession, from Tabele/Klasy.md — used as a cross-check
EXPECTED = {
    "GANGER": ["DWÓCH NA JEDNEGO", "JA I MÓJ GANG!", "JEDEN Z NICH", "ODWAŻNY CZY GŁUPI"],
    "GLADIATOR": ["NIE DO ZDARCIA", "ŁYŻECZKA", "ZEW ARENY", "ZAWOŁAJCIE KOLEGÓW"],
    "NAJEMNIK": ["MASZYNA DO ZABIJANIA", "REPUTACJA", "SKUTECZNY CIOS"],
    # NB: typographic apostrophe U+2019, not ASCII — the PDF uses ’
    "GWIAZDA": ["KAKOFONIA", "LET’S ROCK!", "STYLÓWA", "ZA GARŚĆ GAMBLI"],
    "KAZNODZIEJA NOWEJ ERY": ["AMEN", "ŁASKA BOŻA", "MÓJ BÓG KULE NOSI", "TARCZA WIARY"],
    "MAFIOZO": ["BEZLITOSNY PRZYWÓDCA", "RENOMA", "MOJA PRAWA RĘKA"],
    "CHEMIK": ["SMAKUJE JAK ARSZENIK", "PIROTECHNIKA", "RUSZNIKARSTWO"],
    "MEDYK": ["DOKTOR BRAIN", "KRWAWY ANIOŁ", "ŁAPIDUCH", "FARMACJA"],
    "MONTER": ["MECHANIKA", "HAKERSTWO", "SERWISOWANIE"],
    "KOWBOJ": ["CLINT", "REWOLWEROWIEC", "ZAWSZE W SIODLE"],
    "WOJOWNIK AUTOSTRADY": ["DRZWI W DRZWI", "KASKADER", "PANCERNA FURA"],
    "ŻOŁNIERZ": ["JAK DBASZ, TAK MASZ", "RUTYNA", "TRENING W ZBROI"],
    "KURIER": ["SKRYTKA", "SLANG", "ZNAJOMOŚCI"],
    "SZCZUR": ["A CO MI TAM!", "SZARY", "TRUCICIEL", "ZWINNOŚĆ SZCZURA"],
    "ZABÓJCA": ["JEDEN STRZAŁ", "KAMUFLAŻ", "STRZELEC"],
    "ŁOWCA MUTANTÓW": ["BEZ TAJEMNIC", "MUTANT NA ŚNIADANIE", "POGROMCA", "OSWAJANIE ZWIERZĄT"],
    "SĘDZIA": ["JEDEN Z NAS", "RZUĆ BROŃ I GLEBA!", "PARTNER"],
    "ZABÓJCA MASZYN": ["EMITER EMP", "EMPIRYK", "SŁABY PUNKT"],
}

def norm_name(s):
    return re.sub(r"\s+", " ", s.replace("\xa0", " ")).strip().rstrip(":").strip()


def extract_class(cls, profs, problems):
    secs = read_sections(os.path.join(KLASY, CLASS_FILES[cls]))
    names = {norm_name(p) for p, _ in profs}
    out = {}
    prof = None
    mode = None
    items = []  # (is_heading, text) inside the current ZDOLNOŚCI block

    def close():
        if prof is None:
            return
        expected = EXPECTED.get(prof, [])
        abilities, cur = [], None
        for is_head, txt in items:
            name, action = split_action(txt) if is_head else (txt, None)
            key = norm_name(name)
            hit = next((e for e in expected if key == e or (not is_head and key.startswith(e + " "))), None)
            if hit and hit not in [a["name"] for a in abilities]:
                body = "" if is_head or key == hit else key[len(hit):].strip()
                cur = {"name": hit, "action": action, "text": body}
                abilities.append(cur)
            elif cur is not None:
                cur["text"] = (cur["text"] + " " + txt).strip()
        for a in abilities:
            am = re.match(r"^\[([ABR])\]\s*", a["text"])
            if am and not a["action"]:
                a["action"], a["text"] = am.group(1), a["text"][am.end():]
        missing = [e for e in expected if e not in [a["name"] for a in abilities]]
        for m in missing:
            problems.append(f"{cls}/{prof}: ability not found: {m}")
        out[prof]["abilities"] = abilities

    in_run = False
    for level, title, body in secs:
        if level == 3:
            if in_run:
                break
            in_run = title.endswith("PROFESJE")
            continue
        if not in_run:
            continue
        t = norm_name(title)
        if level == 4 and t in names:
            close()
            prof, mode, items = t, None, []
            out[prof] = {"proficiencies": "", "abilities": []}
            continue
        if prof is None:
            continue
        if t.startswith("BIEGŁOŚCI "):
            mode = "prof"
            out[prof]["proficiencies"] = " ".join(body)
            continue
        if t.startswith("ZDOLNOŚCI "):
            mode = "abil"
            items = [(False, line) for line in body]
            continue
        if mode == "abil":
            items.append((True, title))
            items += [(False, line) for line in body]
    close()
    for p, _ in profs:
        if norm_name(p) not in out:
            problems.append(f"{cls}/{p}: profession heading not found")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=HERE, help="directory for professions.json")
    args = ap.parse_args()
    out, problems = {}, []
    for cls, _header, profs in RUNS:
        out[cls] = extract_class(cls, profs, problems)
        print(f"\n=== {cls} ===")
        for prof, d in out[cls].items():
            print(f"  {prof:24s} {len(d['abilities'])} abilities | prof-grants {len(d['proficiencies'])} chars")
            for a in d["abilities"]:
                print(f"      {a['name']:<24s} {len(a['text']):5d} chars")
    print("\n--- problems ---")
    print("\n".join(problems) if problems else "none")
    path = os.path.join(args.out, "professions.json")
    io.open(path, "w", encoding="utf-8").write(json.dumps(out, ensure_ascii=False, indent=2))
    print(f"\nwrote {path}")


if __name__ == "__main__":
    main()
