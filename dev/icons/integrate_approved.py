"""Wire the final approved art using a checked source-only coverage snapshot."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = ROOT / "dev/icons"
FILES = ["scripts/config/sztuczki-data.mjs", "dev/packs/build-packs.mjs", "scripts/production/wynik.mjs",
         "scripts/items/toolkit-medyk.mjs", "scripts/config/conditions.mjs"]


def digest(value):
    return hashlib.sha256(value).hexdigest()


def main(apply=False):
    report = json.loads((HERE / "module-coverage-2026-10-17.json").read_text(encoding="utf-8"))
    assert not subprocess.check_output(["git", "status", "--porcelain", "--", *FILES], cwd=ROOT).strip(), "Shared wiring targets must be clean"
    originals = {file: (ROOT / file).read_bytes() for file in FILES}
    edits = {file: value.decode("utf-8").replace("\r\n", "\n") for file, value in originals.items()}
    used = set()

    def check_icon(relative):
        source = (ROOT / relative).resolve()
        assert source.is_relative_to(ROOT / "icons") and source.is_file() and source.suffix == ".svg", relative
        used.add(relative)

    def replace(file, before, after):
        assert edits[file].count(before) == 1, f"Expected a unique integration anchor in {file}"
        edits[file] = edits[file].replace(before, after, 1)

    sztuczki = {}
    for item in report["sztuczki"]:
        icon = next(file for file in item["existingArt"] if file.startswith("icons/abilities/"))
        check_icon(icon)
        sztuczki[item["id"]] = Path(icon).name
    assert len(sztuczki) == 53
    anchor = 'const MODULE_ID = "neuroshima-2026-overrides";'
    table = "\n\n/** Approved native art; rule IDs retain their original spelling. */\nconst SZTUCZKA_ICONS = Object.freeze({\n"
    table += ",\n".join(f"  {json.dumps(key)}: {json.dumps(icon)}" for key, icon in sorted(sztuczki.items())) + "\n});"
    replace(FILES[0], anchor, anchor + table)
    replace(FILES[0], '    img: "icons/svg/upgrade.svg",',
        '    img: SZTUCZKA_ICONS[key] ? `modules/${MODULE_ID}/icons/abilities/${SZTUCZKA_ICONS[key]}` : "icons/svg/upgrade.svg",')

    bestiary = {}
    fallbacks = [item for item in report["bestiary"] if item["needsWiring"]]
    for item in fallbacks:
        icon = item["existingArt"][0]
        check_icon(icon)
        creature = "towarzysz-" + item["creatureId"] if item["scope"] == "companion" else item["creatureId"]
        key = f"{creature}.{item['id']}"
        assert key not in bestiary or bestiary[key] == icon, "Conflicting duplicate bestiary action ID"
        bestiary[key] = icon
    assert len(fallbacks) == 91 and len(bestiary) == 89
    anchor = "const BESTIARY_ITEM_ICONS = Object.freeze({"
    table = "\n  // Existing approved art for remaining bestiary and companion actions.\n"
    table += "\n".join(f"  {json.dumps(key)}: `modules/${{MODULE_ID}}/{icon}`," for key, icon in sorted(bestiary.items()))
    replace(FILES[1], anchor, anchor + table)

    fuel = {"paliwo-dobre": "paliwo_dobre.svg", "paliwo-przecietne": "paliwo_przecietne.svg", "paliwo-chrzczone": "paliwo_chrzczone.svg"}
    for file in fuel.values():
        check_icon("icons/items/loot/" + file)
    anchor = "const RAW_IKONY = Object.freeze({"
    replace(FILES[2], anchor, anchor + "\n" + "\n".join(f"  {json.dumps(key)}: {json.dumps(file)}," for key, file in fuel.items()))
    check_icon("icons/items/loot/uzupelnienie_medyka.svg")
    replace(FILES[3], 'const REFILL_IMG = "icons/svg/heal.svg";',
        'const REFILL_IMG = "modules/neuroshima-2026-overrides/icons/items/loot/uzupelnienie_medyka.svg";')
    replace(FILES[3], '// TODO(icons): no dedicated art commissioned yet — core Foundry heal icon as an honest interim\n'
        '// placeholder (same "not a finished-art claim" role `hazard.svg` plays for gear-data.mjs\'s own\n'
        '// TODO stubs), rather than borrowing Medpak\'s specific icon and risking two different items\n'
        '// reading as the same thing in an inventory list that could plausibly hold both at once.',
        '// Approved refill-kit art stays distinct from Medpak\'s treatment icon.')
    check_icon("icons/statuses/wylaczony.svg")
    replace(FILES[4], '  wylaczony: {\n    name: "Wyłączony",\n    img: "icons/svg/lightning.svg",',
        '  wylaczony: {\n    name: "Wyłączony",\n    img: `${OWN}/wylaczony.svg`,')

    encoded = {file: value.replace("\n", "\r\n" if b"\r\n" in originals[file] else "\n").encode("utf-8") for file, value in edits.items()}
    for file in FILES:
        assert (ROOT / file).read_bytes() == originals[file], "Shared source changed during integration preflight"
    result = {"date": "2026-10-17", "sztuczkiWired": len(sztuczki), "bestiaryAndCompanionEntriesWired": len(fallbacks),
        "distinctExactBestiaryKeys": len(bestiary), "fuelGradesWired": 3, "medicRefillWired": True, "disabledStatusWired": True,
        "referencedArtFilesVerified": len(used), "packBuildRun": False, "liveDocumentsChanged": False,
        "files": [{"source": file, "beforeSha256": digest(originals[file]), "afterSha256": digest(encoded[file])} for file in FILES],
        "sztuczki": sztuczki, "bestiaryAndCompanions": bestiary, "fuel": fuel}
    if apply:
        for file in FILES:
            (ROOT / file).write_bytes(encoded[file])
        (HERE / "integration-2026-10-17.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in result.items() if key not in ("files", "sztuczki", "bestiaryAndCompanions", "fuel")}, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    main(parser.parse_args().apply)
