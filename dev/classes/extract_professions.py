# -*- coding: utf-8 -*-
"""Extract the 18 Neuroshima professions (subclasses) + their abilities.

Block shape in source.txt:
    <CLASSADJ> PROFESJE            <- run header
    <PROFESSION>                   <- ALLCAPS, followed by flavour prose
    BIEGŁOŚCI <PROFESSION-GEN>     <- proficiency grants
    ZDOLNOŚCI <PROFESSION-GEN>     <- "Na 3., 6. i 10. poziomie..." then abilities
    <ABILITY NAME>  <prose>        <- ALLCAPS heading + body, repeating
"""
import re, json, io

SRC = r"c:\Git\Neuroshima\neuro5e\Neuro 5e\Podrecznik\source.txt"
OUT = r"C:\Users\archo\AppData\Local\Temp\claude\c--Git-Neuroshima-neuro5e-Neuro-5e\76022c7a-0130-468d-8816-06335c0102ff\scratchpad\professions.json"

text = io.open(SRC, encoding="utf-8", errors="replace").read()
UP = "A-ZŁŚĄĘĆŃÓŻŹ"
ASCII_UP = "ABCDEFGHIJKLMNOPQRSTUVWXYZŁŚĄĘĆŃÓŻŹ"

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

def dehyphen(s):
    """PDF line-break hyphens: 'mo- żesz' -> 'możesz'."""
    return re.sub(r"(\w)-\s+(\w)", r"\1\2", s)

def norm(s):
    return dehyphen(re.sub(r"\s+", " ", s)).strip()

out = {}
problems = []

for cls, header, profs in RUNS:
    hs = text.find(header)
    if hs < 0:
        problems.append(f"run header not found: {header}")
        continue
    # run ends at the next class chapter marker, or a generous window
    run_end = len(text)
    for _, h2, _ in RUNS:
        if h2 == header:
            continue
        p = text.find(h2, hs + 1)
        if p > hs:
            run_end = min(run_end, p)
    # also stop at the SZTUCZKI chapter if it starts sooner
    m = re.search(r"SZTUCZKI\s+Sztuczki", text[hs:run_end])
    if m:
        run_end = hs + m.start()
    run = text[hs:run_end]

    for pi, (prof, anchor) in enumerate(profs):
        astart = run.find(anchor)
        if astart < 0:
            problems.append(f"{cls}/{prof}: anchor missing: {anchor}")
            continue
        aend = len(run)
        if pi + 1 < len(profs):
            nxt = run.find(profs[pi + 1][1], astart + 1)
            if nxt > astart:
                aend = nxt
        block = run[astart:aend]

        # split proficiencies from abilities at "ZDOLNOŚCI <X>"
        zm = re.search(r"ZDOLNOŚCI\s+[" + UP + r"][" + UP + r" ]{2,30}", block)
        if not zm:
            problems.append(f"{cls}/{prof}: ZDOLNOŚCI marker missing")
            continue
        profic = norm(re.sub(r"^BIEGŁOŚCI\s+[" + UP + r" ]+", "", block[:zm.start()]))
        abil_blob = block[zm.end():]

        # ability headings = the expected names, located in order
        found = []
        for nm in EXPECTED.get(prof, []):
            i = abil_blob.find(nm)
            if i < 0:
                problems.append(f"{cls}/{prof}: ability not found: {nm}")
            else:
                found.append((i, nm))
        found.sort()
        abilities = []
        for j, (i, nm) in enumerate(found):
            end = found[j + 1][0] if j + 1 < len(found) else len(abil_blob)
            body = norm(abil_blob[i + len(nm):end])
            body = re.split(r"ZASADY PODSTAWOWE EKSPLORACJA POCHODZENIE", body)[0].strip()
            # action tag ([A]ction / [B]onus / [R]eaction) trails the heading, if any
            am = re.match(r"\[([ABR])\]\s*", body)
            action = am.group(1) if am else None
            if am:
                body = body[am.end():]
            abilities.append({"name": nm, "action": action, "text": body})

        out.setdefault(cls, {})[prof] = {"proficiencies": profic, "abilities": abilities}

for cls in out:
    print(f"\n=== {cls} ===")
    for prof, d in out[cls].items():
        print(f"  {prof:24s} {len(d['abilities'])} abilities | prof-grants {len(d['proficiencies'])} chars")
        for a in d["abilities"]:
            print(f"      {a['name']:<24s} {len(a['text']):5d} chars")

print("\n--- problems ---")
print("\n".join(problems) if problems else "none")
io.open(OUT, "w", encoding="utf-8").write(json.dumps(out, ensure_ascii=False, indent=2))
print(f"\nwrote {OUT}")
