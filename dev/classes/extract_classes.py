# -*- coding: utf-8 -*-
"""Extract class abilities + base attributes from the NOE class chapter -> classes.json.

    python dev/classes/extract_classes.py [--out DIR]

Each class file has "### ZDOLNOŚCI KLASOWE <KLASY>" followed by "#### POZIOM <n>: <NAZWA> [A|B|R]"
headings; an ability runs until the next heading. Bold table captions ("TABELA ZDOLNOŚCI
KLASOWYCH …") that sit between abilities are cut off. `base` is the plain text of the
class intro, the "PODSTAWOWE ATRYBUTY" table and the "TWORZENIE POSTACI" section.
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
CUT = re.compile(r"^(TABELA ZDOLNOŚCI KLASOWYCH|PODSTAWOWE ATRYBUTY)")


def extract(path):
    abilities = []
    base_parts = []
    in_features = False
    for level, title, body in read_sections(path):
        if level == 3:
            in_features = title.startswith("ZDOLNOŚCI KLASOWE")
            if title.startswith("TWORZENIE POSTACI"):
                base_parts += [title] + body
            continue
        if level == 2:
            base_parts += body
            continue
        if not in_features:
            continue
        m = re.match(r"^POZIOM (\d{1,2}):\s*(.+)$", title)
        if not m:
            continue
        name, action = split_action(m.group(2))
        text = []
        for line in body:
            if CUT.match(line):
                break
            text.append(line)
        abilities.append({"level": int(m.group(1)), "name": name, "action": action, "text": " ".join(text)})
    abilities.sort(key=lambda a: (a["level"], a["name"]))
    return {"abilities": abilities, "base": " ".join(base_parts)}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=HERE, help="directory for classes.json")
    args = ap.parse_args()
    classes = {}
    for key, fname in CLASS_FILES.items():
        classes[key] = extract(os.path.join(KLASY, fname))
        ab = classes[key]["abilities"]
        print(f"{key:10s} {len(ab):2d} abilities, levels {sorted({a['level'] for a in ab})}")
        for a in ab:
            tag = f"[{a['action']}]" if a["action"] else "   "
            print(f"           L{a['level']:<2d} {tag} {a['name']:<28s} {len(a['text']):4d} chars")
    out = os.path.join(args.out, "classes.json")
    io.open(out, "w", encoding="utf-8").write(json.dumps(classes, ensure_ascii=False, indent=2))
    print(f"\nwrote {out}")


if __name__ == "__main__":
    main()
