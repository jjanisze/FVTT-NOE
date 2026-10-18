# Missing-asset queue

Checked against files on disk, 2026-10-18: **36 missing final images** — 7 banners,
4 wrecks, 9 map objects, 4 companion tokens and 12 bestiary tokens currently
using generated placeholders. Every final path listed below is absent.

Only outstanding asset requests belong here. Delivery history and remaining
wiring/world-update tasks are in [FINAL_HANDOFF.md](FINAL_HANDOFF.md);
batch approvals are under [review/candidates/](review/candidates/).

**Next batch number: 115**.

<!-- class-placeholder-audit:start -->
<!-- class-placeholder-audit:end -->
<!-- icon-style-review:start -->
<!-- icon-style-review:end -->

## G. Ilustracje teatru wyobraźni — 7

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

### Ruiny — 7

Player scavenging-request card; interiors in daylight or flashlight light.
Edited sources: `dev/art/m5/in/ruiny/<key>.png`.

| Missing final file | Subject |
|---|---|
| `ui/ruiny/apteka.webp` | Splądrowana apteka, przewrócone regały, rozsypane blistry |
| `ui/ruiny/biuro.webp` | Opuszczone biuro / mieszkanie, kurz, pnącza przez okno |
| `ui/ruiny/magazyn.webp` | Regały magazynu, rozdarte kartony, wózek widłowy na boku |
| `ui/ruiny/piwnica.webp` | Ciasna piwnica, słoiki na półkach, rury, smuga światła |
| `ui/ruiny/sklepik.webp` | Sklepik, zbita witryna, lada, przewrócona lodówka |
| `ui/ruiny/warsztat.webp` | Warsztat samochodowy, kanał, narzędzia, auto bez kół |
| `ui/ruiny/wrak.webp` | Rozerwany kadłub samolotu / statku, fotele, zwisające kable |

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
