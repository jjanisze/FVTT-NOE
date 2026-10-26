# Missing-asset queue

Checked against files on disk, 2026-10-20: **31 missing final images** — 2 banners,
4 wrecks, 9 map objects, 4 companion tokens and 12 bestiary tokens currently
using generated placeholders. Every final path listed below is absent.
M4 vehicles: **26 images and 7 sounds still missing** (§P); sedan, Hammer and motorcycle sets delivered.

Only outstanding asset requests belong here. Delivery history and remaining
wiring/world-update tasks are in [FINAL_HANDOFF.md](FINAL_HANDOFF.md);
batch approvals are under [review/candidates/](review/candidates/).

**Next batch number: 119**.

<!-- class-placeholder-audit:start -->
<!-- class-placeholder-audit:end -->


<!-- icon-style-review:start -->
<!-- icon-style-review:end -->

## P. Pojazdy (M4) — 26 obrazów, 7 dźwięków

Requested 2026-10-19 for `PLAN_m4_pojazdy.md` §8. Osobówka's portrait and closed/interior tokens
are on disk; review and integration notes: [OSOBOWKA.md](../art/m4/OSOBOWKA.md).
Hammer's portrait and matched pair were delivered 2026-10-25: [notes and prompts](../art/m4/hammer/README.md).
Motorcycle portrait and open token delivered 2026-10-26: [notes and prompts](../art/m4/motocykl/README.md).
Ready-to-paste prompts, exhaust points and the
vehicle exceptions to the token rules: [dev/art/m4/BRIEFS_MISSING.md](../art/m4/BRIEFS_MISSING.md);
sizes and paths: `dev/art/m4/catalog.json`. Drops: `dev/art/m4/in/<set>/<key>.png`, then
`python dev/art/m4/pack.py`. Until a final file exists the module uses generated placeholders
(`tokens/pojazdy/_placeholder/`); a delivered file wins at the next `fvtt packs` without code changes.

**Tokens — 11.** Top-down, **front toward the bottom**, rectangular frame = footprint at 300 px per
square, 94% fill, transparent margins, exhaust outlet at the briefed point, no riders or weapons.

| Missing final file | Final size | Subject |
|---|---|---|
| `tokens/pojazdy/autobus.webp` | 600×2400 | Autobus miejski, sklejka w oknach, łatany dach |
| `tokens/pojazdy/rower.webp` | 150×300 | Rower stalowy, koszyk na bagażniku |
| `tokens/pojazdy/buggy.webp` | 300×600 | Buggy z ramą rurową, silnik z tyłu |
| `tokens/pojazdy/ciezarowka.webp` | 600×1800 | Ciężarówka z paką, komin za kabiną |
| `tokens/pojazdy/woz-strazacki.webp` | 600×1800 | Wóz strażacki, działko wodne na dachu |
| `tokens/pojazdy/buldozer.webp` | 750×1200 | Spycharka gąsienicowa z lemieszem |
| `tokens/pojazdy/czolg.webp` | 750×1500 | Czołg, lufa w dół kadru, bez oznaczeń |
| `tokens/pojazdy/bwp.webp` | 600×1350 | Bojowy wóz piechoty, rampa z tyłu |
| `tokens/pojazdy/traktor.webp` | 450×750 | Traktor rolniczy, komin na masce |
| `tokens/pojazdy/motorower.webp` | 150×300 | Motorower, skrzynka na bagażniku |
| `tokens/pojazdy/deskorolka.webp` | 150×150 | Deskorolka z góry, nos w dół |

**Wrecks — 4.** Same rules, no exhaust; fitted inside the destroyed vehicle's footprint.

| Missing final file | Final size | Subject |
|---|---|---|
| `tokens/wraki/pojazd-jednoslad.webp` | 150×450 | Spalony motocykl (też motorower, rower, deskorolka) |
| `tokens/wraki/pojazd-osobowy.webp` | 450×900 | Spalona skorupa osobówki (też Hammer, buggy) |
| `tokens/wraki/pojazd-ciezki.webp` | 600×1800 | Spalone podwozie ciężarówki (też autobus, wóz, traktor) |
| `tokens/wraki/pojazd-gasienicowy.webp` | 750×1500 | Rozbity kadłub gąsienicowy (też BWP, buldożer) |

**Portraits — 11.** `tokens/portraits/pojazd-<key>.webp` for the 11 token keys above, **1024×1024
WEBP, RGB, no alpha**, three-quarter front view on a highway shoulder.

**Sounds — 7.** `sounds/pojazdy/`: `start-benzyna.ogg`, `start-diesel.ogg`, `start-motocykl.ogg`,
`zgaszenie.ogg`, `nieudane-odpalenie.ogg`, `alarm.ogg`, `syrena.ogg` (optional) — mono 44.1 kHz
Vorbis, CC0, M5 loudness rules; cues and lengths in the brief.

## G. Ilustracje teatru wyobraźni — 2

Ready-to-paste prompts, purposes, crop instructions and source drop points:
[BRIEFS_MISSING.md](../art/m5/BRIEFS_MISSING.md), set `ruiny`.
Specs: `PLAN_m5_postoj.md` §7.23, D42–D45.

The GM generates and hand-edits each image. Art direction, updated by the GM
2026-10-18: grounded, painterly American post-apocalyptic survival art;
North American buildings and props, realistic materials, no fantasy elements.
Looting scenes use cold daylight or neutral-white flashlights:
deserted search locations, no amber camp ambience.
No text, lettering, logos, recognizable characters or gore.
Final files: **1200×400 WEBP, RGB, no alpha**. Compose the important subjects
inside the middle band of the 1792×1024 source for the final 3:1 crop.

### Ruiny — 2

Player scavenging-request card; interiors in daylight or flashlight light.
Edited sources: `dev/art/m5/in/ruiny/<key>.png`.

| Missing final file | Subject | Full prompt, crop and drop point |
|---|---|---|
| `ui/ruiny/magazyn.webp` | Regały magazynu, rozdarte kartony, wózek widłowy na boku | [Prompt — magazyn](../art/m5/BRIEFS_MISSING.md#ruinymagazyn) |
| `ui/ruiny/wrak.webp` | Rozerwany kadłub samolotu / statku, fotele, zwisające kable | [Prompt — wrak](../art/m5/BRIEFS_MISSING.md#ruinywrak) |

## H. Żetony wraków — 4

After machine self-destruction (`PLAN_m5_postoj.md` §7.18).
Prompts: [BRIEFS_MISSING.md](../art/m5/BRIEFS_MISSING.md), set `wraki`.
Edited sources: `dev/art/m5/in/wraki/<key>.png`.
Top-down WEBP with genuine alpha; no ground, cast shadow or crater.
Preserve the authored square frame and clear transparent margins.

| Missing final file | Final size / frame fill | Subject |
|---|---|---|
| `tokens/wraki/maly.webp` | 400×400 / 70% | Rozerwany korpus małego drona, blacha, kable, okopcenie |
| `tokens/wraki/sredni.webp` | 400×400 / 90% | Wypalony szkielet maszyny wielkości człowieka |
| `tokens/wraki/duzy.webp` | 800×800 / 90% | Rozbebeszony ciężki kadłub, pęknięte płyty, odsłonięte serwa |
| `tokens/wraki/gigantyczny.webp` | 1600×1600 / 92% | Ogromne wypalone cielsko maszyny, uszkodzone gąsienice / nogi |

## B. In-world objects — 9

Physical objects seen directly from above on map Tiles, rather than sheet glyphs.
Prompts: [BRIEFS_MISSING.md](../art/m5/BRIEFS_MISSING.md), set `objekty`.
Edited sources: `dev/art/m5/in/objekty/<key>.png`.
Final files: **128 px long side, native aspect ratio, WEBP with alpha**;
no ground or cast shadow. Reference: `vfx/grenade-thrown.webp`.
The exact filename is picked up by the existing Tile code.

| Missing final file | Subject |
|---|---|
| `vfx/grenade-molotov.webp` | Butelka na boku, brązowy płyn, płonąca szmata w szyjce |
| `vfx/grenade-dynamite.webp` | Pojedyncza laska dynamitu z iskrzącym lontem |
| `vfx/grenade-c4-remote.webp` | Kostka C4 w oliwkowym opakowaniu, zapalnik elektryczny, dwa przewody |
| `vfx/grenade-ied.webp` | Bomba rurowa z przyklejonym budzikiem i przewodami |
| `vfx/grenade-ied-radio.webp` | Bomba rurowa z odbiornikiem radiowym i anteną |
| `vfx/grenade-smoke.webp` | Granat dymny, cylindryczna puszka, zawleczka, smużka dymu |
| `vfx/grenade-flashbang.webp` | Granat hukowy, perforowany korpus, łyżka i zawleczka |
| `vfx/grenade-incendiary.webp` | Granat zapalający, puszka z czerwonym pasem bez napisów |
| `vfx/grenade-improvised.webp` | Puszka z gwoździami i śrubami, taśma, krótki lont |

## E. Żetony towarzyszy — 4

Animal companion templates (`PLAN_m3_towarzysze.md` §7.13).
Prompts: [BRIEFS_MISSING.md](../art/m5/BRIEFS_MISSING.md), set `towarzysze`;
format: [tokens/PROMPT.md](../../tokens/PROMPT.md).
Edited sources: `dev/art/m5/in/towarzysze/<key>.png`.
Top-down WEBP with alpha; preserve size-specific frame fill and margins.

| Missing final file | Final size / frame fill | Subject |
|---|---|---|
| `tokens/towarzysz-psi-partner.webp` | 400×400 / 70% | Kundel z pustkowi, krótka sierść, obroża z kawałkiem łańcucha |
| `tokens/towarzysz-zmutowany-owad.webp` | 400×400 / 70% | Owad wielkości psa, chityna, odnóża do kopania, żuwaczki |
| `tokens/towarzysz-zmutowany-ssak.webp` | 800×800 / 90% | Potężny zmutowany drapieżnik, niedźwiedź / pies-gigant |
| `tokens/towarzysz-zmutowany-gad.webp` | 400×400 / 90% | Jaszczur ziemnowodny, płetwiasty ogon, błotniste łuski |

## I. Bestiary tokens still using generated placeholders — 12

Confirmed from the builder's priority: native art → existing alias → placeholder.
These twelve have neither native token art nor a usable alias. Portraits are
not substitutes for top-down tokens. Format and prompt template:
[tokens/PROMPT.md](../../tokens/PROMPT.md); creature descriptions:
`dev/bestiary/bestiary.json`. WEBP with alpha, head toward the bottom,
clear margins, no ring or base. These are outside the M5 packer catalog.

| Missing final file | Final size / frame fill | Subject |
|---|---|---|
| `tokens/cywil.webp` | 400×400 / 90% | Zwykły cywil pustkowi |
| `tokens/gangus-boss.webp` | 400×400 / 90% | Przywódca gangu |
| `tokens/generacja-ii-genotyp-gadzi.webp` | 400×400 / 90% | Człekokształtny mutant o gadzich cechach |
| `tokens/generacja-ii-genotyp-wilczy.webp` | 800×800 / 90% | Duża, przygarbiona hybryda człowieka i wilka |
| `tokens/generacja-iii-szpieg.webp` | 400×400 / 90% | Prawie ludzki mutant z drobną deformacją |
| `tokens/korzec.webp` | 800×800 / 90% | Wydłużona, kolczasta bestia o skórze przypominającej korę |
| `tokens/kurczak.webp` | 200×200 / 60% | Mała dwunożna maszyna, pękaty korpus, lufa, antena |
| `tokens/mobsprzet.webp` | 400×400 / 90% | Asymetryczna maszyna bojowa ze złomu na kołach / gąsienicach |
| `tokens/pajak.webp` | 200×200 / 60% | Mała ośmionożna maszyna, owalny korpus, sensory |
| `tokens/roj-szczurow.webp` | 800×800 / 90% | Rój szczurów jako wspólna sylwetka |
| `tokens/szeryf.webp` | 400×400 / 90% | Szeryf pustkowi |
| `tokens/taran.webp` | 800×800 / 90% | Duża niska bestia z płytami pancerza i podłużnym łbem |

## How an item gets added here

Add only a confirmed missing asset: final path, purpose, spec and prompt/brief link.
An existing correct image needing a repoint is a wiring task, kept in the handoff.
After delivery, validate the file, add its credit and remove the queue row.
For M5 catalog assets: `python dev/art/m5/pack.py`, then `--check`.
New white glyphs follow [Pipeline.md](Pipeline.md) and require GM review.
