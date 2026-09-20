#!/usr/bin/env python
"""Zasiewa tokens/scale-overrides.json zmierzoną skalą żetonów Bestiariusza.

Skala żetonu to `prototypeToken.texture.scaleX/scaleY`. Jedynym jej źródłem jest
`tokens/scale-overrides.json` (PLAN_monster_closet.md §7, wariant (b)) — builder
czyta ten plik i nic więcej. Ten skrypt wypełnia go **wartością początkową**:

    skala = docelowe wypełnienie kadru / zmierzone wypełnienie kadru

Docelowe wypełnienie bierze się z tabeli rozmiarów w `tokens/README.md`.
Zmierzone — z obwiedni kanału alfa pliku, który dana istota faktycznie dostanie
w buildzie. Efekt: każda istota **startuje na swoim celu**, a ręczna kalibracja
w Szafie z potworami zajmuje się tylko tym, czym powinna — oceną artystyczną
("Bit-Boy ma czytać się jako mniejszy od człowieka"), nie odrabianiem arytmetyki.

## Czym to jest wobec §7 planu

§7 odrzucił pomiar per-plik jako nieopłacalny ("No per-image bbox measurement
pass — deliberately not worth the engineering effort"). Decyzja odwrócona
2026-09-20, po pomiarze: nasz art wypełnia kadr w 64–98%, nie w 100%, więc płaska
wartość z tabeli ("skala = docelowe wypełnienie") ląduje o 10–20% za nisko dla
Średnich i Dużych, a dla żetonów pożyczonych (Koń 64%) nawet o 40%. Argument
o koszcie nie utrzymał się — pomiar to trzy linijki Pillow. Cel §7, czyli
„MG dostaje sensowny punkt startowy i poprawia go na oko", zostaje bez zmian.

## Priorytet źródeł grafiki

Musi być **identyczny** z `tokenArtFor()` w `dev/packs/build-packs.mjs`,
bo inaczej zmierzylibyśmy inny plik niż ten, który pojedzie do kompendium:
`tokens/<id>.webp|png` → `tokens/aliases.json` → `tokens/_placeholder/<id>.webp`.

## Użycie

    npm run seed:token-scales            # dopisuje tylko brakujące wpisy
    npm run seed:token-scales -- --check  # nic nie zapisuje, pokazuje rozjazd
    npm run seed:token-scales -- --force  # przelicza wszystko od nowa

Domyślnie **nie nadpisuje** istniejących wartości: wpis w pliku to wynik
kalibracji MG i pomiar nie ma prawa go wyrzucić. Gdy istota dostanie nową
grafikę, jej stara wartość jest zmierzona względem poprzedniego pliku — wtedy
`--check` pokazuje rozjazd, a skasowanie linijki i ponowne uruchomienie zasiewa
ją na nowo.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image

# Raport jest po polsku, a konsola Windows startuje w cp1252 — bez tego
# `print` z „ś" wywala UnicodeEncodeError i skrypt kończy się błędem po
# wykonaniu całej pracy.
for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="replace")

MODULE_ROOT = Path(__file__).resolve().parents[2]
FVTT_DATA = Path(r"C:\Users\archo\AppData\Local\FoundryVTT\Data")

BESTIARY = MODULE_ROOT / "dev" / "bestiary" / "bestiary.json"
ALIASES = MODULE_ROOT / "tokens" / "aliases.json"
PLACEHOLDERS = MODULE_ROOT / "tokens" / "_placeholder"
TOKENS = MODULE_ROOT / "tokens"
OVERRIDES = MODULE_ROOT / "tokens" / "scale-overrides.json"

# Docelowe wypełnienie kadru per rozmiar — tabela z `tokens/README.md`,
# potwierdzona z MG w PLAN_monster_closet.md §7.
TARGET_FILL = {"tiny": 0.60, "sm": 0.70, "med": 0.90, "lg": 0.90, "huge": 0.92, "grg": 0.92}

HEADER = {
    "//": "Creature id -> prototypeToken.texture.scaleX/scaleY, applied by dev/packs/build-packs.mjs.",
    "//1": "SINGLE source of truth for token scale: the builder reads this file and nothing else,",
    "//2": "so a creature missing here ships at 1.0 (the build prints a suggestion for each one).",
    "//3": "Seeded as target-fill / measured-fill by dev/icons/gen_scale_defaults.py:",
    "//4": "  npm run seed:token-scales            (adds missing entries only)",
    "//5": "  npm run seed:token-scales -- --check  (reports drift, writes nothing)",
    "//6": "Calibrate by eye in the Monster Closet scene, then harvest the result with:",
    "//7": "  game.neuroshima.monsterCloset.harvest()      (merges, never overwrites)",
    "//8": "Rebuild: npm run build:bestiary (Foundry closed)",
}


def load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def strip_comments(raw: dict) -> dict:
    return {k: v for k, v in raw.items() if not k.startswith("//")}


def art_for(creature_id: str, aliases: dict) -> tuple[Path | None, str]:
    """Ten sam łańcuch priorytetów co `tokenArtFor()` w build-packs.mjs."""
    for ext in ("webp", "png"):
        candidate = TOKENS / f"{creature_id}.{ext}"
        if candidate.exists():
            return candidate, "own"

    alias = aliases.get(creature_id)
    if alias:
        candidate = FVTT_DATA / alias.replace("/", "\\")
        if candidate.exists():
            return candidate, "alias"

    candidate = PLACEHOLDERS / f"{creature_id}.webp"
    if candidate.exists():
        return candidate, "placeholder"

    return None, "portrait"


def measure_fill(path: Path) -> float | None:
    """Ułamek kadru zajęty przez grafikę, mierzony **dłuższym** wymiarem.

    Dłuższym, bo to on decyduje, czy grafika wyleje się za swoje pole siatki —
    Foundry z `fit: "contain"` wpisuje teksturę w kwadrat footprintu po dłuższej
    osi. Dla istot innych niż dwunożne wymiar poziomy nic nie mówi (Szczur dnd5e:
    27% w poziomie, 45% w pionie).
    """
    with Image.open(path) as im:
        rgba = im.convert("RGBA")
        box = rgba.split()[3].getbbox()
        if not box:
            return None
        width, height = rgba.size
        return max((box[2] - box[0]) / width, (box[3] - box[1]) / height)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="nic nie zapisuj, tylko pokaż rozjazd")
    parser.add_argument("--force", action="store_true", help="przelicz też istniejące wpisy")
    args = parser.parse_args()

    roster = load_json(BESTIARY)
    aliases = strip_comments(load_json(ALIASES)) if ALIASES.exists() else {}
    current = strip_comments(load_json(OVERRIDES)) if OVERRIDES.exists() else {}

    added: dict[str, float] = {}
    changed: list[str] = []
    kept = 0
    skipped: list[str] = []
    unknown_size: list[str] = []

    for creature_id, creature in sorted(roster.items()):
        # Nakładki (Zombie, Mobsprzęt) nie trafiają do packa — patrz DEV_GUIDE §11.8.
        if creature.get("overlay"):
            continue

        size = creature.get("size", "med")
        target = TARGET_FILL.get(size)
        if target is None:
            unknown_size.append(f"{creature_id} ({size})")
            continue

        path, source = art_for(creature_id, aliases)
        if path is None:
            # Portret w pierścieniu skaluje się przez `ring.subject.scale`,
            # nie przez `texture.scaleX` — nie ma tu czego mierzyć.
            skipped.append(f"{creature_id} ({source})")
            continue

        fill = measure_fill(path)
        if not fill:
            skipped.append(f"{creature_id} (pusty kanał alfa)")
            continue

        scale = round(target / fill, 2)
        have = current.get(creature_id)

        if have is None:
            added[creature_id] = scale
        elif args.force and round(float(have), 2) != scale:
            changed.append(f"{creature_id}: {have} -> {scale} ({source}, kadr {fill:.0%})")
            added[creature_id] = scale
        elif round(float(have), 2) != scale:
            changed.append(f"{creature_id}: plik {have}, pomiar {scale} ({source}, kadr {fill:.0%})")
            kept += 1
        else:
            kept += 1

    print(f"Bestiariusz: {len(roster)} wpisów, plik: {len(current)} wartości")
    print(f"  dopisane   : {len(added)}")
    print(f"  bez zmian  : {kept}")
    if changed:
        label = "przeliczone" if args.force else "rozjazd pomiar/plik (nietknięte)"
        print(f"  {label} ({len(changed)}):")
        for line in changed:
            print(f"    {line}")
    if skipped:
        print(f"  pominięte ({len(skipped)}): {', '.join(skipped)}")
    if unknown_size:
        print(f"  nieznany rozmiar ({len(unknown_size)}): {', '.join(unknown_size)}")

    if args.check:
        print("\n--check: nic nie zapisano.")
        return 0
    if not added:
        print("\nNic do zapisania.")
        return 0

    merged = {**current, **added}
    out = dict(HEADER)
    for key in sorted(merged):
        out[key] = merged[key]
    OVERRIDES.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nZapisano {OVERRIDES.relative_to(MODULE_ROOT)} ({len(merged)} istot).")
    print("Przebuduj pack: npm run build:bestiary (Foundry zamknięte).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
