"""Freeze eight saved revisions and ten fresh subjects; never rerun."""
import hashlib
import json
from PIL import Image
from prepare_70_71 import GENERAL, ROOT, REVIEW, read, write, sha

DATE = "2026-10-16"
MOTIFS = {
    "nie-do-zdarcia": "ENTIRELY NEW CONCEPT replacing both earlier ideas. ONE large SLEDGEHAMMER HEAD SHATTERS against the FOREHEAD of ONE UNINJURED generic ADULT shown in natural side-profile head and shoulders. The adult remains completely calm, eyes open with one simple eye cut, smooth ordinary jaw, no beard. Exactly TWO broad hammer-head PIECES: one broken piece still attached to the complete handle entering diagonally from above-left; the other flies away above-right. One broad angular impact wedge only. The person's forehead and skin stay INTACT and UNMARKED: supernatural resilience breaks the hammer instead. Broad sober white stencil, clear black gaps, no bullet-deflecting arm, bandages, exposed organs, blood, wound, gore, anime or gruff portrait.",
    "reputacja": "ENTIRELY NEW CONCEPT. ONE sturdy metal MERCENARY SERVICE DOG TAG with clipped corners and ONE large bold CHECKMARK cut into its blank face. One short broad chain LOOP passes through the top hole; simplify into a continuous loop, no tiny individual links. TWO thick plain COINS overlap beside the tag's lower edge. Successful completed work earns better pay. Compact coherent flat stencil with broad black gaps. NO HANDSHAKE, hands, person, book, written contract, letters, numerals, currency signs, star or tiny engraving.",
    "rutyna": "NEW CONCEPT requested: ONE generic adult SOLDIER CRAWLING calmly UNDER BARBED WIRE AND GUNFIRE. Complete natural full body in side view facing RIGHT: belly low, one forearm braced ahead, other elbow under torso, one knee drawn up and other leg trailing. Plain helmet, minimal smooth face and one calm UNFAZED eye/brow cut, no grimace or beard. ONE thick strand of barbed wire crosses ABOVE the back with just THREE large cross-shaped barbs, and TWO broad bullet streaks pass above that wire. Keep wire/streaks separate from the intact body. Sober practical clothes, broad black gaps; no wound, blood, firing instruction, extra limbs, anime or fine equipment.",
    "rzeznik": "NEW CONCEPT requested, shown BEFORE CONTACT and NON-GRAPHIC. ONE generic adult TARGET'S upper torso at RIGHT with one arm raised high. ONE attacker's bare HAND enters from upper-left and HOLDS UP that raised WRIST. The attacker's OTHER bare hand is a complete CLENCHED FIST drawn back at lower-left, poised toward the target's exposed UNDERARM below the raised shoulder. The attacker is represented ONLY by those two hands and short forearms, no second head. Target has one smooth small head and natural joined neck/shoulder/elbow. Clear black separation identifies each arm, holding hand and poised fist. No cleaver, weapon, impact, injury, blood, wound, exposed anatomy, gore or tiny face detail.",
    "rzuc-bron-i-gleba": "REVISION of reference cell 5. KEEP THE EXISTING PRONE ADULT in the EXACT SAME pose and KEEP their SEPARATE DROPPED PISTOL ON THE GROUND unchanged. Change ONLY the large STOP PALM at left into ONE complete BARE HAND gripping ONE plain SEMIAUTOMATIC PISTOL aimed diagonally DOWN-RIGHT TOWARD the prone person. Natural fingers around the grip, thumb coherent, straight index finger outside the trigger guard along the frame; complete slide, barrel and empty guard. Same prone figure and ground weapon remain fully visible with broad black gaps. Exactly two pistols total, one held and one dropped. No firing, muzzle flash, blood, injury, extra person, text or anime.",
    "samouk": "ENTIRELY NEW CONCEPT with NO BOOK. ONE smooth generic ADULT HUMAN HEAD AND SHORT NECK in right-facing profile, ordinary natural adult nose and jaw, no hair texture or beard. ONE large clear DIAGONAL WRENCH SHAPE is cut in BLACK NEGATIVE SPACE INSIDE the cranium, showing practical knowledge acquired by oneself. Keep wrench complete: broad open jaw at upper-right, thick shaft and circular handle end at lower-left. The head remains a solid compact white silhouette around the wrench, with thick white bridges and no exposed anatomy. No extra object, lightbulb, page, writing, cog, detailed face, anime or gruff survivor bust.",
    "saper": "NEW CONCEPT requested: TWO complete BARE ADULT HANDS dexterously THREADING ONE large SEWING NEEDLE. Left hand pinches the needle upright just below its broad eye; right hand precisely feeds ONE thick curved THREAD through that eye. Clear natural thumb/index pinches, remaining fingers folded coherently, short wrists. Enlarge needle eye and thread into BROAD STENCIL SHAPES so the precise task reads at small size. One needle, one continuous thread, two hands. No padlock, key, die, book, explosive, injury, fine hairline filament, extra fingers, text or numerals.",
    "serwisowanie": "REVISION of reference cell 8. Preserve ONE sturdy handheld RADIO, its single antenna, tuning knob, two speaker slots and complete SOLDERING IRON. MOVE THE SERVICE OPENING FROM THE SIDE TO THE UNDERSIDE OF THE RADIO. Tilt the radio slightly into a simple three-quarter view so its BOTTOM PLANE is clearly visible. A single broad rectangular hatch on that BOTTOM face hinges DOWNWARD; the soldering tip approaches the bottom opening from lower-right. All vertical side panels remain SOLID AND CLOSED. Not a lower side or front door. Broad structural cuts and coherent device geometry, no tiny circuitry, labels, numbers, extra antenna or person.",
    "skuteczny-cios": "ONE powerful bare CLENCHED FIST strikes against ONE opposing BARE HAND'S WRIST, making that hand release ONE complete short KNIFE that drops below. Two complete natural wrists, coherent thumb/fingers, one short broad impact wedge between fist and wrist. Effective melee blow disarms an opponent. Broad black gaps separate fist, open hand and intact dropped blade. No person, face, severed limb, wound, blood, gore, extra hands or fine fingernails.",
    "slang": "TWO smooth generic ADULT HEADS AND SHORT NECKS in profile facing each other, having a casual STREET CONVERSATION. The speaker on LEFT holds ONE plain CIGARETTE between two bare fingers low beside the chin; TWO short broad speech strokes point toward the listener. Natural adult proportions, minimal face cuts, no beard or gruff portrait. No smoke cloud, lettering, named gang signs, speech-bubble text, book, handshake, anime or tiny hair detail. Clear black gaps between heads and coherent small hand.",
    "smakuje-jak-arszenik": "ONE broad sturdy SHIELD outline containing ONE large CHEMICAL DROPLET with a simple BLACK SKULL symbol cut inside it. Droplet, shield and skull have thick coherent white bridges and generous negative space. Resistance to toxins and acid, sober compact protection emblem. Skull is one plain oval, two broad eye holes and a block jaw, no tiny teeth. No human face, poison instructions, writing, labels, numerals, extra bottles, blood or gore.",
    "sokole-oko": "ONE large realistic FALCON EYE in a compact SIDE-PROFILE PATCH: a broad swept avian brow and two simple feather-edge cuts frame one natural round iris. ONE broad CROSSHAIR centered on the pupil conveys exceptional aim. Sober sharp bird anatomy, complete eye, restrained black negative space, no full bird body or extra target rings. No anime human eye, lashes, human face, tiny feather texture, writing or numerals.",
    "solowa": "ONE plain generic ADULT in a confident full-body fighting stance on LEFT, one open bare hand BECKONING toward ONE smaller generic opponent on RIGHT. The beckoning hand is raised at chest level, fingers curling inward once; other arm hangs ready at side. Opponent faces the challenger, hands raised defensively. Exactly two natural adult bodies with smooth featureless heads and plain clothes, complete limbs, broad black separation. A one-on-one challenge, no crowd, portrait, anime, lettering, weapons, injury or gore.",
    "specjalizacja-spec": "TWO complete PRECISION TOOLS crossed in a compact emblem: ONE sturdy VERNIER CALIPER with two clearly open jaws and one sliding beam; ONE short practical SCREWDRIVER with thick handle and intact straight tip. Equal visual weight, a broad black cut separates their overlap. Technical expertise through real tools, sparse functional detail. No scale ticks, numerals, lettering, generic cog, person, hands, book or scattered parts.",
    "specjalizacja-zlodziej": "ONE OPEN LEATHER LOCKPICK ROLL with exactly THREE broad distinct LOCKPICK TOOLS seated in simple pockets: one hook tip, one straight probe and one short bent tension wrench. Strong complete handles and large black pocket cuts, one plain tie strap at the side. Professional precision tools, sober compact inventory silhouette. No instructions, lock diagram, hands, face, labels, tiny stitching, numerals, generic cog or book.",
    "spieprzysz-to": "ONE complete BARE ADULT HAND uses its extended INDEX FINGER to FLICK ONE coherent CUBE DIE onto an edge, forcing a reroll. Die has exactly three visible flat planes with straight shared edges: ONE big pip on front, TWO on right side, ONE on top. One broad short impact wedge at fingertip, no motion arrow. Natural hand/thumb/folded fingers and short wrist, strong black gap around die. No second die, written words, numerals, speech bubble, book, tiny fingernails or cartoon face.",
    "sportowiec": "ONE generic ADULT ATHLETE VAULTING OVER ONE LOW PLAIN WALL. Both complete bare hands plant on the broad wall top, torso leans forward, one knee drawn over the wall and trailing leg extended behind. Natural adult proportions, smooth featureless head, plain practical clothes and boots. Strong broad black gaps between bent limbs and wall, single coherent athletic action. No gruff portrait, anime, gym logos, tiny brick texture, text or motion arrows.",
    "stalowy-nadgarstek": "ONE complete BARE ADULT HAND AND STRAIGHT FOREARM holds ONE compact SUBMACHINE GUN LEVEL toward the RIGHT with ONE HAND ONLY. Strong steady wrist, coherent fingers around the single grip, thumb natural and index finger straight along the receiver outside the trigger guard. Complete short barrel, simple receiver, one short magazine and a compact folded stock. Sparse broad black structural cuts, no second hand, body, head, recoil cloud, prosthetic wrist, elaborate accessories, lettering or tiny controls."
}


def main():
    feedback_file = REVIEW / "feedback.json"
    feedback_bytes = feedback_file.read_bytes()
    feedback = json.loads(feedback_bytes)["items"]
    manifest = read(REVIEW / "manifest.json")
    reworks = []
    for prior in (80, 81):
        old = {s["itemId"]: s for s in read(REVIEW / f"candidates/batch-{prior}/batch.json")["subjects"]}
        for entry in read(REVIEW / f"candidates/batch-{prior}/reviewed.json")["active"]:
            if entry["decision"] not in ("revise", "reject"):
                continue
            assert feedback[entry["id"]] == entry["feedback"], "Newer GM feedback"
            subject = dict(old[entry["id"]])
            subject.pop("adaptation", None)
            subject["revisionOf"] = entry
            reworks.append(subject)
    assert [s["key"] for s in reworks] == ["nie-do-zdarcia", "reputacja", "rutyna", "rzeznik", "rzuc-bron-i-gleba", "samouk", "saper", "serwisowanie"]
    roadmap = read(ROOT / "dev/icons/placeholder-pass/roadmap.json")
    fresh = [s for group in roadmap["batches"] for s in group["subjects"]][83:93]
    assert len(fresh) == 10
    already = {item.get("placeholderKey") for item in manifest["items"]}
    assert all(f"{s['kind']}:{s['key']}" not in already for s in fresh)
    groups = {82: reworks + fresh[:1], 83: fresh[1:]}
    styles = ["icons/abilities/amen.webp", "icons/abilities/hakerstwo.webp", "icons/abilities/krwawy-aniol.webp",
              "icons/abilities/jeden-strzal.webp", "icons/abilities/dobra-rada.webp", "icons/abilities/emiter-emp.webp",
              "icons/abilities/bez-tajemnic.webp", "icons/abilities/kocie-kosci.webp", "icons/abilities/dziewiec-zyc.webp"]
    for number, subjects in groups.items():
        here = REVIEW / "candidates" / f"batch-{number}"
        assert not here.exists(), "Batch already allocated"
        assert len(subjects) == 9
        (here / "raw").mkdir(parents=True)
        entries, targets = [], []
        for index, original in enumerate(subjects):
            subject = dict(original)
            subject.update(cell=index + 1, request=MOTIFS[subject["key"]])
            subject.setdefault("itemId", f"batch{number}-{subject['key']}")
            for target in subject["deliveryTargets"]:
                assert sha(ROOT / target["source"]) == target["sourceSha256"]
                targets.append({"key": subject["key"], **target})
            entries.append(subject)
        write(here / "batch.json", {"date": DATE, "batch": number,
              "generalFeedback": "Follow exact saved revisions. Avoid repeated handshakes and books where new concepts are requested. Broad white glyphs, generic adults, no gruff portrait default, anime or dithering.", "subjects": entries})
        references = (["dev/icons/review/" + s["revisionOf"]["selectedSource"] for s in reworks] + styles[8:]
                      if number == 82 else list(styles))
        canvas = Image.new("RGB", (768, 768), "black")
        for index, source in enumerate(references):
            with Image.open(ROOT / source) as original:
                rgba = original.convert("RGBA")
                rgba.thumbnail((256, 256), Image.Resampling.LANCZOS)
                canvas.paste(rgba, ((index % 3) * 256, (index // 3) * 256), rgba)
        canvas.save(here / "raw/style-reference.png")
        role = ("Reference cells 1-8 are EXACT selected revision subjects. Cells 1,2,3,4,6,7 require entirely new concepts as specified; cell 5 preserves the prone person and dropped gun while replacing the stop palm, and cell 8 moves the service hatch to the actual UNDERSIDE. Reference cell 9 is STYLE ONLY for a new subject. No books for cell 6 and no handshake for cell 2. Keep each complete glyph inside its own cell."
                if number == 82 else "ALL nine reference cells are STYLE ONLY. Create the entirely NEW subjects below. Cells 5-6 are distinct technical and lockpicking expertise tool emblems, with equal broad white stencil weight. Keep anatomy natural, objects complete and fine detail sparse.")
        prompt = GENERAL + role + "\nROW-MAJOR CONTENTS:\n" + "\n".join(f"{s['cell']}. {s['key']}: {s['request']}" for s in entries)
        write(here / "prompts.json", {"generator": "OpenAI built-in image generation", "date": DATE,
              "reference": "raw/style-reference.png", "role": role, "atlas": prompt, "targetedCorrections": []})
        write(here / "style-reference.json", {"role": role, "sources": [{"source": source, "sha256": sha(ROOT / source)} for source in references]})
        write(here / "references.json", {"role": "Exact native targets, not style inputs", "files": targets})
        write(here / "incoming.json", {"date": DATE, "batch": number,
              "feedbackSha256": hashlib.sha256(feedback_bytes).hexdigest(), "priorReviewItems": len(manifest["items"]),
              "priorResolvedItems": sum(item.get("status") == "resolved" for item in manifest["items"]),
              "revisionCount": sum("revisionOf" in s for s in entries), "freshCount": sum("revisionOf" not in s for s in entries),
              "rejectedConcepts": 0, "remainingPlaceholderFiles": 78, "remainingPlaceholderSubjects": 78})
        print(f"Batch {number}: " + ", ".join(s["key"] for s in entries))
    assert feedback_file.read_bytes() == feedback_bytes


if __name__ == "__main__":
    main()
