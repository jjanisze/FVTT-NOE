# M1A1 Abrams — portrait, cutaway and separate turret

Delivered and approved by the GM 2026-10-27. Poligon: **Garaż → Karta prób → Grafika: M1A1 Abrams**. Empty and fully crewed vehicles, interior reference, portrait and four original-scale dnd5e figures. The existing Parking tank is upgraded in place.

| Shipped asset | Size | Use |
|---|---|---|
| `tokens/portraits/pojazd-czolg.webp` | 1024×1024 RGB | Portrait |
| `tokens/pojazdy/czolg.webp` | 780×2100 RGBA | Complete closed token and loading fallback |
| `tokens/pojazdy/wnetrza/czolg.webp` | 780×2100 RGBA | Four-seat cutaway |
| `tokens/pojazdy/kadluby/czolg.webp` | 780×2100 RGBA | Closed hull under the turret |
| `tokens/pojazdy/wieze/czolg.webp` | 638×1588 RGBA | Extracted turret, bustle rack and gun |

The logical footprint is **2.6×5.6 squares / 3.9×8.4 m**, covering a 780×1680 source-pixel viewport. Native texture fit is **width**, anchor **0.5 / 0.4**, scale 1. The gun extends beyond the footprint. The visible painted hull measures **3.65×7.93 m** and overall gun-forward length **9.83 m**, at 200 pixels per metre. Exhaust is at (390,100) source pixels: 50% / 4.7619% of full art, or 50% / 5.9524% of hull viewport. The seat window clips only its background to the hull viewport; it does not squeeze the full art vertically.

The driver is centred forward. Commander and gunner are on vehicle-right (image-left, front down), commander behind gunner. Loader is on vehicle-left, shown with a folded-seat workstation for a readable tabletop anchor. Painted cushion centres are (390,1310), (285,770), (276,980), (517,875); seat fractions use the **1680-pixel hull viewport**, not the 2100-pixel art height. Existing generic vehicle game statistics remain unchanged.

Turret source pivot: **(389,884)**; crop **(70,458,638,1588)**; pivot within crop **(319,426)**. The renderer already used by Bradley follows hull animation, mirroring, scale, elevation, visibility and engine vibration. X-ray removes the upper layer and shows all four crew. Independent aiming and gunnery remain post-beta D33; future turret turns must also transform the three turret crew positions. [Interactive layer inspection](layers-review.html) permits graphic-only relative rotation around the saved bearing.

## Sources and method

Real geometry and four-person crew: [GDLS M1A1 specification](https://international.gdls.com/english/products/ABRAMS/M1A1.pdf), [Australian Army M1A1](https://www.army.gov.au/equipment/vehicles-and-surveillance/m1a1-abrams-tank), [USMC tank employment manual](https://www.marines.mil/Portals/1/Publications/MCWP%203-12%20Marine%20Corps%20Tank%20Employment.pdf). Visual reference: public-domain USMC [11th MEU tank operations photo](https://www.dvidshub.net/image/5698255/11th-meu-tank-operations), saved as `reference-usmc.jpg`. Interior details are simplified illustration, not an engineering drawing.

Built-in `image_gen.imagegen`, reference editing with transparent backgrounds for tokens; the service does not expose a model name. Full [prompts and reference roles](prompts.json). The Hammer portrait supplies the existing painting style. Portrait v3 corrects the sides of the commander and loader hatches. A first cutaway request was rejected at input; a tabletop-miniature rephrasing produced the retained source. No output was produced by the rejected call.

`layout.svg` is the four-seat geometry guide; `layout.png` is its raster reference. `frame.py` registers the painted cutaway to the physical dimensions (3.5% aspect correction) and registers the generated closed image to that hull. `closed-guide.py` adds a wedge turret over the fixed interior. `measure-ring.py` measures the painted bearing; actual painted cushion positions, rather than the initial SVG coordinates, define the anchors.

`compose.py` preserves the canonical exterior, rear grille and running gear. A finite upper mask extracts the turret and gun; closed hull paint and reused hatch fittings close the compartment and driver well under it. The forward barrel projection is calibrated to 9.83 m overall. This deterministic assembly avoids independently regenerating shared exterior pixels. Native inputs under `../in/` are packed by the normal catalog pipeline; all four token WebPs are lossless.

Run `python dev/art/m4/czolg/validate.py`. [Validation report](validation.json): exact decoded source pixels, zero differences outside the finite change mask, identical hull silhouettes, opaque crew anchors, clear crop margins and **zero RGBA differences** after reassembling the shipped hull and turret. Closed and open full-frame alpha intentionally differ where the gun projects beyond the hull.

Runtime verification: `npm test` green, vehicle Quench **42/42**, sandbox Garage E2E **16/16**,
no module console errors. Report and 21 screenshots: `logs/e2e/2026-10-27T22-35-25/`;
Abrams screenshots 15–17 and 20–21. Tested actual animated turning, engine vibration, mirrored
and unequal scales, alpha/tint/elevation/visibility, custom-art fallback, redraw/delete,
four occupants, seat-button registration, boarding/exit and fresh regeneration.
