# Osobówka — geometria przed malowaniem, v3 → v4

Po v2 MG wskazał nadmierną pustą przestrzeń w kabinie i zaproponował rzut SVG jako kontrolę
proporcji. Geometria v3 i zgodność dachu zostały zaakceptowane. V4 poprawia dodatkowe koła
i jest podpięta w module; [stan integracji i testy](../OSOBOWKA.md).

`model.json` opisuje koncepcyjny sedan 5,15 × 1,90 m, rozstaw osi 2,90 m. Jeden przelicznik
164,27 px/m obejmuje koła, ławę, fotele, konsolę i deskę. Środki rzędów dzieli 0,84 m; odstęp
od przedniej krawędzi tylnej kanapy do oparć przednich foteli to 0,36 m. Podłogi do deski: 0,46 m.
To wymiary koncepcyjne, nie dane konkretnego modelu ani nowy obrys mechaniczny.

`layout.svg` jest autorskim rzutem, `out/layout.png` jego rasteryzacją w przeglądarce. Generator
dostał rzut jako geometrię, a zaakceptowany portret jako styl i tożsamość auta. SVG jest kontrolą
kompozycji, nie ścisłym ograniczeniem generatora; wynik odchyla się od planu.

- `out/roof-off-initial.png` — pierwszy render z błędną trzecią osią.
- `out/roof-off.png`, `out/roof-on.png` — v3, zaakceptowana kabina, nadal ze środkowymi kołami.
- `out/roof-off-final.png`, `out/roof-on-final.png` (podgląd: `roof-off-final.webp`, `roof-on-final.webp`) — v4, cztery wyraźne koła, zainstalowana para.
- `out/roof-on-rejected-seat-shift.png` — odrzucona rekonstrukcja dachu; przesunęła meble w szybie.

Ostatecznie poprawiono same koła w obu obrazach v3 osobno. Zachowało to wnętrze i fragmenty
widoczne przez szyby. [Prompty v3](prompts.json) · [Końcowe edycje](../final-prompts.json).
WEBP 450×900 powstały przez packer M5: kadrowanie, skalowanie i konwersja bez domalowywania.
Oba mają alfę 0–255 i poprawne marginesy; IoU sylwetek dla alfa >128 wynosi 99,10%.
[Podgląd SVG i końcowej pary](review.html) pozwala nakładać dach i pasażerów.
