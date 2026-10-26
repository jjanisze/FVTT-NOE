"""Write catalog.json for the M4 vehicle art from one table (the packer reads only catalog.json)."""
import json
from pathlib import Path

PX = 300  # pixels per 1.5 m grid square for vehicles (see README: why not 400)

# id, file slug, footprint (cells: width x length), exhaust (x, y) as fractions of the frame or None, subject
VEHICLES = [
    ("osobowka", "osobowka", (1.5, 3), (0.30, 0.03),
     "a generic late-1980s American four-door sedan, sun-faded paint, rust on the wheel arches, one mismatched grey door, a roof rack with a tarp-wrapped bundle strapped down"),
    ("autobus", "autobus", (2, 8), (0.78, 0.02),
     "a generic 1980s American city transit bus, faded two-tone paint, plywood bolted over two side windows, patched sheet metal on the roof, roof hatches closed"),
    ("motocykl", "motocykl", (0.5, 1.5), (0.30, 0.05),
     "a generic heavy American cruiser motorcycle without a rider, wide handlebars, teardrop fuel tank, worn leather saddlebags, chrome dulled by dust"),
    ("rower", "rower", (0.5, 1), None,
     "a generic steel-frame road bicycle without a rider, flat handlebars wrapped in tape, a small wire basket on the rear rack"),
    ("buggy", "buggy", (1, 2), (0.50, 0.03),
     "a generic open-frame dune buggy: welded tube roll cage, two bucket seats, exposed rear engine, fat off-road tyres, no body panels"),
    ("hammer", "hammer", (1.5, 3), (0.25, 0.03),
     "a generic wide military four-by-four utility vehicle with a flat bonnet and a roof hatch ring with no weapon on it, sand-coloured paint worn to primer, no markings"),
    ("ciezarowka", "ciezarowka", (2, 6), (0.10, 0.70),
     "a generic medium-duty American stake-bed cargo truck: conventional cab with a long bonnet at the front, a vertical exhaust stack behind the cab on the image-left side, an empty open cargo bed with low wooden sideboards"),
    ("wozStrazacki", "woz-strazacki", (2, 6), (0.90, 0.72),
     "a generic American fire engine pumper, faded red paint, a roof-mounted water monitor (deck gun) in the middle of the roof, rolled hose beds at the rear, an aluminium ladder along the top, no text or emblems"),
    ("buldozer", "buldozer", (2.5, 4), (0.40, 0.62),
     "a generic tracked crawler bulldozer: a wide curved steel blade across the front, an open operator cab with a roll-over frame, a vertical exhaust stack on the engine hood, a rear ripper tooth, flaking yellow paint"),
    ("czolg", "czolg", (2.5, 5), (0.50, 0.03),
     "a generic main battle tank in worn olive paint, no insignia: a central turret with the main gun pointing toward the bottom of the frame, side skirts over the tracks, engine deck grilles at the rear"),
    ("bwp", "bwp", (2, 4.5), (0.12, 0.70),
     "a generic tracked infantry fighting vehicle: a small turret with a slim autocannon pointing toward the bottom, roof hatches, a rear ramp door at the top of the frame, worn olive-drab paint, no insignia"),
    ("traktor", "traktor", (1.5, 2.5), (0.55, 0.68),
     "a generic American farm tractor: large rear wheels, small front wheels, an open seat under a roll-over frame, a vertical exhaust stack on the bonnet, rust-red paint gone chalky"),
    ("motorower", "motorower", (0.5, 1), (0.35, 0.06),
     "a generic small step-through moped without a rider, a scuffed plastic front shield, a milk crate tied to the rear rack"),
    ("deskorolka", "deskorolka", (0.5, 0.5), None,
     "a worn wooden skateboard seen from directly above, chipped grip tape, the long axis vertical in the frame, nose toward the bottom"),
]

WRECKS = [
    ("pojazd-jednoslad", (0.5, 1.5), "motorcycles, mopeds, bicycles and skateboards",
     "a burned-out motorcycle wreck lying flat: bent front forks, melted tyres, a scorched frame and a split fuel tank"),
    ("pojazd-osobowy", (1.5, 3), "sedans, utility four-by-fours and buggies",
     "a burned-out sedan shell: no glass, caved-in roof, bare wheel rims, scorched and rusted panels"),
    ("pojazd-ciezki", (2, 6), "buses, trucks, fire engines and tractors",
     "the burned-out chassis of a heavy truck: a gutted cab at the bottom of the frame, a bare ladder frame, blown-out tyres, buckled cargo bed"),
    ("pojazd-gasienicowy", (2.5, 5), "tanks, infantry fighting vehicles and bulldozers",
     "a knocked-out tracked armoured hull: a thrown track lying beside the hull, blackened plates, open hatches, a turret ring with no turret"),
]


def frame(cells):
    return [round(cells[0] * PX), round(cells[1] * PX)]


assets = []
for vid, slug, cells, rura, subject in VEHICLES:
    w, h = cells
    assets.append({
        "id": f"pojazdy/{slug}", "set": "pojazdy", "key": slug, "kind": "token",
        "output": f"tokens/pojazdy/{slug}.webp", "size": frame(cells), "fill": 94,
        "vehicle": vid, "cells": [w, h], "exhaust": list(rura) if rura else None,
        "subject": subject,
        "purpose": f"Top-down vehicle token, {w}x{h} grid squares (1.5 m each), front toward the bottom of the frame. "
                   "Seats, passenger dots and exhaust smoke are drawn over it by the module.",
    })
for slug, cells, used_for, subject in WRECKS:
    assets.append({
        "id": f"wraki/{slug}", "set": "wraki", "key": slug, "kind": "token",
        "output": f"tokens/wraki/{slug}.webp", "size": frame(cells), "fill": 94, "cells": list(cells),
        "subject": subject,
        "purpose": f"Replaces the token art of a destroyed vehicle ({used_for}); front toward the bottom. "
                   "Fitted inside the original footprint, so other aspect ratios get transparent margins.",
    })
for vid, slug, cells, rura, subject in VEHICLES:
    # Interior variants are delivered per vehicle; keep undelivered requests out of the catalog.
    interiors = {
        "osobowka": "The matching roof-hidden sedan: empty two-seat front row and three-seat rear bench.",
        "hammer": "The matching roof-hidden military utility truck: four seats, a central hatch station and an empty rear cargo floor.",
    }
    if vid not in interiors:
        continue
    assets.append({
        "id": f"wnetrza/{slug}", "set": "wnetrza", "key": slug, "kind": "token",
        "output": f"tokens/pojazdy/wnetrza/{slug}.webp", "size": frame(cells), "fill": 94,
        "vehicle": vid, "cells": list(cells),
        "subject": interiors[vid],
        "purpose": "Client-local interior view; identical frame and orientation to the closed token.",
    })
for vid, slug, cells, rura, subject in VEHICLES:
    assets.append({
        "id": f"portrety/{slug}", "set": "portrety", "key": slug, "kind": "portrait",
        "output": f"tokens/portraits/pojazd-{slug}.webp", "size": [1024, 1024], "vehicle": vid,
        "subject": subject,
        "purpose": "Actor portrait on the vehicle sheet and in the compendium: a three-quarter front view on the ground.",
    })

Path(__file__).with_name("catalog.json").write_text(
    json.dumps({"version": 1, "assets": assets}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(len(assets), "assets")
