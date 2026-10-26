"""Author the sparse foreground revision in the three editable chase catalogs."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


def atlas(key, names, heights, regions=None):
    regions = regions or [[0, 0, .5, .5], [.5, 0, 1, .5], [0, .5, .5, 1], [.5, .5, 1, 1]]
    return {"file": key + ".webp", "role": "atlas", "sprites": [
        {"name": name, "height": height, "crop": .92, "alpha": 1, "region": region}
        for name, height, region in zip(names, heights, regions)
    ]}


def write(folder, update):
    path = ROOT / "dev/art" / folder / "catalog.json"
    catalog = json.loads(path.read_text(encoding="utf8"))
    update(catalog)
    path.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf8")


def winter(c):
    c["groups"]["buildings"] = ["brick-windows", "concrete-portal", "shopfront", "steel-bay",
                                "gas-canopy", "fire-escape", "broken-floor", "timber-windows"]
    small = ["winter-streetlight", "winter-directions", "winter-traffic-light", "winter-sign-frame"]
    c["groups"]["structures"] = small
    c["assets"]["winter-street-props"] = atlas("winter-street-props", small, [330, 280, 260, 260])
    c["foreground"]["plants"]["stride"] = 2800
    c["foreground"]["structures"] = {"rate": 2.2, "stride": 4200, "tint": 0x8A96A3, "blur": 1.1}
    c["foreground"]["buildings"] = {"rate": 2.9, "stride": 24000, "chance": .65,
                                    "yOffset": [160, 480], "tint": 0x69717D, "blur": 2.3}


def urban(c):
    for region in c["regions"]:
        c["assets"].pop("district-" + region, None)
        key = "skyline-" + region + "-v3"
        c["assets"][key] = {"file": key + ".webp", "role": "hill", "cutout": True}
    c["groups"]["landscapes"] = {
        "suburb": ["skyline-suburb-v3", "skyline-commercial-v3"],
        "mall": ["skyline-mall-v3", "skyline-suburb-v3", "skyline-commercial-v3"],
        "commercial": ["skyline-commercial-v3", "skyline-mall-v3", "skyline-suburb-v3"],
        "city": ["skyline-city-v3", "skyline-commercial-v3", "skyline-mall-v3"]
    }
    c["assets"]["sky-ash-v3"] = {"file": "sky-ash-v3.webp", "role": "backdrop"}
    c["backdrop"] = "sky-ash-v3"
    c["landscapeMode"] = "opaque-cutouts"
    names = ["large-brick-windows", "large-concrete-portal", "large-diner", "large-loading-bay"]
    c["groups"]["buildings"] = names
    c["assets"]["large-ruins-v3"] = atlas("large-ruins-v3", names, [650, 700, 640, 680],
        [[0, 0, .5, .51], [.51, 0, 1, .51], [0, .51, .532, 1], [.535, .51, 1, 1]])
    c["foreground"] = {
        "plants": {"rate": 1.28, "stride": 2600, "tint": 0xB3B7B1, "blur": .35},
        "structures": {"rate": 1.9, "stride": 3600, "tint": 0x989B96, "blur": .8},
        "buildings": {"rate": 2.6, "stride": 26000, "chance": .65,
                      "yOffset": [170, 470], "tint": 0x747977, "blur": 2.3}
    }


def nevada(c):
    names = ["desert-garage", "desert-shack", "desert-gas-canopy", "desert-motel"]
    c["groups"]["buildings"] = names
    c["assets"]["desert-buildings-v3"] = atlas("desert-buildings-v3", names, [620, 580, 620, 580],
        [[0, 0, .545, .5], [.565, 0, 1, .5], [0, .5, .525, 1], [.525, .5, 1, 1]])
    c.setdefault("foreground", {})["buildings"] = {"rate": 2.5, "stride": 36000, "chance": .65,
        "yOffset": [160, 430], "tint": 0xA89A84, "blur": 2.0}


write("poscig-winter", winter)
write("poscig-urban", urban)
write("poscig-nevada", nevada)
