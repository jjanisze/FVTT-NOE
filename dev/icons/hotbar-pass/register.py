"""Add the fifteen validated choices as five pending cards, preserving reviews."""
import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
REVIEW = ROOT / "dev/icons/review"
HERE = Path(__file__).resolve().parent

CANDIDATE_NOTES = {
    "kafar": ["Prostokątny ciężar udarowy z dwoma bocznymi uchwytami. Uderzenie wzdłuż osi narzędzia.",
        "Rurowy kafar ręczny: zamknięta góra, otwarty dół i dwa uchwyty.",
        "Ciężki fragment profilu szyny z dwoma uchwytami. Najbardziej dosłowny motyw kolejowy."],
    "unikanie": ["Odchylenie tułowia w tył; cios mija twarz.",
        "Zejście nisko pod ciosem, z osłoną głowy rękami.",
        "Unik tułowiem w bok, bez opuszczania pozycji."],
    "odstapienie": ["Krok wstecz z otwartymi dłońmi, twarzą do zagrożenia.",
        "Dwie osoby: cofający się człowiek pozostaje poza zasięgiem wyciągniętej ręki przeciwnika.",
        "Kontrolowany odwrót z gardą; człowiek nadal patrzy w stronę przeciwnika."],
    "przyspieszenie": ["Długi krok biegowy i wyraźna praca ramion.",
        "Niskie wybicie do przodu, podkreślone dwoma śladami ruchu.",
        "Bardziej wyprostowana sylwetka w szybkim kroku biegowym."],
    "ukrywanie-sie": ["Człowiek kuca za niską skrzynią.",
        "Człowiek chowa się za pionowym narożnikiem ściany.",
        "Niska sylwetka schowana za szeroką, uszkodzoną barierą."]
}


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    registration = HERE / "registration.json"
    assert not registration.exists(), "Already registered; retain newer GM feedback"
    frozen = read(HERE / "incoming.json")
    for item in frozen["productionFiles"]:
        assert sha(ROOT / item["source"]) == item["sha256"], "Production source changed"
    files = [REVIEW / name for name in ["manifest.json", "feedback.json", "style-feedback.json"]]
    missing_file = ROOT / "dev/icons/MISSING.md"
    before = {path: path.read_bytes() for path in [*files, missing_file]}
    manifest = read(files[0])
    existing = {item["id"]: item for item in manifest["items"]}
    grouped = defaultdict(list)
    for number in [115, 116]:
        here = REVIEW / f"candidates/batch-{number}"
        batch, valid = read(here / "batch.json"), read(here / "validated.json")
        assert valid["validatedMasks"] == len(batch["subjects"])
        for subject in batch["subjects"]:
            key = subject["key"]
            assert sha(here / f"{key}.png") == valid["candidateHashes"][key]
            grouped[subject["itemId"]].append((number, subject))
    cards = []
    for key, info in frozen["subjects"].items():
        item_id = f"hotbar-2026-{key}"
        assert item_id not in existing and item_id not in read(files[1])["items"]
        choices = grouped[item_id]
        assert len(choices) == 3
        cards.append({"id": item_id, "name": info["name"], "tier": "Player hotbar corrections · A / B / C",
            "batch": choices[0][0], "target": info["target"],
            "deliveryTargets": choices[0][1]["deliveryTargets"], "context": info["context"], "request": info["request"],
            "current": {"src": "/" + info["current"], "note": "Obecny / pożyczony rysunek z makiety, do porównania. Oryginalna grafika istoty zachowuje własne zastosowanie; nowe akcje człowieka dostaną osobne pliki." if key != "kafar" else "Obecny Kafar: odrzucony, ponieważ wygląda jak wielki młot."},
            "candidates": [{"id": f"batch{number}-{subject['key']}",
                "label": f"{subject['variant'].upper()} · {subject['name'].split(' — ')[-1]}",
                "src": f"candidates/batch-{number}/{subject['key']}.png",
                "note": CANDIDATE_NOTES[key][ord(subject["variant"]) - ord("a")]}
                for number, subject in choices]})
    assert len(cards) == 5
    for path, content in before.items():
        assert path.read_bytes() == content, "Queue or reviews changed during registration"
    manifest["items"].extend(cards)
    manifest.update(title="Player hotbar · 5 subjects / 15 candidates awaiting review", updated="2026-10-24")
    missing = before[missing_file].decode("utf-8").replace("\r\n", "\n")
    assert "<!-- player-hotbar-revision:start -->" not in missing
    assert re.search(r"\*\*Next batch number: 115\*\*", missing), "Next batch counter changed; reconcile before writing"
    missing = missing.replace("**Next batch number: 115**", "**Next batch number: 117**", 1)
    section = ["<!-- player-hotbar-revision:start -->", "## Player hotbar corrections — Batches 115–116", "",
        "Five subjects, three new candidates each, awaiting GM selection. Exact prompts,", 
        "source hashes and reference interpretation: `hotbar-pass/README.md` and", 
        "`review/candidates/batch-115/`, `review/candidates/batch-116/`.", "",
        "| Subject | Prospective target |", "|---|---|"]
    section += [f"| {info['name']} | `{info['target']}` |" for info in frozen["subjects"].values()]
    section += ["", "Player actions get dedicated glyphs; the creature artwork is not repurposed.",
        "No selected candidate is installed and the hotbar picture is not regenerated before review.",
        "<!-- player-hotbar-revision:end -->", ""]
    anchor = missing.index("<!-- icon-style-review:start -->")
    missing = missing[:anchor] + "\n".join(section) + "\n" + missing[anchor:]
    write(files[0], manifest)
    newline = "\r\n" if b"\r\n" in before[missing_file] else "\n"
    missing_file.write_text(missing, encoding="utf-8", newline=newline)
    for path in files[1:]:
        assert path.read_bytes() == before[path], "Existing feedback changed"
    assert all(next(item for item in read(files[0])["items"] if item["id"] == key) == value for key, value in existing.items())
    write(HERE / "manifest-items.json", {"items": cards})
    write(registration, {"date": "2026-10-24", "cards": 5, "candidates": 15,
        "existingCardsPreserved": len(existing), "feedbackUnchanged": True, "productionUnchanged": True,
        "beforeHashes": {path.name: hashlib.sha256(content).hexdigest() for path, content in before.items()}})
    print(f"Registered 5 cards with 15 candidates; preserved {len(existing)} earlier cards, all feedback and production art.")


if __name__ == "__main__":
    main()
