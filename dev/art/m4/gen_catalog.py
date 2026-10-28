"""Write catalog.json for the M4 vehicle art from one table (the packer reads only catalog.json)."""
import json
from pathlib import Path

PX = 300  # pixels per 1.5 m grid square for vehicles (see README: why not 400)

# id, file slug, footprint (cells: width x length), exhaust (x, y) as fractions of the frame or None, subject
VEHICLES = [
    ("osobowka", "osobowka", (1.5, 3), (0.30, 0.03),
     "a generic late-1980s American four-door sedan, sun-faded paint, rust on the wheel arches, one mismatched grey door, a roof rack with a tarp-wrapped bundle strapped down"),
    ("autobus", "autobus", (2, 8), (0.78, 0.02),
     "a generic American city transit bus with a New Look-inspired rounded, raked panoramic windshield visible from overhead, faded cream-and-teal paint, plywood over two rear side windows, patched roof with two closed hatches"),
    ("motocykl", "motocykl", (0.5, 1.5), (0.30, 0.05),
     "a generic heavy American cruiser motorcycle without a rider, wide handlebars, teardrop fuel tank, worn leather saddlebags, chrome dulled by dust"),
    ("rower", "rower", (0.6, 1.5), None,
     "a generic steel-frame road bicycle without a rider, flat handlebars wrapped in tape, a small wire basket on the rear rack"),
    ("buggy", "buggy", (1.4, 2.8), (0.50, 0.035),
     "a generic open-frame dune buggy: welded tube roll cage, two bucket seats, exposed rear engine, fat off-road tyres, no body panels"),
    ("hammer", "hammer", (1.5, 3), (0.25, 0.03),
     "a generic wide military four-by-four utility vehicle with a flat bonnet and a roof hatch ring with no weapon on it, sand-coloured paint worn to primer, no markings"),
    ("ciezarowka", "ciezarowka", (2, 6), (0.115, 0.60),
     "a generic medium-duty American stake-bed cargo truck: conventional cab with a long bonnet at the front, a vertical exhaust stack behind the cab on the image-left side, an empty open cargo bed with low wooden sideboards"),
    ("wozStrazacki", "woz-strazacki", (2, 5.5), (0.242, 0.43),
     "a generic American cab-over fire pumper matching its portrait: faded red and cream five-seat cab (40 percent length), a recessed narrower pump panel (15 percent), rear hose storage (45 percent), short right-side ladder confined to the rear body, four protruding tyres and a raked windshield, no text or emblems"),
    ("buldozer", "buldozer", (2.5, 4), (0.451, 0.538),
     "a generic tracked crawler bulldozer: two steel tracks, a wide curved steel blade across the front, an open rear platform with a main operator seat and smaller helper perch side by side, a protective roll frame without roof or glazing, a vertical exhaust on the engine hood, one rear ripper tooth, flaking yellow paint"),
    ("czolg", "czolg", (2.6, 5.6), (0.50, 0.047619),
     "an M1A1 Abrams in weathered desert-tan paint: wedge-front turret, rear bustle rack, seven wheels per track, centered driver, commander behind gunner on vehicle-right, loader vehicle-left, rear turbine grille; front and complete long barrel down"),
    ("bwp", "bwp", (2.4, 4.5), (0.165278, 0.731852),
     "an M2A2 Bradley infantry fighting vehicle: angular two-person turret offset toward image-left, distinctive side pod on image-right, slim projecting front detail, one driver hatch image-right and engine grille image-left; six rear passengers, weathered olive paint, no insignia"),
    ("traktor", "traktor", (1.5, 2.5), (0.567, 0.499),
     "a generic American farm tractor: large rear wheels, small front wheels, an open central driver's seat and a passenger cushion on the left mudguard, a roll-over hoop without a canopy, a vertical exhaust stack on the bonnet, rust-red paint gone chalky"),
    ("motorower", "motorower", (0.6, 1.56), (0.25, 0.18),
     "a small vintage step-through commuter moped, faded turquoise frame, ivory leg shield, one black saddle, empty rust-red milk crate strapped to the rear rack, two narrow wheels, no rider"),
    ("deskorolka", "deskorolka", (0.6, 0.72), None,
     "a worn maple street skateboard directly overhead, black grip tape, pale laminate edges, four dirty ivory wheels and a small gray duct-tape repair near the lower front nose"),
]

# One recognizable wreck per vehicle. Keep the approved sedan's original filename.
WRECKS = [(vid, "pojazd-" + ("osobowy" if vid == "osobowka" else slug), cells, subject)
          for vid, slug, cells, _, subject in VEHICLES]


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
for vid, slug, cells, subject in WRECKS:
    assets.append({
        "id": f"wraki/{slug}", "set": "wraki", "key": slug, "kind": "token",
        "output": f"tokens/wraki/{slug}.webp", "size": [780, 2100] if vid == "czolg" else frame(cells),
        "fill": 94, "cells": list(cells), "vehicle": vid,
        "subject": "The destroyed, burned-out, rusted mechanical wreck of " + subject,
        "purpose": "Individual wreck derived from this vehicle's accepted token; front down. "
                   "Preserve its full canvas, footprint and texture transform, including barrel overhang. "
                   "No people, flames, smoke or ground; damaged turret baked into armored wrecks.",
    })
for vid, slug, cells, rura, subject in VEHICLES:
    # Interior variants are delivered per vehicle; keep undelivered requests out of the catalog.
    interiors = {
        "czolg": "Matching M1A1 Abrams cutaway: centered front driver and three turret crew around a central gray assembly, commander behind gunner on image-left and loader on image-right. Covered rear engine deck. Full frame retains transparent space where the barrel overhang was removed.",
        "bwp": "The matching roof-hidden M2A2 Bradley: one front-left driver (image-right), two turret-basket seats and six rear dismounts on opposite inward-facing benches, three per side; no center seats. Remove the upper hull roof and turret assembly.",
        "autobus": "The matching roof-hidden city bus: exactly one driver, five rows of four passenger seats, center aisle and empty rear utility floor. All upper glazing and pillars removed.",
        "osobowka": "The matching roof-hidden sedan: empty two-seat front row and three-seat rear bench.",
        "hammer": "The matching roof-hidden military utility truck: four seats, a central hatch station and an empty rear cargo floor.",
        "ciezarowka": "The matching roof-hidden stake-bed truck: three cab seats, all glazing and upper pillars removed, the same empty open wooden cargo bed.",
        "wozStrazacki": "The matching roof-hidden fire pumper: five empty cab seats in rows of three and two, all upper glazing and pillars removed; exactly the same open water-monitor platform, ladder, hoses and exterior.",
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

# Separated, registered Bradley layers. Preserve the authored crop and clear margins.
for aset,size,subject in [
    ("kadluby",[720,1350],"M2A2 Bradley armored hull without the turret, bearing center at source pixel 300,790."),
    ("wieze",[495,627],"The exact extracted Bradley turret, transparent crop at 81,586 in its 720x1350 frame; pivot 219,204 within this crop.")
]:
    assets.append({"id":f"{aset}/bwp","set":aset,"key":"bwp","kind":"token",
        "output":f"tokens/pojazdy/{aset}/bwp.webp","size":size,"fill":94,
        "vehicle":"bwp","subject":subject,"purpose":"Registered art layer; not a standalone vehicle token.","lossless":True})

for aset,size,subject in [
    ("kadluby",[780,2100],"M1A1 Abrams covered hull without turret. The hull viewport is 780x1680; full image reserves the forward barrel overhang."),
    ("wieze",[638,1588],"M1A1 Abrams separate turret and full barrel. Crop 70,458 in the 780x2100 art frame; bearing axis 389,884, local pivot 319,426.")
]:
    assets.append({"id":f"{aset}/czolg","set":aset,"key":"czolg","kind":"token",
        "output":f"tokens/pojazdy/{aset}/czolg.webp","size":size,"fill":76 if aset=="kadluby" else 94,
        "vehicle":"czolg","subject":subject,"purpose":"Registered art layer; not a standalone vehicle token.","lossless":True})

# Abrams uses a hull-sized footprint and width fit. Its art includes the barrel overhang.
for asset in assets:
    if asset.get("vehicle")=="czolg" and asset["set"] in ("pojazdy","wnetrza"):
        asset["size"]=[780,2100]
        asset["fill"]=76 if asset["set"]=="wnetrza" else 94
        asset["purpose"]+=" Hull viewport 780x1680, fit width, anchor 0.5/0.4; the full frame includes forward overhang."

# These pairs share exact exterior pixels. Independent lossy encodes can
# alter matching regions, so preserve the composited RGBA samples verbatim.
for asset in assets:
    if asset["id"] in ("pojazdy/ciezarowka", "wnetrza/ciezarowka", "pojazdy/autobus", "wnetrza/autobus",
                        "pojazdy/woz-strazacki", "wnetrza/woz-strazacki", "pojazdy/bwp", "wnetrza/bwp", "pojazdy/czolg", "wnetrza/czolg"):
        asset["lossless"] = True

Path(__file__).with_name("catalog.json").write_text(
    json.dumps({"version": 1, "assets": assets}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(len(assets), "assets")
