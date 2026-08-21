# -*- coding: utf-8 -*-
"""Extract Neuroshima class abilities + base attributes from the rulebook text dump.

Layout notes (source.txt is a PDF text dump, so column order is not reading order):
  - Each class run starts at "ZDOLNOŚCI KLASOWE <CLASSNAME>".
  - "PODSTAWOWE ATRYBUTY <CLASSNAME>" and stray "ZDOLNOŚCI KLASOWE <word>" are
    table captions that land *inside* a run; they terminate an ability body but
    do not end the class run.
  - Ability heading = "POZIOM <n>: <ALLCAPS NAME> [<A|B|R>]?" immediately followed
    by body prose. The dump gives no separator, so the trailing single capital
    letter of the heading match is actually the body's first letter -> strip it.
"""
import re, json, io

SRC = r"c:\Git\Neuroshima\neuro5e\Neuro 5e\Podrecznik\source.txt"
OUT = r"C:\Users\archo\AppData\Local\Temp\claude\c--Git-Neuroshima-neuro5e-Neuro-5e\76022c7a-0130-468d-8816-06335c0102ff\scratchpad\classes.json"

text = io.open(SRC, encoding="utf-8", errors="replace").read()

UP = "A-ZŁŚĄĘĆŃÓŻŹ"
CLASS_RUNS = [
    ("brutal",    "ZDOLNOŚCI KLASOWE BRUTALA",    "PODSTAWOWE ATRYBUTY CWANIAKA"),
    ("cwaniak",   "ZDOLNOŚCI KLASOWE CWANIAKA",   "PODSTAWOWE ATRYBUTY SPECA"),
    ("spec",      "ZDOLNOŚCI KLASOWE SPECA",      "PODSTAWOWE ATRYBUTY TWARDZIELA"),
    ("twardziel", "ZDOLNOŚCI KLASOWE TWARDZIELA", "PODSTAWOWE ATRYBUTY ZŁODZIEJA"),
    ("zlodziej",  "ZDOLNOŚCI KLASOWE ZŁODZIEJA",  "PODSTAWOWE ATRYBUTY ZWIADOWCY"),
    ("zwiadowca", "ZDOLNOŚCI KLASOWE ZWIADOWCY",  "ZWIADOWCZE PROFESJE"),
]

# Brutal's abilities continue past its own PODSTAWOWE ATRYBUTY block, so runs are
# bounded by the *next* class's marker, not by any caption inside the run.
HEAD_RE = re.compile(r"POZIOM (\d{1,2}):\s+((?:[" + UP + r"!’'\-]{1,}\s+)*[" + UP + r"!’'\-]{1,})(\s*\[([ABR])\])?")
NOISE_RE = re.compile(
    r"TABELA\s+ZDOLNOŚCI"
    r"|ZDOLNOŚCI\s+KLASOWE\s+[" + UP + r"]"
    r"|PODSTAWOWE\s+ATRYBUTY\s+[" + UP + r"]"
    r"|POZIOM\s+PREMIA\s+BIEGŁOŚCI"
    # section that follows the last ability of every class run
    r"|[" + UP + r"]+\s+PROFESJE"
    # PDF running header / page furniture
    r"|ZASADY\s+PODSTAWOWE\s+EKSPLORACJA\s+POCHODZENIE"
)

def dehyphen(s):
    """PDF line-break hyphens: 'mo- żesz' -> 'możesz'."""
    return re.sub(r"(\w)-\s+(\w)", r"\1\2", s)

def clean_name(raw):
    """Strip the trailing single capital letter that is really the body's first char."""
    toks = raw.split()
    while len(toks) > 1 and len(toks[-1]) == 1 and toks[-1] in UP.replace("A-Z", "ABCDEFGHIJKLMNOPQRSTUVWXYZ"):
        toks.pop()
    return " ".join(toks)

classes = {}
for key, start_marker, end_marker in CLASS_RUNS:
    s = text.find(start_marker)
    e = text.find(end_marker, s + 1)
    if s < 0:
        print(f"!! {key}: start marker not found"); continue
    if e < 0:
        e = s + 12000
    run = text[s:e]
    hits = list(HEAD_RE.finditer(run))
    abilities = []
    for i, m in enumerate(hits):
        end = hits[i + 1].start() if i + 1 < len(hits) else len(run)
        body = run[m.end():end]
        body = NOISE_RE.split(body)[0]
        body = dehyphen(re.sub(r"\s+", " ", body)).strip()
        name = clean_name(m.group(2))
        # the letter we stripped belongs to the body
        stripped = m.group(2)[len(name):].strip()
        if stripped and not m.group(3):
            body = stripped + body
        abilities.append({
            "level": int(m.group(1)),
            "name": name,
            "action": m.group(4) or None,   # A / B / R / None(passive)
            "text": body,
        })
    abilities.sort(key=lambda a: (a["level"], a["name"]))

    bpos = text.find("PODSTAWOWE ATRYBUTY", s)
    base = re.sub(r"\s+", " ", text[bpos:bpos + 1500]).strip() if 0 <= bpos < e else None

    classes[key] = {"abilities": abilities, "base": base}
    lv = sorted({a["level"] for a in abilities})
    print(f"{key:10s} {len(abilities):2d} abilities, levels {lv}")
    for a in abilities:
        tag = f"[{a['action']}]" if a["action"] else "   "
        print(f"           L{a['level']:<2d} {tag} {a['name']:<28s} {len(a['text']):4d} chars")

io.open(OUT, "w", encoding="utf-8").write(json.dumps(classes, ensure_ascii=False, indent=2))
print(f"\nwrote {OUT}")
