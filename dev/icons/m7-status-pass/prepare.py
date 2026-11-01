"""Freeze ten new M7 status briefs; leave shipped art and saved reviews intact."""
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
REVIEW = ROOT / "dev/icons/review"
HERE = Path(__file__).resolve().parent
DATE = "2026-11-01"

SUBJECTS = [
    ("reakcja", "Reakcja zużyta", "reakcja", "icons/svg/lightning.svg",
     "Reakcja zużyta; wraca na początku następnej tury właściciela. Nie jest Unikaniem.",
     "ONE stout diagonal LIGHTNING BOLT with ONE separate large CHECK MARK at its lower right. A compact two-part spent-reaction marker. Wide black gap between bolt and check. No human, dodging pose, shield, clock or extra marks."),
    ("akcja-bonusowa", "Akcja bonusowa zużyta", "akcjaBonusowa", "icons/svg/clockwork.svg",
     "Akcja bonusowa zużyta w tej turze. Odrębny znacznik od Reakcji.",
     "ONE broad FIVE-POINT STAR with ONE separate large CHECK MARK at its lower right. A compact two-part spent-bonus-action marker. Wide black gap between star and check. Star has a solid broad center, five short points. No plus sign, medical cross, lightning bolt, sparkles or extra stars."),
    ("stanowisko-snajperskie", "Stanowisko snajperskie", "stanowiskoSnajperskie", "icons/svg/target.svg",
     "Strzelec po pięciu rundach mierzenia: stanowisko strzeleckie, zasięg x3; znika po ruchu. Nie cel ani celownik na przeciwniku.",
     "ONE scoped RIFLE resting horizontally ON TWO BROAD SANDBAGS, viewed from the side. Short stout scope visibly above the receiver, stock at left and complete barrel at right; sandbags form a low stable firing rest beneath it. Three large black separating cuts maximum. Compact sniper-position silhouette, no person, crosshair, target, reticle, scenery, tiny bipod or loose cartridges."),
    ("krwawienie-hemofilia", "Krwawienie — Hemofilia", "krwawienieHemofilia", "systems/dnd5e/icons/svg/statuses/bleeding.svg",
     "Chorobowe krwawienie; symbol krwi i komórek, bez rany ciętej.",
     "ONE broad upright BLOOD DROP containing THREE LARGE ROUND BLACK CUTOUTS arranged loosely like blood cells: two above, one below, with thick white bridges between. Smooth outer teardrop, pointed top. No cut wound, slash, teeth, bullet hole, medical cross or tiny dots."),
    ("krwawienie-podstepny", "Krwawienie — Podstępny atak", "krwawieniePodstepny", "icons/svg/blood.svg",
     "Rana cięta po Podstępnym ataku, 1k8 na turę. Musi różnić się od dum-dum.",
     "ONE bold DIAGONAL CUT-WOUND SYMBOL: two thick tapered white lips separated by ONE wide diagonal black slash, with TWO LARGE WHITE BLOOD DROPS hanging BELOW the cut. Abstract non-graphic wound glyph, no flesh, weapon, large enclosing teardrop, round bullet hole or fine scratches."),
    ("krwawienie-tetnica", "Krwawienie — Tętnica", "krwawienieTetnica", "icons/svg/degen.svg",
     "Przycelowanie: przecięta tętnica, utrata 1k6 PW na turę. Wyraźny tryskający strumień.",
     "A bold SPURTING BLOOD SYMBOL: ONE short broad severed VESSEL STUMP at the bottom, with THREE THICK CURVED JETS fanning UPWARD and outward and ending in large rounded drop tips. Very broad black gaps between the three jets. No hand, flower, tree, fountain basin, enclosing teardrop or tiny splash dots."),
    ("krwawienie-kolory", "Krwawienie — Rdza / Rtęć / Stal", "krwawienieKolory", "icons/svg/acid.svg",
     "Lekkie krwawienie od Stopnia Zranienia, utrata 1 PW na turę. Najprostsza, pojedyncza kropla.",
     "Exactly ONE SMALL SIMPLE SOLID BLOOD DROP: smooth broad teardrop silhouette with a pointed top and rounded bottom. No internal holes, cuts, highlights, slash, secondary drops or other elements. It occupies about HALF the height of its cell; generous black margins."),
    ("krwawienie-pila", "Krwawienie — Piły Juggernauta", "krwawieniePila", "icons/svg/hazard.svg",
     "Rana po pile tarczowej Juggernauta, 1k4 na turę do opatrzenia. Zębaty obrys.",
     "ONE large upright BLOOD DROP with a pointed smooth top and SIX LARGE SAW TEETH cut into the LOWER OUTER EDGE. Thick broad solid white center; angular coarse sawtooth lower silhouette is unmistakable. No cog wheel, circular saw disk, internal hole, wound slash or tiny teeth."),
    ("krwawienie-dumdum", "Krwawienie — Dum-dum", "krwawienieDumdum", "icons/svg/explosion.svg",
     "Osobne krwawienie WKK od pocisku dum-dum; może współistnieć z Podstępnym atakiem. Duży otwór postrzałowy.",
     "ONE broad upright BLOOD DROP with ONE LARGE JAGGED BLACK BULLET HOLE punched through its center. Hole is a single roughly round aperture with FIVE coarse irregular notches, occupying nearly half the width of the drop. Smooth outer edge. No diagonal cut, tiny cracks, weapon, bullet, extra holes or saw teeth on the outer edge."),
    ("wyciek", "Wyciek hydrauliczny", "wyciek", "icons/svg/barrel.svg",
     "Przycelowanie: uszkodzona hydraulika maszyny, utrata 1k6 PW na turę do naprawy. Symbol techniczny, nie rana.",
     "ONE BROKEN RIGHT-ANGLE HYDRAULIC PIPE in side view with ONE LARGE OIL DROP falling from its open downward-facing end. Thick metal pipe silhouette, one stout coupling, ONE broad black inner channel cut, jagged broken pipe mouth. Drop is separate below with a wide black gap. Compact complete mechanical-leak symbol; no blood cells, wound, person, oil can, cog wheel, text or extra droplets.")
]
COMMON = """Use case: logo-brand. Create ONE square 3-by-3 ATLAS of tiny virtual-tabletop STATUS GLYPHS. Image 1 is a STYLE AND FORMAT reference only; do not copy its subjects. Exactly NINE equal square cells, strict row-major order. No drawn grid, cell lines, labels or text. PURE SOLID WHITE silhouettes on a perfectly clean PURE BLACK background. No grey, color, shading, gradients, highlights, outlines, hatching, distressed texture, speckles, letters, numerals, frame or watermark. Match the reference's broad sober stencil silhouettes and wide black negative spaces, but simplify for 16-24 px token-status display. Each glyph complete and centered inside its own cell, at most 70 percent of its cell width and height; nothing crossing a cell boundary. Few large elements, chunky shapes; no decorative details. Abstract game symbols only, no realistic injuries or flesh.
EXACT ROW-MAJOR CONTENTS:
"""

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def main():
    folders = [REVIEW / f"candidates/batch-{number}" for number in (121, 122)]
    assert not any(p.exists() for p in folders), "Batch exists; preserve its candidates"
    reference = REVIEW / "candidates/batch-120/raw/style-reference.png"
    all_subjects = []
    for key, name, status, fallback, context, request in SUBJECTS:
        target = f"icons/statuses/{key}.svg"
        assert not (ROOT / target).exists() and not (ROOT / target).with_suffix(".webp").exists(), target
        all_subjects.append(dict(key=key, name=name, itemId=f"m7-status-{key}", kind="status",
            statusId=status, fallback=fallback, context=context, request=request, target=target,
            deliveryTargets=[dict(source=target, sourceSha256=None, variant="default")]))
    snapshot = dict(date=DATE, sourceCode={p: sha(ROOT/p) for p in (
        "scripts/config/conditions.mjs", "scripts/config/krwawienia-data.mjs", "scripts/wkk/combat/bleeding.mjs")},
        reviewHashes={p: sha(REVIEW/p) for p in ("manifest.json", "feedback.json", "style-feedback.json")},
        previousCards=json.loads((REVIEW/"manifest.json").read_text(encoding="utf-8"))["items"],
        expectedAbsent=[s["target"].removesuffix(".svg")+ext for s in all_subjects for ext in (".svg", ".webp")],
        styleReference=dict(source="dev/icons/review/candidates/batch-120/raw/style-reference.png", sha256=sha(reference)))
    write(HERE/"incoming.json", snapshot)
    for number, subjects in ((121, all_subjects[:9]), (122, all_subjects[9:])):
        folder = REVIEW / f"candidates/batch-{number}"
        (folder/"raw").mkdir(parents=True)
        shutil.copyfile(reference, folder/"raw/style-reference.png")
        for i, s in enumerate(subjects, 1):
            s["cell"] = i
        batch = dict(date=DATE, batch=number, passName="m7-status-glyphs", subjects=subjects)
        prompt = COMMON + "\n".join(f"CELL {s['cell']}: {s['request']}" for s in subjects)
        if len(subjects) < 9:
            batch.update(partialAtlas=True, emptyCells=list(range(len(subjects)+1, 10)))
            prompt += "\nCELLS 2 THROUGH 9: COMPLETELY EMPTY PURE BLACK. No filler, duplicates, marks or ornaments."
        prompt += "\nPreserve the exact cell order and black separation."
        write(folder/"batch.json", batch)
        write(folder/"prompts.json", dict(tool="OpenAI built-in image_gen", model=None,
            reference="raw/style-reference.png", role="Style reference only", atlas=prompt, targetedCorrections=[]))
        write(folder/"incoming.json", dict(date=DATE, expectedAbsent=[s["target"].removesuffix(".svg")+ext
            for s in subjects for ext in (".svg", ".webp")], styleReferenceSha256=sha(reference)))
    print("Frozen batches 121 (9 glyphs) and 122 (hydraulic leak). Shipped art, code and reviews unchanged.")

if __name__ == "__main__":
    main()
