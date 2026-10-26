# Nuclear Winter chase scenery

Generated with the OpenAI built-in image tool on 2026-10-20. Full prompts and edit roles are in
`prompts.json` and `revision-prompts.json`; original selected PNGs are preserved in `in/`.
This revision awaits GM visual review.

Twelve shipped WEBPs provide a shared sky/snow loop and 29 route choices: two roads,
three complete district silhouettes (city, suburb, industrial), four vegetation crowns,
four small street props, eight hollow ruin frames, four ground decals and four powder wisps.
The small props use an oblique camera; their prompts and the sparse foreground revision
are recorded in `../poscig-sparse/`.
The selected sources are converted without painting, colour keying or background removal:

```sh
python dev/art/poscig-nevada/pack-variety.py --catalog dev/art/poscig-winter/catalog.json --source-dir dev/art/poscig-winter/in --dest ui/poscig/themes/zima
```

Rebuild metadata without another image encoding pass by omitting `--source-dir`.
Cold diffuse upper-left lighting, dirty white snow, steel blue ice, charcoal masonry and muted
rust carry across the set. Foreground ruins use a shallow landscape view rather than the older
45-degree camera. Open windows, portals and steel bays have real alpha holes for passing cars.
The larger frames reach across the lower vehicle band; their bases end outside the panel.

The road retains a genuine irregular transparent upper contour around opaque snowbanks, rubble
and frozen vegetation. There is no vertical opacity ramp joining road and background.
The revised background method is described in [BACKGROUNDS.md](BACKGROUNDS.md): complete,
internally opaque architectural silhouettes overlap over a shared sky and snowy horizon.
Architecture never uses a rectangular edge cut or opacity ramp. Only the empty sky/snow base
crossfades its own horizontal wrap, where no building can be dissolved. The packer validates
real alpha and empty gutters around the architectural portion of each skyline.

Foreground depth is authored in `catalog.json`: large ruins scroll at 2.9 times road speed,
with a dark blue-grey tint and 2.3 source-pixel blur; vegetation scrolls at 1.45 times road speed,
with a lighter tint and 0.6-pixel blur. Small lights and signs use their own 4,200-unit stream
at 2.2 times road speed. The large ruins now have a sparse 24,000-unit stream, 65% slot eligibility
and 160-480 px of downward Y variation: about 25 seconds between large buildings on average at
tempo 2. Lower UVs are cropped at the scenery border. Blur is baked into owned textures once during loading,
so it does not require per-frame filters or framebuffer masks. Vehicles and the road stay sharp.

`poscig-snow.mjs` adds three depths of windblown flakes above vehicles and paired tread impressions
below vehicles. Impressions originate at each eligible vehicle's rear axle, scroll at road speed,
and use a bounded pool of 1,536 paired stamps. Token documents are never modified by these VFX.
Tempo zero holds tyre trails while weather continues. Theme changes release all owned VFX
textures and display objects. Scenery and effects exclude pointer hit testing.
Tyre eligibility uses the same centre-based road-band rule as lane badges. A vehicle whose
footprint crosses the lower road boundary still leaves tracks while its centre remains inside;
individual tread pairs stay clipped to the road. Per-vehicle emission counts are exposed in
the render statistics for live verification.

Sandbox checks: `npm run fvtt -- e2e --suites=boot,winter-art --reuse --keep`.
This checks real GM/player select, HUD, sheets, targeting, normal/Shift drags through opaque and
transparent ruins, actual road alpha coverage, cropping, cancellation and texture teardown,
plus snowfall, tyre emission, pause and VFX disposal. Revision checks also cover opaque skyline
cores and gutters, foreground depth treatment, the partly overlapping vehicle regression,
and assigning a chase role to the initially roleless fixture control. The Poligon station
`poscig` has probes `zima-ruiny`, `zima-snieg`, `zima-tlo`, `zima-glebia` and `zima-rola`;
reseed that station only on the GM's request.

Final revision validation: `npm test`, packaging validation and `git diff --check` pass.
Live GM/player interaction, alpha, cropping, cancellation, foreground depth, centre-based tyre
eligibility and chase-role assignment pass without client console errors in
`logs/e2e/2026-10-20T19-05-40/report.json`. Review screenshot:
`logs/e2e/2026-10-20T19-05-40/winter-art-09-gm-revised_winter_review.jpg`. Sandbox scene
**Pościg · Nuklearna zima — przegląd** is left running at tempo 2 for visual review.
Its former roleless control is assigned the chased role in lane 11 and named **Pojazd 7**,
so every vehicle on the road now has a lane badge and tyre trails. The underlying `poscig`
fixture retains its negative control for automated mechanics tests; the winter suite assigns
its role only after checking that the initially roleless control is correctly excluded.
